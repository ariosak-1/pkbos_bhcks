import { sql } from "@/lib/db";
import { handle, currentUser } from "@/lib/server";

export const GET = handle(async () => {
  const u = await currentUser();
  const hunts = await sql<any>(
    `SELECT h.*, uh.started_at, uh.completed_at FROM hunts h LEFT JOIN user_hunts uh ON uh.hunt_id=h.id AND uh.user_id=$1 ORDER BY h.bonus`, [u?.id ?? -1]);
  const pk = await sql<any>("SELECT id, name, domain, lat, lng, types FROM pokebos");
  const out = [];
  for (const h of hunts) {
    const caught = h.started_at
      ? (await sql<{ pokebos_id: string }>("SELECT DISTINCT pokebos_id FROM catches WHERE user_id=$1 AND pokebos_id = ANY($2) AND created_at >= $3", [u!.id, h.pokebos_ids, h.started_at])).map((r) => r.pokebos_id)
      : [];
    out.push({ ...h, stops: h.pokebos_ids.map((id: string) => ({ ...pk.find((p) => p.id === id), caught: caught.includes(id) })) });
  }
  return out;
});
