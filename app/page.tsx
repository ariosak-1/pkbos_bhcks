"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api, getPosition } from "@/lib/client";
import { useMe } from "@/components/AppShell";
import { PokeCard, PokeRow } from "@/components/PokeRow";
import { Crimson } from "@/components/Crimson";

export default function Home() {
  const { me } = useMe();
  const [rec, setRec] = useState<any>(null);
  const [hunts, setHunts] = useState<any[]>([]);
  useEffect(() => {
    api("/api/recommend").then(setRec);
    api("/api/hunts").then(setHunts);
    getPosition(4000).then((pos) => pos && api(`/api/recommend?lat=${pos.lat}&lng=${pos.lng}`).then(setRec));
  }, []);
  const active = hunts.filter((h) => h.started_at && !h.completed_at);
  const s = me?.stats;

  return (
    <>
      <div className="box row" style={{ alignItems: "flex-end" }}>
        <Crimson size={54} />
        <div style={{ flex: 1 }}>
          <h1 style={{ marginBottom: 6 }}>{me?.user.name}</h1>
          <div className="spread small"><span>DEX {s?.caught}/{s?.dexTotal}</span><span>{s?.earned} PTS</span></div>
          <div className="bar"><i style={{ width: `${s ? (s.caught / s.dexTotal) * 100 : 0}%` }} /></div>
        </div>
      </div>

      {active.map((h) => (
        <Link key={h.id} href="/hunts" className="box" style={{ display: "block", background: "#fff4c2" }}>
          <div className="spread"><h3>HUNT: {h.name.toUpperCase()}</h3><span className="px" style={{ fontSize: 9 }}>+{h.bonus}</span></div>
          <div className="row" style={{ gap: 6 }}>{h.stops.map((p: any) => <span key={p.id} className="ball" style={{ opacity: p.caught ? 1 : 0.25 }} />)}</div>
        </Link>
      ))}

      {rec?.nearby?.length > 0 && (<><h2>NEARBY</h2>{rec.nearby.slice(0, 3).map((p: any) => <PokeRow key={p.id} p={p} />)}</>)}

      <h2>{rec?.hasAffinity ? "FOR YOU" : "FILL YOUR DEX"}</h2>
      <div className="scroller">{rec?.forYou?.map((p: any) => <PokeCard key={p.id} p={p} />)}</div>

      <h2>LEGENDARY SIGHTINGS</h2>
      {rec?.events?.slice(0, 4).map((p: any) => (
        <PokeRow key={p.id} p={p} extra={<div className="px" style={{ fontSize: 8, color: p.inSeason ? "var(--green)" : "var(--muted)", marginTop: 4 }}>{p.inSeason ? "APPEARING NOW" : `SEASON ${p.season_from} → ${p.season_to}`}</div>} />
      ))}

      {!active.length && <Link href="/hunts" className="btn go block" style={{ marginTop: 16 }}>START A HUNT</Link>}
    </>
  );
}
