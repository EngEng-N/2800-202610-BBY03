import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import {
  populationVulnerabilityRoute,
  debugCensusHeaders,
  getPopulationVulnerability,
} from "./populationVulnerability";
import { getNeighbourhoodFromCoords } from "./neighbourhoodMatcher";
import path from "path";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.get("/api/debug-census", debugCensusHeaders);
app.get("/api/population-vulnerability", populationVulnerabilityRoute);

app.get("/", (_req, res) => {
  res.send("BBY03 backend is running");
});

app.get("/api/neighbourhood", (req, res) => {
  const lat = parseFloat(req.query.lat as string);
  const lng = parseFloat(req.query.lng as string);

  if (isNaN(lat) || isNaN(lng)) {
    return res.status(400).json({ error: "Missing lat/lng" });
  }

  const neighbourhood = getNeighbourhoodFromCoords(lat, lng);
  if (!neighbourhood) {
    return res
      .status(404)
      .json({ error: "No neighbourhood found for these coordinates" });
  }

  return res.json({ neighbourhood });
});

app.get("/api/report-data", (req, res) => {
  const lat = parseFloat(req.query.lat as string);
  const lng = parseFloat(req.query.lng as string);

  if (isNaN(lat) || isNaN(lng)) {
    return res.status(400).json({ error: "Missing lat/lng" });
  }

  // Step 1 — coords → neighbourhood name
  const neighbourhood = getNeighbourhoodFromCoords(lat, lng);
  if (!neighbourhood) {
    return res
      .status(404)
      .json({ error: "Location is outside Vancouver neighbourhoods" });
  }

  // Step 2 — neighbourhood name → vulnerability scores
  const csvPath = path.resolve(
    __dirname,
    "../../server/datasets/CensusLocalAreaProfiles2016.csv",
  );
  const result = getPopulationVulnerability(neighbourhood, csvPath);
  if (!result) {
    return res
      .status(500)
      .json({ error: `Could not find census data for ${neighbourhood}` });
  }

  return res.json(result);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
