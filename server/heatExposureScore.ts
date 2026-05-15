// import fetch from "node-fetch";

const PUBLIC_TREES_API =
  "https://opendata.vancouver.ca/api/explore/v2.1/catalog/datasets/public-trees/records";

interface TreeRecord {
  height_m: number;
  diameter_cm: number;
  neighbourhood_name: string;
}

interface ApiResponse {
  results: TreeRecord[];
  total_count: number;
}

// ─── Heat Exposure Score ───────────────────────────────────────────────────────
// Higher tree canopy coverage = lower heat exposure (inverse relationship)
// Score 0-100 where 100 = most heat vulnerable (least canopy)
export async function getHeatExposureScore(
  lat: number,
  lng: number,
  radiusMeters: number = 500,
): Promise<{
  heatExposureScore: number;
  treeCount: number;
  avgDiameter: number;
}> {
  const fetchUrl = `${PUBLIC_TREES_API}?where=distance(geo_point_2d,geom'POINT(${lng}%20${lat})',${radiusMeters}m)&select=height_m,diameter_cm,geo_point_2d&limit=100`;
  const response = await fetch(fetchUrl);

  // const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Public trees API error: ${response.status}`);
  }

  const data = (await response.json()) as ApiResponse;
  const trees = data.results;

  if (!trees || trees.length === 0) {
    return { heatExposureScore: 100, treeCount: 0, avgDiameter: 0 };
  }

  // Average canopy diameter across all returned trees
  const avgDiameter =
    trees.reduce((sum, t) => sum + (t.diameter_cm ?? 0), 0) / trees.length;

  // Normalize: Vancouver street trees range roughly 5cm–160cm diameter
  const MIN_DIAMETER = 5;
  const MAX_DIAMETER = 160;
  const normalized =
    (avgDiameter - MIN_DIAMETER) / (MAX_DIAMETER - MIN_DIAMETER);
  const clamped = Math.min(1, Math.max(0, normalized));

  // Invert: more canopy = lower heat vulnerability
  const heatExposureScore = Math.round((1 - clamped) * 100);

  return {
    heatExposureScore,
    treeCount: trees.length,
    avgDiameter: Math.round(avgDiameter * 10) / 10,
  };
}
