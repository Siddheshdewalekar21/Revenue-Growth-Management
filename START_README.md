# RGM Tool Quick Start Guide (Windows)

## Prerequisites
Ensure you have installed:
- **Node.js 16+** from https://nodejs.org/
- **Python 3.8+** from https://www.python.org/
- **MongoDB** (local or Atlas connection string in `.env`)

## Starting the Project

### Option 1: Full Start (includes MongoDB seed)
**Double-click:** `start.bat`

This will:
1. Verify Node.js and Python are installed
2. Seed the MongoDB database with sample data
3. Start the FastAPI backend on port 4000
4. Start the React frontend on port 5173

**Use this on first run or when you need fresh data.**

### Option 2: Quick Start (skip MongoDB seed)
**Double-click:** `start-no-seed.bat`

This will:
1. Start the FastAPI backend on port 4000
2. Start the React frontend on port 5173

**Use this after initial setup.**

### From Command Prompt
```bash
cd my-essential-tool-main
npm run dev:all              # Full start with seed
npm run dev:all:no-seed      # Quick start without seed
npm run dev                  # Frontend only
npm run server               # Backend only (requires Python venv setup)
```

## Services

| Service | URL | Technology |
|---------|-----|-----------|
| Frontend | http://localhost:5173 | React 18, Vite, TypeScript |
| Backend API | http://localhost:4000 | FastAPI (Python) |
| API Docs | http://localhost:4000/docs | Swagger UI |

## Environment Setup (First Time)

1. **Python Virtual Environment:**
   ```bash
   cd my-essential-tool-main/python-backend
   python -m venv .venv
   .venv\Scripts\activate
   pip install -r requirements.txt
   ```

2. **Environment Variables:**
   Create `.env` in `my-essential-tool-main/` with:
   ```
   MONGODB_URI=mongodb://localhost:27017
   SUPABASE_URL=your_supabase_url
   SUPABASE_KEY=your_supabase_key
   ```

3. **Node Dependencies:**
   ```bash
   cd my-essential-tool-main
   npm install
   ```

## Stopping Services
- Press **Ctrl+C** in the terminal to gracefully shutdown both services
- Or close the terminal window

## Troubleshooting

**Port 5173 already in use:**
- Another Vite instance is running, or kill the process using that port

**Port 4000 already in use:**
- Another FastAPI instance is running

**MongoDB connection error:**
- Ensure MongoDB is running locally or `.env` has correct Atlas URI

**Python not found:**
- Add Python to PATH or reinstall Python with "Add to PATH" checked

**Module not found errors:**
- Run `pip install -r requirements.txt` in the python-backend directory

## Model Monitoring & Management

Once backend is running, access the monitoring tools:

```bash
# SSH into the server and run:
python python-backend/monitoring_dashboard.py

# Or use the API endpoints:
curl http://localhost:4000/api/models/health
curl http://localhost:4000/api/predictions/metrics
```

See `my-essential-tool-main/docs/` for complete API documentation.
