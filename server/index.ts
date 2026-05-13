import { getPopulationVulnerability } from "./populationVulnerability";
import { getNeighbourhoodFromCoords } from "./neighbourhoodMatcher";

const express = require("express");
const fs = require("fs");
const nodePath = require("path");
const routes = require("./routes.json");

const app: any = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Open Vancouver API proxy routes ─────────────────────────────────────────
const openVancouver: { path: string; url: string }[] = routes.openVancouver;

for (const { path, url } of openVancouver) {
  app.get(path, async (_req: any, res: any, next: any) => {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        return res.status(response.status).json({ error: "Upstream error" });
      }
      const data = await response.json();
      res.json(data);
    } catch (err) {
      next(err);
    }
  });
  console.log(`Registered GET ${path}`);
}

// ─── Health check ─────────────────────────────────────────────────────────────
app.get("/api/health", (_req: any, res: any) => {
  res.json({ status: "ok" });
});

// ─── Census CSV parser (TB's implementation) ──────────────────────────────────
function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        cur += c;
      }
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") {
        out.push(cur);
        cur = "";
      } else cur += c;
    }
  }
  out.push(cur);
  return out;
}

let censusCache: any = null;
function loadCensus2016() {
  if (censusCache) return censusCache;
  const file = nodePath.join(
    __dirname,
    "datasets",
    "CensusLocalAreaProfiles2016.csv",
  );
  const lines: string[] = fs.readFileSync(file, "utf8").split(/\r?\n/);
  const headerIdx = lines.findIndex((l: string) => l.startsWith("ID,Variable"));
  if (headerIdx === -1) throw new Error("Census CSV header row not found");
  const headers = parseCsvLine(lines[headerIdx]).map((h) => h.trim());
  const areas = headers.slice(2);
  const rows: {
    id: number;
    variable: string;
    values: Record<string, number | string>;
  }[] = [];
  for (let i = headerIdx + 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const cols = parseCsvLine(lines[i]);
    if (cols.length < 2) continue;
    const id = Number(cols[0]);
    const variable = (cols[1] || "").trim();
    const values: Record<string, number | string> = {};
    for (let j = 0; j < areas.length; j++) {
      const raw = (cols[j + 2] || "").trim().replace(/,/g, "");
      if (raw === "") {
        values[areas[j]] = "";
        continue;
      }
      const num = Number(raw);
      values[areas[j]] = Number.isFinite(num) ? num : raw;
    }
    rows.push({ id, variable, values });
  }
  censusCache = { areas, rows };
  return censusCache;
}

app.get(
  "/datasets/census-local-area-profiles-2016/csv",
  (_req: any, res: any, next: any) => {
    try {
      res.json(loadCensus2016());
    } catch (err) {
      next(err);
    }
  },
);
console.log("Registered GET /datasets/census-local-area-profiles-2016/csv");

// ─── Neighbourhood matcher route ──────────────────────────────────────────────
app.get("/api/neighbourhood", (req: any, res: any) => {
  const lat = parseFloat(req.query.lat as string);
  const lng = parseFloat(req.query.lng as string);

  if (isNaN(lat) || isNaN(lng)) {
    return res.status(400).json({ error: "Missing lat/lng" });
  }

  const boundaryPath = nodePath.join(
    __dirname,
    "datasets",
    "local-area-boundary.json",
  );

  const neighbourhood = getNeighbourhoodFromCoords(lat, lng, boundaryPath);
  if (!neighbourhood) {
    return res
      .status(404)
      .json({ error: "No neighbourhood found for these coordinates" });
  }

  return res.json({ neighbourhood });
});
console.log("Registered GET /api/neighbourhood");

// ─── Report data route ────────────────────────────────────────────────────────
// Takes lat/lng → matches neighbourhood → returns population vulnerability score
app.get("/api/report-data", (req: any, res: any) => {
  const lat = parseFloat(req.query.lat as string);
  const lng = parseFloat(req.query.lng as string);

  if (isNaN(lat) || isNaN(lng)) {
    return res.status(400).json({ error: "Missing lat/lng" });
  }

  // Step 1 — coords → neighbourhood name
  const boundaryPath = nodePath.join(
    __dirname,
    "datasets",
    "local-area-boundary.json",
  );
  const neighbourhood = getNeighbourhoodFromCoords(lat, lng, boundaryPath);
  if (!neighbourhood) {
    return res
      .status(404)
      .json({ error: "Location is outside Vancouver neighbourhoods" });
  }

  // Step 2 — neighbourhood name → population vulnerability scores
  const csvPath = nodePath.join(
    __dirname,
    "datasets",
    "CensusLocalAreaProfiles2016.csv",
  );
  const result = getPopulationVulnerability(neighbourhood, csvPath);
  if (!result) {
    return res
      .status(500)
      .json({ error: `Could not find census data for ${neighbourhood}` });
  }

  return res.json(result);
});
console.log("Registered GET /api/report-data");

// ─── 404 + error handlers ─────────────────────────────────────────────────────
app.use((_req: any, res: any) => {
  res.status(404).json({ error: "Not found" });
});

app.use((err: any, _req: any, res: any, _next: any) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

// ─── Start server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// ─── Vulnerability score calculation functions (TB's implementation) ──────────
function heatExposureScore(
  outdoorProviders: number,
  totalProviders: number,
): number {
  return outdoorProviders / totalProviders;
}

function floodExposureScore(
  inFloodZone: number,
  totalProviders: number,
  area: number,
): number {
  return (inFloodZone * (totalProviders / area)) / 100;
}

function populationVulnerabilityScore(populationDetails: object): number {
  return 0;
}

function providerDiversityScore(
  outdoorProviders: number,
  indoorProviders: number,
): number {
  return Math.abs(outdoorProviders - indoorProviders) / 100;
}

function vulnerabilityScore(
  hazardExposureScore: number,
  populationVulnerabilityScore: number,
  providerDiversityScore: number,
  floodExposureScore: number,
): number {
  const w1: number = 1;
  const w2: number = 0.9;
  const w3: number = 0.5;
  const w4: number = 1;

  return (
    (w1 * hazardExposureScore +
      w2 * populationVulnerabilityScore +
      w3 * providerDiversityScore +
      w4 * floodExposureScore) /
    100
  );
}
