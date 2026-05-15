## About Us

Team Name: BBY-03

Team Members:

- Thor Baker, Set 2C
- AngEng Nay, Set 2C
- Daniel Berruti Bueno, Set 1C
- Matthew Yun, Set 1A

# BBY-03 Climate Food Vulnerability App

A map-based tool for exploring Vancouver's climate-and-food vulnerability by neighbourhood. Pick a location and radius and the app aggregates census data, food-vendor counts, and exposure scores into a single vulnerability report, then asks Google Gemini to summarize it in plain language.

## 📁 Project Structure

- `public/` → React + Vite frontend (entry: `public/src/main.tsx`)
- `server/` → Node + Express backend (entry: `server/index.ts`)
  - `server/routes/` → Express routers (`datasets`, `report`, `summary`)
  - `server/vulnerability/` → scoring logic (neighbourhood matching, census-based population vulnerability, weighted scores)
  - `server/datasets/` → bundled CSV / GeoJSON data (Vancouver census, local-area boundaries, tree canopy)

---

## 🚀 Setup Instructions

### 1. Clone repo

```
git clone <repo-url>
cd 2800-202610-BBY03
```

### 2. Run frontend

From the project root:

```
npm install
npm run dev
```

Vite proxies `/api/*` to `http://localhost:3000`, so the backend must also be running.

### 3. Run backend

```
cd server
npm install
npm run dev
```

### 4. Configure environment

Create `server/.env` with:

```
GEMINI_API_KEY=<your Google Gemini API key>
```

The key is read server-side via `dotenv` and never reaches the browser.

---

## 🔌 API Endpoints

- `GET /api/health` — health check.
- `GET /api/datasets/...` — proxied Vancouver OpenData routes (food vendors, gardens, businesses, restaurants, flood plain, etc.).
- `GET /api/report-data?lat=&lng=&radius=` — aggregates a vulnerability report for the given point: resolves the neighbourhood, looks up census-based population vulnerability, counts indoor/outdoor food vendors in the radius, and returns 0–100 scores plus a 0–5 star representation.
- `POST /api/summary` — body `{ "report": <report-object> }`. Sends the report to Google Gemini (`gemini-2.5-flash`) and returns a short plain-language summary. Cached in memory for 30 minutes per unique report payload.
