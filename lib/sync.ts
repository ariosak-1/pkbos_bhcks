import { sql } from "./db";
import { allStops, haversine } from "./mbta";
import { RARITY_POINTS, type Rarity } from "./seed-data";

// keeps the dex filled without anyone adding pokebos by hand
// - places: openstreetmap (overpass api), free, no key, near every T stop
// - events: red sox + bruins home games from the public mlb/nhl schedule apis
// - runs on server start, then every 24h (instrumentation.ts), or hit /api/cron/sync

const OVERPASS = (process.env.OVERPASS_URL || "https://overpass-api.de/api/interpreter,https://overpass.kumi.systems/api/interpreter,https://overpass.private.coffee/api/interpreter").split(",");
const RADIUS = 400;
const PER_STOP = 10;
const BATCH = 12;

const FILTERS = [
  '["amenity"~"^(restaurant|cafe|university|college|library|theatre|arts_centre|ice_cream)$"]',
  '["tourism"~"^(museum|attraction|gallery)$"]',
  '["leisure"~"^(stadium|sports_centre|ice_rink)$"]',
  '["historic"~"^(monument|memorial|building|church|ship|fort|landmark)$"]',
  '["office"~"^(company|financial|coworking|it|research)$"]',
  '["shop"="bakery"]',
];

export type OsmEl = { type: string; id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags: Record<string, string> };

export function classify(t: Record<string, string>): string[] {
  const out = new Set<string>();
  if (t.amenity === "restaurant" || t.amenity === "ice_cream") out.add("restaurant");
  if (t.amenity === "cafe" || t.shop === "bakery") out.add("cafe");
  if (["university", "college", "library", "theatre", "arts_centre"].includes(t.amenity) || t.tourism || t.historic) out.add("historic");
  if (t.leisure || t.sport) out.add("sports");
  if (t.office) out.add("career");
  return [...out].slice(0, 2);
}

// famous (has a wikipedia page) = harder to get a good shot of? nah, just rarer + worth more
export function rarityOf(t: Record<string, string>): Rarity {
  if (t.leisure === "stadium") return "rare";
  if (t.wikipedia || t.wikidata) return t.tourism === "museum" || t.historic ? "rare" : "uncommon";
  if (t.tourism || t.historic || t.amenity === "university") return "uncommon";
  return "common";
}

const cap = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export function abilitiesOf(t: Record<string, string>): { name: string; type: string; hint: string }[] {
  const out: { name: string; type: string; hint: string }[] = [];
  for (const c of (t.cuisine || "").split(";").map((s) => s.trim()).filter(Boolean).slice(0, 2))
    out.push({ name: cap(c), type: c, hint: `${c.replace(/_/g, " ")} food` });
  for (const s of (t.sport || "").split(";").map((x) => x.trim()).filter(Boolean).slice(0, 2))
    out.push({ name: `${cap(s)} Time`, type: "sports", hint: `${s.replace(/_/g, " ")} being played` });
  if (t.outdoor_seating === "yes") out.push({ name: "Patio Season", type: "nature", hint: "the outdoor seating" });
  if (t.tourism === "museum" || t.tourism === "gallery") out.push({ name: "Gallery Gaze", type: "art", hint: "an exhibit inside" });
  if (t.historic) out.push({ name: "Time Traveler", type: "historic", hint: "the historic marker or facade" });
  if (t.amenity === "university" || t.amenity === "college" || t.amenity === "library") out.push({ name: "Study Session", type: "study", hint: "someone studying" });
  if (t.office) out.push({ name: "Badge In", type: "career", hint: "the building entrance or sign" });
  if (!out.length) out.push({ name: "Regular", type: "local", hint: "the storefront sign" });
  return out.slice(0, 3);
}

export function domainOf(t: Record<string, string>) {
  const w = t.website || t["contact:website"] || t.url;
  if (!w) return null;
  try { return new URL(w.startsWith("http") ? w : `https://${w}`).hostname.replace(/^www\./, ""); } catch { return null; }
}

const score = (t: Record<string, string>) =>
  (t.wikidata ? 4 : 0) + (domainOf(t) ? 3 : 0) + (t.cuisine ? 1 : 0) + (t.opening_hours ? 1 : 0) + (t.tourism || t.historic || t.leisure ? 1 : 0);

