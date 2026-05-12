import "dotenv";
import express, { Request, Response, NextFunction } from "express";
import routes from "./routes.json";
import fs from "fs";
import nodePath from "path";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const openVancouver: { path: string; url: string }[] = routes.openVancouver;

for (const { path, url } of openVancouver) {
  app.get(path, async (_req: Request, res: Response, next: NextFunction) => {
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

app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

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

app.use((_req: any, res: any) => {
  res.status(404).json({ error: "Not found" });
});

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

function heatExposureScore(
  outdoorProviders: number,
  totalProviders: number,
): number {
  return outdoorProviders / totalProviders;
}

function floodExposureScore(inFloodZone: number, totalProviders: number, area: number): number {
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
    (w1 * hazardExposureScore + w2 * populationVulnerabilityScore + w3 * providerDiversityScore + w4 * floodExposureScore) / 100
  );
}
