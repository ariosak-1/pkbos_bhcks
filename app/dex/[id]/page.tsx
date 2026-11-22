"use client";
import Link from "next/link";
import { use, useState } from "react";
import { api, useApi, dexNo, fmtDate, getPosition } from "@/lib/client";
import { Sprite, Types, Stars } from "@/components/Sprite";
import { TripView } from "@/components/RouteLegs";
import { useRouter } from "next/navigation";
import { LINES } from "@/lib/mbta-snapshot";

export default function DexEntry({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: p, error } = useApi<any>(`/api/pokebos/${id}`);
  const [sheet, setSheet] = useState(false);
  const [plan, setPlan] = useState<any>(null);
  const [routeErr, setRouteErr] = useState("");
  const router = useRouter();

  async function hunt() {
    setRouteErr("");
    const pos = await getPosition();
    if (!pos) return setRouteErr("Turn on location to start a hunt.");
    api("/api/hunts", { method: "POST", json: { to: id, ...pos } }).then(() => router.push("/hunts"), (e) => setRouteErr(e.message));
  }

  async function route() {
    setRouteErr("");
    const pos = await getPosition();
    if (!pos) return setRouteErr("Turn on location to get a T route.");
    api(`/api/route?to=${id}&lat=${pos.lat}&lng=${pos.lng}`).then(setPlan, (e) => setRouteErr(e.message));
  }

  if (error) return <div className="dialog">{error}</div>;
  if (!p) return <div className="px" style={{ fontSize: 10 }}>...</div>;
  const caught = p.level > 0;

  return (
    <div style={{ paddingBottom: 60 }}>
      <div className="box collectible" data-caught={caught} data-rarity={p.rarity}>
        <div className="row" style={{ alignItems: "flex-start", gap: 16 }}>
          <div className="collectible-art detail-art motion-reveal">
            <Sprite domain={p.domain} name={p.name} caught={caught} size={96} />
          </div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <div className="px muted" style={{ fontSize: 9 }}>{dexNo(p.dex_no)}</div>
            <h1 style={{ lineHeight: 1.5, margin: "6px 0" }}>{p.name.toUpperCase()}</h1>
            <Types types={p.types} />
            <div className="row" style={{ marginTop: 8, gap: 12 }}>
              <Stars rarity={p.rarity} />
              <span className="px" style={{ fontSize: 9 }}>{p.points} PTS</span>
              {caught && <span className="px" style={{ fontSize: 9, color: "var(--green)" }}>LV {p.level}</span>}
            </div>
          </div>
        </div>
        <p style={{ margin: "12px 0 0" }}>{p.blurb}</p>
        {p.is_event && <p className="px" style={{ fontSize: 9, color: p.inSeason ? "var(--green)" : "var(--muted)", lineHeight: 1.8 }}>{p.inSeason ? "APPEARING NOW" : `ONLY APPEARS ${p.season_from} → ${p.season_to}`}</p>}
        <div className="small muted" style={{ marginTop: 8 }}>
          Nearest T: {p.stops.map((s: any) => `${s.name} (${s.routes.map((r: string) => LINES[r].group).filter((v: string, i: number, a: string[]) => a.indexOf(v) === i).join("/")}, ${Math.round(s.dist)}m)`).join(" · ")}
        </div>
        <div className="row" style={{ marginTop: 12 }}>
          <Link href={`/catch?id=${p.id}`} className="btn primary">CATCH</Link>
          <button className="btn go" onClick={route}>T ROUTE</button>
          <button className="btn" onClick={hunt}>HUNT IT</button>
        </div>
        {routeErr && <div className="error" style={{ marginTop: 8 }}>{routeErr}</div>}
        {plan && <div style={{ marginTop: 12 }}><TripView plan={plan} target={p} /></div>}
      </div>

      <h2>ABILITIES</h2>
      {p.abilities.map((a: any) => (
        <div key={a.id} className="mon" style={{ opacity: a.unlocked ? 1 : 0.7 }}>
          <span className="px" style={{ fontSize: 14 }}>{a.unlocked ? "◆" : "◇"}</span>
          <div style={{ flex: 1 }}>
            <div className="name">{a.unlocked ? a.name.toUpperCase() : a.name.toUpperCase()}</div>
            <div className="meta">{a.type.toUpperCase()} · {a.unlocked ? "unlocked" : `photo of ${a.hint}`}</div>
          </div>
          <span className="px" style={{ fontSize: 8 }}>+{a.points}</span>
        </div>
      ))}

      <h2>YOUR CATCHES</h2>
      {p.mine.length ? (
        <div className="photogrid">
          {p.mine.map((ph: any) => (
            <figure key={ph.id} style={{ margin: 0 }}>
              <img src={`/api/photos/${ph.id}`} alt="" loading="lazy" />
              <figcaption className="small muted">{fmtDate(ph.taken_at || ph.uploaded_at)}</figcaption>
            </figure>
          ))}
        </div>
      ) : <div className="dialog">Not caught yet.</div>}

      <h2>TOP TRAINERS</h2>
      {p.top.length ? (
        <table className="rank"><tbody>
          {p.top.map((t: any, i: number) => <tr key={t.name}><td className="pos">{i + 1}</td><td>{t.name}</td><td>Lv {t.level}</td></tr>)}
        </tbody></table>
      ) : <div className="small muted">Nobody yet. Be first.</div>}

      <section className={`sheet ${sheet ? "open" : ""}`}>
        <button className="handle" onClick={() => setSheet(!sheet)}>
          <span>POPULAR PHOTOS</span><span>{p.popular.length} {sheet ? "▼" : "▲"}</span>
        </button>
        <div className="inner">
          {p.popular.length ? (
            <div className="photogrid">
              {p.popular.map((ph: any) => (
                <figure key={ph.id} style={{ margin: 0 }}>
                  <img src={`/api/photos/${ph.id}`} alt="" loading="lazy" />
                  <figcaption className="small">{ph.trainer} · ♥{ph.likes}</figcaption>
                </figure>
              ))}
            </div>
          ) : <div className="small muted">No photos from other trainers yet.</div>}
        </div>
      </section>
    </div>
  );
}
