# RGM System – AI-Driven Revenue Growth Management

AI-driven RGM leverages ML to optimize **pricing**, **promotions**, **assortment**, and **revenue strategy** for CPG and Foodservice.

## AI/ML in this project

The app is framed as **AI-driven RGM** in docs and UI. **ML is used today for demand forecasting** (Python backend: `python-backend/ml_forecast.py` and “Use ML model” on the Forecasting page). The rest (pricing insight, promotion recommendation, assortment) is **data-driven / ML-informed** and ready for more AI/ML (e.g. pricing or promotion models) when you add them. See `docs/AI_AND_ML_IN_RGM.md`.

## Tech stack

- **Frontend:** Vite, TypeScript, React, React Router, TanStack Query, shadcn-ui, Tailwind CSS, Recharts
- **Backend:** Python, FastAPI (REST API on port 4000)
- **Data:** MongoDB (products, pricing, promotions, event_calendar, assortment, demand_forecasts)
- **Auth:** Supabase (email/password)

## Getting started

**Requirements:** Node.js, npm, Python 3.10+, MongoDB (local or cloud).

```sh
# Install dependencies
npm i

# Install Python backend dependencies (first time only)
cd python-backend
python -m venv .venv
.venv\Scripts\python -m pip install -r requirements.txt
cd ..

# One-command startup (seed + backend + frontend)
npm run dev:all

# Fast restart without reseeding
npm run dev:all:no-seed
```

- Frontend: http://localhost:8080  
- API: http://localhost:4000  

**Environment:** Configure `.env` with `MONGODB_URI`, `MONGODB_DB`, `PORT`, Supabase URL/keys, and optionally `VITE_API_BASE_URL`.  
For Google Calendar auto events, also set:
- `GOOGLE_CALENDAR_ICS_URLS` (free iCal URL, recommended), or
- `GOOGLE_CALENDAR_IDS` + `GOOGLE_CALENDAR_API_KEY` (Google Calendar API).
- Optional: `GOOGLE_CALENDAR_SYNC_ON_READ=true` to auto-sync on `GET /api/promotions/upcoming`.

**Seed data:** From repo root run `npm run seed:mongo`, or from this folder run `node server/scripts/seedMongo.js`.

## Scripts

| Script        | Description                |
|---------------|----------------------------|
| `npm run dev` | Start Vite dev server      |
| `npm run dev:all` | Seed DB, then run backend + frontend together |
| `npm run dev:all:no-seed` | Run backend + frontend together without seeding |
| `npm run build` | Production build         |
| `npm run server` | Start Python API server |
| `npm run seed:mongo` | Seed MongoDB (from project root) |
| `npm run lint` | Run ESLint               |
| `npm run test` | Run Vitest                |

Google Calendar manual sync endpoint:
- `POST http://localhost:4000/api/promotions/sync-google-calendar`

## Project structure

- `src/` – React app (pages, components, hooks)
- `python-backend/` - FastAPI backend and ML forecasting
- `server/scripts/` - MongoDB seed script
- `docs/` – Architecture and workflow docs

## Docs

- `docs/AI_AND_ML_IN_RGM.md` – Where AI/ML is used and where it’s ready for more
- `docs/COMPLETE_ARCHITECTURE.md` – Full architecture overview
- `docs/TECH_ARCHITECTURE.md` – Tech stack and “what for which”
- `docs/WORKFLOW.md` – User and data flow

