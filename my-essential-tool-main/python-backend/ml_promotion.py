"""
ML models for promotion recommendation and scenario simulation.
Uses profit/loss aware targets with robust fallbacks.
"""

from __future__ import annotations

from typing import Any, Dict, List, Tuple

import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.feature_extraction import DictVectorizer
from sklearn.metrics import mean_absolute_error


def _to_float(value: Any, default: float = 0.0) -> float:
  try:
    if value is None:
      return default
    return float(value)
  except Exception:
    return default


def _to_int(value: Any, default: int = 0) -> int:
  try:
    if value is None:
      return default
    return int(value)
  except Exception:
    return default


def _prepare_training_rows(promotions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
  rows: List[Dict[str, Any]] = []
  for promo in promotions:
    discount = promo.get("discount_pct")
    duration = promo.get("duration_days")
    if discount is None or duration is None:
      continue

    discount_pct = _to_float(discount)
    duration_days = _to_int(duration)
    channel = str(promo.get("channel") or "Retail")
    event_name = str(promo.get("event_name") or "none")
    product_category = str(promo.get("product_category") or promo.get("category") or "all")
    region = str(promo.get("region") or "all")
    promo_type = str(promo.get("promo_type") or "percent_off").strip().lower()
    budget = _to_float(promo.get("budget"), 0.0)

    lift = _to_float(promo.get("revenue_lift_pct"), 0.0)
    cannibalization_pct = _to_float(promo.get("cannibalization_pct"), 0.0)

    base_revenue = _to_float(promo.get("base_revenue"), 50000.0)
    incremental_revenue = _to_float(
      promo.get("incremental_revenue"),
      base_revenue * (lift / 100.0),
    )

    promo_spend = _to_float(
      promo.get("promo_spend"),
      base_revenue * (discount_pct / 100.0) * 0.5,
    )

    cannibalization_loss_amount = _to_float(
      promo.get("cannibalization_loss_amount"),
      incremental_revenue * (cannibalization_pct / 100.0) * 0.4,
    )

    incremental_profit = _to_float(
      promo.get("incremental_profit"),
      _to_float(promo.get("net_profit"), incremental_revenue - promo_spend - cannibalization_loss_amount),
    )

    incremental_loss = _to_float(
      promo.get("incremental_loss"),
      _to_float(promo.get("loss_amount"), max(0.0, cannibalization_loss_amount + (-incremental_profit if incremental_profit < 0 else 0.0))),
    )

    roi = _to_float(
      promo.get("roi"),
      (incremental_profit / promo_spend) if promo_spend > 0 else 0.0,
    )

    rows.append(
      {
        "discount_pct": discount_pct,
        "duration_days": duration_days,
        "channel": channel,
        "event_name": event_name,
        "product_category": product_category,
        "region": region,
        "promo_type": promo_type,
        "budget": budget,
        "roi": roi,
        "revenue_lift_pct": lift,
        "cannibalization_pct": cannibalization_pct,
        "incremental_profit": incremental_profit,
        "incremental_loss": max(0.0, incremental_loss),
      }
    )
  return rows


def _fit_models(rows: List[Dict[str, Any]]) -> Dict[str, Any]:
  if len(rows) < 5:
    raise ValueError("Need at least 5 promotion records with ROI/lift/profit to train ML model")

  feature_rows = [
    {
      "discount_pct": row["discount_pct"],
      "duration_days": row["duration_days"],
      "channel": row["channel"],
      "event_name": row["event_name"],
      "product_category": row.get("product_category", "all"),
      "region": row.get("region", "all"),
      "promo_type": row.get("promo_type", "percent_off"),
      "budget": row.get("budget", 0.0),
    }
    for row in rows
  ]
  y_roi = np.array([row["roi"] for row in rows], dtype=float)
  y_lift = np.array([row["revenue_lift_pct"] for row in rows], dtype=float)
  y_cannibalization = np.array([row["cannibalization_pct"] for row in rows], dtype=float)
  y_profit = np.array([row["incremental_profit"] for row in rows], dtype=float)
  y_loss = np.array([row["incremental_loss"] for row in rows], dtype=float)

  vectorizer = DictVectorizer(sparse=False)
  x = vectorizer.fit_transform(feature_rows)

  roi_model = RandomForestRegressor(n_estimators=250, random_state=42, min_samples_leaf=1)
  lift_model = RandomForestRegressor(n_estimators=250, random_state=42, min_samples_leaf=1)
  cannibalization_model = RandomForestRegressor(n_estimators=220, random_state=42, min_samples_leaf=1)
  profit_model = RandomForestRegressor(n_estimators=280, random_state=42, min_samples_leaf=1)
  loss_model = RandomForestRegressor(n_estimators=220, random_state=42, min_samples_leaf=1)

  roi_model.fit(x, y_roi)
  lift_model.fit(x, y_lift)
  cannibalization_model.fit(x, y_cannibalization)
  profit_model.fit(x, y_profit)
  loss_model.fit(x, y_loss)

  roi_train_mae = float(mean_absolute_error(y_roi, roi_model.predict(x)))
  lift_train_mae = float(mean_absolute_error(y_lift, lift_model.predict(x)))
  cann_train_mae = float(mean_absolute_error(y_cannibalization, cannibalization_model.predict(x)))
  profit_train_mae = float(mean_absolute_error(y_profit, profit_model.predict(x)))
  loss_train_mae = float(mean_absolute_error(y_loss, loss_model.predict(x)))

  return {
    "vectorizer": vectorizer,
    "roi_model": roi_model,
    "lift_model": lift_model,
    "cannibalization_model": cannibalization_model,
    "profit_model": profit_model,
    "loss_model": loss_model,
    "roi_train_mae": roi_train_mae,
    "lift_train_mae": lift_train_mae,
    "cann_train_mae": cann_train_mae,
    "profit_train_mae": profit_train_mae,
    "loss_train_mae": loss_train_mae,
  }


def _predict_bundle(models: Dict[str, Any], feature: Dict[str, Any]) -> Tuple[float, float, float, float, float]:
  vectorizer: DictVectorizer = models["vectorizer"]
  x = vectorizer.transform([feature])

  roi = float(models["roi_model"].predict(x)[0])
  lift = float(models["lift_model"].predict(x)[0])
  cannibalization = float(models["cannibalization_model"].predict(x)[0])
  profit = float(models["profit_model"].predict(x)[0])
  loss = float(models["loss_model"].predict(x)[0])

  roi = max(0.0, roi)
  lift = max(0.0, lift)
  cannibalization = max(0.0, cannibalization)
  loss = max(0.0, loss)
  return roi, lift, cannibalization, profit, loss


def build_promotion_recommendation_ml(promotions: List[Dict[str, Any]]) -> Dict[str, Any]:
  rows = _prepare_training_rows(promotions)
  models = _fit_models(rows)

  channels = sorted({row["channel"] for row in rows}) or ["Retail"]
  discounts = [10, 15, 20, 25, 30]
  durations = [3, 5, 7, 10, 14]

  best: Dict[str, Any] | None = None
  for channel in channels:
    for discount in discounts:
      for duration in durations:
        feature = {
          "discount_pct": float(discount),
          "duration_days": int(duration),
          "channel": channel,
          "event_name": "none",
          "product_category": "all",
          "region": "all",
          "promo_type": "percent_off",
          "budget": 0.0,
        }
        roi, lift, cannibalization, profit, loss = _predict_bundle(models, feature)

        # Weighted score prioritizes ROI and incremental profit while penalizing cannibalization/loss.
        score = roi + (0.03 * lift) + (0.002 * profit) - (0.015 * cannibalization) - (0.002 * loss)
        candidate = {
          "discount_pct": float(discount),
          "duration_days": int(duration),
          "channel": channel,
          "predicted_roi": roi,
          "predicted_revenue_lift_pct": lift,
          "predicted_cannibalization_pct": cannibalization,
          "predicted_incremental_profit": profit,
          "predicted_incremental_loss": loss,
          "score": score,
        }
        if best is None or candidate["score"] > best["score"]:
          best = candidate

  if best is None:
    raise ValueError("Failed to generate ML promotion recommendation")

  avg_roi = float(np.mean([row["roi"] for row in rows]))
  avg_lift = float(np.mean([row["revenue_lift_pct"] for row in rows]))
  avg_cannibalization = float(np.mean([row["cannibalization_pct"] for row in rows]))
  avg_profit = float(np.mean([row["incremental_profit"] for row in rows]))
  avg_loss = float(np.mean([row["incremental_loss"] for row in rows]))

  return {
    "insight": (
      "ML model suggests "
      f"{int(best['discount_pct'])}% off for {best['duration_days']} days in {best['channel']} channel "
      f"(pred ROI {best['predicted_roi']:.2f}x, profit {best['predicted_incremental_profit']:.0f})."
    ),
    "source": "ml_model",
    "model_type": "RandomForestRegressor",
    "training_samples": len(rows),
    "discount_pct": best["discount_pct"],
    "duration_days": best["duration_days"],
    "channel": best["channel"],
    "predicted_roi": round(best["predicted_roi"], 2),
    "predicted_revenue_lift_pct": round(best["predicted_revenue_lift_pct"], 1),
    "predicted_cannibalization_pct": round(best["predicted_cannibalization_pct"], 1),
    "predicted_incremental_profit": round(best["predicted_incremental_profit"], 2),
    "predicted_incremental_loss": round(best["predicted_incremental_loss"], 2),
    "historical_avg_roi": round(avg_roi, 2),
    "historical_avg_revenue_lift_pct": round(avg_lift, 1),
    "historical_avg_cannibalization_pct": round(avg_cannibalization, 1),
    "historical_avg_incremental_profit": round(avg_profit, 2),
    "historical_avg_incremental_loss": round(avg_loss, 2),
    "roi_train_mae": round(models["roi_train_mae"], 3),
    "lift_train_mae": round(models["lift_train_mae"], 3),
    "cannibalization_train_mae": round(models["cann_train_mae"], 3),
    "profit_train_mae": round(models["profit_train_mae"], 2),
    "loss_train_mae": round(models["loss_train_mae"], 2),
  }


def simulate_promotion_ml(
  promotions: List[Dict[str, Any]],
  discount_pct: float,
  duration_days: int,
  channel: str,
  product_category: str | None = None,
  region: str | None = None,
  promo_type: str | None = "percent_off",
  budget: float | None = None,
) -> Dict[str, Any]:
  rows = _prepare_training_rows(promotions)
  models = _fit_models(rows)

  feature = {
    "discount_pct": _to_float(discount_pct),
    "duration_days": _to_int(duration_days),
    "channel": str(channel or "Retail"),
    "event_name": "none",
    "product_category": str(product_category or "all"),
    "region": str(region or "all"),
    "promo_type": str(promo_type or "percent_off").strip().lower(),
    "budget": _to_float(budget, 0.0),
  }
  roi, lift, cannibalization, profit, loss = _predict_bundle(models, feature)

  return {
    "source": "ml_model",
    "model_type": "RandomForestRegressor",
    "training_samples": len(rows),
    "discount_pct": round(feature["discount_pct"], 1),
    "duration_days": int(feature["duration_days"]),
    "channel": feature["channel"],
    "product_category": feature["product_category"] if feature["product_category"] != "all" else "All Categories",
    "region": feature["region"] if feature["region"] != "all" else "All Regions",
    "promo_type": feature["promo_type"],
    "budget": round(float(feature["budget"]), 2) if feature["budget"] > 0 else None,
    "predicted_roi": round(roi, 2),
    "predicted_revenue_lift_pct": round(lift, 1),
    "predicted_cannibalization_pct": round(cannibalization, 1),
    "predicted_incremental_profit": round(profit, 2),
    "predicted_incremental_loss": round(loss, 2),
  }
