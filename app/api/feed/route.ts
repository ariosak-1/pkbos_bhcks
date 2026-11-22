import { sql } from "@/lib/db";
import { handle, currentUser } from "@/lib/server";

export const GET = handle(async (req: Request) => {
  const u = await currentUser();
  const before = Number(new URL(req.url).searchParams.get("before")) || 2147483647;
  return sql(
    `SELECT ph.id, ph.uploaded_at, ph.taken_at, u.name AS trainer, u.trainer_type, u.college, p.id AS pokebos_id, p.name AS pokebos, p.domain, p.types,
       (SELECT count(*) FROM likes l WHERE l.photo_id=ph.id)::int AS likes,
       EXISTS (SELECT 1 FROM likes l WHERE l.photo_id=ph.id AND l.user_id=$1) AS liked,
       (ph.user_id = $1) AS mine
     FROM photos ph JOIN users u ON u.id=ph.user_id JOIN pokebos p ON p.id=ph.pokebos_id
     WHERE ph.id < $2 AND NOT ph.flagged ORDER BY ph.id DESC LIMIT 30`, [u?.id ?? -1, before]);
});
