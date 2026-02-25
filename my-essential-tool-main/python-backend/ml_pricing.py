"""
ML models for pricing insight and recommendation generation.
Uses profit/loss aware training rows with safe fallbacks for sparse datasets.
"""

from __future__ import annotations

from collections import defaultdict
from typing import Any, Dict, List, Tuple

import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.feature_extraction import DictVectorizer
from sklearn.metrics import mean_absolute_error, r2_score


def _to_float(value: Any, default: float = 0.0) -> float:
  try:
    if value is None:
      return default
    return float(value)
  except Exception:
    return default


def _build_product_map(products: List[Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
  mapping: Dict[str, Dict[str, Any]] = {}
  for product in products:
    pid = product.get("_id")
    if pid is not None:
      mapping[str(pid)] = product
  return mapping


def _feature_row(
  *,
  product: Dict[str, Any],
  price: float,
  competitor_price: float,
  margin_pct: float,
  price_index: float,
  loss_rate_pct: float,
  profit_margin_pct: float,
) -> Dict[str, Any]:
  unit_cost = _to_float(product.get("unit_cost"), 0.0)
  category = str(product.get("category") or "Unknown")
  subcategory = str(product.get("subcategory") or "Unknown")
  channel = str(product.get("channel") or "Retail")
  region = str(product.get("region") or "National")
  price_gap_pct = ((price - competitor_price) / competitor_price * 100.0) if competitor_price > 0 else 0.0
  return {
    "price": price,
    "competitor_price": competitor_price,
    "price_index": price_index,
    "margin_pct": margin_pct,
    "unit_cost": unit_cost,
    "price_gap_pct": price_gap_pct,
    "loss_rate_pct": loss_rate_pct,
    "profit_margin_pct": profit_margin_pct,
    "category": category,
    "subcategory": subcategory,
    "channel": channel,
    "region": region,
  }


def _prepare_training_rows(
  products: List[Dict[str, Any]],
  pricing_records: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
  product_map = _build_product_map(products)
  rows: List[Dict[str, Any]] = []

  for record in pricing_records:
    product = product_map.get(str(record.get("product_id")))
    if not product:
      continue

    price = _to_float(record.get("price"))
    units_sold = _to_float(record.get("units_sold"), -1.0)
    if price <= 0 or units_sold <= 0:
      continue

    competitor_price = _to_float(
      record.get("competitor_price"),
      _to_float(product.get("competitor_price"), price),
    )
    if competitor_price <= 0:
      competitor_price = price

    unit_cost = _to_float(product.get("unit_cost"), 0.0)
    margin_pct = _to_float(
      record.get("margin_pct"),
      ((price - unit_cost) / price * 100.0) if price > 0 else 0.0,
    )
    price_index = _to_float(
      record.get("price_index"),
      (price / competitor_price * 100.0) if competitor_price > 0 else 100.0,
    )

    revenue = _to_float(record.get("revenue"), price * units_sold)
    cogs = _to_float(
      record.get("cost_of_goods_sold"),
      unit_cost * units_sold,
    )
    gross_profit = _to_float(record.get("gross_profit"), revenue - cogs)

    promo_spend = _to_float(record.get("promo_spend"), 0.0)
    logistics_cost = _to_float(record.get("logistics_cost"), 0.0)
    channel_cost = _to_float(record.get("channel_cost"), 0.0)

    loss_amount = _to_float(record.get("loss_amount"), _to_float(record.get("loss"), _to_float(record.get("total_loss"), 0.0)))
    if loss_amount <= 0:
      loss_amount = _to_float(record.get("returns_loss"), 0.0) + _to_float(record.get("shrinkage_loss"), 0.0)

    net_profit = _to_float(
      record.get("net_profit"),
      gross_profit - promo_spend - logistics_cost - channel_cost - loss_amount,
    )

    if net_profit < 0:
      loss_amount += abs(net_profit)
      net_profit = 0.0

    profit_margin_pct = (net_profit / revenue * 100.0) if revenue > 0 else 0.0
    loss_rate_pct = (loss_amount / revenue * 100.0) if revenue > 0 else 0.0

    rows.append(
      {
        "product_id": str(record.get("product_id") or ""),
        "features": _feature_row(
          product=product,
          price=price,
          competitor_price=competitor_price,
          margin_pct=margin_pct,
          price_index=price_index,
          loss_rate_pct=loss_rate_pct,
          profit_margin_pct=profit_margin_pct,
        ),
        "units_sold": units_sold,
        "revenue": revenue,
        "net_profit": net_profit,
        "loss_amount": max(0.0, loss_amount),
      }
    )

  return rows


def _fit_units_model(rows: List[Dict[str, Any]]) -> Dict[str, Any]:
  if len(rows) < 8:
    raise ValueError("Need at least 8 pricing records to train pricing ML model")

  feature_rows = [row["features"] for row in rows]
  y_units = np.array([row["units_sold"] for row in rows], dtype=float)

  vectorizer = DictVectorizer(sparse=False)
  x = vectorizer.fit_transform(feature_rows)

  model = RandomForestRegressor(
    n_estimators=350,
    random_state=42,
    min_samples_leaf=1,
  )
  model.fit(x, y_units)

  train_pred = model.predict(x)
  train_mae = float(mean_absolute_error(y_units, train_pred))
  train_r2 = float(r2_score(y_units, train_pred))

  return {
    "vectorizer": vectorizer,
    "model": model,
    "train_mae": train_mae,
    "train_r2": train_r2,
  }


def _predict_units(models: Dict[str, Any], feature: Dict[str, Any]) -> float:
  vectorizer: DictVectorizer = models["vectorizer"]
  x = vectorizer.transform([feature])
  predicted = float(models["model"].predict(x)[0])
  return max(0.0, predicted)


def _estimate_loss_per_unit_by_product(rows: List[Dict[str, Any]]) -> Dict[str, float]:
  grouped: Dict[str, List[float]] = defaultdict(list)
  for row in rows:
    units = float(row.get("units_sold") or 0)
    if units <= 0:
      continue
    pid = str(row.get("product_id") or "")
    if not pid:
      continue
    loss_per_unit = float(row.get("loss_amount") or 0) / units
    grouped[pid].append(max(0.0, loss_per_unit))

  return {
    pid: float(np.mean(values))
    for pid, values in grouped.items()
    if values
  }


def _price_candidates(current_price: float, competitor_price: float, unit_cost: float) -> List[float]:
  factors = [0.85, 0.90, 0.95, 1.00, 1.05, 1.10, 1.15]
  candidates = {round(current_price * factor, 2) for factor in factors}
  if competitor_price > 0:
    candidates.add(round(competitor_price, 2))
    candidates.add(round(competitor_price * 1.03, 2))

  floor_price = max(unit_cost * 1.08, 0.1)
  sorted_candidates = sorted(c for c in candidates if c >= floor_price)
  if not sorted_candidates:
    return [round(max(current_price, floor_price), 2)]
  return sorted_candidates


def _recommend_for_product(models: Dict[str, Any], product: Dict[str, Any], loss_per_unit: float) -> Dict[str, Any]:
  product_id = str(product.get("_id"))
  product_name = str(product.get("name") or "Unknown")
  current_price = _to_float(product.get("current_price"), 0.0)
  competitor_price = _to_float(product.get("competitor_price"), current_price)
  if competitor_price <= 0:
    competitor_price = current_price if current_price > 0 else 1.0
  unit_cost = _to_float(product.get("unit_cost"), 0.0)

  if current_price <= 0:
    raise ValueError(f"Invalid current price for product {product_name}")

  safe_loss_per_unit = max(0.0, _to_float(loss_per_unit, 0.0))

  def evaluate(price_value: float) -> Tuple[float, float, float, float]:
    margin_pct = ((price_value - unit_cost) / price_value * 100.0) if price_value > 0 else 0.0
    price_index = (price_value / competitor_price * 100.0) if competitor_price > 0 else 100.0
    features = _feature_row(
      product=product,
      price=price_value,
      competitor_price=competitor_price,
      margin_pct=margin_pct,
      price_index=price_index,
      loss_rate_pct=0.0,
      profit_margin_pct=margin_pct,
    )
    predicted_units = _predict_units(models, features)
    revenue = predicted_units * price_value
    gross_profit = predicted_units * (price_value - unit_cost)
    expected_loss = predicted_units * safe_loss_per_unit
    net_profit = gross_profit - expected_loss
    if net_profit < 0:
      expected_loss += abs(net_profit)
      net_profit = 0.0
    return predicted_units, revenue, net_profit, expected_loss

  current_units, current_revenue, current_profit, current_loss = evaluate(current_price)
  best = {
    "price": current_price,
    "units": current_units,
    "revenue": current_revenue,
    "profit": current_profit,
    "loss": current_loss,
  }

  for candidate_price in _price_candidates(current_price, competitor_price, unit_cost):
    candidate_units, candidate_revenue, candidate_profit, candidate_loss = evaluate(candidate_price)
    if candidate_profit > best["profit"]:
      best = {
        "price": candidate_price,
        "units": candidate_units,
        "revenue": candidate_revenue,
        "profit": candidate_profit,
        "loss": candidate_loss,
      }

  recommended_price = float(best["price"])
  change_pct = ((recommended_price - current_price) / current_price * 100.0) if current_price > 0 else 0.0
  revenue_lift_pct = ((best["revenue"] - current_revenue) / current_revenue * 100.0) if current_revenue > 0 else 0.0
  profit_lift_pct = ((best["profit"] - current_profit) / current_profit * 100.0) if current_profit > 0 else 0.0

  if change_pct > 1.5:
    action = "increase"
  elif change_pct < -1.5:
    action = "decrease"
  else:
    action = "hold"

  return {
    "product_id": product_id,
    "product_name": product_name,
    "current_price": round(current_price, 2),
    "recommended_price": round(recommended_price, 2),
    "price_change_pct": round(change_pct, 2),
    "action": action,
    "predicted_units_current": round(current_units, 1),
    "predicted_units_recommended": round(best["units"], 1),
    "predicted_revenue_current": round(current_revenue, 2),
    "predicted_revenue_recommended": round(best["revenue"], 2),
    "predicted_profit_current": round(current_profit, 2),
    "predicted_profit_recommended": round(best["profit"], 2),
    "predicted_net_profit_current": round(current_profit, 2),
    "predicted_net_profit_recommended": round(best["profit"], 2),
    "predicted_loss_current": round(current_loss, 2),
    "predicted_loss_recommended": round(best["loss"], 2),
    "expected_revenue_lift_pct": round(revenue_lift_pct, 2),
    "expected_profit_lift_pct": round(profit_lift_pct, 2),
  }


def build_pricing_insight_ml(
  products: List[Dict[str, Any]],
  pricing_records: List[Dict[str, Any]],
) -> Dict[str, Any]:
  rows = _prepare_training_rows(products, pricing_records)
  models = _fit_units_model(rows)

  loss_per_unit_map = _estimate_loss_per_unit_by_product(rows)
  avg_loss_per_unit = float(np.mean([v for v in loss_per_unit_map.values()])) if loss_per_unit_map else 0.0

  recommendations: List[Dict[str, Any]] = []
  for product in products:
    try:
      pid = str(product.get("_id") or "")
      recommendations.append(_recommend_for_product(models, product, loss_per_unit_map.get(pid, avg_loss_per_unit)))
    except Exception:
      continue

  if not recommendations:
    raise ValueError("No valid product recommendations generated")

  increase_count = sum(1 for r in recommendations if r["action"] == "increase")
  decrease_count = sum(1 for r in recommendations if r["action"] == "decrease")
  hold_count = sum(1 for r in recommendations if r["action"] == "hold")

  total_current_revenue = float(sum(r["predicted_revenue_current"] for r in recommendations))
  total_recommended_revenue = float(sum(r["predicted_revenue_recommended"] for r in recommendations))
  total_current_profit = float(sum(r["predicted_net_profit_current"] for r in recommendations))
  total_recommended_profit = float(sum(r["predicted_net_profit_recommended"] for r in recommendations))

  projected_revenue_uplift_pct = (
    ((total_recommended_revenue - total_current_revenue) / total_current_revenue * 100.0)
    if total_current_revenue > 0
    else 0.0
  )
  projected_profit_uplift_pct = (
    ((total_recommended_profit - total_current_profit) / total_current_profit * 100.0)
    if total_current_profit > 0
    else 0.0
  )
  avg_change_pct = float(np.mean([r["price_change_pct"] for r in recommendations]))

  ranked = sorted(recommendations, key=lambda r: r["expected_profit_lift_pct"], reverse=True)
  top_opportunities = ranked[:3]

  historical_total_profit = float(sum(float(row.get("net_profit") or 0) for row in rows))
  historical_total_loss = float(sum(float(row.get("loss_amount") or 0) for row in rows))

  return {
    "source": "ml_model",
    "model_type": "RandomForestRegressor",
    "training_samples": len(rows),
    "train_mae_units": round(models["train_mae"], 2),
    "train_r2_units": round(models["train_r2"], 3),
    "insight": (
      "ML pricing model recommends "
      f"{increase_count} increase(s), {decrease_count} decrease(s), {hold_count} hold(s). "
      f"Projected revenue uplift {projected_revenue_uplift_pct:.1f}% and profit uplift {projected_profit_uplift_pct:.1f}%."
    ),
    "action_summary": {
      "increase": increase_count,
      "decrease": decrease_count,
      "hold": hold_count,
    },
    "projected_revenue_uplift_pct": round(projected_revenue_uplift_pct, 2),
    "projected_profit_uplift_pct": round(projected_profit_uplift_pct, 2),
    "avg_recommended_price_change_pct": round(avg_change_pct, 2),
    "historical_total_profit": round(historical_total_profit, 2),
    "historical_total_loss": round(historical_total_loss, 2),
    "recommendations": recommendations,
    "top_opportunities": top_opportunities,
  }