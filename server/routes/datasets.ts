import { 
  Router,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import routes from "../routes.json";
import { loadCensus2016 } from "../helpers/csv";

const router = Router();

const openVancouver: { path: string; url: string }[] = routes.openVancouver;
const temperature: { path: string; url: string }[] = routes.temperature;

// Api endpoints for Open Vancouver
for (const { path, url } of openVancouver) {
  router.get(path, async (req: Request, res: Response, next: NextFunction) => {
    const lon: any = req.query.lon;
    const lat: any = req.query.lat;
    const radius: any = req.query.radius;

    if (!lon || !lat || !radius || typeof lon !== "string" || typeof lat !== "string" || typeof radius !== "string") {
      res.status(400).json({ error: "Invalid query parameters: lon, lat, radius must be strings" });
      return;
    }
    
    try {
      const response = await fetch(url);
      if (!response.ok) {
        res.status(response.status).json({ error: "Upstream error" });
        return;
      }
      const data = await response.json();
      res.json(data);
    } catch (err) {
      next(err);
    }
  });
  console.log(`Registered GET /api/datasets/${path}`);
}

// Api endpoints for Temperature
for (const { path, url } of temperature) {
  router.get(path, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        res.status(response.status).json({ error: "Upstream error" });
        return;
      }
      const data = await response.json();
      res.json(data);
    } catch (err) {
      next(err);
    }
  });
  console.log(`Registered GET /api/datasets/${path}`);
}

// Api endpoint for Census
router.get(
  "/census-local-area-profiles-2016/csv",
  (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(loadCensus2016());
    } catch (err) {
      next(err);
    }
  },
);

console.log("Registered GET /api/datasets/census-local-area-profiles-2016/csv");

export default router;
