import { sql } from "@/lib/db";
import { handle, requireUser, HttpError } from "@/lib/server";
import { planBeat } from "@/lib/beat";

async function current(userId: number) {
  const [r] = await sql<any>(
    `SELECT r.*, (SELECT json_agg(json_build_object('id', p.id, 'name', p.name, 'domain', p.domain, 'types', p.types, 'lat', p.lat, 'lng', p.lng,
        'caught', EXISTS (SELECT 1 FROM catches c WHERE c.user_id=r.user_id AND c.pokebos_id=p.id AND c.created_at >= r.started_at))
        ORDER BY array_position(r.pokebos_ids, p.id)) FROM pokebos p WHERE p.id = ANY(r.pokebos_ids)) AS stops
     FROM beat_runs r WHERE r.user_id=$1 ORDER BY r.started_at DESC LIMIT 1`, [userId]);
  if (!r) return null;
  if (typeof r.stops === "string") r.stops = JSON.parse(r.stops);
  return r;
}

// your latest run (live or finished)
export const GET = handle(async () => ({ run: await current((await requireUser()).id) }));

// POST { mins, lat, lng, words, go? } -> preview a run, or start it when go=true
export const POST = handle(async (req: Request) => {
  const u = await requireUser();
  const { mins, lat, lng, words = "", go, preview } = await req.json();
  const m = Math.round(Number(mins));
  if (!(m >= 5 && m <= 60)) throw new HttpError(400, "Pick between 5 and 60 minutes");
  if (!lat || !lng) throw new HttpError(400, "Turn on location so we know where your stop is.");
  if (go && preview) {
    const ids: string[] = preview.stops.map((s: any) => String(s.id)).slice(0, 4);
    const ok = await sql("SELECT id FROM pokebos WHERE id = ANY($1) AND active", [ids]);
    if (ok.length !== ids.length) throw new HttpError(400, "That run went stale, roll a new one");
    await sql(
      "INSERT INTO beat_runs (user_id, title, pokebos_ids, start_lat, start_lng, bonus, deadline) VALUES ($1,$2,$3,$4,$5,$6, now() + make_interval(mins => $7))",
      [u.id, String(preview.title).slice(0, 60), ids, lat, lng, Math.min(150, Number(preview.bonus) || 0), m]);
    return { run: await current(u.id) };
  }
  const plan = await planBeat(u.id, m, { lat, lng }, String(words).slice(0, 80));
  if (!plan) throw new HttpError(404, words ? "Nothing like that close enough. Try other words or more time." : "No Pokebos close enough for that window. Give yourself more time.");
  return { preview: plan };
});
