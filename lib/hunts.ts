import { sql, inSeason } from "./db";
import { planRoute, haversine, addLivePredictions, type Plan } from "./mbta";
import { bostonDate } from "./server";

// a hunt = ride the T from where you are to one pokebos somewhere else
export const MIN_HUNT_M = 1000;

export function huntBonus(plan: Plan, points: number) {
  const rides = plan.legs.filter((l) => l.kind === "ride");
  const stops = rides.reduce((n, l) => n + (l.kind === "ride" ? l.stops : 0), 0);
  return Math.min(300, Math.round(20 + stops * 6 + (rides.length - 1) * 20 + points / 2));
}

const rides = (p: Plan) => p.legs.some((l) => l.kind === "ride");

// same few offers all day, different tomorrow
function hash(s: string) {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

export async function huntOffers(userId: number, lat: number, lng: number, n = 4) {
  const pk = await sql<any>(
    `SELECT p.id, p.name, p.domain, p.types, p.rarity, p.points, p.lat, p.lng, p.season_from, p.season_to,
       EXISTS (SELECT 1 FROM catches c WHERE c.user_id=$1 AND c.pokebos_id=p.id) AS caught
     FROM pokebos p WHERE p.active`, [userId]);
  const day = bostonDate(new Date());
  const pool = pk
    .filter((p) => inSeason(p.season_from, p.season_to))
    .map((p) => ({ ...p, dist: haversine(lat, lng, p.lat, p.lng) }))
    .filter((p) => p.dist >= MIN_HUNT_M && p.dist <= 12000)
    .sort((a, b) => Number(a.caught) - Number(b.caught) || hash(day + userId + a.id) - hash(day + userId + b.id))
    .slice(0, 40);
  const out: any[] = [];
  const usedLines = new Set<string>(), usedTypes = new Set<string>();
  for (const strict of [true, false]) {
    for (const p of pool) {
      if (out.length >= n) break;
      if (out.some((o) => o.target.id === p.id)) continue;
      const plan = planRoute({ lat, lng }, { lat: p.lat, lng: p.lng, name: p.name });
      if (!rides(plan)) continue;
      const line = (plan.legs.filter((l) => l.kind === "ride").pop() as any).route;
      if (strict && (usedLines.has(line) || usedTypes.has(p.types[0]))) continue;
      usedLines.add(line); usedTypes.add(p.types[0]);
      const { season_from, season_to, ...target } = p;
      out.push({ target: { ...target, dist: Math.round(p.dist) }, plan, bonus: huntBonus(plan, p.points) });
    }
  }
  return out;
}

export async function activeHunt(userId: number) {
  const [t] = await sql<any>(
    `SELECT t.id, t.bonus, t.plan, t.started_at, t.from_lat, t.from_lng,
       json_build_object('id', p.id, 'name', p.name, 'domain', p.domain, 'types', p.types, 'rarity', p.rarity, 'lat', p.lat, 'lng', p.lng) AS target
     FROM hunt_trips t JOIN pokebos p ON p.id=t.pokebos_id
     WHERE t.user_id=$1 AND t.completed_at IS NULL AND t.gave_up_at IS NULL ORDER BY t.started_at DESC LIMIT 1`, [userId]);
  if (!t) return null;
  if (typeof t.plan === "string") t.plan = JSON.parse(t.plan);
  if (typeof t.target === "string") t.target = JSON.parse(t.target);
  await addLivePredictions(t.plan.legs).catch(() => {});
  return t;
}

export { rides as hasRide };
