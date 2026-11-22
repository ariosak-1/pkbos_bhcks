import crypto from "crypto";
import { sql } from "@/lib/db";
import { handle, requireUser, userStats, HttpError } from "@/lib/server";

export const GET = handle(async () => sql("SELECT * FROM rewards ORDER BY cost"));

// Gift card codes are placeholders until partners issue real ones.
export const POST = handle(async (req: Request) => {
  const u = await requireUser();
  const { rewardId } = await req.json();
  const [r] = await sql<any>("SELECT * FROM rewards WHERE id=$1", [rewardId]);
  if (!r) throw new HttpError(404, "No such reward");
  const s = await userStats(u.id);
  if (s.balance < r.cost) throw new HttpError(400, "Not enough points");
  const code = `PKB-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
  await sql("INSERT INTO redemptions (user_id, reward_id, points, code) VALUES ($1,$2,$3,$4)", [u.id, r.id, r.cost, code]);
  return { code, name: r.name };
});
