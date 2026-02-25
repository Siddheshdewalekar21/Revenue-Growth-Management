"""
ML-based demand forecasting for AI-driven RGM. Uses scikit-learn (Ridge regression +
polynomial time features). This is the concrete ML feature in the project; invoked when
the API receives useMl=true in POST /api/forecasts/generate.
"""

from datetime import datetime
from typing import List, Tuple

import numpy as np
from sklearn.linear_model import Ridge
from sklearn.preprocessing import PolynomialFeatures, StandardScaler


def add_months(date: datetime, months: int) -> datetime:
    month = date.month - 1 + months
    year = date.year + month // 12
    month = month % 12 + 1
    day = min(date.day, 28)
    return datetime(year, month, day)


def generate_ml_forecast(
    historical_dates: List[str],
    historical_demand: List[float],
    horizon_months: int,
    degree: int = 2,
    alpha: float = 1.0,
) -> List[Tuple[str, float]]:
    """
    Fit Ridge regression (with polynomial time features) on historical demand
    and predict the next horizon_months.

    Args:
        historical_dates: List of date strings (e.g. "2025-01-01").
        historical_demand: List of demand values (same length).
        horizon_months: Number of future months to predict.
        degree: Polynomial degree for time index (default 2 for slight curve).
        alpha: Ridge regularization (default 1.0).

    Returns:
        List of (forecast_date_iso, predicted_demand) for each future month.
    """
    if len(historical_demand) < 2:
        raise ValueError("Need at least 2 historical points for ML forecast")

    n = len(historical_demand)
    X = np.arange(n, dtype=float).reshape(-1, 1)
    y = np.array(historical_demand, dtype=float)

    if degree > 1:
        poly = PolynomialFeatures(degree=degree, include_bias=True)
        X = poly.fit_transform(X)
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    model = Ridge(alpha=alpha, positive=False)
    model.fit(X_scaled, y)

    last_date_str = historical_dates[-1]
    try:
        last_date = datetime.fromisoformat(str(last_date_str)[:10])
    except Exception:
        last_date = datetime.now()

    results: List[Tuple[str, float]] = []
    for k in range(1, horizon_months + 1):
        t = (n - 1) + k
        t_arr = np.array([[t]], dtype=float)
        if degree > 1:
            t_arr = poly.transform(t_arr)
        t_scaled = scaler.transform(t_arr)
        pred = float(model.predict(t_scaled)[0])
        pred = max(0.0, pred)
        forecast_date = add_months(last_date, k).date().isoformat()
        results.append((forecast_date, round(pred, 0)))
    return results
