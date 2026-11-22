import { handle, HttpError } from "@/lib/server";
import { sql } from "@/lib/db";
import { aiEnabled, crimson } from "@/lib/ai";

const SKIP = new Set("where what which who how can get find the and for any some near good best place places want need you are there here with like should food".split(" "));

// no-ai answer: pull a few matching pokebos straight from the db
async function fallback(q: string) {
  const words = (q.toLowerCase().match(/[a-z]{3,}/g) || []).filter((w) => !SKIP.has(w));
  const rows = words.length
    ? await sql<{ name: string }>(
        `SELECT DISTINCT p.name, p.dex_no FROM pokebos p LEFT JOIN abilities a ON a.pokebos_id=p.id
         WHERE p.active AND EXISTS (SELECT 1 FROM unnest($1::text[]) w WHERE p.name ILIKE '%'||w||'%' OR a.name ILIKE '%'||w||'%' OR a.hint ILIKE '%'||w||'%' OR w = ANY(p.types))
         ORDER BY p.dex_no LIMIT 3`, [words])
    : [];
  return rows.length
    ? `Hmm, my notes say: ${rows.map((r) => r.name).join(", ")}. Try SEARCH for the T route!`
    : "Static on the Bostondex radio... try SEARCH for now.";
}

export const POST = handle(async (req: Request) => {
  const { q, lat, lng } = await req.json();
  if (!q || String(q).length > 300) throw new HttpError(400, "Ask me something short!");
  if (!aiEnabled()) return { answer: "My Pokedex... er, Bostondex radio is offline! Try SEARCH for now." };
  const where = lat && lng ? `\n(Trainer is at lat ${lat}, lng ${lng})` : "";
  try {
    // tool loops on a slow model can hang the request, so cap it
    const res = await Promise.race([
      crimson.generate(String(q) + where, { maxSteps: 4 } as any),
      new Promise<null>((ok) => setTimeout(() => ok(null), 15000)),
    ]);
    const text = res?.text?.trim();
    if (text) return { answer: text };
    console.warn("[ask] gemini gave no answer in time, using fallback");
  } catch (e: any) {
    console.error("[ask] gemini failed:", e?.message || e);
  }
  return { answer: await fallback(String(q)) };
});
