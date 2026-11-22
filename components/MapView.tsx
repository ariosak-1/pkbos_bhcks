"use client";
import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip, Pane, useMap } from "react-leaflet";
import { useEffect } from "react";
import type { Line } from "@/lib/mbta";

type Stop = { id: string; name: string; lat: number; lng: number; color: string; count: number; caught: number };
const cartoKey = process.env.NEXT_PUBLIC_CARTO_BASEMAP_API_KEY;

function Fit({ lines }: { lines: Line[] }) {
  const map = useMap();
  useEffect(() => {
    const pts = lines.flatMap((l) => l.stops.map((s) => [s.lat, s.lng] as [number, number]));
    if (pts.length) map.flyToBounds(pts, { padding: [24, 24], duration: 0.8 });
  }, [lines, map]);
  return null;
}

export default function MapView({ lines, stops, selected, onSelect, me }: { lines: Line[]; stops: Stop[]; selected: string | null; onSelect: (id: string) => void; me: { lat: number; lng: number } | null }) {
  return (
    <MapContainer center={[42.355, -71.07]} zoom={12} style={{ height: "100%", width: "100%" }} zoomControl={false} attributionControl={true} zoomAnimation fadeAnimation markerZoomAnimation>
      {cartoKey && (
        <TileLayer
          url={`https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=${encodeURIComponent(cartoKey)}`}
          attribution="&copy; OpenStreetMap contributors &copy; CARTO"
        />
      )}
      <Fit lines={lines} />
      {lines.map((l) => l.paths.map((p, i) => (
        <Polyline key={`${l.id}-${i}`} positions={p} pathOptions={{ color: "#ffffff", weight: 10, opacity: 0.9, lineCap: "round", lineJoin: "round" }} />
      )))}
      <Pane name="lines" style={{ zIndex: 420 }}>
      {lines.map((l) => l.paths.map((p, i) => (
        <Polyline key={`${l.id}-c-${i}`} positions={p} pathOptions={{ color: l.color, weight: 5, opacity: 0.95, lineCap: "round", lineJoin: "round" }} />
      )))}
      </Pane>
      {/* own pane so lines added later (filter switch) never cover the stops */}
      <Pane name="stops" style={{ zIndex: 450 }}>
      {stops.map((s) => (
        <CircleMarker key={s.id} center={[s.lat, s.lng]} radius={s.id === selected ? 9 : s.count ? 6 : 4}
          pathOptions={{ color: "#2e2a3a", weight: 2.5, fillColor: s.id === selected ? "#ffd54a" : s.count && s.caught === s.count ? s.color : "#fff", fillOpacity: 1 }}
          eventHandlers={{ click: () => onSelect(s.id) }}>
          <Tooltip className="stop-tip" direction="top" offset={[0, -6]}>
            {s.name.toUpperCase()}{s.count ? ` · ${s.caught}/${s.count}` : ""}
          </Tooltip>
        </CircleMarker>
      ))}
      {me && <CircleMarker center={[me.lat, me.lng]} radius={7} pathOptions={{ color: "#181818", weight: 3, fillColor: "#2a6bd1", fillOpacity: 1 }} />}
      </Pane>
    </MapContainer>
  );
}
