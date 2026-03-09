# RGM Platform — Dashboard Documentation

> **Revenue Growth Management (RGM)** — AI-driven system for pricing, promotions, assortment, and demand forecasting, backed by MongoDB + FastAPI + React.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [How to Start the Application](#how-to-start-the-application)
3. [Data Flow](#data-flow)
4. [MongoDB Collections](#mongodb-collections)
5. [Dashboard Modules](#dashboard-modules)
   - [Executive Overview](#1-executive-overview)
   - [Pricing](#2-pricing)
   - [Promotions](#3-promotions)
   - [Assortment](#4-assortment)
   - [Forecasting](#5-forecasting)
6. [API Endpoints Reference](#api-endpoints-reference)
7. [Environment Variables](#environment-variables)
8. [Seeding Sample Data](#seeding-sample-data)
9. [Authentication](#authentication)
10. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

```
┌─────────────────────────────┐
│   React Frontend (Vite)     │  http://localhost:5173
│   TypeScript + Tailwind CSS │
│   TanStack Query (caching)  │
└────────────┬────────────────┘
             │  fetch() calls to REST API
             ▼
┌─────────────────────────────┐
│   FastAPI Backend (Python)  │  http://localhost:4000
│   python-backend/main.py    │
│   ML modules (optional)     │
└────────────┬────────────────┘
             │  pymongo
             ▼
┌─────────────────────────────┐
│   MongoDB                   │  mongodb://127.0.0.1:27017
│   Database: rgm_tool_prod   │
└─────────────────────────────┘
```

- **Frontend**: React + TypeScript (Vite). All API calls use `VITE_API_BASE_URL` (defaults to `http://localhost:4000`).
- **Backend**: FastAPI server in `python-backend/main.py`. Reads/writes directly to MongoDB using `pymongo`.
- **Database**: MongoDB local instance, database `rgm_tool_prod`. **No Supabase is used for data** — Supabase credentials in the `.env` are legacy leftovers.
- **ML modules**: Optional Python modules (`ml_pricing.py`, `ml_promotion.py`, `ml_forecast.py`, `ml_assortment.py`). The backend falls back to rule-based logic when ML is unavailable.

---

## How to Start the Application

### Option 1 — Use the batch script (recommended)

```bat
cd C:\Users\Siddesh\Desktop\Revenue-Growth-Management-RGM-System\my-essential-tool-main
start.bat
```

This starts both the backend and the frontend together.

### Option 2 — Start manually

**Step 1: Start the FastAPI backend**
```bat
cd python-backend
python -m uvicorn main:app --host 0.0.0.0 --port 4000 --reload
```

**Step 2: Start the React frontend** (new terminal)
```bat
cd my-essential-tool-main
npm run dev
```

**Step 3: Open in browser**
```
http://localhost:5173
```

> ⚠️ MongoDB must be running locally on port `27017` before starting the backend. Start it with `mongod` or via MongoDB Compass.

---

## Data Flow

```
User opens dashboard
       │
       ▼
React page loads → useQuery() fires fetch()
       │
       ▼
GET http://localhost:4000/api/products
GET http://localhost:4000/api/assortment
       │
       ▼
FastAPI reads from MongoDB collections
       │
       ▼
JSON response → React renders KPI cards + charts
```

All data is fetched on page load using **TanStack Query** (`useQuery`), which:
- Caches results in memory to avoid redundant network calls.
- Automatically refetches when the component re-mounts.
- Uses unique `queryKey` arrays (e.g., `["products-overview"]`) to identify each request.

---

## MongoDB Collections

| Collection | Purpose |
|---|---|
| `products` | Master product catalogue — price, margin, elasticity, category |
| `pricing_records` | Historical pricing data — revenue, units sold, competitor prices |
| `promotions` | Promotion history — discount %, ROI, revenue lift, cannibalization |
| `assortment_data` | SKU channel performance — revenue, growth, market share, recommendation |
| `demand_forecasts` | Actual + predicted demand per product per month |
| `event_calendar` | Upcoming events/holidays (synced from Google Calendar) |

---

## Dashboard Modules

---

### 1. Executive Overview

**Route:** `/` (home page)  
**File:** `src/pages/Index.tsx`

The landing page gives a top-level summary of the entire business.

#### KPI Cards

| Card | Formula | Source Collection |
|---|---|---|
| **Avg Price** | Average `current_price` across all products | `products` |
| **Avg Margin** | Average `margin_pct` across all products | `products` |
| **Total Revenue** | Sum of `revenue` across all assortment rows | `assortment_data` |
| **Avg Growth** | Average `revenue_growth_pct` across all assortment rows | `assortment_data` |

#### Revenue by Category Chart

- Joins `products` (for `category`) with `assortment_data` (for `revenue`) on `product_id` / `_id`.
- Groups total revenue by category and renders a **bar chart**.
- Y-axis displays values as `$M` (millions) or `$k` (thousands) depending on scale.

#### Quick Access Panel

- Navigation links to the four main analytics modules: Pricing, Promotions, Assortment, Forecasting.

#### API calls made
```
GET /api/products
GET /api/assortment
```

---

### 2. Pricing

**Route:** `/pricing`  
**File:** `src/pages/Pricing.tsx`

Provides pricing intelligence — current vs. recommended vs. competitor prices, price elasticity, and AI-driven insights.

#### KPI Cards

| Card | Description |
|---|---|
| **Avg Price** | Mean current price across all products |
| **Avg Margin** | Mean margin % across all products |
| **Revenue** | Total revenue summed from `pricing_records` |
| **Net Profit** | Total `net_profit` from pricing records |
| **Loss** | Total `loss_amount` / `total_loss` from pricing records |
| **Price Index** | Average `price_index` (our price ÷ competitor price) |

#### AI Insight Banner

- Shows a text recommendation from `/api/pricing/insight`.
- If the ML pricing model (`ml_pricing.py`) is trained and available, the banner shows **ML model metrics** (train MAE, R²).
- Otherwise it falls back to a **data-driven summary** (e.g., "3 products priced below competitor").

#### Charts

| Chart | Description |
|---|---|
| **Price Elasticity** | Bar chart of `|price_elasticity|` per product — how demand changes with price |
| **Competitor Comparison** | Grouped bar chart: our price vs. competitor price per product |

#### Product Pricing Table

Full table with columns: Product, Category, Current Price, Recommended Price, Competitor Price, Margin %, Elasticity, Net Profit (Recommended), Loss (Recommended), Action (Increase / Decrease / Hold).

- The **Action** badge (`Increase` / `Decrease` / `Hold`) is derived from ML recommendations if available, otherwise from the price delta.

#### API calls made
```
GET /api/products
GET /api/pricing-records
GET /api/pricing/insight
```

---

### 3. Promotions

**Route:** `/promotions`  
**File:** `src/pages/Promotions.tsx`

Manage and simulate promotions, track ROI, and plan for upcoming calendar events.

#### KPI Cards

| Card | Description |
|---|---|
| **Avg ROI** | Mean ROI across all stored promotions |
| **Avg Revenue Lift** | Mean `revenue_lift_pct` across promotions |
| **Promo Profit** | Total `incremental_profit` / `net_profit` across promotions |
| **Promo Loss** | Total `incremental_loss` / `loss_amount` |
| **Best Promo** | Promotion with highest ROI |
| **Active Promos** | Count of promotions with `status = "active"` |

#### AI Recommendation Banner

- Text from `/api/promotions/recommendation`.
- If ML promotion model is trained: shows ML metrics (ROI MAE, Lift MAE, predicted profit/loss).
- Otherwise: surfaces the best historical promotion by ROI as a recommendation.

#### Scenario Builder (Simulation)

Interactive form to simulate a hypothetical promotion **before running it**:

| Input | Description |
|---|---|
| Discount % | Slider 5–50% |
| Duration | Number of days |
| Channel | Retail / Foodservice / E-commerce |
| Product Category | Dynamically populated from `products` collection |
| Region | Dynamically populated from `products` collection |
| Promo Type | % Off / BOGO / Bundle |
| Budget ($) | Total spend budget |

Clicking **Run Simulation** calls `POST /api/promotions/simulate` and appends results to a comparison table showing: predicted Revenue Lift %, ROI, Cannibalization %, Incremental Profit, Incremental Loss.

> If ML is available (`ml_promotion.py`), the simulation uses the trained model. Otherwise it uses a rule-based heuristic.

#### Upcoming Holidays Panel

- Lists upcoming events from the `event_calendar` MongoDB collection.
- Events are synced from **Google Calendar** via `POST /api/promotions/sync-google-calendar`.
- The **Sync Now** button triggers a live sync from the Google Calendar API using the `GOOGLE_CALENDAR_IDS` and `GOOGLE_CALENDAR_API_KEY` env variables.
- For each upcoming event, references the best past promotion that ran on the same event (by `event_name`) to suggest a tactic.

#### Historical Promotion Performance Chart

Bar chart showing ROI and Revenue Lift % per historical promotion.

#### API calls made
```
GET  /api/promotions
GET  /api/promotions/upcoming
GET  /api/promotions/recommendation
GET  /api/products
POST /api/promotions/simulate        ← on "Run Simulation" click
POST /api/promotions/sync-google-calendar  ← on "Sync Now" click
```

---

### 4. Assortment

**Route:** `/assortment`  
**File:** `src/pages/Assortment.tsx`

SKU-level performance analysis with AI/ML-driven add/keep/delist recommendations.

#### KPI Cards

| Card | Description |
|---|---|
| **Total Revenue** | Sum of `revenue` across all assortment items |
| **Net Profit** | Sum of `net_profit` across items |
| **Loss** | Sum of `loss_amount` across items |
| **Avg Growth** | Average `revenue_growth_pct` |
| **Add Recs** | Count of items with `recommendation = "add"` |
| **Delist Recs** | Count of items with `recommendation = "delist"` |

ML coverage stats are shown below the heading:
- **ML recommendation coverage**: how many rows used the ML model vs. rule-based.
- **Avg confidence**: average `recommendation_confidence` score from the ML model.

#### Charts

| Chart | Description |
|---|---|
| **SKU Performance Matrix** | Scatter plot: X = Revenue ($K), Y = Growth % — reveals stars, cash cows, and laggards by position |
| **Category Mix** | Pie chart of `category_mix_pct` per product — portfolio composition |

#### SKU Recommendations Table

Full table per assortment row:

| Column | Source Field |
|---|---|
| Product | `productName` (joined from `products`) |
| Channel | `channel` |
| Revenue | `revenue` |
| Net Profit | `net_profit` |
| Loss | `loss_amount` |
| Growth | `revenue_growth_pct` |
| Market Share | `market_share_pct` |
| Mix % | `category_mix_pct` |
| Confidence | `recommendation_confidence` (ML only) |
| Recommendation | `recommendation` badge: **ADD** / **KEEP** / **DELIST** / **REVIEW** |

> Recommendation logic: if ML assortment model (`ml_assortment.py`) is trained with ≥6 items and ≥2 classes, it produces ML recommendations with confidence scores. Otherwise stored `recommendation` values are used directly.

#### API calls made
```
GET /api/assortment
```

---

### 5. Forecasting

**Route:** `/forecasting`  
**File:** `src/pages/Forecasting.tsx`

ML-only demand forecasting for individual products, with accuracy metrics and trend decomposition.

#### Product Selector

Dropdown populated from `GET /api/products`. Changing the selection reloads the forecast data for that product.

#### KPI Cards

| Card | Description |
|---|---|
| **MAPE** | Mean Absolute Percentage Error — forecast accuracy (lower = better) |
| **RMSE** | Root Mean Square Error across historical predictions |
| **Forecast Horizon** | Number of future months in the forecast |
| **Data Points** | Number of historical actual demand months available |
| **Forecast Revenue** | Sum of `predicted_revenue` across forecast months |
| **Forecast Profit** | Sum of `predicted_profit` across forecast months |
| **Forecast Loss** | Sum of `predicted_loss` across forecast months |

#### ML Status

- If `GET /api/health` returns `{ mlAvailable: true }`, the **Recalculate forecast** button is enabled.
- Clicking it calls `POST /api/forecasts/generate` with `{ productId, useMl: true }`, which trains/runs the ML model and saves new forecast rows to `demand_forecasts`.
- If ML is unavailable, a warning is shown: _"ML backend unavailable. Start python-backend to recalculate forecasts."_

#### Charts

| Chart | Description |
|---|---|
| **Actual vs Forecast** | Line chart: solid line = actual demand, dashed line = ML predictions. Future months show only the predicted line. |
| **Seasonality Index** | Area chart of `seasonality_index` per month — shows recurring seasonal patterns |
| **Trend Component** | Line chart of `trend_component` — long-term underlying growth/decline trend |

> MAPE and RMSE are computed **on the frontend** from historical rows (`is_forecast: false`) by comparing `actual_demand` vs `predicted_demand`.

#### API calls made
```
GET  /api/health
GET  /api/products
GET  /api/forecasts?productId=<id>
POST /api/forecasts/generate          ← on "Recalculate" click
```

---

## API Endpoints Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Backend health + ML capability flags |
| `GET` | `/api/products` | All products |
| `GET` | `/api/pricing-records` | Historical pricing records (sorted by date) |
| `GET` | `/api/pricing/insight` | AI/ML pricing recommendation |
| `GET` | `/api/promotions` | All promotions |
| `GET` | `/api/promotions/upcoming` | Upcoming calendar events with promo context |
| `GET` | `/api/promotions/recommendation` | AI/ML best promotion recommendation |
| `POST` | `/api/promotions/simulate` | Simulate a promotion scenario |
| `POST` | `/api/promotions/sync-google-calendar` | Sync Google Calendar events to MongoDB |
| `GET` | `/api/assortment` | Assortment data with ML recommendations |
| `GET` | `/api/forecasts?productId=<id>` | Demand forecasts for a product |
| `POST` | `/api/forecasts/generate` | Run ML forecast generation |

Full interactive API docs available at: **`http://localhost:4000/docs`** (Swagger UI)

---

## Environment Variables

Located in `my-essential-tool-main/.env`:

```env
# MongoDB (used by the FastAPI backend)
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DB=rgm_tool_prod

# Backend port
PORT=4000

# Frontend — base URL for all API calls
VITE_API_BASE_URL=http://localhost:4000

# Google Calendar integration (optional, for Promotions calendar sync)
GOOGLE_CALENDAR_IDS=en-gb.indian#holiday@group.v.calendar.google.com
GOOGLE_CALENDAR_API_KEY=<your-google-api-key>
GOOGLE_CALENDAR_SYNC_ON_READ=true
```

---

## Seeding Sample Data

The MongoDB collections are **empty by default**. Use the playground scripts in the root to insert data:

### Option 1 — MongoDB Compass or mongosh

Open `playground-1.mongodb.js` in MongoDB Compass (or run with `mongosh`) to insert:
- 3 sample products (Sparkling Water, Energy Drink, Family Cookies)
- Pricing records, promotions, assortment data, demand forecasts

```bash
mongosh "mongodb://127.0.0.1:27017/rgm_tool_prod" playground-1.mongodb.js
```

### Option 2 — Additional playground files

| File | Contents |
|---|---|
| `playground-1.mongodb.js` | Core sample data across all collections |
| `playground-2.mongodb.js` | Additional products and records |
| `playground-6.mongodb.js` | Extended promotion and forecast data |

> After seeding, refresh the dashboard — KPI cards and charts will populate with real data.

---

## Authentication

The application uses a **mock/local authentication** stored in `localStorage` (no external auth service):

- **Sign In**: Any email + password combination works. The email is saved to `localStorage` under the key `rgm_mock_auth`.
- **Sign Out**: Clears `localStorage` and redirects to `/auth`.
- **Protected routes**: All dashboard pages are wrapped in `ProtectedLayout`, which checks for a stored session and redirects to `/auth` if not found.

This is suitable for local demo use. For production, replace `useAuth.tsx` with a real auth provider (JWT, OAuth, etc.).

---

## Troubleshooting

### Dashboard shows "Cannot reach the backend"
→ The FastAPI server is not running. Start it:
```bat
cd python-backend
python -m uvicorn main:app --port 4000 --reload
```

### KPIs all show $0.00 / 0.0%
→ MongoDB collections are empty. Seed data using the playground files (see [Seeding Sample Data](#seeding-sample-data)).

### Forecasting "Recalculate" button is disabled
→ ML backend is unavailable. Ensure `ml_forecast.py` dependencies are installed:
```bat
cd python-backend
pip install -r requirements.txt
```

### Google Calendar events not loading
→ Check that `GOOGLE_CALENDAR_IDS` and `GOOGLE_CALENDAR_API_KEY` are set in `.env`. Click **Sync Now** on the Promotions page.

### Port conflict
→ Change `PORT` in `.env` and update `VITE_API_BASE_URL` to match.
