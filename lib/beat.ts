import { sql } from "./db";
import { haversine } from "./mbta";
import { expandSearch, nameMission } from "./ai";

// beat the t: walk to a few pokebos and get back to your stop before the train
const WALK = 80;        // m per min
const STREET = 1.3;     // streets aren't straight lines
const CATCH_MIN = 2;    // time to snap a photo
const BUFFER = 2;       // be back a bit early

const walkMin = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => (haversine(a.lat, a.lng, b.lat, b.lng) * STREET) / WALK;

const TITLES = ["Platform Dash", "Mind the Gap", "Next Train Sprint", "Inbound Rush", "Doors Closing", "Last Call Loop"];

export async function planBeat(userId: number, mins: number, start: { lat: number; lng: number }, words: string) {
  const budget = mins - BUFFER;
  const reach = ((budget - CATCH_MIN) / 2) * WALK / STREET; // furthest a single out-and-back can go
  let pk = await sql<any>(
    `SELECT p.id, p.name, p.domain, p.types, p.rarity, p.points, p.lat, p.lng, p.blurb,
       EXISTS (SELECT 1 FROM catches c WHERE c.user_id=$1 AND c.pokebos_id=p.id AND c.caught_on = (now() AT TIME ZONE 'America/New_York')::date) AS today,
       ARRAY(SELECT a.name || ' ' || a.type || ' ' || COALESCE(a.hint,'') FROM abilities a WHERE a.pokebos_id=p.id) AS tags
     FROM pokebos p WHERE p.active`, [userId]);
  pk = pk.filter((p) => !p.today && haversine(start.lat, start.lng, p.lat, p.lng) <= reach);

  // words -> keep places that match (ai widens "pizza" into pizza/italian/slice...)
  let terms: string[] = [], note = "";
  if (words.trim()) {
    const ai = await expandSearch(words);
    terms = [...new Set([...words.toLowerCase().split(/[\s,]+/).filter((w) => w.length > 2), ...(ai?.terms || []).map((t) => t.toLowerCase())])];
    const types = ai?.types || [];
    const hit = (p: any) => {
      const hay = `${p.name} ${p.blurb || ""} ${p.types.join(" ")} ${p.tags.join(" ")}`.toLowerCase();
      return terms.some((t) => hay.includes(t)) || p.types.some((t: string) => types.includes(t as any));
    };
    const matched = pk.filter(hit);
    if (matched.length) pk = matched;
    else note = `Nothing matching "${words.trim()}" that close, so here's a mixed run.`;
  }

  // a few randomized greedy loops, keep the one with the most stops/points
  let best: any[] = [], bestPts = 0;
  for (let tries = 0; tries < 6; tries++) {
    const pool = [...pk].sort(() => Math.random() - 0.5);
    const route: any[] = [];
    let here = start, used = 0;
    while (route.length < 4) {
      const fits = pool
        .filter((p) => !route.includes(p))
        .map((p) => ({ p, cost: walkMin(here, p) + CATCH_MIN }))
        .filter(({ p, cost }) => used + cost + walkMin(p, start) <= budget)
        .sort((a, b) => a.cost - b.cost);
      const next = fits[Math.random() < 0.5 ? 0 : Math.min(1, fits.length - 1)]; // nearest, sometimes 2nd nearest
      if (!next) break;
      route.push(next.p); used += next.cost; here = next.p;
    }
    const pts = route.reduce((n, p) => n + p.points, 0) + route.length * 10;
    if (route.length > best.length || (route.length === best.length && pts > bestPts)) { best = route; bestPts = pts; }
  }
  if (!best.length) return null;

  let walk = 0, here = start;
  const legs = best.map((p) => { const m = walkMin(here, p); walk += m; const leg = { kind: "walk", meters: Math.round(m * WALK), mins: Math.round(m), to: p.name, path: [[here.lat, here.lng], [p.lat, p.lng]] }; here = p; return leg; });
  const back = walkMin(here, start); walk += back;
  legs.push({ kind: "walk", meters: Math.round(back * WALK), mins: Math.round(back), to: "your stop", path: [[here.lat, here.lng], [start.lat, start.lng]] });

  const named = await nameMission(mins, best.map((p) => p.name), words);
  const bonus = Math.round(15 * best.length + Math.max(0, 30 - mins) * 2 + (best.length === 4 ? 25 : 0));
  return {
    title: named?.title || TITLES[Math.floor(Math.random() * TITLES.length)],
    brief: named?.brief || `${best.length} Pokebos, ${mins} minutes, one train. Go go go!`,
    stops: best.map(({ tags, today, blurb, ...p }) => p),
    plan: { from: [start.lat, start.lng], to: [start.lat, start.lng], legs, totalMins: Math.round(walk + best.length * CATCH_MIN) },
    bonus,
    terms,
    note,
  };
}
