"use client";
import { LINES } from "@/lib/mbta-snapshot";

const fmt = (iso: string) => {
  const m = Math.round((new Date(iso).getTime() - Date.now()) / 60000);
  return m <= 0 ? "now" : `${m} min`;
};

export function RouteLegs({ plan }: { plan: { totalMins: number; legs: any[] } }) {
  return (
    <div>
      <div className="px" style={{ fontSize: 9 }}>~{plan.totalMins} MIN</div>
      <div className="legs">
        {plan.legs.filter((l) => l.kind === "ride" || l.meters > 40).map((l, i) =>
          l.kind === "walk" ? (
            <div className="leg" key={i}><span className="tag" style={{ background: "#6b6658" }}>WALK</span> {l.mins} min to {l.to}</div>
          ) : (
            <div className="leg" key={i}>
              <span className="tag" style={{ background: LINES[l.route]?.color }}>{l.route.replace("Green-", "GL ").toUpperCase()}</span>
              <span>{l.from} → {l.to} <span className="muted">· toward {l.toward} · {l.stops} stop{l.stops > 1 ? "s" : ""}{l.nextDepartures?.length ? ` · next ${l.nextDepartures.slice(0, 2).map(fmt).join(", ")}` : ""}</span></span>
            </div>
          )
        )}
      </div>
    </div>
  );
}
