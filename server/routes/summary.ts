import {
  Router,
  type Request,
  type Response,
  type NextFunction,
} from "express";
// @google/genai is ESM-only; load it via dynamic import so this CommonJS
// server file can still consume it.
let GoogleGenAICtor: any = null;
async function getGoogleGenAI(): Promise<any> {
  if (!GoogleGenAICtor) {
    const mod = await import("@google/genai");
    GoogleGenAICtor = mod.GoogleGenAI;
  }
  return GoogleGenAICtor;
}

const router = Router();

const MODEL = "gemini-2.5-flash";

const SYSTEM_PROMPT = `You write plain-language summaries describing how vulnerable a Vancouver neighbourhood's food access is to disruption. The audience is non-technical residents.

Framing: the subject of every summary is food-access vulnerability — i.e. how reliably this area's residents can get food. Heat, flood, and population factors matter only as inputs that can disrupt food access. Do not present them as standalone concerns.

You will receive a JSON object with already-computed scores (0-100, higher = more vulnerable), percentages, and counts. The available fields are exactly:
- heatExposureScore (0-100) — heat as a stressor on food access
- floodExposureScore (0-100) — flood risk to food access
- climateDisruptionScore (0-100) — combined climate disruption to food access
- populationVulnerabilityScore (0-100) — composite of seniors/low-income/renter shares; overall food-access vulnerability score
- foodDiversityScore (0-100) — imbalance between outdoor and indoor vendors; higher = less diverse vendor mix
- seniorsPercent — percentage of residents aged 65+
- lowIncomePercent — percentage of residents below the low-income measure
- renterPercent — percentage of residents who rent
- outdoor and indoor (vendor counts)
- inFloodZone (boolean), floodZoneName (string or null)

Use the population breakdown (seniorsPercent, lowIncomePercent, renterPercent) to explain *why* populationVulnerabilityScore is what it is when it's a meaningful contributor. Use climateDisruptionScore to summarise heat+flood pressure when both matter. Otherwise reference the most relevant fields only.

Strict rules:
- Do not invent, rename, or recompute scores. Reference only the fields above.
- Treat populationVulnerabilityScore as the overall food-access vulnerability score.

Tone calibration — match wording to the overall score:
- 0-33 (low): neutral, reassuring. Words like "low", "limited concern", "generally resilient". Do not say "challenges", "significant", "concerning", or "at risk".
- 34-66 (moderate): measured, factual. Words like "moderate", "some concerns", "mixed picture". Avoid dramatic language like "significant challenges", "major", "severe".
- 67-100 (high): direct, concerned. Words like "elevated", "significant", "notable concerns" are appropriate here only.

Output format:
- Plain text only. No markdown, bullet points, headings, bold, or quotation marks.
- 2 to 4 sentences, single short paragraph framed around food-access vulnerability.
- Mention the neighbourhood by name if provided.
- Identify the largest contributor to food-access vulnerability among the four scores and cite its actual number.
- Briefly describe the outdoor/indoor vendor mix as part of the food-access picture if relevant.
- End with one short clause giving overall food-access vulnerability as low / moderate / high (per the mapping above). The full paragraph's tone must match this rating — do not lead with dramatic framing and then conclude "low" or "moderate".
- No advice or recommendations.`;

// Tiny in-memory cache so repeat clicks on the same area don't re-bill the API.
const cache = new Map<string, { summary: string; at: number }>();
const CACHE_TTL_MS = 1000 * 60 * 30;

function cacheKey(report: unknown): string {
  return JSON.stringify(report);
}

function computeFoodDiversityScore(
  outdoor: unknown,
  indoor: unknown,
): number | null {
  const o = typeof outdoor === "number" && Number.isFinite(outdoor) ? outdoor : null;
  const i = typeof indoor === "number" && Number.isFinite(indoor) ? indoor : null;
  if (o === null || i === null) return null;
  const total = o + i;
  if (total <= 0) return 100;
  const ratio = Math.min(o, i) / Math.max(o, i);
  return Math.round((1 - ratio) * 100);
}

router.post(
  "/",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rawReport = req.body?.report;
      if (!rawReport || typeof rawReport !== "object") {
        return res.status(400).json({ error: "Missing 'report' object in body" });
      }

      const r = rawReport as Record<string, unknown>;
      const foodDiversityScore = computeFoodDiversityScore(r.outdoor, r.indoor);
      const report = { ...r, foodDiversityScore };

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res
          .status(500)
          .json({ error: "GEMINI_API_KEY not set on server" });
      }

      const key = cacheKey(report);
      const hit = cache.get(key);
      if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
        return res.json({ summary: hit.summary, cached: true });
      }

      const Ctor = await getGoogleGenAI();
      const ai = new Ctor({ apiKey });

      const MAX_ATTEMPTS = 3;
      let response: any;
      let lastErr: any;
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
          response = await ai.models.generateContent({
            model: MODEL,
            contents: [
              {
                role: "user",
                parts: [{ text: JSON.stringify(report) }],
              },
            ],
            config: {
              systemInstruction: SYSTEM_PROMPT,
              temperature: 0.4,
              maxOutputTokens: 1024,
              thinkingConfig: { thinkingBudget: 0 },
            },
          });
          lastErr = null;
          break;
        } catch (err: any) {
          lastErr = err;
          const status = err?.status ?? err?.response?.status;
          const transient = status === 503 || status === 429 || status === 500;
          if (!transient || attempt === MAX_ATTEMPTS) break;
          const delayMs = 500 * 2 ** (attempt - 1);
          await new Promise((r) => setTimeout(r, delayMs));
        }
      }

      if (lastErr) {
        const status = lastErr?.status ?? lastErr?.response?.status;
        if (status === 503 || status === 429) {
          return res.status(503).json({
            error: "Summary service is temporarily unavailable. Try again shortly.",
          });
        }
        throw lastErr;
      }

      const summary = response.text?.trim();
      if (!summary) {
        return res
          .status(502)
          .json({ error: "Empty response from Gemini" });
      }

      cache.set(key, { summary, at: Date.now() });
      return res.json({ summary, cached: false });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