async function overpass(points: { lat: number; lng: number }[]): Promise<OsmEl[]> {
  let q = "[out:json][timeout:60];(";
  for (const p of points) for (const f of FILTERS) q += `nwr(around:${RADIUS},${p.lat},${p.lng})${f}[name];`;
  q += ");out center tags;";
  for (const host of OVERPASS) {
    try {
      const r = await fetch(host, { method: "POST", body: "data=" + encodeURIComponent(q), signal: AbortSignal.timeout(90_000), headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json", "user-agent": "pokebos/0.1 (hackathon game)" } });
      if (r.ok) return (await r.json()).elements;
    } catch {}
  }
  throw new Error("overpass unreachable");
}

// pick the best few places per stop so every stop has a mix instead of 40 dunkins
export function pickPerStop(els: OsmEl[], stops: { lat: number; lng: number }[]) {
  const keep = new Map<string, OsmEl>();
  for (const s of stops) {
    const near = els
      .map((e) => ({ e, lat: e.lat ?? e.center?.lat, lng: e.lon ?? e.center?.lon }))
      .filter((x) => x.lat && haversine(s.lat, s.lng, x.lat!, x.lng!) < RADIUS && classify(x.e.tags).length)
      .sort((a, b) => score(b.e.tags) - score(a.e.tags));
    const perType = new Map<string, number>();
    let n = 0;
    for (const { e } of near) {
      const t = classify(e.tags)[0];
      if ((perType.get(t) || 0) >= 3 || n >= PER_STOP) continue;
      if ((e.tags.brand || "").match(/dunkin|starbucks|mcdonald|subway|chipotle|7-eleven/i) && (perType.get(t) || 0) >= 1) continue;
      perType.set(t, (perType.get(t) || 0) + 1);
      n++;
      keep.set(`${e.type}/${e.id}`, e);
    }
  }
  return [...keep.values()];
}

export async function upsertOsm(els: OsmEl[]) {
  let [{ n: dex }] = await sql<{ n: number }>("SELECT COALESCE(max(dex_no),0)::int AS n FROM pokebos");
  let added = 0;
  for (const e of els) {
    const t = e.tags;
    const pid = `osm:${e.type}/${e.id}`;
    const lat = e.lat ?? e.center!.lat, lng = e.lon ?? e.center!.lon;
    const existing = await sql<{ id: string }>("SELECT id FROM pokebos WHERE place_id=$1", [pid]);
    if (existing.length) {
      await sql("UPDATE pokebos SET name=$2, lat=$3, lng=$4, domain=COALESCE($5, domain), active=TRUE, last_seen=now() WHERE place_id=$1", [pid, t.name, lat, lng, domainOf(t)]);
      continue;
    }
    // skip places we already hand-curated (same name within 150m)
    const dupe = await sql("SELECT 1 FROM pokebos WHERE lower(name)=lower($1) AND abs(lat-$2) < 0.0015 AND abs(lng-$3) < 0.002", [t.name, lat, lng]);
    if (dupe.length) continue;
    const rarity = rarityOf(t);
    const id = `${t.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 36)}-${e.id.toString(36)}`;
    const blurb = t.description || [t.cuisine && cap(t.cuisine.split(";")[0]), t["addr:street"] && `on ${t["addr:street"]}`].filter(Boolean).join(" ") || null;
    await sql(
      `INSERT INTO pokebos (id, dex_no, name, types, rarity, points, lat, lng, domain, blurb, source, place_id, last_seen)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'osm',$11,now()) ON CONFLICT DO NOTHING`,
      [id, ++dex, t.name, classify(t), rarity, RARITY_POINTS[rarity], lat, lng, domainOf(t), blurb, pid]
    );
    for (const a of abilitiesOf(t)) await sql("INSERT INTO abilities (pokebos_id, name, type, hint) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING", [id, a.name, a.type, a.hint]);
    added++;
  }
  return added;
}

export async function syncPlaces() {
  const stops = allStops();
  const started = new Date();
  let added = 0, failed = 0;
  for (let i = 0; i < stops.length; i += BATCH) {
    const batch = stops.slice(i, i + BATCH);
    try {
      added += await upsertOsm(pickPerStop(await overpass(batch), batch));
    } catch { failed++; }
    await new Promise((r) => setTimeout(r, 1500)); // be nice to the free overpass servers
  }
  // only retire stuff (closed places) after a clean full run, and only if nobody caught it
  if (!failed)
    await sql("UPDATE pokebos SET active=FALSE WHERE source='osm' AND last_seen < $1 - interval '30 days' AND NOT EXISTS (SELECT 1 FROM catches c WHERE c.pokebos_id=pokebos.id)", [started]);
  return { added, failedBatches: failed };
}

// ---- events from public sports schedules ----
const VENUES = {
  fenway: { lat: 42.3467, lng: -71.0972, domain: "mlb.com" },
  garden: { lat: 42.3662, lng: -71.0621, domain: "nhl.com" },
};

async function upsertEvent(key: string, name: string, date: string, types: string[], rarity: Rarity, v: { lat: number; lng: number; domain: string }, blurb: string, abilities: [string, string, string][]) {
  const id = `event-${key}`;
  const md = date.slice(5, 10);
  const [{ n: dex }] = await sql<{ n: number }>("SELECT COALESCE(max(dex_no),0)::int + 1 AS n FROM pokebos");
  const ins = await sql(
    `INSERT INTO pokebos (id, dex_no, name, types, rarity, points, lat, lng, domain, blurb, source, place_id, season_from, season_to, is_event, last_seen)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'schedule',$1,$11,$11,TRUE,now()) ON CONFLICT (id) DO UPDATE SET last_seen=now() RETURNING (xmax = 0) AS fresh`,
    [id, dex, name, types, rarity, RARITY_POINTS[rarity], v.lat, v.lng, v.domain, blurb, md]
  );
  for (const [n, t, h] of abilities) await sql("INSERT INTO abilities (pokebos_id, name, type, hint) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING", [id, n, t, h]);
  return ins[0]?.fresh ? 1 : 0;
}

export async function syncEvents() {
  let added = 0;
  const today = new Date().toISOString().slice(0, 10);
  const until = new Date(Date.now() + 45 * 864e5).toISOString().slice(0, 10);
  try {
    // red sox = team 111
    const j = await (await fetch(`https://statsapi.mlb.com/api/v1/schedule?sportId=1&teamId=111&startDate=${today}&endDate=${until}`, { signal: AbortSignal.timeout(15000) })).json();
    for (const d of j.dates || []) for (const g of d.games || []) {
      if (g.teams?.home?.team?.id !== 111) continue;
      const opp = g.teams.away.team.name.split(" ").pop();
      added += await upsertEvent(`mlb-${g.gamePk}`, `Red Sox vs ${opp} (${d.date.slice(5)})`, d.date, ["sports"], opp === "Yankees" ? "legendary" : "rare", VENUES.fenway, "Game day at Fenway.", [["Fenway Frank", "restaurant", "a hot dog at the game"], ["Monster Seats", "sports", "the field from the stands"]]);
    }
  } catch {}
  try {
    const j = await (await fetch(`https://api-web.nhle.com/v1/club-schedule-season/BOS/now`, { signal: AbortSignal.timeout(15000) })).json();
    for (const g of j.games || []) {
      const date = g.gameDate as string;
      if (g.homeTeam?.abbrev !== "BOS" || date < today || date > until) continue;
      const opp = g.awayTeam?.commonName?.default || g.awayTeam?.abbrev;
      added += await upsertEvent(`nhl-${g.id}`, `Bruins vs ${opp} (${date.slice(5)})`, date, ["sports"], opp === "Canadiens" ? "legendary" : "rare", VENUES.garden, "Game night at the Garden.", [["Spoked B", "sports", "the ice from the stands"], ["Garden Grub", "restaurant", "arena food"]]);
    }
  } catch {}
  // games that already happened drop off the map (people who caught them keep them)
  await sql("UPDATE pokebos SET active=FALSE WHERE source='schedule' AND last_seen < now() - interval '2 days' AND NOT EXISTS (SELECT 1 FROM catches c WHERE c.pokebos_id=pokebos.id)");
  return { added };
}

let running: Promise<unknown> | null = null;

export async function syncAll(force = false) {
  if (running) return running;
  const [last] = await sql<{ value: string }>("SELECT value FROM meta WHERE key='last_sync'");
  if (!force && last && Date.now() - Date.parse(last.value) < 20 * 3600e3) return { skipped: true, last: last.value };
  running = (async () => {
    const events = await syncEvents();
    const places = await syncPlaces();
    // only mark it done if osm actually answered, otherwise try again next boot / next cron
    if (places.failedBatches < 3) await sql("INSERT INTO meta (key, value) VALUES ('last_sync', $1) ON CONFLICT (key) DO UPDATE SET value=$1", [new Date().toISOString()]);
    console.log("[sync]", { places, events });
    return { places, events };
  })().finally(() => { running = null; });
  return running;
}
