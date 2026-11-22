"use client";
import dynamic from "next/dynamic";
import { useState } from "react";
import { LINES } from "@/lib/mbta-snapshot";
import { Sprite } from "./Sprite";

const RouteMap = dynamic(() => import("./RouteMap"), { ssr: false, loading: () => <div className="routemap skeleton" /> });

const fmt = (iso: string) => {
  const m = Math.round((new Date(iso).getTime() - Date.now()) / 60000);
  return m <= 0 ? "now" : `${m} min`;
};
const short = (r: string) => r.replace("Green-", "GL ").toUpperCase();

type Target = { name: string; domain?: string | null } | null | undefined;

// map + strip. tap a step to zoom the map to it
export function TripView({ plan, target, map = true }: { plan: any; target?: Target; map?: boolean }) {
  const [focus, setFocus] = useState<number | null>(null);
  return (
    <div className="trip">
      {map && <RouteMap plan={plan} target={target} focus={focus} />}
      <TripStrip plan={plan} target={target} focus={focus} onFocus={map ? setFocus : undefined} />
    </div>
  );
}

export function TripStrip({ plan, target, focus, onFocus, steps = true }: { plan: any; target?: Target; focus?: number | null; onFocus?: (i: number | null) => void; steps?: boolean }) {
  const legs = plan.legs.map((l: any, i: number) => ({ ...l, i })).filter((l: any) => l.kind === "ride" || l.meters > 40);
  const trains = legs.filter((l: any) => l.kind === "ride").length;
  const walk = legs.filter((l: any) => l.kind === "walk").reduce((n: number, l: any) => n + l.mins, 0);
  const pick = (i: number) => onFocus?.(focus === i ? null : i);
  const Tag = onFocus ? "button" : "div";
  return (
    <div className="tripstrip">
      <div className="spread trip-head">
        <span className="px">~{plan.totalMins} MIN</span>
        <span className="small muted">{trains ? `${trains} train${trains > 1 ? "s" : ""} · ` : ""}{walk} min walk</span>
      </div>
      <div className="trip-bar" aria-hidden="true">
        <span className="node you" />
        {legs.map((l: any) => (
          <span key={l.i} className={`seg ${l.kind} ${focus === l.i ? "on" : ""}`} style={{ flexGrow: Math.max(l.mins, 3), ["--c" as any]: l.kind === "ride" ? LINES[l.route]?.color : undefined }}>
            <i />
            <b>{l.kind === "walk" ? `${l.mins}′` : short(l.route)}</b>
          </span>
        ))}
        <span className="node end">{target ? <Sprite domain={target.domain} name={target.name} caught size={26} /> : "★"}</span>
      </div>
      {steps && (
        <div className="trip-steps">
          {legs.map((l: any) => (
            <Tag key={l.i} type={onFocus ? "button" : undefined} className={`step ${focus === l.i ? "on" : ""}`} onClick={onFocus ? () => pick(l.i) : undefined}>
              <span className="tag" style={{ background: l.kind === "walk" ? "#6b6658" : LINES[l.route]?.color }}>{l.kind === "walk" ? "WALK" : short(l.route)}</span>
              <span className="what">
                {l.kind === "walk" ? <>Walk to {l.to}<small>{l.meters}m</small></> : (
                  <>{l.from} → {l.to}<small>toward {l.toward} · {l.stops} stop{l.stops > 1 ? "s" : ""}{l.nextDepartures?.length ? ` · next ${l.nextDepartures.slice(0, 2).map(fmt).join(", ")}` : ""}</small></>
                )}
              </span>
              <span className="mins">{l.mins}′</span>
            </Tag>
          ))}
        </div>
      )}
    </div>
  );
}

// old name, still used by search
export function RouteLegs({ plan }: { plan: any }) {
  return <TripStrip plan={plan} steps={false} />;
}
