import { sql, inSeason } from "@/lib/db";
import { handle, requireUser, syncBadges } from "@/lib/server";
import { haversine, nearestStops } from "@/lib/mbta";

// Opt-in location tracking. Pings land in a Timescale hypertable on TigerData.
// Consecutive pings moving at train speed near stations count as T miles.
export const POST = handle(async (req: Request) => {
  const u = await requireUser();
  const { lat, lng } = await req.json();
  if (typeof lat !== "number" || typeof lng !== "number") return { nearby: [] };
  const [last] = await sql<any>("SELECT lat, lng, ts FROM location_pings WHERE user_id=$1 ORDER BY ts DESC LIMIT 1", [u.id]);
  let meters = 0, speed: number | null = null, onTransit = false;
  if (last) {
    meters = haversine(last.lat, last.lng, lat, lng);
    const secs = (Date.now() - new Date(last.ts).getTime()) / 1000;
    if (secs > 5 && secs < 900) {
      speed = (meters / secs) * 3.6;
      onTransit = speed > 12 && speed < 90 && nearestStops(lat, lng, 1)[0].dist < 900 && nearestStops(last.lat, last.lng, 1)[0].dist < 900;
    }
  }
  await sql("INSERT INTO location_pings (user_id, lat, lng, speed_kmh, on_transit, meters) VALUES ($1,$2,$3,$4,$5,$6)", [u.id, lat, lng, speed, onTransit, meters]);
  if (onTransit) await syncBadges(u.id);
  const pk = await sql<any>(
    `SELECT p.id, p.name, p.lat, p.lng, p.domain, p.season_from, p.season_to FROM pokebos p
     WHERE p.active AND NOT EXISTS (SELECT 1 FROM catches c WHERE c.pokebos_id=p.id AND c.user_id=$1)`, [u.id]);
  const nearby = pk
    .filter((p) => inSeason(p.season_from, p.season_to))
    .map((p) => ({ id: p.id, name: p.name, domain: p.domain, dist: Math.round(haversine(lat, lng, p.lat, p.lng)) }))
    .filter((p) => p.dist < 350)
    .sort((a, b) => a.dist - b.dist);
  return { nearby, onTransit };
});
