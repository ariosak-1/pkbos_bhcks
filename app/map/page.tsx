"use client";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { api, getPosition } from "@/lib/client";
import { haversine } from "@/lib/mbta";
import type { Line } from "@/lib/mbta";
import { PokeRow } from "@/components/PokeRow";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false, loading: () => <div className="px" style={{ padding: 20, fontSize: 10 }}>LOADING MAP...</div> });

const FILTERS = [
  { id: "all", label: "ALL", color: "#181818" },
  { id: "Red", label: "RED", color: "#DA291C" },
  { id: "Orange", label: "ORANGE", color: "#ED8B00" },
  { id: "Blue", label: "BLUE", color: "#003DA5" },
  { id: "Green", label: "GREEN", color: "#00843D" },
  { id: "Mattapan", label: "MATTAPAN", color: "#DA291C" },
];
const RADIUS = 750;

export default function MapPage() {
  const [lines, setLines] = useState<Line[]>([]);
  const [pk, setPk] = useState<any[]>([]);
  const [filter, setFilter] = useState("all");
  const [sel, setSel] = useState<string | null>(null);
  const [me, setMe] = useState<{ lat: number; lng: number } | null>(null);
  useEffect(() => {
    api("/api/mbta/lines").then((r) => setLines(r.lines));
    api("/api/pokebos").then(setPk);
    getPosition(5000).then(setMe);
  }, []);

  const shown = useMemo(() => lines.filter((l) => filter === "all" || l.group === filter), [lines, filter]);
  const stops = useMemo(() => {
    const m = new Map<string, any>();
    for (const l of shown) for (const s of l.stops) {
      if (m.has(s.id)) { m.get(s.id).lines.push(l); continue; }
      const here = pk.filter((p) => haversine(s.lat, s.lng, p.lat, p.lng) < RADIUS);
      m.set(s.id, { ...s, color: l.color, lines: [l], count: here.length, caught: here.filter((p) => p.level).length });
    }
    return [...m.values()];
  }, [shown, pk]);
  const stop = stops.find((s) => s.id === sel);
  const here = stop ? pk.map((p) => ({ ...p, dist: Math.round(haversine(stop.lat, stop.lng, p.lat, p.lng)) })).filter((p) => p.dist < RADIUS).sort((a, b) => a.dist - b.dist) : [];

  return (
    <>
      <div className="chips" style={{ marginBottom: 10 }}>
        {FILTERS.map((f) => (
          <button key={f.id} className={`chip ${filter === f.id ? "on" : ""}`} onClick={() => { setFilter(f.id); setSel(null); }}>
            <span className="linepill" style={{ background: f.color }} />{f.label}
          </button>
        ))}
      </div>
      <div className="mapwrap">
        <MapView lines={shown} stops={stops} selected={sel} onSelect={setSel} me={me} />
        {stop && (
          <aside className="sidepanel motion-slide">
            <button className="btn close" onClick={() => setSel(null)} aria-label="Close">✕</button>
            <h1 style={{ paddingRight: 44, lineHeight: 1.5 }}>{stop.name.toUpperCase()}</h1>
            <div className="row" style={{ gap: 4, marginBottom: 10 }}>
              {[...new Set(stop.lines.map((l: Line) => l.name.replace(/ [BCDE]$/, "")))].map((n: any) => <span key={n} className="small">{n}</span>)}
            </div>
            <div className="px muted" style={{ fontSize: 8, marginBottom: 10 }}>POKEBOS {stop.caught}/{stop.count}</div>
            {here.length ? here.map((p) => <PokeRow key={p.id} p={p} />) : <div className="dialog">No Pokebos around here. Yet.</div>}
          </aside>
        )}
      </div>
    </>
  );
}
