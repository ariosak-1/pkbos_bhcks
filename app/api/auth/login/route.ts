import { sql } from "@/lib/db";
import { handle, checkPass, startSession, HttpError } from "@/lib/server";

export const POST = handle(async (req: Request) => {
  const { name, password } = await req.json();
  const [u] = await sql<{ id: number; pass_hash: string }>("SELECT id, pass_hash FROM users WHERE name=$1", [String(name || "").trim().toUpperCase()]);
  if (!u || !checkPass(String(password || ""), u.pass_hash)) throw new HttpError(401, "Wrong name or password");
  await startSession(u.id);
  return { ok: true };
});
