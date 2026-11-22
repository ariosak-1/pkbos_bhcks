import { LINES, STOPS, BRANCH_JOINS, type SnapStop } from "./mbta-snapshot";

export const MBTA = "https://api-v3.mbta.com";

export function haversine(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 6371000, toR = Math.PI / 180;
  const dLat = (bLat - aLat) * toR, dLng = (bLng - aLng) * toR;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * toR) * Math.cos(bLat * toR) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

async function mbta(path: string) {
  const headers: Record<string, string> = { accept: "application/vnd.api+json" };
  if (process.env.MBTA_API_KEY) headers["x-api-key"] = process.env.MBTA_API_KEY;
  const res = await fetch(MBTA + path, { headers, signal: AbortSignal.timeout(6000) });
  if (!res.ok) throw new Error(`MBTA ${res.status}`);
  return res.json();
}

// Google encoded polyline decoder (MBTA shapes use it)
export function decodePolyline(str: string): [number, number][] {
  let i = 0, lat = 0, lng = 0;
  const out: [number, number][] = [];
  while (i < str.length) {
    for (const which of [0, 1]) {
      let shift = 0, result = 0, b: number;
      do { b = str.charCodeAt(i++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
      const d = result & 1 ? ~(result >> 1) : result >> 1;
      if (which === 0) lat += d; else lng += d;
    }
    out.push([lat / 1e5, lng / 1e5]);
  }
  return out;
}

function snapshotPaths(route: string): [number, number][][] {
  const stops = STOPS[route];
  const joins = BRANCH_JOINS[route] || {};
  const paths: [number, number][][] = [[]];
  const byId = new Map(stops.map((s) => [s[0], s]));
  for (const s of stops) {
    if (joins[s[0]]) {
      const j = byId.get(joins[s[0]])!;
      paths.push([[j[2], j[3]]]);
    }
    paths[paths.length - 1].push([s[2], s[3]]);
  }
  return paths;
}

export type Line = {
  id: string; name: string; color: string; group: string;
  paths: [number, number][][];
  stops: { id: string; name: string; lat: number; lng: number }[];
};

let linesCache: { at: number; data: Line[] } | null = null;

export async function getLines(): Promise<{ lines: Line[]; live: boolean }> {
  if (linesCache && Date.now() - linesCache.at < 24 * 3600e3) return { lines: linesCache.data, live: true };
  const base: Line[] = Object.entries(LINES).map(([id, l]) => ({
    id, ...l,
    paths: snapshotPaths(id),
    stops: STOPS[id].map(([sid, name, lat, lng]) => ({ id: sid, name, lat, lng })),
  }));
  try {
    const ids = Object.keys(LINES);
    const shapes = await Promise.all(ids.map((r) => mbta(`/shapes?filter[route]=${r}&fields[shape]=polyline`)));
    shapes.forEach((json, idx) => {
      const polys: string[] = (json.data || []).map((s: any) => s.attributes.polyline);
      const decoded = [...new Set(polys)].map(decodePolyline).sort((a, b) => b.length - a.length).slice(0, 4);
      if (decoded.length) base[idx].paths = decoded;
    });
    linesCache = { at: Date.now(), data: base };
    return { lines: base, live: true };
  } catch {
    return { lines: base, live: false };
  }
}

export function allStops() {
  const m = new Map<string, { id: string; name: string; lat: number; lng: number; routes: string[] }>();
  for (const [route, stops] of Object.entries(STOPS))
    for (const [id, name, lat, lng] of stops) {
      const e = m.get(id) || { id, name, lat, lng, routes: [] };
      e.routes.push(route);
      m.set(id, e);
    }
  return [...m.values()];
}

export function nearestStops(lat: number, lng: number, n = 3) {
  return allStops()
    .map((s) => ({ ...s, dist: haversine(lat, lng, s.lat, s.lng) }))
    .sort((a, b) => a.dist - b.dist)
    .slice(0, n);
}

// ---------- Route planner (Dijkstra over the subway graph) ----------
type Edge = { to: string; route: string; dir: 0 | 1; mins: number };
const RIDE_MIN = 2.2, TRANSFER_MIN = 6, WALK_M_PER_MIN = 80;
let graph: Map<string, Edge[]> | null = null;

function buildGraph() {
  const g = new Map<string, Edge[]>();
  const add = (a: string, b: string, route: string, dir: 0 | 1) => {
    if (!g.has(a)) g.set(a, []);
    g.get(a)!.push({ to: b, route, dir, mins: route.startsWith("Green") ? RIDE_MIN * 0.9 : RIDE_MIN });
  };
  for (const [route, stops] of Object.entries(STOPS)) {
    const joins = BRANCH_JOINS[route] || {};
    for (let i = 1; i < stops.length; i++) {
      const prev = joins[stops[i][0]] ?? stops[i - 1][0];
      add(prev, stops[i][0], route, 0);
      add(stops[i][0], prev, route, 1);
    }
  }
  return g;
}

function terminal(route: string, dir: 0 | 1, alightAt: string) {
  const stops = STOPS[route];
  if (dir === 1) return stops[0][1];
  if (route === "Red") {
    const idx = stops.findIndex((s) => s[0] === alightAt);
    return idx >= 17 ? "Braintree" : idx >= 13 ? "Ashmont" : "Ashmont/Braintree";
  }
  return stops[stops.length - 1][1];
}

export type Leg =
  | { kind: "walk"; meters: number; mins: number; to: string; path: LatLng[] }
  | { kind: "ride"; route: string; line: string; color: string; from: string; fromId: string; to: string; toId: string; toward: string; stops: number; mins: number; dir: 0 | 1; nextDepartures?: string[]; path: LatLng[] };
type LatLng = [number, number];
export type Plan = { totalMins: number; legs: Leg[]; from: LatLng; to: LatLng };

export function planRoute(from: { lat: number; lng: number }, to: { lat: number; lng: number; name?: string }): Plan {
  const A: LatLng = [from.lat, from.lng], B: LatLng = [to.lat, to.lng];
  graph ??= buildGraph();
  const stopInfo = new Map(allStops().map((s) => [s.id, s]));
  const walkDirect = haversine(from.lat, from.lng, to.lat, to.lng);
  const starts = nearestStops(from.lat, from.lng, 4);
  const ends = nearestStops(to.lat, to.lng, 4);
  const endCost = new Map(ends.map((e) => [e.id, e.dist / WALK_M_PER_MIN]));

  // state = stop|route so transfers cost extra
  const dist = new Map<string, number>();
  const prev = new Map<string, { state: string; edge: Edge | null }>();
  const pq: [number, string][] = [];
  for (const s of starts) {
    const st = `${s.id}|`;
    const c = s.dist / WALK_M_PER_MIN;
    if (c < (dist.get(st) ?? Infinity)) { dist.set(st, c); prev.set(st, { state: "", edge: null }); pq.push([c, st]); }
  }
  let best: { cost: number; state: string } | null = null;
  while (pq.length) {
    pq.sort((a, b) => a[0] - b[0]);
    const [cost, state] = pq.shift()!;
    if (cost > (dist.get(state) ?? Infinity)) continue;
    const [stop, route] = state.split("|");
    if (endCost.has(stop)) {
      const total = cost + endCost.get(stop)!;
      if (!best || total < best.cost) best = { cost: total, state };
    }
    for (const e of graph.get(stop) || []) {
      const extra = route && route !== e.route ? TRANSFER_MIN : route ? 0 : 3; // initial wait ~3m
      const ns = `${e.to}|${e.route}`;
      const nc = cost + e.mins + extra;
      if (nc < (dist.get(ns) ?? Infinity)) { dist.set(ns, nc); prev.set(ns, { state, edge: e }); pq.push([nc, ns]); }
    }
  }

  if (!best || walkDirect / WALK_M_PER_MIN <= best.cost) {
    return { from: A, to: B, totalMins: Math.round(walkDirect / WALK_M_PER_MIN), legs: [{ kind: "walk", meters: Math.round(walkDirect), mins: Math.round(walkDirect / WALK_M_PER_MIN), to: to.name || "destination", path: [A, B] }] };
  }

  // reconstruct
  const edges: { from: string; e: Edge }[] = [];
  let cur = best.state;
  while (prev.get(cur)?.edge) {
    const p = prev.get(cur)!;
    edges.unshift({ from: p.state.split("|")[0], e: p.edge! });
    cur = p.state;
  }
  const firstStop = cur.split("|")[0];
  const legs: Leg[] = [];
  const ll = (id: string): LatLng => [stopInfo.get(id)!.lat, stopInfo.get(id)!.lng];
  const startWalk = haversine(from.lat, from.lng, stopInfo.get(firstStop)!.lat, stopInfo.get(firstStop)!.lng);
  legs.push({ kind: "walk", meters: Math.round(startWalk), mins: Math.round(startWalk / WALK_M_PER_MIN), to: stopInfo.get(firstStop)!.name, path: [A, ll(firstStop)] });
  for (const { from: f, e } of edges) {
    const last = legs[legs.length - 1];
    if (last.kind === "ride" && last.route === e.route && last.dir === e.dir) {
      last.stops++; last.mins += e.mins; last.to = stopInfo.get(e.to)!.name; last.toId = e.to; last.path.push(ll(e.to));
    } else {
      legs.push({ kind: "ride", route: e.route, line: LINES[e.route].name, color: LINES[e.route].color, from: stopInfo.get(f)!.name, fromId: f, to: stopInfo.get(e.to)!.name, toId: e.to, toward: "", stops: 1, mins: e.mins, dir: e.dir, path: [ll(f), ll(e.to)] });
    }
  }
  for (const l of legs) if (l.kind === "ride") { l.toward = terminal(l.route, l.dir, l.toId); l.mins = Math.round(l.mins); }
  const lastStop = stopInfo.get(best.state.split("|")[0])!;
  const endWalk = haversine(lastStop.lat, lastStop.lng, to.lat, to.lng);
  legs.push({ kind: "walk", meters: Math.round(endWalk), mins: Math.round(endWalk / WALK_M_PER_MIN), to: to.name || "destination", path: [ll(lastStop.id), B] });
  return { from: A, to: B, totalMins: Math.round(best.cost), legs };
}

export async function addLivePredictions(legs: Leg[]) {
  await Promise.all(
    legs.map(async (l) => {
      if (l.kind !== "ride") return;
      try {
        const j = await mbta(`/predictions?filter[stop]=${l.fromId}&filter[route]=${l.route}&filter[direction_id]=${l.dir}&sort=departure_time&page[limit]=3&fields[prediction]=departure_time`);
        l.nextDepartures = (j.data || []).map((p: any) => p.attributes.departure_time).filter(Boolean);
      } catch { /* offline: keep estimate */ }
    })
  );
  return legs;
}

export type { SnapStop };
