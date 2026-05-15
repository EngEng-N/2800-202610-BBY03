import fs from "fs";
import path from "path";

// ─── Point-in-polygon using ray casting algorithm ─────────────────────────────
// Returns true if the point [lng, lat] is inside the polygon
function pointInPolygon(
  point: [number, number],
  polygon: number[][][],
): boolean {
  const [px, py] = point;
  const ring = polygon[0]; // outer ring only
  let inside = false;

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];

    const intersects =
      yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;

    if (intersects) inside = !inside;
  }

  return inside;
}

// ─── Normalize neighbourhood name ─────────────────────────────────────────────
// Boundary file uses "Arbutus Ridge", census uses "Arbutus-Ridge"
// This normalizes both to lowercase with no hyphens/spaces for comparison
function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[-\s]/g, "");
}

// ─── Main function ────────────────────────────────────────────────────────────
// Takes lat/lng from the map, returns the matching neighbourhood name
// as it appears in the CENSUS CSV (with hyphens e.g. "Arbutus-Ridge")

const CENSUS_NAMES: Record<string, string> = {
  arbutusridge: "Arbutus-Ridge",
  downtown: "Downtown",
  dunbarsouthlands: "Dunbar-Southlands",
  fairview: "Fairview",
  grandviewwoodland: "Grandview-Woodland",
  hastingssunrise: "Hastings-Sunrise",
  kensingtoncedarcottage: "Kensington-Cedar Cottage",
  kerrisdale: "Kerrisdale",
  killarney: "Killarney",
  kitsilano: "Kitsilano",
  marpole: "Marpole",
  mountpleasant: "Mount Pleasant",
  oakridge: "Oakridge",
  renfrewcollingwood: "Renfrew-Collingwood",
  rileypark: "Riley Park",
  shaughnessy: "Shaughnessy",
  southcambie: "South Cambie",
  strathcona: "Strathcona",
  sunset: "Sunset",
  victoriafraserview: "Victoria-Fraserview",
  westend: "West End",
  westpointgrey: "West Point Grey",
};

export function getNeighbourhoodFromCoords(
  lat: number,
  lng: number,
  boundaryFilePath?: string,
): string | null {
  const filePath =
    boundaryFilePath ??
    path.resolve(__dirname, "../../data/local-area-boundary.json");

  const raw = fs.readFileSync(filePath, "utf-8");
  const records: Array<{
    name: string;
    geom: { geometry: { type: string; coordinates: number[][][] } };
  }> = JSON.parse(raw);

  // GeoJSON coordinates are [lng, lat] — note the order is flipped
  const point: [number, number] = [lng, lat];

  for (const record of records) {
    const { name, geom } = record;
    if (geom.geometry.type !== "Polygon") continue;

    if (pointInPolygon(point, geom.geometry.coordinates)) {
      // Map boundary name → census name
      const censusName = CENSUS_NAMES[normalizeName(name)];
      return censusName ?? name;
    }
  }

  return null; // coords outside all neighbourhoods
}
