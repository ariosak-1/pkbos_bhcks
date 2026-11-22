import { cookies } from "next/headers";
import crypto from "crypto";
import { sql } from "./db";
import { BADGES, type BadgeStats } from "./seed-data";
import { recordOnChain } from "./solana";

export type User = { id: number; name: string; trainer_type: string; college: string | null; tutorial_done: boolean; tracking: boolean; solana_address: string | null };

export function hashPass(pw: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  return `${salt}:${crypto.scryptSync(pw, salt, 32).toString("hex")}`;
}
export function checkPass(pw: string, stored: string) {
  const [salt, h] = stored.split(":");
  return crypto.timingSafeEqual(Buffer.from(h, "hex"), crypto.scryptSync(pw, salt, 32));
}

export async function startSession(userId: number) {
  const token = crypto.randomBytes(24).toString("hex");
  await sql("INSERT INTO sessions (token, user_id) VALUES ($1,$2)", [token, userId]);
  (await cookies()).set("pkb", token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 90 });
}

export async function currentUser(): Promise<User | null> {
  const token = (await cookies()).get("pkb")?.value;
  if (!token) return null;
  const rows = await sql<User>(
    "SELECT u.id, u.name, u.trainer_type, u.college, u.tutorial_done, u.tracking, u.solana_address FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = $1",
    [token]
  );
  return rows[0] ?? null;
}

export class HttpError extends Error { constructor(public status: number, msg: string) { super(msg); } }

export async function requireUser() {
  const u = await currentUser();
  if (!u) throw new HttpError(401, "Not signed in");
  return u;
}

export function handle<A extends any[]>(fn: (...a: A) => Promise<unknown>) {
  return async (...a: A) => {
    try {
      const out = await fn(...a);
      return out instanceof Response ? out : Response.json(out);
    } catch (e: any) {
      if (e instanceof HttpError) return Response.json({ error: e.message }, { status: e.status });
      console.error(e);
      return Response.json({ error: "Something went wrong" }, { status: 500 });
    }
  };
}

// Earned points only ever go up (leaderboards). Spending is tracked in redemptions.
export async function award(userId: number, points: number, reason: string, ref?: string) {
  if (!points) return;
  const [row] = await sql<{ id: number }>("INSERT INTO points_ledger (user_id, points, reason, ref) VALUES ($1,$2,$3,$4) RETURNING id", [userId, points, reason, ref ?? null]);
  recordOnChain(`pokebos|points|u${userId}|${points}|${reason}|${ref ?? ""}`).then((sig) => {
    if (sig) sql("UPDATE points_ledger SET chain_sig = $1 WHERE id = $2", [sig, row.id]).catch(() => {});
  });
}

export async function userStats(userId: number) {
  const [pts] = await sql<{ earned: number; spent: number }>(
    `SELECT COALESCE((SELECT sum(points) FROM points_ledger WHERE user_id=$1),0)::int AS earned,
            COALESCE((SELECT sum(points) FROM redemptions WHERE user_id=$1),0)::int AS spent`, [userId]);
  const typeRows = await sql<{ t: string; n: number }>(
    "SELECT t, count(DISTINCT p.id)::int AS n FROM catches c JOIN pokebos p ON p.id=c.pokebos_id, unnest(p.types) t WHERE c.user_id=$1 GROUP BY t", [userId]);
  const [c] = await sql<{ caught: number; legendary: number }>(
    "SELECT count(DISTINCT pokebos_id)::int AS caught, count(DISTINCT pokebos_id) FILTER (WHERE p.rarity='legendary')::int AS legendary FROM catches c JOIN pokebos p ON p.id=c.pokebos_id WHERE c.user_id=$1", [userId]);
  const [m] = await sql<{ m: number }>("SELECT COALESCE(sum(meters) FILTER (WHERE on_transit),0)::float AS m FROM location_pings WHERE user_id=$1", [userId]);
  const [h] = await sql<{ n: number }>("SELECT count(*)::int AS n FROM hunt_trips WHERE user_id=$1 AND completed_at IS NOT NULL", [userId]);
  const [total] = await sql<{ n: number }>("SELECT count(*)::int AS n FROM pokebos WHERE active");
  const types = Object.fromEntries(typeRows.map((r) => [r.t, r.n]));
  const s: BadgeStats = { caught: c.caught, legendary: c.legendary, types, tMiles: +(m.m / 1609.34).toFixed(1), hunts: h.n };
  return { ...s, earned: pts.earned, balance: pts.earned - pts.spent, dexTotal: total.n };
}

export async function syncBadges(userId: number) {
  const s = await userStats(userId);
  const have = new Set((await sql<{ badge_id: string }>("SELECT badge_id FROM user_badges WHERE user_id=$1", [userId])).map((r) => r.badge_id));
  const fresh = BADGES.filter((b) => !have.has(b.id) && b.test(s));
  for (const b of fresh) {
    await sql("INSERT INTO user_badges (user_id, badge_id) VALUES ($1,$2) ON CONFLICT DO NOTHING", [userId, b.id]);
    recordOnChain(`pokebos|badge|u${userId}|${b.id}`).then((sig) => {
      if (sig) sql("UPDATE user_badges SET chain_sig=$1 WHERE user_id=$2 AND badge_id=$3", [sig, userId, b.id]).catch(() => {});
    });
  }
  return fresh.map((b) => b.name);
}

export function bostonDate(d: Date) {
  return d.toLocaleDateString("en-CA", { timeZone: "America/New_York" });
}
