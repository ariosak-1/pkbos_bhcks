"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api, getPosition } from "@/lib/client";
import { useMe } from "@/components/AppShell";
import { PokeCard, PokeRow } from "@/components/PokeRow";
import { Crimson } from "@/components/Crimson";
import { Sprite } from "@/components/Sprite";
import { TripStrip } from "@/components/RouteLegs";

export default function Home() {
  const { me } = useMe();
  const [rec, setRec] = useState<any>(null);
  const [hunt, setHunt] = useState<any>(null);
  useEffect(() => {
    api("/api/recommend").then(setRec);
    api("/api/hunts").then((h) => setHunt(h.active), () => {});
    getPosition(4000).then((pos) => pos && api(`/api/recommend?lat=${pos.lat}&lng=${pos.lng}`).then(setRec));
  }, []);
  const s = me?.stats;

  return (
    <div className="home">
      <div className="box row home-hero" style={{ alignItems: "flex-end" }}>
        <Crimson size={54} />
        <div style={{ flex: 1 }}>
          <h1 style={{ marginBottom: 6 }}>{me?.user.name}</h1>
          <div className="spread small"><span>DEX {s?.caught}/{s?.dexTotal}</span><span>{s?.earned} PTS</span></div>
          <div className="bar"><i style={{ width: `${s ? (s.caught / s.dexTotal) * 100 : 0}%` }} /></div>
        </div>
      </div>

      {hunt ? (
        <Link href="/hunts" className="box hunt-active" style={{ display: "block" }}>
          <div className="row" style={{ flexWrap: "nowrap" }}>
            <Sprite domain={hunt.target.domain} name={hunt.target.name} caught size={40} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="px muted" style={{ fontSize: 8 }}>ON THE HUNT</div>
              <h3 style={{ margin: "4px 0 0" }}>{hunt.target.name.toUpperCase()}</h3>
            </div>
            <span className="bonus">+{hunt.bonus}</span>
          </div>
          <TripStrip plan={hunt.plan} target={hunt.target} steps={false} />
        </Link>
      ) : (
        <Link href="/hunts" className="box hunt-cta">
          <span className="px">START A HUNT</span>
          <span className="small muted">Ride the T to a Pokebos across town for bonus points</span>
        </Link>
      )}

      <Link href="/beat" className="box beat-cta">
        <span className="px">BEAT THE T</span>
        <span className="small muted">Waiting on a train? Grab a few Pokebos before it shows up.</span>
      </Link>

      <section className="home-wide">
        <h2>{rec?.hasAffinity ? "FOR YOU" : "FILL YOUR DEX"}</h2>
        <div className="scroller motion-stagger">{rec?.forYou?.map((p: any) => <PokeCard key={p.id} p={p} />)}</div>
      </section>

      {rec?.nearby?.length > 0 && (<section><h2>NEARBY</h2>{rec.nearby.slice(0, 4).map((p: any) => <PokeRow key={p.id} p={p} />)}</section>)}

      <section>
      <h2>LEGENDARY SIGHTINGS</h2>
      {rec?.events?.slice(0, 4).map((p: any) => (
        <PokeRow key={p.id} p={p} extra={<div className="px" style={{ fontSize: 8, color: p.inSeason ? "var(--green)" : "var(--muted)", marginTop: 4 }}>{p.inSeason ? "APPEARING NOW" : `SEASON ${p.season_from} → ${p.season_to}`}</div>} />
      ))}
      </section>
    </div>
  );
}
