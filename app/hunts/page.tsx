"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api, getPosition } from "@/lib/client";
import { useMe } from "@/components/AppShell";
import { Sprite, Types, Stars } from "@/components/Sprite";
import { TripView, TripStrip } from "@/components/RouteLegs";

const km = (m: number) => (m < 1000 ? `${m}m` : `${(m / 1000).toFixed(1)}km`);

export default function Hunts() {
  const { reload } = useMe();
  const [data, setData] = useState<any>(null);
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const [sel, setSel] = useState(0);
  const [plan, setPlan] = useState<any>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const p = await getPosition(6000);
    setPos(p);
    const d = await api(`/api/hunts${p ? `?lat=${p.lat}&lng=${p.lng}` : ""}`);
    setData(d); setPlan(null);
  }
  useEffect(() => { load().catch((e) => setErr(e.message)); }, []);

  async function start(to: string) {
    if (!pos) return setErr("Turn on location so we know where you're starting from.");
    setBusy(true); setErr("");
    try {
      const r = await api("/api/hunts", { method: "POST", json: { to, ...pos } });
      setData({ ...data, active: r.active });
      window.scrollTo({ top: 0, behavior: "smooth" });
      reload();
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }
  async function giveUp() {
    await api("/api/hunts", { method: "DELETE" });
    load();
  }
  async function reroute() {
    const p = await getPosition();
    if (!p) return setErr("Turn on location to reroute.");
    api(`/api/route?to=${data.active.target.id}&lat=${p.lat}&lng=${p.lng}`).then(setPlan, (e) => setErr(e.message));
  }

  if (!data) return err ? <div className="dialog">{err}</div> : <div className="routemap skeleton" />;
  const a = data.active;
  const offer = data.offers[sel];

  return (
    <>
      <div className="spread">
        <h1 style={{ margin: 0 }}>HUNTS</h1>
        <span className="small muted">{data.completed} done · +{data.earned} pts</span>
      </div>
      <p className="small muted" style={{ margin: "4px 0 14px" }}>Ride the T from where you are to a Pokebos across town. Catch it there for the bonus.</p>
      {err && <div className="error" style={{ marginBottom: 10 }}>{err}</div>}

      {a ? (
        <section className="box hunt-active motion-pop">
          <div className="row" style={{ flexWrap: "nowrap" }}>
            <Sprite domain={a.target.domain} name={a.target.name} caught size={52} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="px muted" style={{ fontSize: 8 }}>ON THE HUNT</div>
              <h2 style={{ margin: "4px 0" }}>{a.target.name.toUpperCase()}</h2>
              <Types types={a.target.types} />
            </div>
            <span className="bonus">+{a.bonus}</span>
          </div>
          <TripView plan={plan || a.plan} target={a.target} />
          <div className="row" style={{ marginTop: 12 }}>
            <Link href={`/catch?id=${a.target.id}`} className="btn primary">CATCH IT</Link>
            <button className="btn" onClick={reroute}>REROUTE FROM HERE</button>
            <button className="btn ghost" onClick={giveUp}>GIVE UP</button>
          </div>
        </section>
      ) : data.needLocation ? (
        <div className="dialog">Turn on location and Crimson will line up a few hunts from where you are.</div>
      ) : !data.offers.length ? (
        <div className="dialog">Nothing far enough to ride to from here. Try again somewhere else in the city.</div>
      ) : null}

      {data.offers.length > 0 && (
        <>
          <h2>{a ? "NEXT UP" : "PICK A HUNT"}</h2>
          {!a && offer && <TripView key={offer.target.id} plan={offer.plan} target={offer.target} />}
          <div className="hunt-grid motion-stagger">
            {data.offers.map((o: any, i: number) => (
              <div key={o.target.id} className={`hunt-card ${!a && i === sel ? "on" : ""}`} onClick={() => setSel(i)}>
                <div className="row" style={{ flexWrap: "nowrap" }}>
                  <Sprite domain={o.target.domain} name={o.target.name} caught={o.target.caught} size={40} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="name">{o.target.name}</div>
                    <div className="small muted">{km(o.target.dist)} · <Stars rarity={o.target.rarity} /></div>
                  </div>
                  <span className="bonus">+{o.bonus}</span>
                </div>
                <TripStrip plan={o.plan} target={o.target} steps={false} />
                <button className="btn go block" disabled={busy} onClick={(e) => { e.stopPropagation(); start(o.target.id); }}>
                  {a ? "SWITCH TO THIS" : "START HUNT"}
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
