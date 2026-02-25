"""
RGM Backend (FastAPI). AI-driven RGM: demand forecasting is ML-only (see ml_forecast.py).
Pricing, promotions, and assortment use ML when available and fallback to data-driven logic.
"""

import json
import os
import re
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlencode
from urllib.request import Request, urlopen

from bson import ObjectId
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pymongo import MongoClient


load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://127.0.0.1:27017")
MONGODB_DB = os.getenv("MONGODB_DB", "rgm_tool_prod")
PORT = int(os.getenv("PORT", "4000"))

client = MongoClient(MONGODB_URI)
db = client[MONGODB_DB]


def serialize_doc(doc: Dict[str, Any]) -> Dict[str, Any]:
  """
  Convert MongoDB-specific types (ObjectId, datetime) into JSON-serializable values.
  """
  if not doc:
    return doc
  result: Dict[str, Any] = {}
  for k, v in doc.items():
    if isinstance(v, ObjectId):
      result[k] = str(v)
    elif isinstance(v, datetime):
      result[k] = v.isoformat()
    else:
      result[k] = v
  return result


def serialize_list(docs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
  return [serialize_doc(d) for d in docs]


def _parse_bool_env(name: str, default: bool = False) -> bool:
  raw = os.getenv(name)
  if raw is None:
    return default
  return raw.strip().lower() in {"1", "true", "yes", "y", "on"}


def _split_env_values(*names: str) -> List[str]:
  values: List[str] = []
  for name in names:
    raw = os.getenv(name, "")
    if not raw:
      continue
    for part in raw.split(","):
      value = part.strip()
      if value:
        values.append(value)
  return values


def _safe_positive_int(name: str, default: int, min_value: int = 1, max_value: int = 5000) -> int:
  raw = os.getenv(name)
  if raw is None or not raw.strip():
    return default
  try:
    parsed = int(raw.strip())
  except ValueError:
    return default
  return max(min_value, min(max_value, parsed))


def _normalize_event_name(display_name: str) -> str:
  normalized = str(display_name or "").strip()
  if not normalized:
    return "Unnamed Event"
  normalized = re.sub(r"\s*\(\d{4}\)\s*$", "", normalized)
  normalized = re.sub(r"\s+\d{4}\s*$", "", normalized)
  normalized = normalized.strip()
  return normalized or "Unnamed Event"


def _parse_iso_datetime(value: str) -> Optional[datetime]:
  raw = str(value or "").strip()
  if not raw:
    return None
  normalized = raw.replace("Z", "+00:00")
  try:
    return datetime.fromisoformat(normalized)
  except ValueError:
    return None


def _parse_google_event_start(start_data: Dict[str, Any]) -> Optional[Dict[str, str]]:
  if not isinstance(start_data, dict):
    return None

  all_day_date = start_data.get("date")
  if all_day_date:
    event_date = str(all_day_date)[:10]
    if re.fullmatch(r"\d{4}-\d{2}-\d{2}", event_date):
      return {"event_date": event_date, "event_time": "00:00"}
    return None

  date_time_raw = start_data.get("dateTime")
  parsed_dt = _parse_iso_datetime(str(date_time_raw))
  if not parsed_dt:
    return None

  return {
    "event_date": parsed_dt.date().isoformat(),
    "event_time": parsed_dt.strftime("%H:%M"),
  }


def _parse_ics_event_start(dtstart_key: str, dtstart_value: str) -> Optional[Dict[str, str]]:
  raw_key = str(dtstart_key or "").upper()
  raw_value = str(dtstart_value or "").strip()
  if not raw_value:
    return None

  if "VALUE=DATE" in raw_key or re.fullmatch(r"\d{8}", raw_value):
    try:
      parsed_date = datetime.strptime(raw_value[:8], "%Y%m%d")
      return {"event_date": parsed_date.date().isoformat(), "event_time": "00:00"}
    except ValueError:
      return None

  for fmt in ("%Y%m%dT%H%M%SZ", "%Y%m%dT%H%M%S", "%Y%m%dT%H%M", "%Y%m%dT%H"):
    try:
      parsed_dt = datetime.strptime(raw_value, fmt)
      return {"event_date": parsed_dt.date().isoformat(), "event_time": parsed_dt.strftime("%H:%M")}
    except ValueError:
      continue

  return None


def _fetch_google_calendar_events_via_api(
  calendar_id: str,
  api_key: str,
  window_start_iso: str,
  window_end_iso: str,
  max_results: int,
) -> List[Dict[str, Any]]:
  encoded_calendar_id = quote(calendar_id, safe="")
  params = urlencode(
    {
      "key": api_key,
      "singleEvents": "true",
      "orderBy": "startTime",
      "showDeleted": "false",
      "timeMin": window_start_iso,
      "timeMax": window_end_iso,
      "maxResults": max_results,
    }
  )
  request_url = f"https://www.googleapis.com/calendar/v3/calendars/{encoded_calendar_id}/events?{params}"
  request = Request(request_url, headers={"Accept": "application/json"})

  with urlopen(request, timeout=20) as response:
    payload = json.loads(response.read().decode("utf-8"))

  items = payload.get("items", []) if isinstance(payload, dict) else []
  events: List[Dict[str, Any]] = []
  for item in items:
    if not isinstance(item, dict):
      continue
    if item.get("status") == "cancelled":
      continue

    parsed_start = _parse_google_event_start(item.get("start") or {})
    if not parsed_start:
      continue

    summary = str(item.get("summary") or "Untitled Event").strip() or "Untitled Event"
    source_event_id = str(item.get("id") or "").strip()
    if not source_event_id:
      continue

    events.append(
      {
        "event_name": _normalize_event_name(summary),
        "event_date": parsed_start["event_date"],
        "event_time": parsed_start["event_time"],
        "display_name": summary,
        "source": "google-calendar",
        "source_type": "api",
        "calendar_id": calendar_id,
        "google_event_id": f"api:{calendar_id}:{source_event_id}",
      }
    )

  return events


def _fetch_google_calendar_events_via_ics(ics_url: str, source_label: str) -> List[Dict[str, Any]]:
  request = Request(ics_url, headers={"Accept": "text/calendar, */*"})
  with urlopen(request, timeout=20) as response:
    raw_text = response.read().decode("utf-8", errors="replace")

  unfolded_lines: List[str] = []
  for line in raw_text.splitlines():
    if line.startswith((" ", "\t")) and unfolded_lines:
      unfolded_lines[-1] += line[1:]
    else:
      unfolded_lines.append(line.strip())

  events: List[Dict[str, Any]] = []
  current: Optional[Dict[str, str]] = None
  for line in unfolded_lines:
    if line == "BEGIN:VEVENT":
      current = {}
      continue

    if line == "END:VEVENT":
      if current:
        dtstart_key = current.get("_DTSTART_KEY", "DTSTART")
        dtstart_value = current.get("DTSTART", "")
        parsed_start = _parse_ics_event_start(dtstart_key, dtstart_value)
        if parsed_start:
          summary = str(current.get("SUMMARY") or "Untitled Event").strip() or "Untitled Event"
          uid = str(current.get("UID") or "").strip()
          recurrence_id = str(current.get("RECURRENCE-ID") or "").strip()
          external_id = uid if not recurrence_id else f"{uid}:{recurrence_id}"
          if external_id:
            events.append(
              {
                "event_name": _normalize_event_name(summary),
                "event_date": parsed_start["event_date"],
                "event_time": parsed_start["event_time"],
                "display_name": summary,
                "source": "google-calendar",
                "source_type": "ics",
                "calendar_id": source_label,
                "google_event_id": f"ics:{source_label}:{external_id}",
              }
            )
      current = None
      continue

    if current is None or ":" not in line:
      continue

    key_part, value = line.split(":", 1)
    key_name = key_part.split(";", 1)[0].upper()
    current[key_name] = value.strip()
    if key_name == "DTSTART":
      current["_DTSTART_KEY"] = key_part.upper()

  return events


def sync_google_calendar_events_to_mongo() -> Dict[str, Any]:
  api_key = str(os.getenv("GOOGLE_CALENDAR_API_KEY", "")).strip()
  calendar_ids = _split_env_values("GOOGLE_CALENDAR_IDS", "GOOGLE_CALENDAR_ID")
  ics_urls = _split_env_values("GOOGLE_CALENDAR_ICS_URLS", "GOOGLE_CALENDAR_ICS_URL")
  lookahead_days = _safe_positive_int("GOOGLE_CALENDAR_LOOKAHEAD_DAYS", 365, 1, 3650)
  max_results = _safe_positive_int("GOOGLE_CALENDAR_MAX_RESULTS", 250, 1, 2500)

  if not calendar_ids and not ics_urls:
    raise HTTPException(
      status_code=400,
      detail="Google Calendar sync is not configured. Set GOOGLE_CALENDAR_IDS or GOOGLE_CALENDAR_ICS_URLS.",
    )

  warnings: List[str] = []
  if calendar_ids and not api_key:
    if ics_urls:
      warnings.append("Skipped GOOGLE_CALENDAR_IDS because GOOGLE_CALENDAR_API_KEY is not set.")
      calendar_ids = []
    else:
      raise HTTPException(
        status_code=400,
        detail="GOOGLE_CALENDAR_API_KEY is required when GOOGLE_CALENDAR_IDS is used.",
      )

  now_utc = datetime.utcnow()
  today_str = now_utc.date().isoformat()
  window_end_date = (now_utc + timedelta(days=lookahead_days)).date().isoformat()
  window_start_iso = f"{today_str}T00:00:00Z"
  window_end_iso = (now_utc + timedelta(days=lookahead_days)).replace(microsecond=0).isoformat() + "Z"

  source_errors: List[str] = []
  successful_sources = 0
  collected_events: List[Dict[str, Any]] = []

  for calendar_id in calendar_ids:
    try:
      fetched = _fetch_google_calendar_events_via_api(
        calendar_id=calendar_id,
        api_key=api_key,
        window_start_iso=window_start_iso,
        window_end_iso=window_end_iso,
        max_results=max_results,
      )
      successful_sources += 1
      collected_events.extend(fetched)
    except (HTTPError, URLError, TimeoutError, ValueError, json.JSONDecodeError) as exc:
      source_errors.append(f"{calendar_id}: {exc}")

  for index, ics_url in enumerate(ics_urls):
    source_label = f"ics-{index + 1}"
    try:
      fetched = _fetch_google_calendar_events_via_ics(ics_url=ics_url, source_label=source_label)
      successful_sources += 1
      for event in fetched:
        event_date = str(event.get("event_date") or "")
        if today_str <= event_date <= window_end_date:
          collected_events.append(event)
    except (HTTPError, URLError, TimeoutError, ValueError) as exc:
      source_errors.append(f"{source_label}: {exc}")

  if successful_sources == 0:
    error_suffix = f" Details: {', '.join(source_errors)}" if source_errors else ""
    raise HTTPException(status_code=502, detail=f"Failed to fetch Google Calendar events.{error_suffix}")

  deduped_map: Dict[str, Dict[str, Any]] = {}
  for event in collected_events:
    event_id = str(event.get("google_event_id") or "")
    if not event_id:
      continue
    deduped_map[event_id] = event
  deduped_events = list(deduped_map.values())

  event_collection = db["event_calendar"]
  synced_at = datetime.utcnow()
  inserted = 0
  updated = 0
  for event in deduped_events:
    update_result = event_collection.update_one(
      {"source": "google-calendar", "google_event_id": event["google_event_id"]},
      {
        "$set": {**event, "last_synced_at": synced_at},
        "$setOnInsert": {"created_at": synced_at},
      },
      upsert=True,
    )
    if update_result.upserted_id is not None:
      inserted += 1
    elif update_result.modified_count > 0:
      updated += 1

  deleted = 0
  stale_filter: Dict[str, Any] = {
    "source": "google-calendar",
    "event_date": {"$gte": today_str},
  }
  if deduped_events:
    stale_filter["google_event_id"] = {"$nin": [ev["google_event_id"] for ev in deduped_events]}
  deleted = event_collection.delete_many(stale_filter).deleted_count

  result: Dict[str, Any] = {
    "status": "ok",
    "sources_configured": len(calendar_ids) + len(ics_urls),
    "sources_loaded": successful_sources,
    "sources_failed": len(source_errors),
    "events_fetched": len(collected_events),
    "events_upserted": len(deduped_events),
    "inserted": inserted,
    "updated": updated,
    "deleted": deleted,
    "lookahead_days": lookahead_days,
    "synced_at": synced_at.isoformat(),
  }
  if warnings:
    result["warnings"] = warnings
  if source_errors:
    result["source_errors"] = source_errors
  return result


class ForecastGeneratePayload(BaseModel):
  productId: str
  horizonMonths: Optional[int] = 6
  useMl: Optional[bool] = True


class PromotionSimulationPayload(BaseModel):
  discountPct: float
  durationDays: int
  channel: str = "Retail"
  productCategory: Optional[str] = None
  region: Optional[str] = None
  promoType: Optional[str] = "percent_off"
  budget: Optional[float] = None


# Forecasting ML backend (required for forecast generation).
try:
  from ml_forecast import generate_ml_forecast

  _FORECAST_ML_AVAILABLE = True
except Exception:
  generate_ml_forecast = None
  _FORECAST_ML_AVAILABLE = False


# Pricing ML backend (fallback to data-driven insight if unavailable).
try:
  from ml_pricing import build_pricing_insight_ml

  _PRICING_ML_AVAILABLE = True
except Exception:
  build_pricing_insight_ml = None
  _PRICING_ML_AVAILABLE = False


# Promotions ML backend (fallback to data-driven recommendation/simulation if unavailable).
try:
  from ml_promotion import build_promotion_recommendation_ml, simulate_promotion_ml

  _PROMOTION_ML_AVAILABLE = True
except Exception:
  build_promotion_recommendation_ml = None
  simulate_promotion_ml = None
  _PROMOTION_ML_AVAILABLE = False


# Assortment ML backend (fallback to stored recommendation if unavailable).
try:
  from ml_assortment import build_assortment_recommendations_ml

  _ASSORTMENT_ML_AVAILABLE = True
except Exception:
  build_assortment_recommendations_ml = None
  _ASSORTMENT_ML_AVAILABLE = False


app = FastAPI(
  title="RGM Backend (FastAPI)",
  # Override the docs favicons so the browser tab shows no 'lovable' icon
  swagger_favicon_url="data:,",
  redoc_favicon_url="data:,",
)

app.add_middleware(
  CORSMiddleware,
  allow_origins=["*"],
  allow_credentials=True,
  allow_methods=["*"],
  allow_headers=["*"],
)


@app.get("/api/health")
def health():
  return {
    "status": "ok",
    "service": "rgm-backend-fastapi",
    "time": datetime.utcnow().isoformat(),
    "mlAvailable": _FORECAST_ML_AVAILABLE,
    "mlOnly": True,
    "mlCapabilities": {
      "forecasting": _FORECAST_ML_AVAILABLE,
      "pricing": _PRICING_ML_AVAILABLE,
      "promotions": _PROMOTION_ML_AVAILABLE,
      "assortment": _ASSORTMENT_ML_AVAILABLE,
    },
  }


@app.get("/api/products")
def get_products():
  try:
    products = list(db["products"].find({}))
    return serialize_list(products)
  except Exception as exc:
    raise HTTPException(status_code=500, detail="Failed to fetch products") from exc


@app.get("/api/pricing-records")
def get_pricing_records():
  try:
    records = list(db["pricing_records"].find({}).sort("effective_date", 1))
    return serialize_list(records)
  except Exception as exc:
    raise HTTPException(status_code=500, detail="Failed to fetch pricing records") from exc


@app.get("/api/promotions")
def get_promotions():
  try:
    promos = list(db["promotions"].find({}))
    return serialize_list(promos)
  except Exception as exc:
    raise HTTPException(status_code=500, detail="Failed to fetch promotions") from exc


@app.get("/api/promotions/upcoming")
def get_upcoming_promotions():
  try:
    if _parse_bool_env("GOOGLE_CALENDAR_SYNC_ON_READ", default=False):
      try:
        sync_google_calendar_events_to_mongo()
      except Exception as sync_exc:
        print(f"[GoogleCalendarSync] upcoming read sync failed: {sync_exc}")

    today_str = datetime.utcnow().date().isoformat()
    raw_events = list(db["event_calendar"].find({"event_date": {"$gte": today_str}}).sort("event_date", 1))
    deduped_events_by_key: Dict[str, Dict[str, Any]] = {}
    for event in raw_events:
      dedupe_key = f"{str(event.get('event_name') or '')}|{str(event.get('event_date') or '')}"
      current = deduped_events_by_key.get(dedupe_key)
      if current is None:
        deduped_events_by_key[dedupe_key] = event
      else:
        current_is_google = str(current.get("source") or "") == "google-calendar"
        event_is_google = str(event.get("source") or "") == "google-calendar"
        if event_is_google and not current_is_google:
          deduped_events_by_key[dedupe_key] = event

    events = sorted(deduped_events_by_key.values(), key=lambda ev: str(ev.get("event_date") or ""))
    promos = list(db["promotions"].find({}))

    upcoming: List[Dict[str, Any]] = []
    for ev in events:
      event_name = ev.get("event_name")
      past_for_event = []
      for promo in promos:
        end_raw = promo.get("end_date")
        end_date = str(end_raw)[:10] if end_raw else None
        if promo.get("event_name") == event_name and end_date and end_date < today_str:
          past_for_event.append(promo)

      reference = None
      if past_for_event:
        reference = sorted(
          past_for_event,
          key=lambda p: str(p.get("end_date") or "")[:10],
          reverse=True,
        )[0]

      upcoming.append(
        {
          "event_name": event_name,
          "event_date": ev.get("event_date"),
          "event_time": ev.get("event_time") or "00:00",
          "display_name": ev.get("display_name") or event_name,
          "reference_promotion_id": str(reference.get("_id")) if reference and reference.get("_id") else None,
          "reference_name": reference.get("name") if reference else None,
          "reference_roi": reference.get("roi") if reference else None,
          "reference_revenue_lift_pct": reference.get("revenue_lift_pct") if reference else None,
          "reference_discount_pct": reference.get("discount_pct") if reference else None,
          "reference_duration_days": reference.get("duration_days") if reference else None,
          "reference_channel": reference.get("channel") if reference else None,
        }
      )

    return upcoming
  except Exception as exc:
    raise HTTPException(status_code=500, detail="Failed to fetch upcoming promotions") from exc


@app.post("/api/promotions/sync-google-calendar")
def sync_google_calendar():
  try:
    return sync_google_calendar_events_to_mongo()
  except HTTPException:
    raise
  except Exception as exc:
    raise HTTPException(status_code=500, detail="Failed to sync Google Calendar events") from exc


@app.get("/api/promotions/recommendation")
def get_promotion_recommendation():
  """Promotion recommendation using ML when available, else data-driven fallback."""
  try:
    promos = list(db["promotions"].find({}))
    if _PROMOTION_ML_AVAILABLE and build_promotion_recommendation_ml is not None:
      try:
        return build_promotion_recommendation_ml(promos)
      except Exception:
        pass

    promos = [p for p in promos if p.get("roi") is not None]
    if not promos:
      return {
        "insight": "No historical promotions yet. Run a few promos to get data-driven recommendations.",
        "source": "data",
      }

    best = max(promos, key=lambda p: float(p.get("roi") or 0))
    incremental_profit = float(best.get("incremental_profit") or best.get("net_profit") or 0)
    incremental_loss = float(best.get("incremental_loss") or best.get("loss_amount") or 0)
    return {
      "insight": (
        f"Best historical ROI: {best.get('name', 'Promo')} - "
        f"{float(best.get('discount_pct') or 0):.0f}% off, {best.get('duration_days', 0)}d, "
        f"{best.get('channel', '')} (ROI {float(best.get('roi') or 0):.1f}x). Consider similar for next event."
      ),
      "source": "data",
      "discount_pct": float(best.get("discount_pct") or 0),
      "duration_days": best.get("duration_days"),
      "channel": best.get("channel"),
      "roi": float(best.get("roi") or 0),
      "predicted_incremental_profit": round(incremental_profit, 2),
      "predicted_incremental_loss": round(incremental_loss, 2),
    }
  except Exception as exc:
    raise HTTPException(status_code=500, detail="Failed to build recommendation") from exc


@app.post("/api/promotions/simulate")
def simulate_promotion(payload: PromotionSimulationPayload):
  """Simulate promotion performance using ML when available, else rule-model fallback."""
  try:
    discount_pct = float(payload.discountPct)
    duration_days = int(payload.durationDays)
    channel = str(payload.channel or "Retail")
    product_category = str(payload.productCategory or "").strip() or None
    region = str(payload.region or "").strip() or None
    promo_type_raw = str(payload.promoType or "percent_off").strip().lower()
    budget = float(payload.budget) if payload.budget is not None else None

    if discount_pct <= 0:
      raise HTTPException(status_code=400, detail="discountPct must be > 0")
    if duration_days <= 0:
      raise HTTPException(status_code=400, detail="durationDays must be > 0")
    if budget is not None and budget <= 0:
      raise HTTPException(status_code=400, detail="budget must be > 0")

    promo_type_aliases = {
      "percent_off": "percent_off",
      "%_off": "percent_off",
      "% off": "percent_off",
      "percentage_off": "percent_off",
      "bogo": "bogo",
      "bundle": "bundle",
    }
    promo_type = promo_type_aliases.get(promo_type_raw)
    if promo_type is None:
      raise HTTPException(status_code=400, detail="promoType must be one of: percent_off, bogo, bundle")

    promos = list(db["promotions"].find({}))
    if _PROMOTION_ML_AVAILABLE and simulate_promotion_ml is not None:
      try:
        return simulate_promotion_ml(
          promos,
          discount_pct,
          duration_days,
          channel,
          product_category=product_category,
          region=region,
          promo_type=promo_type,
          budget=budget,
        )
      except Exception:
        pass

    category_key = str(product_category or "").strip().lower()
    region_key = str(region or "").strip().lower()

    promo_type_lift_factor = {"percent_off": 1.0, "bogo": 1.22, "bundle": 1.12}
    promo_type_cannibalization_factor = {"percent_off": 1.0, "bogo": 1.18, "bundle": 1.08}
    promo_type_roi_factor = {"percent_off": 1.0, "bogo": 0.85, "bundle": 0.93}

    category_lift_boost = 0.0
    if "beverage" in category_key:
      category_lift_boost = 2.0
    elif "snack" in category_key:
      category_lift_boost = 1.5
    elif "breakfast" in category_key:
      category_lift_boost = 1.0
    elif "foodservice" in category_key:
      category_lift_boost = 1.2

    region_lift_boost = 0.0 if not region_key or region_key == "national" else 1.0

    revenue_lift_pct = discount_pct * 1.4 + (5 if duration_days > 7 else 0) + (3 if channel == "Foodservice" else 0)
    revenue_lift_pct = (revenue_lift_pct + category_lift_boost + region_lift_boost) * promo_type_lift_factor[promo_type]

    predicted_roi = ((100 - discount_pct) / discount_pct) * (1.5 if duration_days < 7 else 1.0)
    predicted_roi *= promo_type_roi_factor[promo_type]

    predicted_cannibalization_pct = discount_pct * 0.4 + (5 if duration_days > 14 else 0)
    predicted_cannibalization_pct *= promo_type_cannibalization_factor[promo_type]

    estimated_base_revenue = max(20000.0, 26000.0 + (duration_days * 650.0))
    if budget is not None:
      estimated_base_revenue = max(estimated_base_revenue, budget * 2.2)

    predicted_incremental_revenue = max(0.0, estimated_base_revenue * (revenue_lift_pct / 100.0))
    estimated_promo_spend = (
      max(0.0, budget)
      if budget is not None
      else max(0.0, estimated_base_revenue * (discount_pct / 100.0) * 0.5)
    )

    if budget is not None:
      spend_intensity = budget / estimated_base_revenue if estimated_base_revenue > 0 else 0.0
      if spend_intensity < 0.06:
        revenue_lift_pct *= 0.82
        predicted_roi *= 0.92
      elif spend_intensity > 0.2:
        revenue_lift_pct *= 1.08
        predicted_cannibalization_pct *= 1.05

      predicted_incremental_revenue = max(0.0, estimated_base_revenue * (revenue_lift_pct / 100.0))

    estimated_cannibalization_loss = max(0.0, predicted_incremental_revenue * (predicted_cannibalization_pct / 100.0) * 0.4)
    predicted_incremental_profit = predicted_incremental_revenue - estimated_promo_spend - estimated_cannibalization_loss
    predicted_incremental_loss = max(
      0.0,
      estimated_cannibalization_loss + (-predicted_incremental_profit if predicted_incremental_profit < 0 else 0.0),
    )

    return {
      "source": "rule_model",
      "model_type": "heuristic",
      "discount_pct": round(discount_pct, 1),
      "duration_days": duration_days,
      "channel": channel,
      "product_category": product_category or "All Categories",
      "region": region or "All Regions",
      "promo_type": promo_type,
      "budget": round(budget, 2) if budget is not None else None,
      "predicted_roi": round(max(0.0, predicted_roi), 2),
      "predicted_revenue_lift_pct": round(max(0.0, revenue_lift_pct), 1),
      "predicted_cannibalization_pct": round(max(0.0, predicted_cannibalization_pct), 1),
      "predicted_incremental_profit": round(predicted_incremental_profit, 2),
      "predicted_incremental_loss": round(predicted_incremental_loss, 2),
    }
  except HTTPException:
    raise
  except Exception as exc:
    raise HTTPException(status_code=500, detail="Failed to simulate promotion") from exc


@app.get("/api/pricing/insight")
def get_pricing_insight():
  """Pricing insight using ML when available, else data-driven fallback."""
  try:
    products = list(db["products"].find({}))
    pricing_records = list(db["pricing_records"].find({}).sort("effective_date", 1))

    if _PRICING_ML_AVAILABLE and build_pricing_insight_ml is not None:
      try:
        return build_pricing_insight_ml(products, pricing_records)
      except Exception:
        pass

    if not products:
      return {"insight": "No products loaded. Add products for pricing insights.", "source": "data"}

    avg_margin = sum(float(p.get("margin_pct") or 0) for p in products) / len(products)
    below_competitor = sum(
      1
      for p in products
      if p.get("competitor_price")
      and float(p.get("current_price", 0)) < float(p.get("competitor_price", 0))
    )
    return {
      "insight": f"Avg margin {avg_margin:.1f}%. {below_competitor} product(s) priced below competitor - opportunity to align or premium.",
      "source": "data",
      "avg_margin_pct": round(avg_margin, 1),
      "products_below_competitor": below_competitor,
      "product_count": len(products),
    }
  except Exception as exc:
    raise HTTPException(status_code=500, detail="Failed to build pricing insight") from exc


@app.get("/api/forecasts")
def get_forecasts(productId: Optional[str] = None):
  try:
    query: Dict[str, Any] = {}
    if productId:
      query["product_id"] = ObjectId(str(productId))

    forecasts = list(db["demand_forecasts"].find(query).sort("forecast_date", 1))
    return serialize_list(forecasts)
  except Exception as exc:
    raise HTTPException(status_code=500, detail="Failed to fetch forecasts") from exc


@app.post("/api/forecasts/generate")
def generate_forecasts(payload: ForecastGeneratePayload):
  try:
    product_id_str = payload.productId
    horizon_months = payload.horizonMonths or 6

    if not product_id_str:
      raise HTTPException(status_code=400, detail="productId is required")
    if not _FORECAST_ML_AVAILABLE or generate_ml_forecast is None:
      raise HTTPException(status_code=503, detail="ML model is unavailable on this backend")
    if payload.useMl is False:
      raise HTTPException(status_code=400, detail="ML-only mode is enabled. Set useMl=true or omit it.")

    product_object_id = ObjectId(str(product_id_str))
    collection = db["demand_forecasts"]
    product = db["products"].find_one({"_id": product_object_id}) or {}
    current_price = float(product.get("current_price") or 0)
    unit_cost = float(product.get("unit_cost") or 0)

    historical = list(collection.find({"product_id": product_object_id, "is_forecast": False}).sort("forecast_date", 1))

    if not historical:
      raise HTTPException(status_code=400, detail="No historical demand data for this product")

    horizon = int(horizon_months) if horizon_months > 0 else 6
    new_forecasts: List[Dict[str, Any]] = []
    hist_dates = [str(p.get("forecast_date", ""))[:10] for p in historical]
    hist_demand: List[float] = []
    hist_profit: List[float] = []
    hist_loss: List[float] = []
    for p in historical:
      y_raw = p.get("actual_demand")
      if isinstance(y_raw, (int, float)) and y_raw > 0:
        demand_point = float(y_raw)
      else:
        demand_point = float(p.get("predicted_demand") or 0)
      hist_demand.append(demand_point)

      profit_point_raw = p.get("actual_profit")
      if not isinstance(profit_point_raw, (int, float)):
        profit_point_raw = p.get("predicted_profit")
      if not isinstance(profit_point_raw, (int, float)):
        profit_point_raw = demand_point * max(0.0, (current_price - unit_cost))
      hist_profit.append(float(profit_point_raw))

      loss_point_raw = p.get("actual_loss")
      if not isinstance(loss_point_raw, (int, float)):
        loss_point_raw = p.get("predicted_loss")
      if not isinstance(loss_point_raw, (int, float)):
        loss_point_raw = p.get("loss_amount")
      if not isinstance(loss_point_raw, (int, float)):
        loss_point_raw = max(0.0, demand_point * current_price * 0.015)
      hist_loss.append(float(max(0.0, float(loss_point_raw))))

    predictions = generate_ml_forecast(hist_dates, hist_demand, horizon)
    profit_predictions: List[tuple[str, float]] = []
    loss_predictions: List[tuple[str, float]] = []
    if len(hist_profit) >= 2:
      try:
        profit_predictions = generate_ml_forecast(hist_dates, hist_profit, horizon)
      except Exception:
        profit_predictions = []
    if len(hist_loss) >= 2:
      try:
        loss_predictions = generate_ml_forecast(hist_dates, hist_loss, horizon)
      except Exception:
        loss_predictions = []

    profit_by_date = {d: v for d, v in profit_predictions}
    loss_by_date = {d: v for d, v in loss_predictions}

    for forecast_date, predicted in predictions:
      predicted_demand = float(max(0.0, predicted))
      default_revenue = predicted_demand * max(0.0, current_price)
      default_profit = predicted_demand * max(0.0, (current_price - unit_cost))
      predicted_profit = float(profit_by_date.get(forecast_date, default_profit))
      predicted_loss = float(loss_by_date.get(forecast_date, default_revenue * 0.015))
      if predicted_profit < 0:
        predicted_loss += abs(predicted_profit)
        predicted_profit = 0.0
      predicted_loss = max(0.0, predicted_loss)
      new_forecasts.append(
        {
          "product_id": product_object_id,
          "forecast_date": forecast_date,
          "actual_demand": None,
          "predicted_demand": int(round(predicted_demand)),
          "is_forecast": True,
          "seasonality_index": 1,
          "trend_component": int(round(predicted_demand)),
          "actual_revenue": None,
          "predicted_revenue": int(round(default_revenue)),
          "actual_profit": None,
          "predicted_profit": int(round(predicted_profit)),
          "actual_loss": None,
          "predicted_loss": int(round(predicted_loss)),
          "loss_amount": int(round(predicted_loss)),
        }
      )

    collection.delete_many({"product_id": product_object_id, "is_forecast": True})
    if new_forecasts:
      collection.insert_many(new_forecasts)

    return {"status": "ok", "inserted": len(new_forecasts), "usedMl": True}
  except HTTPException:
    raise
  except Exception as exc:
    raise HTTPException(status_code=500, detail="Failed to generate forecasts") from exc


@app.get("/api/assortment")
def get_assortment():
  try:
    assortment = list(db["assortment_data"].find({}))
    products = list(db["products"].find({}))

    product_map = {str(p["_id"]): p for p in products}
    with_names: List[Dict[str, Any]] = []

    for item in assortment:
      product = product_map.get(str(item.get("product_id")))
      enriched = dict(item)
      enriched["productName"] = product.get("name") if product else "Unknown"
      enriched["productCategory"] = product.get("category") if product else "Unknown"
      enriched["productSubcategory"] = product.get("subcategory") if product else "Unknown"
      enriched["productRegion"] = product.get("region") if product else "National"
      enriched["priceElasticity"] = product.get("price_elasticity") if product else None
      margin_pct = float(enriched.get("margin_pct") if enriched.get("margin_pct") is not None else (product.get("margin_pct") if product else 0) or 0)
      revenue = float(enriched.get("revenue") or 0)
      gross_profit = float(enriched.get("gross_profit") or (revenue * margin_pct / 100.0))
      loss_amount_raw = enriched.get("loss_amount")
      if not isinstance(loss_amount_raw, (int, float)):
        loss_amount_raw = enriched.get("operational_loss")
      loss_amount = float(loss_amount_raw or 0)
      net_profit = float(enriched.get("net_profit") or (gross_profit - loss_amount))
      if net_profit < 0:
        loss_amount += abs(net_profit)
        net_profit = 0.0
      profit_margin_pct = (net_profit / revenue * 100.0) if revenue > 0 else 0.0

      enriched["marginPct"] = margin_pct
      enriched["gross_profit"] = round(gross_profit, 2)
      enriched["loss_amount"] = round(max(0.0, loss_amount), 2)
      enriched["net_profit"] = round(net_profit, 2)
      enriched["profit_margin_pct"] = round(profit_margin_pct, 2)
      with_names.append(enriched)

    if _ASSORTMENT_ML_AVAILABLE and build_assortment_recommendations_ml is not None and with_names:
      try:
        ml_result = build_assortment_recommendations_ml(with_names)
        recommendation_map = {str(r.get("row_id") or ""): r for r in ml_result.get("recommendations", [])}
        for item in with_names:
          row_id = str(item.get("_id") or "")
          rec = recommendation_map.get(row_id)
          if not rec:
            continue
          item["recommendation_rule"] = item.get("recommendation")
          item["recommendation"] = rec.get("recommendation", item.get("recommendation"))
          item["recommendation_confidence"] = rec.get("confidence")
          item["recommendation_source"] = rec.get("source", "ml_model")
      except Exception:
        pass

    return serialize_list(with_names)
  except Exception as exc:
    raise HTTPException(status_code=500, detail="Failed to fetch assortment data") from exc


if __name__ == "__main__":
  import uvicorn

  uvicorn.run("main:app", host="0.0.0.0", port=PORT, reload=True)
