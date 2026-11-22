import { sql } from "@/lib/db";
import { handle, currentUser } from "@/lib/server";
import { expandSearch } from "@/lib/ai";
import { planRoute } from "@/lib/mbta";

export const GET = handle(async (req: Request) => {
  const sp = new URL(req.url).searchParams;
  const q = (sp.get("q") || "").trim().slice(0, 80);
  if (!q) return { results: [], terms: [] };
  const u = await currentUser();
  const ai = await expandSearch(q);
  const words = q.toLowerCase().split(/\s+/).filter((w) => w.length > 2 && !["food", "place", "places", "near", "the", "and", "some"].includes(w));
  const terms = [...new Set([q.toLowerCase(), ...words, ...(ai?.terms || []).map((t) => t.toLowerCase())])];
  const types = ai?.types || [];
  const rows = await sql<any>(
    `SELECT p.id, p.name, p.types, p.rarity, p.lat, p.lng, p.domain, p.is_event,
       (SELECT count(*) FROM catches c WHERE c.pokebos_id=p.id AND c.user_id=$3)::int AS level,
       (SELECT count(*) FROM unnest($1::text[]) t WHERE p.name ILIKE '%'||t||'%' OR p.blurb ILIKE '%'||t||'%' OR t = ANY(p.types)
          OR EXISTS (SELECT 1 FROM abilities a WHERE a.pokebos_id=p.id AND (a.name ILIKE '%'||t||'%' OR a.type ILIKE '%'||t||'%' OR a.hint ILIKE '%'||t||'%')))::int
       + (SELECT count(*) FROM unnest($2::text[]) t WHERE t = ANY(p.types))::int AS score,
       ARRAY(SELECT a.name FROM abilities a WHERE a.pokebos_id=p.id AND EXISTS (SELECT 1 FROM unnest($1::text[]) t WHERE a.name ILIKE '%'||t||'%' OR a.type ILIKE '%'||t||'%' OR a.hint ILIKE '%'||t||'%')) AS matched
     FROM pokebos p ORDER BY score DESC, p.dex_no LIMIT 10`, [terms, types, u?.id ?? -1]);
  const lat = Number(sp.get("lat")), lng = Number(sp.get("lng"));
  const results = rows.filter((r) => r.score > 0).map((r) => ({
    ...r,
    route: lat && lng ? planRoute({ lat, lng }, { lat: r.lat, lng: r.lng, name: r.name }) : null,
  }));
  return { results, terms, ai: !!ai };
});
