import "./env";
import { getPopulationVulnerability } from "./vulnerability/populationVulnerability";
import { getNeighbourhoodFromCoords } from "./vulnerability/neighbourhoodMatcher";
import { getHeatExposureScore } from "./vulnerability/heatExposureScore";
import { getFloodExposureScore } from "./vulnerability/floodExposureScore";
import "dotenv/config";
import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import session from "express-session";
import MongoStore from "connect-mongo";
import rateLimit from "express-rate-limit";

import datasetRouter from "./routes/datasets";
import reportRouter from "./routes/report";
import summaryRouter from "./routes/summary";
import authRouter from "./routes/auth";
import savedLocationsRouter from "./routes/savedLocations";
import { getMongoUri, getSessionDbName } from "./helpers/mongo";

import fs from "fs";
import nodePath from "path";
import routes from "./routes.json";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.NODE_SESSION_SECRET ?? "dev-secret-change-me",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: getMongoUri(),
      dbName: getSessionDbName(),
      collectionName: "sessions",
      crypto: {
        secret:
          process.env.MONGODB_SESSION_SECRET ?? "dev-crypto-change-me",
      },
    }),
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
  }),
);

// ─── Rate limiting on auth routes ───────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});

// ─── Open Vancouver API proxy routes ─────────────────────────────────────────
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

app.use("/api/auth", authLimiter, authRouter);
app.use("/api/saved-locations", savedLocationsRouter);
app.use("/api/datasets", datasetRouter);
app.use("/api/report-data", reportRouter);
app.use("/api/summary", summaryRouter);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

// ─── Census CSV parser ────────────────────────────────────────────────────────
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
  (_req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(loadCensus2016());
    } catch (err) {
      next(err);
    }
  },
);
console.log("Registered GET /datasets/census-local-area-profiles-2016/csv");

// ─── Neighbourhood matcher route ──────────────────────────────────────────────
app.get("/api/neighbourhood", (req: Request, res: Response) => {
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

// ─── Heat exposure route ──────────────────────────────────────────────────────
app.get("/api/heat-exposure", async (req: Request, res: Response) => {
  const lat = parseFloat(req.query.lat as string);
  const lng = parseFloat(req.query.lng as string);
  const radius = parseInt(req.query.radius as string) || 500;

  if (isNaN(lat) || isNaN(lng)) {
    return res.status(400).json({ error: "Missing lat/lng" });
  }

  try {
    const result = await getHeatExposureScore(lat, lng, radius);
    return res.json({ lat, lng, radius, ...result });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ error: "Failed to fetch heat exposure data" });
  }
});
console.log("Registered GET /api/heat-exposure");

// ─── Flood exposure route ─────────────────────────────────────────────────────
app.get("/api/flood-exposure", async (req: Request, res: Response) => {
  const lat = parseFloat(req.query.lat as string);
  const lng = parseFloat(req.query.lng as string);

  if (isNaN(lat) || isNaN(lng)) {
    return res.status(400).json({ error: "Missing lat/lng" });
  }

  try {
    const result = await getFloodExposureScore(lat, lng);
    return res.json({ lat, lng, ...result });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ error: "Failed to fetch flood exposure data" });
  }
});
console.log("Registered GET /api/flood-exposure");

// ─── Serve frontend static files ─────────────────────────────────────────────
const distPath = nodePath.join(__dirname, "..", "dist");
const publicPath = nodePath.join(__dirname, "..", "public");
app.use(express.static(distPath));
app.use("/html", express.static(nodePath.join(publicPath, "html")));
app.use("/css", express.static(nodePath.join(publicPath, "css")));
app.use("/js", express.static(nodePath.join(publicPath, "js")));
app.use("/assets", express.static(nodePath.join(publicPath, "assets")));

// Catch-all: serve index.html for client-side routing
app.get("/{*path}", (_req: Request, res: Response) => {
  res.sendFile(nodePath.join(distPath, "index.html"));
});

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

// ─── Start server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
