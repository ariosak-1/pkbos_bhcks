import { sql } from "@/lib/db";
import { handle, requireUser, HttpError } from "@/lib/server";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handle(async (_req: Request, { params }: Ctx) => {
  const id = Number((await params).id);
  return sql(
    `SELECT c.id, c.body, c.created_at, u.name AS trainer FROM comments c JOIN users u ON u.id=c.user_id
     WHERE c.photo_id=$1 ORDER BY c.id LIMIT 200`, [id]);
});

export const POST = handle(async (req: Request, { params }: Ctx) => {
  const u = await requireUser();
  const id = Number((await params).id);
  const body = String((await req.json()).body ?? "").replace(/\s+/g, " ").trim().slice(0, 200);
  if (!body) throw new HttpError(400, "Say something first");
  const [ph] = await sql("SELECT 1 FROM photos WHERE id=$1", [id]);
  if (!ph) throw new HttpError(404, "No such photo");
  // light spam brake: 5 comments a minute
  const [r] = await sql<{ n: number }>("SELECT count(*)::int AS n FROM comments WHERE user_id=$1 AND created_at > now() - interval '1 minute'", [u.id]);
  if (r.n >= 5) throw new HttpError(429, "Slow down a little");
  const [c] = await sql("INSERT INTO comments (photo_id, user_id, body) VALUES ($1,$2,$3) RETURNING id, body, created_at", [id, u.id, body]);
  return { ...c, trainer: u.name };
});
