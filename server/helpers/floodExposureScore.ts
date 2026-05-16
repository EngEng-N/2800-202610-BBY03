const FLOOD_PLAIN_API =
  "https://opendata.vancouver.ca/api/explore/v2.1/catalog/datasets/designated-floodplain/records";

interface FloodZone {
  name: string;
  geom: {
    type: string;
    geometry: {
      type: string;
      coordinates: number[][][];
    };
  };
}

interface ApiResponse {
  results: FloodZone[];
  total_count: number;
}

// ─── Ray casting point-in-polygon ─────────────────────────────────────────────
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

// ─── Flood Exposure Score ──────────────────────────────────────────────────────
// Checks if the given lat/lng falls inside any Vancouver flood zone polygon
// Score: 100 = inside a flood zone, 0 = outside all flood zones
export async function getFloodExposureScore(
  lat: number,
  lng: number,
): Promise<{
  floodExposureScore: number;
  inFloodZone: boolean;
  floodZoneName: string | null;
}> {
  const fetchUrl = `${FLOOD_PLAIN_API}?select=name,geom&limit=10`;
  const response = await fetch(fetchUrl);

  if (!response.ok) {
    throw new Error(`Flood plain API error: ${response.status}`);
  }

  const data = (await response.json()) as ApiResponse;
  const zones = data.results;

  if (!zones || zones.length === 0) {
    return { floodExposureScore: 0, inFloodZone: false, floodZoneName: null };
  }

  // GeoJSON coordinates are [lng, lat]
  const point: [number, number] = [lng, lat];

  for (const zone of zones) {
    const { type, coordinates } = zone.geom.geometry;

    if (type === "Polygon") {
      if (pointInPolygon(point, coordinates as number[][][])) {
        return {
          floodExposureScore: 100,
          inFloodZone: true,
          floodZoneName: zone.name,
        };
      }
    } else if (type === "MultiPolygon") {
      for (const polygon of coordinates as unknown as number[][][][]) {
        if (pointInPolygon(point, polygon as unknown as number[][][])) {
          return {
            floodExposureScore: 100,
            inFloodZone: true,
            floodZoneName: zone.name,
          };
        }
      }
    }
  }

  return { floodExposureScore: 0, inFloodZone: false, floodZoneName: null };
}
