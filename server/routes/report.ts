import {
  Router,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import path from "path";
import { getNeighbourhoodFromCoords } from "../vulnerability/neighbourhoodMatcher";
import { getPopulationVulnerability } from "../vulnerability/populationVulnerability";
import {
  heatExposureScore,
  floodExposureScore,
  providerDiversityScore,
  vulnerabilityScore,
} from "../vulnerability/scores";

const router = Router();

const OUTDOOR_SOURCES = [
  "community-gardens-and-food-trees",
  "food-vendors",
];

const INDOOR_SOURCES = [
  "free-low-cost-food",
  "food-related-businesses",
  "restaurants",
];

function vendorUrl(slug: string, lon: number, lat: number, radius: number) {
  const base =
    "https://opendata.vancouver.ca/api/explore/v2.1/catalog/datasets";
  const geomField = slug === "free-low-cost-food" ? "geom" : "geo_point_2d";

  const datasetSlug =
    slug === "community-gardens-and-food-trees"
      ? "community-gardens-and-food-trees"
      : slug === "free-low-cost-food"
        ? "free-and-low-cost-food-programs"
        : slug === "food-related-businesses" || slug === "restaurants"
          ? "business-licences"
          : slug === "food-vendors"
            ? "food-vendors"
            : slug;

  const typeFilter =
    slug === "food-related-businesses"
      ? '%20AND%20(businesstype%3D%22Food%20Market%22%20OR%20businesstype%3D%22Grocery%20Store%22%20OR%20businesstype%3D%22Pharmacy%22%20OR%20businesstype%3D%22Retail%20Dealer%20-%20Food%22)'
      : slug === "restaurants"
        ? '%20AND%20(businesstype%3D%22Limited%20Service%20Food%20Establishment%22%20OR%20businesstype%3D%22Restaurant%22)'
        : "";

  return (
    `${base}/${datasetSlug}/records` +
    `?where=NOT(${geomField}%20is%20null)${typeFilter}` +
    `%20AND%20within_distance(${geomField}, geom'POINT(${lon} ${lat})', ${radius}m)&limit=0`
  );
}

async function fetchVendorCount(slug: string, lon: number, lat: number, radius: number): Promise<number> {
  const res = await fetch(vendorUrl(slug, lon, lat, radius));
  if (!res.ok) return 0;
  const data = (await res.json()) as { total_count?: number };
  return Number(data.total_count ?? 0);
}

router.get(
  "/",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const lat = Number(req.query.lat);
      const lng = Number(req.query.lng);
      const radius = Number(req.query.radius ?? 500);

      if (!Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(radius)) {
        return res.status(400).json({ error: "lat, lng, radius must be numbers" });
      }

      // 1. Neighbourhood lookup
      const boundaryPath = path.resolve(
        __dirname,
        "../datasets/local-area-boundary.json",
      );
      const neighbourhood = getNeighbourhoodFromCoords(lat, lng, boundaryPath);

      // 2. Population vulnerability (census-based)
      const csvPath = path.resolve(
        __dirname,
        "../datasets/CensusLocalAreaProfiles2016.csv",
      );
      const population = neighbourhood
        ? getPopulationVulnerability(neighbourhood, csvPath)
        : null;

      // 3. Vendor counts within radius
      const [outdoorCounts, indoorCounts] = await Promise.all([
        Promise.all(OUTDOOR_SOURCES.map((s) => fetchVendorCount(s, lng, lat, radius))),
        Promise.all(INDOOR_SOURCES.map((s) => fetchVendorCount(s, lng, lat, radius))),
      ]);
      const outdoorTotal = outdoorCounts.reduce((a, b) => a + b, 0);
      const indoorTotal = indoorCounts.reduce((a, b) => a + b, 0);
      const totalVendors = outdoorTotal + indoorTotal;

      // 4. Derived scores (0–100 scale)
      const areaKm2 = (Math.PI * radius * radius) / 1_000_000;

      const heatScore = totalVendors > 0
        ? Math.round(heatExposureScore(outdoorTotal, totalVendors) * 100)
        : 0;

      // We don't yet have a flood-zone count per area, so leave 0 until that
      // dataset is wired up. The shape stays the same so the AI prompt and UI
      // don't change once it lands.
      const floodScore = 0;
      void floodExposureScore;

      const diversityScore = Math.round(
        providerDiversityScore(outdoorTotal, indoorTotal) * 100,
      );

      const populationScore = population?.populationVulnerabilityScore ?? 0;

      const hazardScore = heatScore; // placeholder until flood lands
      const overallScore = Math.round(
        vulnerabilityScore(
          hazardScore,
          populationScore,
          diversityScore,
          floodScore,
        ),
      );

      // 0–100 → 0–5 star rating, clamped.
      const toStars = (score: number) =>
        Math.max(0, Math.min(5, Math.round(score / 20)));

      return res.json({
        coords: { lat, lng },
        radiusM: radius,
        areaKm2: Math.round(areaKm2 * 100) / 100,
        neighbourhood,
        population,
        vendors: {
          outdoor: outdoorTotal,
          indoor: indoorTotal,
          ratio: indoorTotal > 0 ? Math.round((outdoorTotal / indoorTotal) * 100) / 100 : null,
        },
        scores: {
          heat: heatScore,
          flood: floodScore,
          population: populationScore,
          diversity: diversityScore,
          overall: overallScore,
        },
        stars: {
          heat: toStars(heatScore),
          flood: toStars(floodScore),
          population: toStars(populationScore),
          diversity: toStars(diversityScore),
          overall: toStars(overallScore),
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
