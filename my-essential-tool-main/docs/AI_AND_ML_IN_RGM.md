# AI and ML in the RGM Project

**Summary:** The app is framed as **AI-driven RGM** in docs and UI. **ML is used today for demand forecasting** (Python backend). The rest is **data-driven / ML-informed** and ready for more AI/ML (e.g. pricing or promotion models) when you add them.

---

Here is where AI/ML is used today and where it is ready for more.

---

## In use today

| Area | What’s in place |
|------|-----------------|
| **Demand forecasting** | **ML model** in the Python backend: Ridge regression with polynomial time features (see `python-backend/ml_forecast.py`). Users can enable “Use ML model” on the Forecasting page when the API is the Python backend. |
| **Pricing** | **Data-driven** views: elasticity, competitor comparison, margin and revenue KPIs. **GET /api/pricing/insight** returns a short data-driven insight; ready for pricing optimization ML models. |
| **Promotions** | **Data-driven** historical ROI, scenario simulation, and upcoming events with past-performance reference. **GET /api/promotions/recommendation** returns a data-driven suggestion (best past ROI); ready for promotion ROI/ML models. |
| **Assortment** | **Data-driven** SKU performance and add/keep/delist recommendations from stored data. Ready for assortment optimization ML. |

---

## Framing in the product

- **UI and copy:** Overview and client docs describe the system as “AI-driven RGM” that uses ML to optimize pricing, promotions, assortment, and revenue strategy.
- **Demand forecasting** is the current **concrete ML feature**; the rest are **data-driven and ML-informed** and documented as ready for more AI/ML.

---

## Ready for more AI/ML

You can extend the project with:

- **Pricing:** e.g. optimal price or price-band recommendations by product/category (replace or augment current rules with a model).
- **Promotions:** e.g. predicted ROI or recommended discount/duration by channel or event (plug into or replace the existing recommendation endpoint).
- **Assortment:** e.g. ML-based add/keep/delist or space allocation (feed from or into current recommendation fields).

The architecture (Python backend with sklearn, Node backend for other APIs, shared MongoDB) supports adding these models and exposing them via existing or new endpoints.

---

## API endpoints (AI/ML-ready)

| Endpoint | Purpose |
|----------|---------|
| **GET /api/promotions/recommendation** | Data-driven promotion suggestion (best historical ROI). Replace with ML model later. |
| **GET /api/pricing/insight** | Data-driven pricing insight (avg margin, below-competitor count). Replace with ML model later. |
| **POST /api/forecasts/generate** (body: `useMl: true`) | ML-based demand forecast when using Python backend with scikit-learn. |
