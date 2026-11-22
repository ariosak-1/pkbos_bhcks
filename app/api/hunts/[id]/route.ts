import { sql } from "@/lib/db";
import { handle, requireUser } from "@/lib/server";

export const POST = handle(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const u = await requireUser();
  const { id } = await params;
  await sql("INSERT INTO user_hunts (user_id, hunt_id) VALUES ($1,$2) ON CONFLICT (user_id, hunt_id) DO UPDATE SET started_at = now(), completed_at = NULL WHERE user_hunts.completed_at IS NOT NULL", [u.id, id]);
  return { ok: true };
});
