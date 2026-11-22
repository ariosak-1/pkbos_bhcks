// Bulk-import establishments near T stops from Google Places API (New) into the Boston Dex.
// Usage: GOOGLE_PLACES_API_KEY=... npm run seed:places -- [--line Red] [--per-stop 3]
// Types come from Google's primaryType; abilities come from review text via Gemini (Mastra) or keyword fallback.
import { sql } from "../lib/db";
import { STOPS } from "../lib/mbta-snapshot";
import { aiEnabled, forgeAbilities, keywordAbilities } from "../lib/ai";
import { RARITY_POINTS, type Rarity } from "../lib/seed-data";

const KEY = process.env.GOOGLE_PLACES_API_KEY;
if (!KEY) { console.error("Set GOOGLE_PLACES_API_KEY"); process.exit(1); }
const arg = (name: string) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : undefined; };
const LINE = arg("line");
const PER_STOP = Number(arg("per-stop") || 3);

const QUERIES: [query: string, type: string][] = [
  ["restaurant", "restaurant"], ["cafe", "cafe"], ["museum OR historic site OR university", "historic"], ["stadium OR arena OR sports venue", "sports"], ["corporate office OR coworking space OR bank headquarters", "career"],
];
const TYPE_MAP: Record<string, string> = {
  restaurant: "restaurant", meal_takeaway: "restaurant", bakery: "cafe", cafe: "cafe", coffee_shop: "cafe", museum: "historic", university: "historic",
  historical_landmark: "historic", tourist_attraction: "historic", church: "historic", stadium: "sports", arena: "sports", sports_complex: "sports", gym: "sports",
  bank: "career", corporate_office: "career", coworking_space: "career", library: "historic", art_gallery: "historic", bar: "restaurant",
};

function rarityFor(ratings: number): Rarity {
  // Famous places are everywhere on the feed; hidden gems are rarer finds.
  if (ratings > 800) return "common";
  if (ratings > 150) return "uncommon";
  return "rare";
}

async function search(q: string, lat: number, lng: number) {
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "X-Goog-Api-Key": KEY!,
      "X-Goog-FieldMask": "places.id,places.displayName,places.location,places.primaryType,places.types,places.websiteUri,places.userRatingCount,places.editorialSummary,places.reviews",
    },
    body: JSON.stringify({ textQuery: q, maxResultCount: PER_STOP, locationBias: { circle: { center: { latitude: lat, longitude: lng }, radius: 600 } } }),
  });
  if (!res.ok) throw new Error(`Places ${res.status}: ${await res.text()}`);
  return ((await res.json()).places || []) as any[];
}

async function main() {
  const stops = new Map<string, [string, string, number, number]>();
  for (const [route, list] of Object.entries(STOPS)) if (!LINE || route.startsWith(LINE)) for (const s of list) stops.set(s[0], s);
  let [{ n: dex }] = await sql<{ n: number }>("SELECT COALESCE(max(dex_no),0)::int AS n FROM pokebos");
  let added = 0;
  for (const [, name, lat, lng] of stops.values()) {
    for (const [q, fallbackType] of QUERIES) {
      const places = await search(`${q} near ${name} station Boston`, lat, lng).catch((e) => { console.warn(e.message); return []; });
      for (const p of places) {
        if ((await sql("SELECT 1 FROM pokebos WHERE place_id=$1", [p.id])).length) continue;
        const reviewText = [p.editorialSummary?.text, ...(p.reviews || []).map((r: any) => r.text?.text)].filter(Boolean).join("\n");
        let types = [...new Set([p.primaryType, ...(p.types || [])].map((t: string) => TYPE_MAP[t]).filter(Boolean))].slice(0, 2);
        if (!types.length) types = [fallbackType];
        let abilities = keywordAbilities(reviewText);
        if (aiEnabled() && reviewText) {
          try { const f = await forgeAbilities(p.displayName.text, reviewText); abilities = f.abilities; types = f.types; } catch (e) { console.warn("abilities:", (e as Error).message); }
        }
        const rarity = rarityFor(p.userRatingCount || 0);
        const domain = p.websiteUri ? new URL(p.websiteUri).hostname.replace(/^www\./, "") : null;
        const id = p.displayName.text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 40) + "-" + p.id.slice(-4).toLowerCase();
        await sql(
          `INSERT INTO pokebos (id, dex_no, name, types, rarity, points, lat, lng, domain, blurb, source, place_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'places',$11) ON CONFLICT DO NOTHING`,
          [id, ++dex, p.displayName.text, types, rarity, RARITY_POINTS[rarity], p.location.latitude, p.location.longitude, domain, p.editorialSummary?.text || null, p.id]
        );
        for (const a of abilities) await sql("INSERT INTO abilities (pokebos_id, name, type, hint) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING", [id, a.name, a.type, a.hint]);
        added++;
        console.log(`#${dex} ${p.displayName.text} [${types.join("/")}] ${rarity}`);
      }
    }
  }
  console.log(`Added ${added} Pokebos.`);
  process.exit(0);
}
main();
