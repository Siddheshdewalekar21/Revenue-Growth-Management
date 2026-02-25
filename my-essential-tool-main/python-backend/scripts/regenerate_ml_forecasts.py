"""
One-time data migration helper to regenerate forecast rows with the ML model only.

Usage:
  python scripts/regenerate_ml_forecasts.py
  python scripts/regenerate_ml_forecasts.py --horizon 6
  python scripts/regenerate_ml_forecasts.py --product-id <mongo_object_id>
  python scripts/regenerate_ml_forecasts.py --dry-run
"""

from __future__ import annotations

import argparse
import os
import sys
from typing import Any, Dict, List, Optional, Tuple

from bson import ObjectId
from dotenv import load_dotenv
from pymongo import MongoClient

# Allow running this file directly from the python-backend folder.
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PY_BACKEND_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
if PY_BACKEND_DIR not in sys.path:
  sys.path.insert(0, PY_BACKEND_DIR)

from ml_forecast import generate_ml_forecast


def build_arg_parser() -> argparse.ArgumentParser:
  parser = argparse.ArgumentParser(description="Regenerate MongoDB demand_forecasts using ML-only model.")
  parser.add_argument("--product-id", help="Optional Mongo ObjectId to regenerate only one product.")
  parser.add_argument("--horizon", type=int, default=None, help="Forecast horizon in months. Default: keep existing horizon per product, else 6.")
  parser.add_argument("--dry-run", action="store_true", help="Print what would change without writing to MongoDB.")
  return parser


def get_env_value(name: str, default: str) -> str:
  value = os.getenv(name, default)
  return value.strip() if isinstance(value, str) else default


def normalize_history_point(point: Dict[str, Any]) -> Tuple[str, float]:
  date_str = str(point.get("forecast_date", ""))[:10]
  raw_actual = point.get("actual_demand")
  if isinstance(raw_actual, (int, float)) and raw_actual > 0:
    demand = float(raw_actual)
  else:
    demand = float(point.get("predicted_demand") or 0)
  return date_str, demand


def main() -> int:
  args = build_arg_parser().parse_args()

  # Load .env from cwd and parent folder so this works from either repo root or python-backend.
  load_dotenv()
  load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
  load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))

  mongo_uri = get_env_value("MONGODB_URI", "mongodb://127.0.0.1:27017")
  mongo_db = get_env_value("MONGODB_DB", "rgm_tool_prod")

  client = MongoClient(mongo_uri)
  db = client[mongo_db]
  products_collection = db["products"]
  forecasts_collection = db["demand_forecasts"]

  product_query: Dict[str, Any] = {}
  if args.product_id:
    try:
      product_query["_id"] = ObjectId(args.product_id)
    except Exception:
      print(f"Invalid --product-id value: {args.product_id}")
      return 2

  products = list(products_collection.find(product_query, {"_id": 1, "name": 1, "current_price": 1, "unit_cost": 1}))
  if not products:
    print("No products found for migration query.")
    return 0

  migrated = 0
  skipped = 0
  total_inserted = 0

  for product in products:
    product_id = product["_id"]
    product_name = product.get("name") or str(product_id)
    current_price = float(product.get("current_price") or 0)
    unit_cost = float(product.get("unit_cost") or 0)

    historical = list(
      forecasts_collection
      .find({"product_id": product_id, "is_forecast": False})
      .sort("forecast_date", 1)
    )
    if len(historical) < 2:
      skipped += 1
      print(f"[SKIP] {product_name}: need >=2 historical points, found {len(historical)}")
      continue

    existing_forecast_count = forecasts_collection.count_documents({"product_id": product_id, "is_forecast": True})
    horizon = args.horizon if args.horizon and args.horizon > 0 else (existing_forecast_count if existing_forecast_count > 0 else 6)

    normalized = [normalize_history_point(point) for point in historical]
    hist_dates = [p[0] for p in normalized]
    hist_demand = [p[1] for p in normalized]

    try:
      predictions = generate_ml_forecast(hist_dates, hist_demand, horizon)
    except Exception as exc:
      skipped += 1
      print(f"[SKIP] {product_name}: ML generation failed: {exc}")
      continue

    new_forecasts: List[Dict[str, Any]] = []
    for forecast_date, predicted in predictions:
      pred_int = int(predicted)
      predicted_revenue = int(round(max(0.0, float(predicted)) * max(0.0, current_price)))
      predicted_loss = int(round(predicted_revenue * 0.015))
      predicted_profit = int(round(max(0.0, float(predicted) * max(0.0, (current_price - unit_cost)) - predicted_loss)))
      new_forecasts.append({
        "product_id": product_id,
        "forecast_date": forecast_date,
        "actual_demand": None,
        "predicted_demand": pred_int,
        "is_forecast": True,
        "seasonality_index": 1,
        "trend_component": pred_int,
        "actual_revenue": None,
        "predicted_revenue": predicted_revenue,
        "actual_profit": None,
        "predicted_profit": predicted_profit,
        "actual_loss": None,
        "predicted_loss": predicted_loss,
        "loss_amount": predicted_loss,
      })

    if not args.dry_run:
      forecasts_collection.delete_many({"product_id": product_id, "is_forecast": True})
      if new_forecasts:
        forecasts_collection.insert_many(new_forecasts)

    migrated += 1
    total_inserted += len(new_forecasts)
    action = "would write" if args.dry_run else "wrote"
    print(f"[OK] {product_name}: {action} {len(new_forecasts)} ML forecast rows (horizon={horizon})")

  print("")
  print(f"Done. migrated={migrated} skipped={skipped} forecast_rows={'would_insert' if args.dry_run else 'inserted'}={total_inserted}")
  return 0


if __name__ == "__main__":
  raise SystemExit(main())
