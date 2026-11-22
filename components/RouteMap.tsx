"use client";
import { MapContainer, TileLayer, Polyline, CircleMarker, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import { useEffect, useMemo, useRef } from "react";
import { spriteSrc } from "./Sprite";

type LL = [number, number];
const cartoKey = process.env.NEXT_PUBLIC_CARTO_BASEMAP_API_KEY;

function Fit({ pts }: { pts: LL[] }) {
  const map = useMap();
  useEffect(() => {
    if (pts.length) map.flyToBounds(pts, { padding: [36, 36], duration: 0.6, maxZoom: 16 });
  }, [pts, map]);
  return null;
}

// little train that rides the whole route on a loop
function Rider({ path }: { path: LL[] }) {
  const ref = useRef<L.CircleMarker>(null);
  useEffect(() => {
    if (path.length < 2 || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const cum = [0];
    for (let i = 1; i < path.length; i++) cum.push(cum[i - 1] + Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]));
    const total = cum[cum.length - 1] || 1;
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const d = (((now - t0) / 7000) % 1) * total;
      let i = 1;
      while (i < cum.length - 1 && cum[i] < d) i++;
      const f = (d - cum[i - 1]) / (cum[i] - cum[i - 1] || 1);
      ref.current?.setLatLng([path[i - 1][0] + (path[i][0] - path[i - 1][0]) * f, path[i - 1][1] + (path[i][1] - path[i - 1][1]) * f]);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [path]);
  return <CircleMarker ref={ref} center={path[0]} radius={6} pathOptions={{ color: "#25251F", weight: 2.5, fillColor: "#F3C82D", fillOpacity: 1 }} interactive={false} />;
}

export default function RouteMap({ plan, target, focus }: { plan: any; target?: { name: string; domain?: string | null } | null; focus?: number | null }) {
  const all: LL[] = useMemo(() => plan.legs.flatMap((l: any) => l.path || []), [plan]);
  const fitPts: LL[] = useMemo(() => (focus != null && plan.legs[focus]?.path?.length ? plan.legs[focus].path : all), [plan, focus, all]);
  const pin = useMemo(() => L.divIcon({
    className: "route-pin",
    html: `<div class="pin-in"><b>${(target?.name || "?")[0]}</b>${target?.domain ? `<img src="${spriteSrc(target.domain)}" alt="" onerror="this.remove()" onload="this.naturalWidth<=16&&this.remove()" />` : ""}</div>`,
    iconSize: [40, 40], iconAnchor: [20, 40],
  }), [target]);
  const transfers: LL[] = plan.legs.filter((l: any) => l.kind === "ride").flatMap((l: any) => [l.path[0], l.path[l.path.length - 1]]);
  const dim = (i: number) => (focus == null || focus === i ? 1 : 0.35);

  return (
    <div className="routemap">
      <MapContainer center={plan.from} zoom={13} style={{ height: "100%", width: "100%" }} zoomControl={false} scrollWheelZoom={false} attributionControl>
        {cartoKey && <TileLayer url={`https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=${encodeURIComponent(cartoKey)}`} attribution="&copy; OpenStreetMap &copy; CARTO" />}
        <Fit pts={fitPts} />
        {plan.legs.map((l: any, i: number) => l.kind === "walk" ? (
          <Polyline key={`w${i}`} positions={l.path} pathOptions={{ className: "route-walk", color: "#25251F", weight: 4, dashArray: "2 10", lineCap: "round", opacity: dim(i) }} />
        ) : (
          <Polyline key={`c${i}`} positions={l.path} pathOptions={{ color: "#fff", weight: 11, lineCap: "round", lineJoin: "round", opacity: dim(i) }} />
        ))}
        {plan.legs.map((l: any, i: number) => l.kind === "ride" && (
          <Polyline key={`r${i}`} positions={l.path} pathOptions={{ color: l.color, weight: 6, lineCap: "round", lineJoin: "round", opacity: dim(i) }} />
        ))}
        {plan.legs.map((l: any, i: number) => l.kind === "ride" && (
          <Polyline key={`f${i}`} positions={l.path} pathOptions={{ className: "route-flow", color: "#fff", weight: 2, dashArray: "1 14", lineCap: "round", opacity: 0.85 * dim(i) }} interactive={false} />
        ))}
        {transfers.map((p, i) => <CircleMarker key={`t${i}`} center={p} radius={5} pathOptions={{ color: "#25251F", weight: 2.5, fillColor: "#fff", fillOpacity: 1 }} />)}
        <Rider path={all} />
        <CircleMarker center={plan.from} radius={8} pathOptions={{ className: "route-you", color: "#25251F", weight: 3, fillColor: "#2a6bd1", fillOpacity: 1 }} />
        <Marker position={plan.to} icon={pin} />
      </MapContainer>
    </div>
  );
}
