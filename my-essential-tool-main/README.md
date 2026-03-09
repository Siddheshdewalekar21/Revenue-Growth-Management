# Revenue Growth Management (RGM) System

A full-stack AI-powered Revenue Growth Management platform with ML-driven pricing, promotions, assortment, and demand forecasting.

---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite, TypeScript, Recharts, TanStack Query, Tailwind CSS |
| **Backend** | Python 3.11+, FastAPI, Uvicorn |
| **ML Models** | scikit-learn (RandomForest, Ridge), NumPy |
| **Database** | MongoDB Atlas (cloud) or local MongoDB |

---

## 🚀 Quick Start

### 1. Start the Backend

```powershell
cd my-essential-tool-main/python-backend

# Install dependencies (first time only)
pip install -r requirements.txt

# (Optional) Seed the database with realistic demo data
python seed_data.py

# Start the API server
uvicorn main:app --port 4000 --reload
```

Backend will be live at: **http://localhost:4000**  
Interactive API docs: **http://localhost:4000/docs**

---

### 2. Start the Frontend

```powershell
cd my-essential-tool-main

# Install dependencies (first time only)
npm install

# Start dev server
npm run dev
```

Frontend will be live at: **http://localhost:8080**

---

## 📊 Data Setup

The system uses **MongoDB** storing these collections:

| Collection | Purpose |
|---|---|
| `products` | Product catalog with pricing & elasticity |
| `pricing_records` | Historical price/revenue/profit data (ML training) |
| `promotions` | Historical promotion performance (ML training) |
| `demand_forecasts` | Historical + ML-generated demand forecasts |
| `assortment_data` | SKU performance & add/keep/delist data |
| `event_calendar` | Upcoming events from Google Calendar sync |

### Seed demo data
```bash
python seed_data.py
# OR via API endpoint:
curl -X POST http://localhost:4000/api/seed
```

---

## 🔌 API Endpoints Reference

### Core
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Backend health + DB connectivity + ML status |
| GET | `/api/stats` | Document counts per collection |
| GET | `/api/dashboard/summary` | All KPIs in a single request |

### Products
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/products` | List all products |
| POST | `/api/products` | Create a product |
| PUT | `/api/products/{id}` | Update a product |
| PATCH | `/api/products/{id}/price` | Update price only |
| DELETE | `/api/products/{id}` | Delete a product |

### Pricing
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/pricing-records` | Historical pricing data |
| GET | `/api/pricing/insight` | ML pricing recommendations |

### Promotions
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/promotions` | Historical promotions |
| POST | `/api/promotions` | Create a promotion |
| DELETE | `/api/promotions/{id}` | Delete a promotion |
| GET | `/api/promotions/recommendation` | ML recommendation |
| POST | `/api/promotions/simulate` | Simulate a scenario |
| GET | `/api/promotions/upcoming` | Upcoming events |
| POST | `/api/promotions/sync-google-calendar` | Sync calendar |

### Forecasting
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/forecasts?productId=...` | Demand forecasts |
| POST | `/api/forecasts/generate` | Generate ML forecast |

### Assortment
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/assortment` | SKU recommendations (ML-enhanced) |

---

## 🤖 ML Models

All ML features require sufficient historical data:

| Feature | Model | Min Training Data |
|---|---|---|
| **Demand Forecasting** | Ridge Regression + Polynomial Features | 2 historical points |
| **Pricing** | Random Forest Regressor | 8 pricing records |
| **Promotions** | Random Forest (ROI + Lift + Profit + Loss) | 5 promotions |
| **Assortment** | Random Forest Classifier | 6 assortment rows, 2 classes |

Run `python seed_data.py` to populate sufficient training data for all ML models.

---

## ⚙️ Environment Variables

Edit `my-essential-tool-main/python-backend/.env`:

```env
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/rgm_tool_prod
MONGODB_DB=rgm_tool_prod
PORT=4000
VITE_API_BASE_URL=http://localhost:4000
GOOGLE_CALENDAR_IDS=en.indian#holiday@group.v.calendar.google.com
GOOGLE_CALENDAR_API_KEY=<your-google-api-key>
GOOGLE_CALENDAR_SYNC_ON_READ=true
```

Edit `my-essential-tool-main/.env` (or `.env.local`):
```env
VITE_API_BASE_URL=http://localhost:4000
```
