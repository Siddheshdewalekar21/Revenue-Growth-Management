# RGM Python Backend (FastAPI)

REST API for the RGM tool. Uses MongoDB and **ML-only demand forecasting** (scikit-learn).

## Setup

```bash
cd python-backend
python -m venv .venv
.venv\Scripts\activate   # Windows
# or: source .venv/bin/activate  # macOS/Linux
pip install -r requirements.txt
```

Create a `.env` (or copy from project root) with `MONGODB_URI`, `MONGODB_DB`, `PORT`.

## Google Calendar auto-sync (free)

You can auto-load upcoming events from Google Calendar into MongoDB `event_calendar`.

### Option A (recommended): iCal URL, no API key

Use a Google Calendar **public iCal URL** or **private secret iCal URL**:

```env
GOOGLE_CALENDAR_ICS_URLS=https://calendar.google.com/calendar/ical/your_calendar_id/public/basic.ics
```

You can add multiple URLs separated by commas.

### Option B: Google Calendar API (public calendars)

```env
GOOGLE_CALENDAR_IDS=your_calendar_id@group.calendar.google.com
GOOGLE_CALENDAR_API_KEY=your_google_api_key
```

You can add multiple IDs separated by commas.

### Optional sync behavior

```env
GOOGLE_CALENDAR_SYNC_ON_READ=true
GOOGLE_CALENDAR_LOOKAHEAD_DAYS=365
GOOGLE_CALENDAR_MAX_RESULTS=250
```

- `GOOGLE_CALENDAR_SYNC_ON_READ=true` auto-syncs before `GET /api/promotions/upcoming`.
- Keep `false` if you prefer manual sync only.

### Manual sync endpoint

```http
POST /api/promotions/sync-google-calendar
```

This fetches upcoming events from configured Google Calendar source(s) and upserts them into `event_calendar`.

## Run

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 4000
```

## ML demand forecasting

- **Dependencies:** `scikit-learn` and `numpy` (in `requirements.txt`).
- **How it works:** `POST /api/forecasts/generate` always uses **Ridge regression with polynomial time features** (see `ml_forecast.py`).
- **Health:** `GET /api/health` returns `mlAvailable: true` when scikit-learn is installed.

If `scikit-learn` is not installed, forecast generation returns an error (`503`) until ML dependencies are available.

### Regenerate existing forecast data with ML only

```bash
python scripts/regenerate_ml_forecasts.py
```

Use `--dry-run` first to preview changes.
