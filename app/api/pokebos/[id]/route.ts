import { sql, inSeason } from "@/lib/db";
import { handle, currentUser, HttpError } from "@/lib/server";
import { nearestStops } from "@/lib/mbta";

export const GET = handle(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const u = await currentUser();
  const uid = u?.id ?? -1;
  const [p] = await sql<any>("SELECT * FROM pokebos WHERE id=$1", [id]);
  if (!p) throw new HttpError(404, "No such Pokebos");
  const abilities = await sql(
    `SELECT a.id, a.name, a.type, a.hint, a.points, (ua.user_id IS NOT NULL) AS unlocked
     FROM abilities a LEFT JOIN user_abilities ua ON ua.ability_id=a.id AND ua.user_id=$2 WHERE a.pokebos_id=$1 ORDER BY a.id`, [id, uid]);
  const mine = await sql(
    "SELECT ph.id, ph.taken_at, ph.uploaded_at FROM photos ph WHERE ph.pokebos_id=$1 AND ph.user_id=$2 ORDER BY ph.uploaded_at DESC", [id, uid]);
  const popular = await sql(
    `SELECT ph.id, u.name AS trainer, count(l.user_id)::int AS likes FROM photos ph JOIN users u ON u.id=ph.user_id
     LEFT JOIN likes l ON l.photo_id=ph.id WHERE ph.pokebos_id=$1 AND ph.user_id<>$2 AND NOT ph.flagged
     GROUP BY ph.id, u.name ORDER BY likes DESC, ph.id DESC LIMIT 24`, [id, uid]);
  const top = await sql(
    `SELECT u.name, u.trainer_type, count(*)::int AS level FROM catches c JOIN users u ON u.id=c.user_id
     WHERE c.pokebos_id=$1 GROUP BY u.id, u.name, u.trainer_type ORDER BY level DESC, min(c.created_at) LIMIT 10`, [id]);
  const level = (await sql<{ n: number }>("SELECT count(*)::int AS n FROM catches WHERE pokebos_id=$1 AND user_id=$2", [id, uid]))[0].n;
  return { ...p, level, inSeason: inSeason(p.season_from, p.season_to), abilities, mine, popular, top, stops: nearestStops(p.lat, p.lng, 2) };
});
