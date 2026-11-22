import { sql } from "@/lib/db";
import { handle, requireUser, HttpError } from "@/lib/server";
import { planRoute, haversine } from "@/lib/mbta";
import { huntOffers, activeHunt, huntBonus, hasRide, MIN_HUNT_M } from "@/lib/hunts";

// GET ?lat&lng -> your current hunt + a few places worth riding to
export const GET = handle(async (req: Request) => {
  const u = await requireUser();
  const q = new URL(req.url).searchParams;
  const lat = Number(q.get("lat")), lng = Number(q.get("lng"));
  const [done] = await sql<{ n: number; pts: number }>(
    "SELECT count(*)::int AS n, COALESCE(sum(bonus),0)::int AS pts FROM hunt_trips WHERE user_id=$1 AND completed_at IS NOT NULL", [u.id]);
  const active = await activeHunt(u.id);
  const offers = lat && lng ? (await huntOffers(u.id, lat, lng, 5)).filter((o) => o.target.id !== active?.target.id).slice(0, 4) : [];
  return {
    active,
    offers,
    needLocation: !(lat && lng),
    completed: done.n,
    earned: done.pts,
  };
});

// POST { to, lat, lng } -> start a hunt (replaces any hunt you're on)
export const POST = handle(async (req: Request) => {
  const u = await requireUser();
  const { to, lat, lng } = await req.json();
  if (!lat || !lng) throw new HttpError(400, "Turn on location so we know where you're starting from.");
  const [p] = await sql<any>("SELECT id, name, lat, lng, points FROM pokebos WHERE id=$1 AND active", [to]);
  if (!p) throw new HttpError(404, "No such Pokebos");
  if (haversine(lat, lng, p.lat, p.lng) < MIN_HUNT_M) throw new HttpError(400, `${p.name} is walking distance. Just go catch it!`);
  const plan = planRoute({ lat, lng }, { lat: p.lat, lng: p.lng, name: p.name });
  if (!hasRide(plan)) throw new HttpError(400, `${p.name} is walking distance. Just go catch it!`);
  await sql("UPDATE hunt_trips SET gave_up_at=now() WHERE user_id=$1 AND completed_at IS NULL AND gave_up_at IS NULL", [u.id]);
  await sql("INSERT INTO hunt_trips (user_id, pokebos_id, from_lat, from_lng, bonus, plan) VALUES ($1,$2,$3,$4,$5,$6)",
    [u.id, p.id, lat, lng, huntBonus(plan, p.points), JSON.stringify(plan)]);
  return { active: await activeHunt(u.id) };
});

export const DELETE = handle(async () => {
  const u = await requireUser();
  await sql("UPDATE hunt_trips SET gave_up_at=now() WHERE user_id=$1 AND completed_at IS NULL AND gave_up_at IS NULL", [u.id]);
  return { ok: true };
});
