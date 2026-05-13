import { Router } from "express";
import routes from "../routes.json";
import { loadCensus2016 } from "../helpers/csv";

const router = Router();

const openVancouver: { path: string; url: string }[] = routes.openVancouver;

for (const { path, url } of openVancouver) {
  router.get(path, async (_req, res, next) => {
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
  console.log(`Registered GET ${path}`);
}

router.get(
  "/census-local-area-profiles-2016/csv",
  (_req, res, next) => {
    try {
      res.json(loadCensus2016());
    } catch (err) {
      next(err);
    }
  },
);

console.log("Registered GET /datasets/census-local-area-profiles-2016/csv");

export default router;
