"""
ML model for assortment recommendation (add/keep/delist/review).
Profit/loss fields are optional and safely backfilled when missing.
"""

from __future__ import annotations

from typing import Any, Dict, List

import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.feature_extraction import DictVectorizer
from sklearn.metrics import accuracy_score


VALID_RECOMMENDATIONS = {"add", "keep", "delist", "review"}


def _to_float(value: Any, default: float = 0.0) -> float:
  try:
    if value is None:
      return default
    return float(value)
  except Exception:
    return default


def _normalize_recommendation(value: Any) -> str:
  text = str(value or "").strip().lower()
  return text if text in VALID_RECOMMENDATIONS else ""


def _prepare_training_rows(assortment_rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
  rows: List[Dict[str, Any]] = []
  for item in assortment_rows:
    label = _normalize_recommendation(item.get("recommendation"))
    if not label:
      continue

    channel = str(item.get("channel") or "Retail")
    product_name = str(item.get("productName") or "Unknown")

    revenue = _to_float(item.get("revenue"), 0.0)
    margin_pct = _to_float(item.get("margin_pct"), _to_float(item.get("marginPct"), 0.0))
    gross_profit = _to_float(item.get("gross_profit"), revenue * margin_pct / 100.0)
    explicit_loss = _to_float(
      item.get("loss_amount"),
      _to_float(item.get("operational_loss"), _to_float(item.get("loss"), 0.0)),
    )
    net_profit = _to_float(item.get("net_profit"), gross_profit - explicit_loss)

    if net_profit < 0:
      explicit_loss += abs(net_profit)
      net_profit = 0.0

    profit_margin_pct = (net_profit / revenue * 100.0) if revenue > 0 else 0.0
    loss_ratio_pct = (explicit_loss / revenue * 100.0) if revenue > 0 else 0.0

    features = {
      "revenue": revenue,
      "revenue_growth_pct": _to_float(item.get("revenue_growth_pct")),
      "units_sold": _to_float(item.get("units_sold")),
      "market_share_pct": _to_float(item.get("market_share_pct")),
      "category_mix_pct": _to_float(item.get("category_mix_pct")),
      "gross_profit": gross_profit,
      "net_profit": net_profit,
      "loss_amount": max(0.0, explicit_loss),
      "profit_margin_pct": profit_margin_pct,
      "loss_ratio_pct": loss_ratio_pct,
      "channel": channel,
      "product_category": str(item.get("productCategory") or "Unknown"),
      "product_subcategory": str(item.get("productSubcategory") or "Unknown"),
      "product_region": str(item.get("productRegion") or "National"),
      "price_elasticity": _to_float(item.get("priceElasticity")),
      "margin_pct": margin_pct,
    }
    rows.append(
      {
        "row_id": str(item.get("_id") or ""),
        "product_id": str(item.get("product_id") or ""),
        "product_name": product_name,
        "channel": channel,
        "label": label,
        "features": features,
      }
    )
  return rows


def build_assortment_recommendations_ml(assortment_rows: List[Dict[str, Any]]) -> Dict[str, Any]:
  rows = _prepare_training_rows(assortment_rows)
  if len(rows) < 6:
    raise ValueError("Need at least 6 assortment rows to train ML assortment model")

  labels = sorted({row["label"] for row in rows})
  if len(labels) < 2:
    raise ValueError("Need at least 2 recommendation classes to train ML assortment model")

  feature_rows = [row["features"] for row in rows]
  y = np.array([row["label"] for row in rows], dtype=object)

  vectorizer = DictVectorizer(sparse=False)
  x = vectorizer.fit_transform(feature_rows)

  model = RandomForestClassifier(
    n_estimators=300,
    random_state=42,
    class_weight="balanced",
    min_samples_leaf=1,
  )
  model.fit(x, y)

  y_pred = model.predict(x)
  y_prob = model.predict_proba(x)
  classes = [str(c) for c in model.classes_]
  train_accuracy = float(accuracy_score(y, y_pred))

  recommendations: List[Dict[str, Any]] = []
  for idx, row in enumerate(rows):
    probs = {classes[i]: float(y_prob[idx][i]) for i in range(len(classes))}
    predicted = str(y_pred[idx])
    confidence = float(probs.get(predicted, 0.0))
    recommendations.append(
      {
        "row_id": row["row_id"],
        "product_id": row["product_id"],
        "product_name": row["product_name"],
        "channel": row["channel"],
        "recommendation": predicted,
        "baseline_recommendation": row["label"],
        "confidence": round(confidence, 3),
        "source": "ml_model",
      }
    )

  summary = {
    "add": sum(1 for r in recommendations if r["recommendation"] == "add"),
    "keep": sum(1 for r in recommendations if r["recommendation"] == "keep"),
    "delist": sum(1 for r in recommendations if r["recommendation"] == "delist"),
    "review": sum(1 for r in recommendations if r["recommendation"] == "review"),
  }

  return {
    "source": "ml_model",
    "model_type": "RandomForestClassifier",
    "training_samples": len(rows),
    "train_accuracy": round(train_accuracy, 3),
    "action_summary": summary,
    "recommendations": recommendations,
  }