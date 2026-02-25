# RGM Tool — Client Presentation

**Overview**
- **Project:** Retail Growth Management (RGM) Tool
- **Purpose:** Provide AI-driven and data-driven forecasts, pricing, promotions, and assortment recommendations that improve promotional ROI and revenue lift.

**Problem Statement**
- Retail teams need reliable, evidence-based promotion planning. Historically promotion performance is scattered across spreadsheets and calendars, making it hard to reuse learnings and forecast outcomes. The client needs a single application to: collect past promotion performance, surface upcoming events (calendar-driven), recommend promotion parameters, and simulate expected ROI and incremental profit.

**Solution Summary**
- A full-stack web application integrating:
  - Frontend: React + Vite (interactive UI, simulation, dashboards)
  - Backend: FastAPI (Python) providing REST APIs for promos, pricing, forecasting, and calendar sync
  - Database: MongoDB for storing products, promotions, pricing records, event calendar
  - Optional: Supabase for authentication / additional integrations
- Key capabilities: seed/demo data, Google Calendar sync for upcoming events, promotion simulation, ML-backed recommendations (when models are present), simple deployment and dev flow.

**Architecture**

- Components
  - Frontend (my-essential-tool-main/src): React + Vite app served in dev by `vite`.
  - Backend (my-essential-tool-main/python-backend): FastAPI app exposing endpoints such as `/api/promotions/upcoming`, `/api/promotions/sync-google-calendar`, `/api/promotions/simulate`, `/api/products`.
  - Database: MongoDB (local or managed). Seed data script populates `products`, `promotions`, `event_calendar`, `pricing_records`, etc.
  - Orchestration: root `package.json` forwards dev commands to `my-essential-tool-main` and `scripts/run-all.mjs` starts seed + backend + frontend concurrently.

- Data flow (high-level)
  1. Seed DB (optional) to provide demo products, pricing records, past promotions, and event_calendar entries.
  2. Frontend requests upcoming events from backend (`/api/promotions/upcoming`).
  3. If calendar sync enabled, backend fetches public ICS feeds or uses Google Calendar API to upsert `event_calendar` rows.
  4. When an upcoming event matches a past promotion `event_name`, the UI shows historical performance and suggested parameters.
  5. Users run simulations (`/api/promotions/simulate`) or request recommendation (`/api/promotions/recommendation`).

**Key Endpoints**
- `GET /api/promotions/upcoming` — list upcoming events + matched historical references
- `POST /api/promotions/sync-google-calendar` — fetch and upsert Google Calendar events (uses `GOOGLE_CALENDAR_API_KEY` + `GOOGLE_CALENDAR_IDS` or `GOOGLE_CALENDAR_ICS_URLS`)
- `GET /api/products` — product input data for simulator
- `POST /api/promotions/simulate` — simulate promotion performance

**Workflow & Demo Script (5–10 minutes)**

1. Start services (dev):
```powershell
# from repository root
npm run dev:all       # starts seed (unless skipped), backend, frontend
# or run individually
cd my-essential-tool-main
node server/scripts/seedMongo.js      # seed DB (optional)
cd python-backend
.venv\Scripts\python -m uvicorn main:app --reload --host 0.0.0.0 --port 4000
cd ../
npm run dev         # start frontend (vite)
```

2. Show Promotions page in UI (http://localhost:5173 by default) — explain KPI cards.

3. Click **Sync Now** (or run the sync endpoint) to import upcoming events from Google Calendar. Verify response showing `events_upserted` (for demo we saw 52 events).

4. Show an upcoming event card, expand to view matched historical promotion performance (ROI, revenue lift, duration). Explain how recommendation is derived (past similar promotion selected as reference).

5. Run a simulation for a chosen scenario (discount %, duration, channel). Show predicted ROI, incremental profit, and sensitivity.

6. (Optional) Show `server/scripts/seedMongo.js` to explain the synthetic data used for demos.

**Configuration & Environment**
- Required environment variables (backend `python-backend/.env`):
  - `MONGODB_URI` (default: mongodb://127.0.0.1:27017)
  - `MONGODB_DB` (default: rgm_tool_prod)
  - `PORT` (default: 4000)
  - `GOOGLE_CALENDAR_API_KEY` and `GOOGLE_CALENDAR_IDS` (or `GOOGLE_CALENDAR_ICS_URLS`) to enable calendar sync
  - Frontend: `VITE_API_BASE_URL` (defaults to http://localhost:4000)

**Security & Operational Notes**
- Keep API keys and `.env` files out of version control. Use secrets manager in production (Azure Key Vault, AWS Secrets Manager, etc.).
- For production deployment consider:
  - Managed MongoDB (Atlas) with network rules
  - Running backend under a process manager (systemd, Docker, or serverless)
  - Frontend served from CDN or static hosting

**How the Problem Is Solved**
- Consolidation: Centralizes historical promotions, pricing, and product metadata in MongoDB, which enables consistent analyses.
- Event-driven planning: Syncing Google Calendar/ICS ensures upcoming events are visible to planners without manual entry.
- Evidence-driven recommendations: Past promotions with matching `event_name` provide realistic reference performance; ML models are plugged in when available for stronger recommendations.
- Rapid experimentation: Interactive simulators and scenario builder let users test multiple promotion options and view predicted ROI and profit impact before execution.

**Next Steps & Recommendations**
- Replace demo ML with production-trained models using stored historical promotions and a reproducible training pipeline.
- Add user authentication and role-based access (Supabase or other provider).
- Add audit log for promotions and simulation runs.
- Add CI to run tests and linting; add Dockerfiles for containerized deployment.

**Files of interest**
- Seed script: [my-essential-tool-main/server/scripts/seedMongo.js](my-essential-tool-main/server/scripts/seedMongo.js#L1)
- Backend app: [my-essential-tool-main/python-backend/main.py](my-essential-tool-main/python-backend/main.py#L1)
- Frontend promotions UI: [my-essential-tool-main/src/pages/Promotions.tsx](my-essential-tool-main/src/pages/Promotions.tsx#L1)
- Orchestration: [my-essential-tool-main/scripts/run-all.mjs](my-essential-tool-main/scripts/run-all.mjs#L1)

**Contact / Maintainer**
- Development lead: (your name) — available for the demo and Q&A

---
_Prepared for client demo on 2026-02-16_