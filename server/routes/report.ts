import {
  Router,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import path from "path";
import { getNeighbourhoodFromCoords } from "../vulnerability/neighbourhoodMatcher";
import { getPopulationVulnerability } from "../vulnerability/populationVulnerability";
import { getHeatExposureScore } from "../vulnerability/heatExposureScore";
import { getFloodExposureScore } from "../vulnerability/floodExposureScore";
import {
  providerDiversityScore,
  vulnerabilityScore,
} from "../vulnerability/scores";

const router = Router();

const OUTDOOR_SOURCES = ["community-gardens-and-food-trees", "food-vendors"];

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
      ? "%20AND%20(businesstype%3D%22Food%20Market%22%20OR%20businesstype%3D%22Grocery%20Store%22%20OR%20businesstype%3D%22Pharmacy%22%20OR%20businesstype%3D%22Retail%20Dealer%20-%20Food%22)"
      : slug === "restaurants"
        ? "%20AND%20(businesstype%3D%22Limited%20Service%20Food%20Establishment%22%20OR%20businesstype%3D%22Restaurant%22)"
        : "";

  return (
    `${base}/${datasetSlug}/records` +
    `?where=NOT(${geomField}%20is%20null)${typeFilter}` +
    `%20AND%20within_distance(${geomField}, geom'POINT(${lon} ${lat})', ${radius}m)&limit=0`
  );
}

async function fetchVendorCount(
  slug: string,
  lon: number,
  lat: number,
  radius: number,
): Promise<number> {
  const res = await fetch(vendorUrl(slug, lon, lat, radius));
  if (!res.ok) return 0;
  const data = (await res.json()) as { total_count?: number };
  return Number(data.total_count ?? 0);
}

router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const radius = Number(req.query.radius ?? 500);

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      !Number.isFinite(radius)
    ) {
      return res
        .status(400)
        .json({ error: "lat, lng, radius must be numbers" });
    }

    const boundaryPath = path.resolve(
      __dirname,
      "../datasets/local-area-boundary.json",
    );
    const neighbourhood = getNeighbourhoodFromCoords(lat, lng, boundaryPath);

    const csvPath = path.resolve(
      __dirname,
      "../datasets/CensusLocalAreaProfiles2016.csv",
    );
    const population = neighbourhood
      ? getPopulationVulnerability(neighbourhood, csvPath)
      : null;

    const [outdoorCounts, indoorCounts] = await Promise.all([
      Promise.all(
        OUTDOOR_SOURCES.map((s) => fetchVendorCount(s, lng, lat, radius)),
      ),
      Promise.all(
        INDOOR_SOURCES.map((s) => fetchVendorCount(s, lng, lat, radius)),
      ),
    ]);

    const outdoorTotal = outdoorCounts.reduce((a, b) => a + b, 0);
    const indoorTotal = indoorCounts.reduce((a, b) => a + b, 0);

    const areaKm2 = (Math.PI * radius * radius) / 1_000_000;

    const heatResult = await getHeatExposureScore(lat, lng, radius);
    const heatScore = heatResult.heatExposureScore;

    const floodResult = await getFloodExposureScore(lat, lng);
    const floodScore = floodResult.floodExposureScore;

    const diversityScore = providerDiversityScore(outdoorTotal, indoorTotal);
    const populationScore = population?.populationVulnerabilityScore ?? 0;

    const hazardScore = Math.round((heatScore + floodScore) / 2);
    const overallScore = Math.round(
      vulnerabilityScore(
        hazardScore,
        populationScore,
        diversityScore,
        floodScore,
      ),
    );

    const toStars = (score: number) =>
      Math.max(0, Math.min(5, Math.round(score / 20)));

    return res.json({
      neighbourhood: neighbourhood ?? "Unknown",
      coords: { lat, lng },
      radiusM: radius,
      areaKm2: Math.round(areaKm2 * 100) / 100,
      population: {
        seniorsPercent: population?.seniorsPercent ?? 0,
        lowIncomePercent: population?.lowIncomePercent ?? 0,
        renterPercent: population?.renterPercent ?? 0,
        populationVulnerabilityScore: populationScore,
      },
      vendors: {
        outdoor: outdoorTotal,
        indoor: indoorTotal,
      },
      scores: {
        heatExposureScore: heatScore,
        floodExposureScore: floodScore,
        climateDisruptionScore: hazardScore,
        populationVulnerabilityScore: populationScore,
      },
      stars: {
        heat: toStars(heatScore),
        flood: toStars(floodScore),
        seniors: toStars(population?.seniorsScore ?? 0),
        income: toStars(population?.lowIncomeScore ?? 0),
        renters: toStars(population?.renterScore ?? 0),
        diversity: toStars(diversityScore),
        overall: toStars(overallScore),
      },
      inFloodZone: floodResult.inFloodZone,
      floodZoneName: floodResult.floodZoneName,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
