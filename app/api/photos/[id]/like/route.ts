import { sql } from "@/lib/db";
import { handle, requireUser, award, HttpError } from "@/lib/server";

// A like is worth 1 point to the photo's owner. Likes can't be undone (no like/unlike farming).
export const POST = handle(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const u = await requireUser();
  const id = Number((await params).id);
  const [ph] = await sql<{ user_id: number }>("SELECT user_id FROM photos WHERE id=$1", [id]);
  if (!ph) throw new HttpError(404, "No such photo");
  if (ph.user_id === u.id) throw new HttpError(400, "Can't like your own catch");
  const ins = await sql("INSERT INTO likes (user_id, photo_id) VALUES ($1,$2) ON CONFLICT DO NOTHING RETURNING 1", [u.id, id]);
  if (ins.length) await award(ph.user_id, 1, "like", String(id));
  const [c] = await sql<{ n: number }>("SELECT count(*)::int AS n FROM likes WHERE photo_id=$1", [id]);
  return { likes: c.n, liked: true };
});
