import { handle, HttpError } from "@/lib/server";
import { aiEnabled, crimson } from "@/lib/ai";

export const POST = handle(async (req: Request) => {
  const { q, lat, lng } = await req.json();
  if (!q || String(q).length > 300) throw new HttpError(400, "Ask me something short!");
  if (!aiEnabled()) return { answer: "My Pokedex... er, Bostondex radio is offline! Try SEARCH for now." };
  const where = lat && lng ? `\n(Trainer is at lat ${lat}, lng ${lng})` : "";
  try {
    const res = await crimson.generate(String(q) + where, { maxSteps: 4 } as any);
    return { answer: res.text };
  } catch (e: any) {
    // usually a bad/expired gemini key or quota. log the real reason, keep the professor in character
    console.error("[ask] gemini failed:", e?.message || e);
    const key = /api key|permission|unauth|401|403/i.test(String(e?.message)) ? " (Gemini didn't accept the API key.)" : "";
    return { answer: `Static on the Bostondex radio... try again in a sec, or use SEARCH.${key}` };
  }
});
