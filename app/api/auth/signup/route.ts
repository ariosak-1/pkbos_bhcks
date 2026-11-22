import { sql } from "@/lib/db";
import { handle, hashPass, startSession, HttpError } from "@/lib/server";

export const POST = handle(async (req: Request) => {
  const { name, password, trainerType, college, crimsonShe } = await req.json();
  const clean = String(name || "").trim().toUpperCase().slice(0, 12);
  if (!/^[A-Z0-9 _.-]{2,12}$/.test(clean)) throw new HttpError(400, "Name must be 2-12 letters or numbers");
  if (String(password || "").length < 4) throw new HttpError(400, "Password too short");
  if (!["college", "resident", "tourist"].includes(trainerType)) throw new HttpError(400, "Pick a trainer type");
  const taken = await sql("SELECT 1 FROM users WHERE name=$1", [clean]);
  if (taken.length) throw new HttpError(409, "That name is taken");
  const [u] = await sql<{ id: number }>(
    "INSERT INTO users (name, pass_hash, trainer_type, college, crimson_she) VALUES ($1,$2,$3,$4,$5) RETURNING id",
    [clean, hashPass(String(password)), trainerType, trainerType === "college" ? college || "Other" : null, !!crimsonShe]
  );
  await startSession(u.id);
  return { ok: true };
});
