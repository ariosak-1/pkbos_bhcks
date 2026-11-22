import { cookies } from "next/headers";
import { sql } from "@/lib/db";
import { handle } from "@/lib/server";

export const POST = handle(async () => {
  const jar = await cookies();
  const t = jar.get("pkb")?.value;
  if (t) await sql("DELETE FROM sessions WHERE token=$1", [t]);
  jar.delete("pkb");
  return { ok: true };
});
