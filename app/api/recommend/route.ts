import { sql, inSeason } from "@/lib/db";
import { handle, currentUser } from "@/lib/server";
import { haversine } from "@/lib/mbta";

const RARITY_BONUS: Record<string, number> = { common: 0, uncommon: 1, rare: 2, legendary: 3 };

export const GET = handle(async (req: Request) => {
  const u = await currentUser();
  const sp = new URL(req.url).searchParams;
  let lat = Number(sp.get("lat")) || null, lng = Number(sp.get("lng")) || null;
  if (u && !lat) {
    const [last] = await sql<any>("SELECT lat, lng FROM location_pings WHERE user_id=$1 ORDER BY ts DESC LIMIT 1", [u.id]);
    if (last) ({ lat, lng } = last);
  }
  const all = await sql<any>(
    `SELECT p.id, p.dex_no, p.name, p.types, p.rarity, p.points, p.lat, p.lng, p.domain, p.is_event, p.season_from, p.season_to,
       (SELECT count(*) FROM catches c WHERE c.pokebos_id=p.id AND c.user_id=$1)::int AS level FROM pokebos p WHERE p.active`, [u?.id ?? -1]);
  const affinity: Record<string, number> = {};
  for (const p of all) if (p.level) for (const t of p.types) affinity[t] = (affinity[t] || 0) + 1 + p.level * 0.2;
  const open = all.filter((p) => !p.level && inSeason(p.season_from, p.season_to));
  const withDist = open.map((p) => ({ ...p, dist: lat && lng ? Math.round(haversine(lat, lng, p.lat, p.lng)) : null }));
  const score = (p: any) => p.types.reduce((s: number, t: string) => s + (affinity[t] || 0), 0) * 2 + RARITY_BONUS[p.rarity] - (p.dist ? p.dist / 1500 : 0);
  const forYou = [...withDist].sort((a, b) => score(b) - score(a)).slice(0, 6);
  const nearby = lat ? [...withDist].sort((a, b) => a.dist! - b.dist!).slice(0, 6) : [];
  const events = all.filter((p) => p.is_event).map((p) => ({ ...p, inSeason: inSeason(p.season_from, p.season_to) })).sort((a, b) => Number(b.inSeason) - Number(a.inSeason));
  const caught = all.filter((p) => p.level).length;
  return { forYou, nearby, events, caught, total: all.length, hasAffinity: Object.keys(affinity).length > 0 };
});
