# 📊 RGM Platform — Revenue Growth Management System

<div align="center">

![RGM Platform](https://img.shields.io/badge/RGM-Platform-4F46E5?style=for-the-badge&logo=chartdotjs&logoColor=white)
![React](https://img.shields.io/badge/React_18-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)
![Python](https://img.shields.io/badge/Python_3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white)

**An AI-driven, full-stack platform for smarter pricing, promotions, assortment, and demand forecasting decisions.**

[Features](#-features) · [Tech Stack](#-tech-stack) · [Getting Started](#-getting-started) · [Project Structure](#-project-structure) · [Screenshots](#-dashboard-pages) · [API Docs](#-api-reference)

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

- 📊 **Executive Overview** — Live KPI cards (Avg Price, Margin, Revenue, Growth) + Revenue by Category chart
- 💰 **Pricing Dashboard** — AI insight, price elasticity analysis, competitor pricing comparison, action recommendations
- 🎪 **Promotion Simulator** — Configure discount %, duration, channel, budget → get predicted ROI, revenue lift, cannibalization risk **before running the promotion**
- 📅 **Google Calendar Integration** — Sync upcoming holidays/events to plan promotions around real-world calendar
- 📦 **Assortment Analysis** — SKU performance scatter matrix, category mix, AI-driven Add / Keep / Review / Delist recommendations with confidence scores
- 📈 **Demand Forecasting** — ML-based demand prediction, Actual vs Forecast chart, seasonality index, trend decomposition, MAPE/RMSE accuracy metrics
- 🤖 **AI Assistant** — Floating chat widget available on every page
- 🔄 **ML ↔ Rule-based fallback** — All AI features gracefully fall back to data-driven logic when ML models are not yet trained
- 🔐 **Auth** — Session-based authentication with protected routes

---

## 🛠 Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| **React 18 + TypeScript** | UI framework |
| **Vite** | Build tool & dev server |
| **Tailwind CSS** | Styling |
| **shadcn/ui + Radix UI** | Component library |
| **TanStack Query (React Query)** | Data fetching & caching |
| **Recharts** | Charts & visualizations |
| **React Router v6** | Client-side routing |
| **Framer Motion** | Animations |

### Backend
| Technology | Purpose |
|---|---|
| **FastAPI (Python)** | REST API server |
| **pymongo** | MongoDB client |
| **scikit-learn** | ML models (pricing, promotions, assortment, forecasting) |
| **uvicorn** | ASGI server |
| **python-dotenv** | Environment configuration |

### Database & Services
| Technology | Purpose |
|---|---|
| **MongoDB** | Primary database (`rgm_tool_prod`) |
| **Google Calendar API** | Sync upcoming events/holidays for promotion planning |

---

## 🏗 Project Structure

```
Revenue-Growth-Management-RGM-System/
│
├── my-essential-tool-main/          # Main application
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Index.tsx            # Executive Overview dashboard
│   │   │   ├── Pricing.tsx          # Pricing analysis
│   │   │   ├── Promotions.tsx       # Promotion simulator
│   │   │   ├── Assortment.tsx       # Assortment analysis
│   │   │   ├── Forecasting.tsx      # Demand forecasting
│   │   │   └── Auth.tsx             # Login page
│   │   ├── components/
│   │   │   ├── KPICard.tsx          # Reusable KPI metric card
│   │   │   ├── AppSidebar.tsx       # Navigation sidebar
│   │   │   ├── AIAssistant.tsx      # Floating AI chat widget
│   │   │   └── ProtectedLayout.tsx  # Auth guard wrapper
│   │   └── hooks/
│   │       └── useAuth.tsx          # Authentication context
│   │
│   ├── python-backend/
│   │   ├── main.py                  # FastAPI app + all REST endpoints
│   │   ├── ml_pricing.py            # ML pricing recommendation model
│   │   ├── ml_promotion.py          # ML promotion simulation model
│   │   ├── ml_assortment.py         # ML assortment classification model
│   │   ├── ml_forecast.py           # ML demand forecasting model
│   │   ├── model_monitoring.py      # Model performance tracking
│   │   └── requirements.txt
│   │
│   ├── .env                         # Environment variables
│   └── package.json
│
├── playground-1.mongodb.js          # Sample data seed scripts
├── playground-2.mongodb.js
├── start.bat                        # One-click startup script
└── README.md
```

---

## ⚡ Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [Python](https://www.python.org/) 3.10+
- [MongoDB](https://www.mongodb.com/try/download/community) running locally on port `27017`

---

### 1. Clone the repository

```bash
git clone https://github.com/Siddheshdewalekar21/Revenue-Growth-Management.git
cd Revenue-Growth-Management/my-essential-tool-main
```

---

### 2. Set up environment variables

Copy `.env` and fill in your values (defaults work for local dev):

```env
# MongoDB
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DB=rgm_tool_prod

# Backend
PORT=4000

# Frontend
VITE_API_BASE_URL=http://localhost:4000

# Google Calendar (optional — for Promotions calendar sync)
GOOGLE_CALENDAR_IDS=your-calendar-id@group.calendar.google.com
GOOGLE_CALENDAR_API_KEY=your-google-api-key
GOOGLE_CALENDAR_SYNC_ON_READ=true
```

---

### 3. Install frontend dependencies

```bash
npm install
```

---

### 4. Set up Python backend

```bash
cd python-backend
python -m venv .venv

# Windows
.venv\Scripts\activate

# Mac/Linux
source .venv/bin/activate

pip install -r requirements.txt
```

---

### 5. Seed the database with sample data

Open MongoDB Compass or `mongosh` and run the playground scripts:

```bash
mongosh "mongodb://127.0.0.1:27017/rgm_tool_prod" ../playground-1.mongodb.js
```

---

### 6. Start the application

**Option A — One command (recommended):**
```bash
# From the my-essential-tool-main directory
npm run dev:all
```

**Option B — Manually (two terminals):**

Terminal 1 — Backend:
```bash
cd python-backend
python -m uvicorn main:app --host 0.0.0.0 --port 4000 --reload
```

Terminal 2 — Frontend:
```bash
npm run dev
```

---

### 7. Open in browser

```
http://localhost:5173
```

Log in with any email and password (demo mode). FastAPI docs available at `http://localhost:4000/docs`.

---

## 📸 Dashboard Pages

### 🏠 Executive Overview
> Bird's-eye view of Avg Price, Avg Margin, Total Revenue, and Avg Growth with a Revenue by Category chart.

### 💰 Pricing Dashboard
> Price elasticity chart, competitor comparison, AI pricing insight, and product-level action recommendations (Increase / Hold / Decrease).

### 🎪 Promotion Simulator
> Configure a promotion scenario and instantly predict ROI, revenue lift %, cannibalization risk, and incremental profit — before spending a rupee.

### 📦 Assortment Analysis
> SKU performance scatter matrix (Revenue vs Growth), category mix pie chart, and AI-powered Add / Keep / Review / Delist recommendations.

### 📈 Demand Forecasting
> ML demand forecast with Actual vs Predicted chart, MAPE/RMSE accuracy, seasonality index, and trend decomposition.

---

## 📡 API Reference

All endpoints are served at `http://localhost:4000`. Full Swagger docs at **`/docs`**.

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Backend health + ML capability flags |
| `GET` | `/api/products` | All products |
| `GET` | `/api/pricing-records` | Historical pricing records |
| `GET` | `/api/pricing/insight` | AI pricing recommendation |
| `GET` | `/api/promotions` | All promotions |
| `GET` | `/api/promotions/upcoming` | Upcoming calendar events with promotion context |
| `GET` | `/api/promotions/recommendation` | AI promotion strategy recommendation |
| `POST` | `/api/promotions/simulate` | Simulate a promotion scenario |
| `POST` | `/api/promotions/sync-google-calendar` | Sync Google Calendar events |
| `GET` | `/api/assortment` | Assortment data with ML recommendations |
| `GET` | `/api/forecasts?productId=<id>` | Demand forecasts for a product |
| `POST` | `/api/forecasts/generate` | Run ML forecast generation |

---

## 🧠 ML Models

All ML models use **scikit-learn** and are trained on-demand from the MongoDB data. If insufficient data is available, the system **automatically falls back** to rule-based logic — so the platform always works.

| Module | Algorithm | Inputs | Outputs |
|---|---|---|---|
| Pricing | Gradient Boosting / Linear Regression | Price, elasticity, competitor price, history | Recommended price, predicted profit/loss |
| Promotion | Random Forest Regressor | Discount %, duration, channel, category | Predicted ROI, revenue lift, cannibalization |
| Assortment | Random Forest Classifier | Revenue, growth, market share, mix % | Add / Keep / Review / Delist + confidence |
| Forecasting | Time-series decomposition + ML | Historical demand, seasonality, trend | Predicted demand (N months ahead) |

---

## 🗃 MongoDB Collections

| Collection | Description |
|---|---|
| `products` | Product master — name, category, price, margin, elasticity |
| `pricing_records` | Historical pricing — revenue, units sold, competitor price per date |
| `promotions` | Promotion history — discount, ROI, revenue lift, cannibalization |
| `assortment_data` | SKU channel performance — revenue, growth, market share, recommendation |
| `demand_forecasts` | Actual + ML predicted demand per product per month |
| `event_calendar` | Upcoming events synced from Google Calendar |

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m "Add your feature"`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

---

## 📄 License

This project is for educational and demonstration purposes.

---

<div align="center">

Built with ❤️ using **React**, **FastAPI**, **MongoDB**, and **scikit-learn**

⭐ Star this repo if you found it useful!

</div>
