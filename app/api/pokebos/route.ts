import { sql, inSeason } from "@/lib/db";
import { handle, currentUser } from "@/lib/server";

export const GET = handle(async () => {
  const u = await currentUser();
  const rows = await sql<any>(
    `SELECT p.id, p.dex_no, p.name, p.types, p.rarity, p.points, p.lat, p.lng, p.domain, p.is_event, p.season_from, p.season_to,
       (SELECT count(*) FROM catches c WHERE c.pokebos_id=p.id AND c.user_id=$1)::int AS level
     FROM pokebos p ORDER BY p.dex_no`, [u?.id ?? -1]);
  return rows.map((p) => ({ ...p, inSeason: inSeason(p.season_from, p.season_to) }));
});
