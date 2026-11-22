import exifr from "exifr";
import { sql, inSeason } from "@/lib/db";
import { handle, requireUser, award, syncBadges, bostonDate, HttpError } from "@/lib/server";
import { putPhoto } from "@/lib/storage";
import { haversine } from "@/lib/mbta";
import { aiEnabled, identifyPhoto, type Candidate } from "@/lib/ai";

const MAX_BYTES = 10 * 1024 * 1024;
const MAX_AGE_DAYS = 3; // anti-cheat: catches must be fresh photos
const LEVEL_UP_POINTS = 5;

export const POST = handle(async (req: Request) => {
  const user = await requireUser();
  const form = await req.formData();
  const file = form.get("photo");
  if (!(file instanceof File)) throw new HttpError(400, "No photo");
  if (file.size > MAX_BYTES) throw new HttpError(413, "Photo too large (10MB max)");
  const type = file.type || "image/jpeg";
  if (!type.startsWith("image/")) throw new HttpError(400, "That isn't a photo");
  const buf = Buffer.from(await file.arrayBuffer());

  // --- EXIF: when + where the photo was taken ---
  let exif: any = null;
  try { exif = await exifr.parse(buf, { gps: true, exif: true, tiff: true, xmp: false, icc: false, iptc: false }); } catch {}
  const takenAt: Date | null = exif?.DateTimeOriginal || exif?.CreateDate || null;
  const when = takenAt ?? new Date();
  if (takenAt && Date.now() - takenAt.getTime() > MAX_AGE_DAYS * 864e5)
    throw new HttpError(422, `This photo was taken ${takenAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}. Catch it fresh!`);
  const lat = exif?.latitude ?? (Number(form.get("lat")) || null);
  const lng = exif?.longitude ?? (Number(form.get("lng")) || null);

  // --- Candidates: near the photo's location, in season on the day it was taken ---
  const all = await sql<any>("SELECT id, name, blurb, lat, lng, types, rarity, points, season_from, season_to FROM pokebos WHERE active");
  const seasonal = all.filter((p) => inSeason(p.season_from, p.season_to, when));
  const ranked = lat && lng
    ? seasonal.map((p) => ({ ...p, dist: haversine(lat, lng, p.lat, p.lng) })).filter((p) => p.dist < 1500).sort((a, b) => a.dist - b.dist)
    : seasonal;
  const pool = (ranked.length ? ranked : seasonal).slice(0, 25);

  const confirmId = form.get("pokebosId")?.toString();
  let chosen: any = null, confidence: number | null = null, abilityIds: number[] = [];
  if (confirmId) {
    chosen = seasonal.find((p) => p.id === confirmId);
    if (!chosen) {
      const ev = all.find((p) => p.id === confirmId);
      throw new HttpError(422, ev ? `${ev.name} isn't around on that date.` : "Unknown Pokebos");
    }
    const claimed = Number(form.get("abilityId"));
    if (claimed && !aiEnabled()) abilityIds = [claimed]; // with AI on, abilities must be seen in the photo
  }

  if (!chosen && aiEnabled()) {
    const abil = await sql<any>("SELECT id, name, hint, pokebos_id FROM abilities WHERE pokebos_id = ANY($1)", [pool.map((p) => p.id)]);
    const cands: Candidate[] = pool.map((p) => ({ id: p.id, name: p.name, blurb: p.blurb, abilities: abil.filter((a) => a.pokebos_id === p.id) }));
    try {
      const r = await identifyPhoto(buf, type, cands);
      if (r?.pokebosId && r.confidence >= 0.5) {
        chosen = pool.find((p) => p.id === r.pokebosId);
        confidence = r.confidence;
        abilityIds = r.abilityIds;
      }
    } catch (e) { console.warn("[catch] AI identify failed", (e as Error).message); }
  } else if (!chosen && ranked.length && ranked[0].dist < 120) {
    chosen = ranked[0]; // no AI key: trust a very close GPS fix
  }

  if (!chosen) {
    return { status: "choose", candidates: pool.slice(0, 8).map((p) => ({ id: p.id, name: p.name, types: p.types, dist: p.dist ? Math.round(p.dist) : null })) };
  }

  // --- Same-day rule ---
  const day = bostonDate(when);
  const dupe = await sql("SELECT 1 FROM catches WHERE user_id=$1 AND pokebos_id=$2 AND caught_on=$3", [user.id, chosen.id, day]);
  if (dupe.length) return Response.json({ status: "dupe", error: `Oops! Looks like you already caught ${chosen.name} today.` }, { status: 409 });

  const key = await putPhoto(buf, type);
  const [photo] = await sql<{ id: number }>(
    "INSERT INTO photos (user_id, pokebos_id, storage_key, content_type, taken_at, lat, lng, ai_confidence, flagged) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id",
    [user.id, chosen.id, key, type, takenAt, lat, lng, confidence, (!takenAt && !lat) || (!!confirmId && aiEnabled())] // review queue: no metadata, or AI couldn't confirm
  );
  await sql("INSERT INTO catches (user_id, pokebos_id, photo_id, caught_on) VALUES ($1,$2,$3,$4)", [user.id, chosen.id, photo.id, day]);
  const level = (await sql<{ n: number }>("SELECT count(*)::int AS n FROM catches WHERE user_id=$1 AND pokebos_id=$2", [user.id, chosen.id]))[0].n;
  const first = level === 1;
  let points = first ? chosen.points : LEVEL_UP_POINTS;
  await award(user.id, points, first ? "catch" : "level-up", chosen.id);

  // --- Abilities shown in the photo ---
  const newAbilities: string[] = [];
  if (abilityIds.length) {
    const valid = await sql<any>(
      `SELECT a.id, a.name, a.points FROM abilities a WHERE a.pokebos_id=$1 AND a.id = ANY($2)
       AND NOT EXISTS (SELECT 1 FROM user_abilities ua WHERE ua.user_id=$3 AND ua.ability_id=a.id)`, [chosen.id, abilityIds, user.id]);
    for (const a of valid) {
      await sql("INSERT INTO user_abilities (user_id, ability_id, photo_id) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING", [user.id, a.id, photo.id]);
      await award(user.id, a.points, "ability", String(a.id));
      points += a.points;
      newAbilities.push(a.name);
    }
  }

  // --- Hunts ---
  const huntsCompleted: string[] = [];
  const hunts = await sql<any>(
    `SELECT h.*, uh.started_at FROM user_hunts uh JOIN hunts h ON h.id=uh.hunt_id
     WHERE uh.user_id=$1 AND uh.completed_at IS NULL AND $2 = ANY(h.pokebos_ids)`, [user.id, chosen.id]);
  for (const h of hunts) {
    const got = await sql<{ n: number }>(
      "SELECT count(DISTINCT pokebos_id)::int AS n FROM catches WHERE user_id=$1 AND pokebos_id = ANY($2) AND created_at >= $3", [user.id, h.pokebos_ids, h.started_at]);
    if (got[0].n >= h.pokebos_ids.length) {
      await sql("UPDATE user_hunts SET completed_at=now() WHERE user_id=$1 AND hunt_id=$2", [user.id, h.id]);
      await award(user.id, h.bonus, "hunt", h.id);
      points += h.bonus;
      huntsCompleted.push(h.name);
    }
  }

  const badges = await syncBadges(user.id);
  return { status: "caught", pokebos: { id: chosen.id, name: chosen.name, types: chosen.types, rarity: chosen.rarity }, level, first, points, newAbilities, huntsCompleted, badges, confidence };
});
