# 📊 RGM Platform — Revenue Growth Management System

<div align="center">

![RGM Platform](https://img.shields.io/badge/RGM-Platform-4F46E5?style=for-the-badge&logo=chartdotjs&logoColor=white)
![React](https://img.shields.io/badge/React_18-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)
![Python](https://img.shields.io/badge/Python_3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white)

**An AI-driven, full-stack platform for smarter pricing, promotions, assortment, and demand forecasting decisions.**

</div>

---

## 🚀 What is RGM?

**Revenue Growth Management (RGM)** is a commercial strategy used by FMCG, retail, and CPG companies to maximize revenue by optimizing four core levers:

| Lever | Question it answers |
|---|---|
| 💰 **Pricing** | What is the right price to maximize margin without losing volume? |
| 🎪 **Promotions** | Which discount, channel, and duration will yield the best ROI? |
| 📦 **Assortment** | Which SKUs should we grow, maintain, or remove from the portfolio? |
| 📈 **Forecasting** | How much demand should we plan for next quarter? |

This platform brings all four into **one AI-powered dashboard** — with machine learning models, interactive simulators, and real-time data from MongoDB.

---

## ✨ Features

- 📊 **Executive Dashboard** — Live KPI cards (Revenue, Net Profit, Loss, Active Promos) + category revenue chart + DB health
- 💰 **Pricing Dashboard** — AI pricing insight, price elasticity chart, competitor comparison, sortable product table with detail modals, CSV export
- 🎪 **Promotion Simulator** — Configure discount %, duration, channel, budget → predict ROI, lift, cannibalization **before spending a penny**
- 📅 **Google Calendar Integration** — Sync upcoming holidays/events to plan promotions around real-world calendar
- 📦 **Assortment Analysis** — SKU performance scatter matrix, category mix pie chart, ML-driven Add / Keep / Review / Delist with confidence scores
- 📈 **Demand Forecasting** — ML-based demand prediction, Actual vs Forecast chart, seasonality index, accuracy gauge
- 🤖 **AI Assistant** — Floating chat widget available on every page
- 🔄 **ML ↔ Rule-based fallback** — All AI features gracefully fall back to data-driven logic when training data is insufficient
- 🗄️ **Seed DB button** — Repopulate the database with rich demo data in one click from the dashboard
- 🔐 **Auth** — Session-based authentication with protected routes

---

## 🛠 Tech Stack

### Frontend
| Technology | Role |
|---|---|
| React 18 + TypeScript | UI framework |
| Vite | Build tool & dev server |
| Tailwind CSS + shadcn/ui | Styling & component library |
| TanStack Query (React Query) | Data fetching & caching |
| Recharts | Charts & data visualizations |
| React Router v6 | Client-side routing |
| Framer Motion | Animations |

### Backend
| Technology | Role |
|---|---|
| FastAPI (Python) | REST API server |
| Uvicorn | ASGI production server |
| pymongo | MongoDB driver |
| scikit-learn | ML models |
| python-dotenv | Environment configuration |

### Database & Services
| Technology | Role |
|---|---|
| MongoDB (Atlas or local) | Primary database |
| Google Calendar API | Sync events for promotion planning |

---

## 📋 Prerequisites

Make sure the following are installed **before** starting:

| Tool | Minimum Version | Download |
|---|---|---|
| **Node.js** | v18+ | https://nodejs.org/ |
| **Python** | 3.10+ | https://www.python.org/ |
| **MongoDB** | Atlas (cloud) or 7.0 local | https://www.mongodb.com/ |
| **Git** | any | https://git-scm.com/ |

> **Windows users:** When installing Python, tick **"Add Python to PATH"**.

---

## ⚡ Setup Guide

### Step 1 — Clone the repository

```bash
git clone https://github.com/Siddheshdewalekar21/Revenue-Growth-Management.git
cd Revenue-Growth-Management
```

---

### Step 2 — Configure environment variables

All configuration lives in one `.env` file inside `my-essential-tool-main/`:

```bash
# Open the file (it already exists)
# my-essential-tool-main/python-backend/.env
```

Edit these values:

```env
# ── MongoDB ─────────────────────────────────────────────
# Atlas (cloud) — recommended:
MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/rgm_tool_prod

# OR local MongoDB:
MONGODB_URI=mongodb://127.0.0.1:27017

MONGODB_DB=rgm_tool_prod

# ── Backend ─────────────────────────────────────────────
PORT=4000

# ── Frontend ────────────────────────────────────────────
VITE_API_BASE_URL=http://localhost:4000

# ── Google Calendar (optional) ──────────────────────────
# Adds Indian holidays to the Promotions calendar view
GOOGLE_CALENDAR_IDS=en-gb.indian#holiday@group.v.calendar.google.com
GOOGLE_CALENDAR_API_KEY=your-google-api-key-here
GOOGLE_CALENDAR_SYNC_ON_READ=true
```

> **MongoDB Atlas users:** The default `.env` already points to a shared demo cluster. Change the URI to your own project if needed.

---

### Step 3 — Choose your setup method

---

#### 🟢 Option A — One-click Windows setup *(easiest)*

Simply double-click the batch scripts in the **root** folder:

```
1. Double-click  setup.bat       ← installs all dependencies (run once)
2. Double-click  start.bat       ← starts backend + frontend + seeds DB
```

That's it. Both servers will start in the same window.

To restart **without** re-seeding the database:
```
Double-click  start-no-seed.bat
```

---

#### 🔵 Option B — Single npm command

```powershell
cd my-essential-tool-main

# First time — install Node deps + create Python venv + install Python deps
npm install
cd python-backend
python -m venv .venv
.venv\Scripts\pip install -r requirements.txt
cd ..

# Start everything (seeds DB + backend + frontend)
npm run dev:all

# Start everything WITHOUT re-seeding
npm run dev:all:no-seed
```

---

#### 🟡 Option C — Manual (two terminals)

**Terminal 1 — Backend**
```powershell
cd my-essential-tool-main/python-backend

# First time only — create virtual environment
python -m venv .venv
.venv\Scripts\activate

# First time only — install Python packages
pip install -r requirements.txt

# Start the API server
uvicorn main:app --host 0.0.0.0 --port 4000 --reload
```

**Terminal 2 — Frontend**
```powershell
cd my-essential-tool-main

# First time only
npm install

# Start Vite dev server
npm run dev
```

---

### Step 4 — Seed the database

The database needs demo data for ML models to work. You have **3 ways** to seed it:

#### Option A — Seed button on Dashboard *(easiest)*
Open the app → click the **"Seed DB"** button on the top-right of the dashboard.

#### Option B — Python script
```powershell
cd my-essential-tool-main/python-backend
.venv\Scripts\python seed_data.py
```

#### Option C — Node.js script (used by `dev:all`)
```powershell
cd my-essential-tool-main
npm run seed:mongo
```

#### Option D — API endpoint
```bash
curl -X POST http://localhost:4000/api/seed
```

> The Python `seed_data.py` generates the **richest dataset** — 15 products, 180 pricing records, 30 promotions, 360 demand forecasts, 30+ assortment rows — fully satisfying all ML model training requirements.

---

### Step 5 — Open in browser

| Service | URL |
|---|---|
| **Frontend App** | http://localhost:8080 |
| **Backend API Docs** | http://localhost:4000/docs |
| **Health Check** | http://localhost:4000/api/health |

Log in with the credentials in your MongoDB `users` collection (or register via the Auth page).

---

## 📁 Project Structure

```
Revenue-Growth-Management-RGM-System/
│
├── setup.bat                        ← Windows: run once to install everything
├── start.bat                        ← Windows: start all services (with seed)
├── start-no-seed.bat                ← Windows: start all services (no seed)
├── verify-setup.bat                 ← Windows: check environment health
│
└── my-essential-tool-main/          ← Main application root
    │
    ├── package.json                 ← npm scripts
    ├── .env                         ← (create from .env.example)
    │
    ├── scripts/
    │   └── run-all.mjs              ← Powers `npm run dev:all`
    │
    ├── server/scripts/
    │   └── seedMongo.js             ← Node.js seed (used by dev:all)
    │
    ├── src/                         ← React frontend
    │   ├── pages/
    │   │   ├── Index.tsx            ← Executive dashboard
    │   │   ├── Pricing.tsx          ← Pricing analysis
    │   │   ├── Promotions.tsx       ← Promotion simulator
    │   │   ├── Assortment.tsx       ← Assortment analysis
    │   │   ├── Forecasting.tsx      ← Demand forecasting
    │   │   └── Auth.tsx             ← Login / register
    │   │
    │   ├── components/
    │   │   ├── KPICard.tsx          ← Reusable KPI metric card
    │   │   ├── AppSidebar.tsx       ← Navigation sidebar
    │   │   ├── AIAssistant.tsx      ← Floating AI chat widget
    │   │   └── ProtectedLayout.tsx  ← Auth guard
    │   │
    │   └── hooks/
    │       └── useAuth.tsx          ← Authentication context
    │
    └── python-backend/              ← FastAPI backend
        ├── main.py                  ← All REST endpoints
        ├── ml_pricing.py            ← Pricing ML model (RandomForest)
        ├── ml_promotion.py          ← Promotion ML model (RandomForest)
        ├── ml_assortment.py         ← Assortment classifier (RandomForest)
        ├── ml_forecast.py           ← Demand forecasting (Ridge regression)
        ├── seed_data.py             ← Python rich data seed script
        ├── model_monitoring.py      ← Model drift & performance tracking
        ├── management_api.py        ← A/B testing & rollout control APIs
        ├── requirements.txt
        └── .venv/                   ← Python virtual environment (git-ignored)
```

---

## 🧩 npm Scripts Reference

Run all commands from the `my-essential-tool-main/` directory.

| Script | What it does |
|---|---|
| `npm run dev` | Start Vite frontend only (port 8080) |
| `npm run dev:all` | **Seed DB + start backend + start frontend** (all-in-one) |
| `npm run dev:all:no-seed` | Start backend + frontend, **skip seeding** |
| `npm run server` | Start Python FastAPI backend only (port 4000) |
| `npm run seed:mongo` | Run Node.js MongoDB seed script |
| `npm run build` | Production build |
| `npm run lint` | ESLint check |
| `npm run test` | Run Vitest tests |

---

## 📡 API Reference

All endpoints served at `http://localhost:4000`. Interactive docs at **`/docs`**.

### System
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health check + DB connectivity + ML status |
| `GET` | `/api/stats` | Document counts per collection |
| `GET` | `/api/dashboard/summary` | All KPIs in a single request |
| `POST` | `/api/seed` | Re-seed database with demo data |

### Products
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/products` | List all products |
| `POST` | `/api/products` | Create a product |
| `PUT` | `/api/products/{id}` | Update a product |
| `PATCH` | `/api/products/{id}/price` | Update price only |
| `DELETE` | `/api/products/{id}` | Delete a product |

### Pricing
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/pricing-records` | Historical pricing data |
| `GET` | `/api/pricing/insight` | ML pricing recommendations |

### Promotions
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/promotions` | Historical promotions |
| `POST` | `/api/promotions` | Create a promotion |
| `DELETE` | `/api/promotions/{id}` | Delete a promotion |
| `GET` | `/api/promotions/recommendation` | ML recommendation |
| `POST` | `/api/promotions/simulate` | Simulate a scenario |
| `GET` | `/api/promotions/upcoming` | Upcoming calendar events |
| `POST` | `/api/promotions/sync-google-calendar` | Sync Google Calendar |

### Forecasting
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/forecasts?productId=...` | Demand forecasts for a product |
| `POST` | `/api/forecasts/generate` | Generate ML forecast |

### Assortment
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/assortment` | SKU data with ML recommendations |

---

## 🤖 ML Models

All models are trained **on-demand** from MongoDB data. If insufficient data exists, the system **automatically falls back** to rule-based logic — so the app always works.

| Module | Algorithm | Minimum Data Needed |
|---|---|---|
| **Pricing** | Random Forest Regressor | 8+ pricing records with `units_sold` |
| **Promotions** | Random Forest (ROI + Lift + Profit + Loss) | 5+ promotions with `discount_pct` & `duration_days` |
| **Assortment** | Random Forest Classifier | 6+ rows with at least 2 recommendation classes |
| **Forecasting** | Ridge Regression + Polynomial Features | 2+ historical demand points per product |

> Run `python seed_data.py` to populate data that satisfies **all** ML model requirements at once.

---

## 🗃 MongoDB Collections

| Collection | Description |
|---|---|
| `products` | Product catalog — name, category, prices, margin, elasticity, unit cost |
| `pricing_records` | Historical pricing — revenue, units sold, profit, loss, competitor price |
| `promotions` | Promotion history — discount, duration, ROI, lift, cannibalization |
| `assortment_data` | SKU channel performance — revenue, growth, market share, recommendation |
| `demand_forecasts` | Actual + ML predicted demand per product per month |
| `event_calendar` | Upcoming events from Google Calendar sync |

---

## 🔧 Troubleshooting

### ❌ "Backend not reachable" on Dashboard
- Make sure the Python backend is running: `uvicorn main:app --port 4000 --reload`
- Check the `.env` file has `VITE_API_BASE_URL=http://localhost:4000`
- Visit http://localhost:4000/api/health — if it shows JSON, the backend is working

### ❌ "Failed to activate virtual environment"
```powershell
# PowerShell execution policy issue — run:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Then retry:
cd my-essential-tool-main/python-backend
.venv\Scripts\activate
```

### ❌ ML features showing "ML Unavailable"
The ML models need enough training data. Run the seed script:
```powershell
cd my-essential-tool-main/python-backend
.venv\Scripts\python seed_data.py
```
Or click the **"Seed DB"** button on the dashboard.

### ❌ `npm run dev:all` fails at seed step
The Node seed script requires a valid `MONGODB_URI` in `.env`. Check:
1. `.env` exists in `my-essential-tool-main/`
2. `MONGODB_URI` is correct and MongoDB is reachable
3. If using Atlas, ensure your IP is whitelisted

### ❌ Port already in use
```powershell
# Kill process on port 4000 (backend)
netstat -ano | findstr :4000
taskkill /PID <pid> /F

# Kill process on port 8080 (frontend)
netstat -ano | findstr :8080
taskkill /PID <pid> /F
```

### ❌ `ModuleNotFoundError` in Python
Virtual environment not active or packages not installed:
```powershell
cd my-essential-tool-main/python-backend
python -m venv .venv          # recreate if needed
.venv\Scripts\activate
pip install -r requirements.txt
```

---

## 📄 License

This project is for educational and demonstration purposes.

---

<div align="center">

Built with ❤️ using **React**, **FastAPI**, **MongoDB**, and **scikit-learn**

⭐ Star this repo if you found it useful!

</div>
