import { sql } from "@/lib/db";
import { handle } from "@/lib/server";

// Monthly boards reset by filtering the ledger to the month (America/New_York). Spent points never count against you.
export const GET = handle(async (req: Request) => {
  const sp = new URL(req.url).searchParams;
  const board = sp.get("board") || "overall";
  const month = sp.get("month") === "all" ? null : sp.get("month") || new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" }).slice(0, 7);
  const type = ["college", "resident", "tourist"].includes(board) ? board : null;
  const where = `($1::text IS NULL OR to_char(l.created_at AT TIME ZONE 'America/New_York', 'YYYY-MM') = $1) AND ($2::text IS NULL OR u.trainer_type = $2)`;
  const trainers = await sql(
    `SELECT u.name, u.trainer_type, u.college, sum(l.points)::int AS points FROM points_ledger l JOIN users u ON u.id=l.user_id
     WHERE ${where} GROUP BY u.id, u.name, u.trainer_type, u.college ORDER BY points DESC LIMIT 50`, [month, type]);
  const colleges = board === "college"
    ? await sql(`SELECT u.college AS name, sum(l.points)::int AS points, count(DISTINCT u.id)::int AS trainers FROM points_ledger l JOIN users u ON u.id=l.user_id
        WHERE ${where} GROUP BY u.college ORDER BY points DESC`, [month, type])
    : [];
  return { month, board, trainers, colleges };
});
