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

const SYSTEM_PROMPT = `You write plain-language summaries of a Vancouver neighbourhood's climate-and-food vulnerability for non-technical residents.

You will receive a JSON object with already-computed scores (0-100, higher = more vulnerable) and counts. Do not invent or recompute numbers — only phrase what is given.

Output format:
- Plain text only. No markdown, no bullet points, no headings, no bold, no quotation marks.
- 2 to 4 sentences total, written as a single short paragraph.
- Mention the neighbourhood by name if it is provided.
- Call out the single largest contributing risk factor (highest score among heat, flood, population, diversity), and briefly touch on the food-vendor mix (outdoor vs. indoor) if it adds context.
- End with one short clause giving the overall vulnerability in qualitative terms (low / moderate / high). Map overall 0-33 = low, 34-66 = moderate, 67-100 = high.
- Do not give advice or recommendations. Just describe what the data shows.`;

// Tiny in-memory cache so repeat clicks on the same area don't re-bill the API.
const cache = new Map<string, { summary: string; at: number }>();
const CACHE_TTL_MS = 1000 * 60 * 30;

function cacheKey(report: unknown): string {
  return JSON.stringify(report);
}

router.post(
  "/",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const report = req.body?.report;
      if (!report || typeof report !== "object") {
        return res.status(400).json({ error: "Missing 'report' object in body" });
      }

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

      const response = await ai.models.generateContent({
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
