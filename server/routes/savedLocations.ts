import { Router } from "express";
import { ObjectId } from "mongodb";
import { getDb } from "../helpers/mongo";

const router = Router();

async function getSavedLocations() {
  const db = await getDb();
  return db.collection("savedLocations");
}

router.get("/", async (_req, res, next) => {
  try {
    const col = await getSavedLocations();
    const items = await col.find({}).sort({ createdAt: -1 }).toArray();
    res.json(items);
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const { name, lat, lng, radius, report, outdoor, indoor, summary } =
      req.body ?? {};
    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof lat !== "number" ||
      typeof lng !== "number"
    ) {
      res.status(400).json({ error: "name, lat, lng are required" });
      return;
    }

    const doc = {
      name: name.trim(),
      lat,
      lng,
      radius: typeof radius === "number" ? radius : null,
      report: report ?? null,
      outdoor: typeof outdoor === "number" ? outdoor : 0,
      indoor: typeof indoor === "number" ? indoor : 0,
      summary: typeof summary === "string" ? summary : null,
      createdAt: new Date(),
    };

    const col = await getSavedLocations();
    const result = await col.insertOne(doc);
    res.status(201).json({ _id: result.insertedId, ...doc });
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const id = req.params.id as string;
    if (!ObjectId.isValid(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    const col = await getSavedLocations();
    const result = await col.deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
