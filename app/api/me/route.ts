import { sql } from "@/lib/db";
import { handle, currentUser, requireUser, userStats, syncBadges } from "@/lib/server";
import { BADGES } from "@/lib/seed-data";
import { explorerUrl, solanaEnabled } from "@/lib/solana";
import { aiEnabled } from "@/lib/ai";

export const GET = handle(async () => {
  const u = await currentUser();
  if (!u) return { user: null };
  await syncBadges(u.id);
  const stats = await userStats(u.id);
  const owned = await sql<{ badge_id: string; chain_sig: string | null; earned_at: string }>("SELECT badge_id, chain_sig, earned_at FROM user_badges WHERE user_id=$1", [u.id]);
  const badges = BADGES.map((b) => {
    const o = owned.find((x) => x.badge_id === b.id);
    return { id: b.id, name: b.name, color: b.color, earned: !!o, chainUrl: o?.chain_sig ? explorerUrl(o.chain_sig) : null };
  });
  const redemptions = await sql("SELECT r.code, r.points, r.created_at, w.name FROM redemptions r JOIN rewards w ON w.id=r.reward_id WHERE r.user_id=$1 ORDER BY r.created_at DESC", [u.id]);
  return { user: u, stats, badges, redemptions, features: { ai: aiEnabled(), solana: solanaEnabled(), postgres: !!process.env.DATABASE_URL } };
});

export const PATCH = handle(async (req: Request) => {
  const u = await requireUser();
  const body = await req.json();
  if (typeof body.tutorialDone === "boolean") await sql("UPDATE users SET tutorial_done=$1 WHERE id=$2", [body.tutorialDone, u.id]);
  if (typeof body.tracking === "boolean") await sql("UPDATE users SET tracking=$1 WHERE id=$2", [body.tracking, u.id]);
  return { ok: true };
});
