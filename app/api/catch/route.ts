import exifr from "exifr";
import { sql, inSeason } from "@/lib/db";
import { handle, requireUser, award, syncBadges, bostonDate, HttpError } from "@/lib/server";
import { putPhoto } from "@/lib/storage";
import { haversine } from "@/lib/mbta";
import { aiEnabled, identifyPhoto, verifyPhoto, type Candidate } from "@/lib/ai";

const MAX_BYTES = 10 * 1024 * 1024;
const MAX_AGE_DAYS = 3; // anti-cheat: catches must be fresh photos
const LEVEL_UP_POINTS = 5;
const NEAR_M = 400; // how close your location has to be when the AI can't vouch for the photo

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
  let aiWorked = false;
  const abilitiesFor = async (ids: string[]) => {
    const abil = await sql<any>("SELECT id, name, hint, pokebos_id FROM abilities WHERE pokebos_id = ANY($1)", [ids]);
    return (p: any): Candidate => ({ id: p.id, name: p.name, blurb: p.blurb, abilities: abil.filter((a) => a.pokebos_id === p.id) });
  };
  const nearYou = (p: any) => lat && lng && haversine(lat, lng, p.lat, p.lng) < NEAR_M;

  if (confirmId) {
    // trainer picked it (from the dex or the list). someone has to back that up: the AI or your location
    const pick = seasonal.find((p) => p.id === confirmId);
    if (!pick) {
      const ev = all.find((p) => p.id === confirmId);
      throw new HttpError(422, ev ? `${ev.name} isn't around on that date.` : "Unknown Pokebos");
    }
    if (aiEnabled()) {
      try {
        const v = await verifyPhoto(buf, type, (await abilitiesFor([pick.id]))(pick));
        aiWorked = true;
        if (!v.match || v.confidence < 0.5) throw new HttpError(422, `That doesn't look like ${pick.name}. Get a clearer shot of it!`);
        confidence = v.confidence;
        abilityIds = v.abilityIds;
      } catch (e) {
        if (e instanceof HttpError) throw e;
        console.warn("[catch] AI verify failed", (e as Error).message);
      }
    }
    if (!aiWorked) {
      if (!nearYou(pick)) throw new HttpError(422, `Can't confirm you're at ${pick.name}. Turn on location, or snap it while you're there.`);
      const claimed = Number(form.get("abilityId"));
      if (claimed) abilityIds = [claimed];
    }
    chosen = pick;
  } else {
    if (aiEnabled()) {
      const toCand = await abilitiesFor(pool.map((p) => p.id));
      try {
        const r = await identifyPhoto(buf, type, pool.map(toCand));
        aiWorked = true;
        if (r?.pokebosId && r.confidence >= 0.5) {
          chosen = pool.find((p) => p.id === r.pokebosId);
          confidence = r.confidence;
          abilityIds = r.abilityIds;
        }
      } catch (e) { console.warn("[catch] AI identify failed", (e as Error).message); }
    }
    if (!chosen && !aiWorked && ranked.length && ranked[0].dist < 120) chosen = ranked[0]; // no AI: trust a very close GPS fix
  }

  if (!chosen) {
    // only offer a pick list for places you're actually near; a pick still gets verified above
    const near = ranked.filter((p) => p.dist < NEAR_M).slice(0, 8);
    if (!near.length) throw new HttpError(422, "Couldn't spot a Pokebos in this photo. Get the sign or storefront in frame, and turn on location.");
    return { status: "choose", candidates: near.map((p) => ({ id: p.id, name: p.name, types: p.types, dist: Math.round(p.dist) })) };
  }

  // --- Metadata has to agree too ---
  if (exif?.latitude != null && exif?.longitude != null) {
    const d = haversine(exif.latitude, exif.longitude, chosen.lat, chosen.lng);
    if (d > 600) throw new HttpError(422, `This photo was taken ${(d / 1609.34).toFixed(1)} mi away from ${chosen.name}.`);
  }
  if (!takenAt && !(lat && lng)) throw new HttpError(422, "This photo has no date or location info. Use your camera, or turn on location.");

  // --- Same-day rule ---
  const day = bostonDate(when);
  const dupe = await sql("SELECT 1 FROM catches WHERE user_id=$1 AND pokebos_id=$2 AND caught_on=$3", [user.id, chosen.id, day]);
  if (dupe.length) return Response.json({ status: "dupe", error: `Oops! Looks like you already caught ${chosen.name} today.` }, { status: 409 });

  const key = await putPhoto(buf, type);
  const [photo] = await sql<{ id: number }>(
    "INSERT INTO photos (user_id, pokebos_id, storage_key, content_type, taken_at, lat, lng, ai_confidence, flagged) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id",
    [user.id, chosen.id, key, type, takenAt, lat, lng, confidence, !aiWorked && !takenAt] // no AI + no exif = review later
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

  // --- Hunt: you rode out here for this one ---
  const huntsCompleted: string[] = [];
  const [trip] = await sql<any>(
    "SELECT id, bonus FROM hunt_trips WHERE user_id=$1 AND pokebos_id=$2 AND completed_at IS NULL AND gave_up_at IS NULL", [user.id, chosen.id]);
  if (trip) {
    await sql("UPDATE hunt_trips SET completed_at=now() WHERE id=$1", [trip.id]);
    await award(user.id, trip.bonus, "hunt", String(trip.id));
    points += trip.bonus;
    huntsCompleted.push(chosen.name);
  }

  // --- Beat the T: all stops caught before the train ---
  const [run] = await sql<any>(
    "SELECT id, title, bonus, pokebos_ids, started_at FROM beat_runs WHERE user_id=$1 AND completed_at IS NULL AND deadline > now() AND $2 = ANY(pokebos_ids) ORDER BY started_at DESC LIMIT 1", [user.id, chosen.id]);
  if (run) {
    const [got] = await sql<{ n: number }>("SELECT count(DISTINCT pokebos_id)::int AS n FROM catches WHERE user_id=$1 AND pokebos_id = ANY($2) AND created_at >= $3", [user.id, run.pokebos_ids, run.started_at]);
    if (got.n >= run.pokebos_ids.length) {
      await sql("UPDATE beat_runs SET completed_at=now() WHERE id=$1", [run.id]);
      await award(user.id, run.bonus, "beat", String(run.id));
      points += run.bonus;
      huntsCompleted.push(`Beat the T: ${run.title}`);
    }
  }

  const badges = await syncBadges(user.id);
  return { status: "caught", pokebos: { id: chosen.id, name: chosen.name, types: chosen.types, rarity: chosen.rarity }, level, first, points, newAbilities, huntsCompleted, badges, confidence };
});
