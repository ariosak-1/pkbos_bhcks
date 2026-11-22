"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api, getPosition } from "@/lib/client";
import { Sprite } from "@/components/Sprite";
import { TripView } from "@/components/RouteLegs";

const MINS = [5, 10, 15, 20, 30, 45];
const clock = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

export default function BeatTheT() {
  const [mins, setMins] = useState(15);
  const [words, setWords] = useState("");
  const [preview, setPreview] = useState<any>(null);
  const [run, setRun] = useState<any>(null);
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [now, setNow] = useState(Date.now());

  useEffect(() => { api("/api/beat").then((r) => setRun(r.run), () => {}); }, []);
  const live = run && !run.completed_at && new Date(run.deadline).getTime() > now;
  useEffect(() => {
    if (!live) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    const poll = setInterval(() => api("/api/beat").then((r) => setRun(r.run), () => {}), 15000);
    return () => { clearInterval(t); clearInterval(poll); };
  }, [live]);

  async function roll() {
    setBusy(true); setErr("");
    const p = pos || (await getPosition());
    if (!p) { setBusy(false); return setErr("Turn on location so we know where your stop is."); }
    setPos(p);
    try { setPreview((await api("/api/beat", { method: "POST", json: { mins, words, ...p } })).preview); }
    catch (e: any) { setErr(e.message); setPreview(null); }
    finally { setBusy(false); }
  }
  async function go() {
    setBusy(true);
    try { setRun((await api("/api/beat", { method: "POST", json: { mins, words, ...pos, go: true, preview } })).run); setPreview(null); setNow(Date.now()); }
    catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }

  if (live) {
    const left = new Date(run.deadline).getTime() - now;
    const done = run.stops.filter((s: any) => s.caught).length;
    return (
      <>
        <div className={`beat-clock ${left < 120000 ? "hurry" : ""}`}>
          <span className="px">TRAIN IN</span>
          <b>{clock(left)}</b>
        </div>
        <h1 style={{ textAlign: "center" }}>{run.title.toUpperCase()}</h1>
        <div className="bar" style={{ marginBottom: 12 }}><i style={{ width: `${(done / run.stops.length) * 100}%` }} /></div>
        <div className="beat-stops motion-stagger">
          {run.stops.map((s: any, i: number) => (
            <Link key={s.id} href={`/catch?id=${s.id}`} className={`beat-stop ${s.caught ? "got" : ""}`}>
              <span className="n">{i + 1}</span>
              <Sprite domain={s.domain} name={s.name} caught size={36} />
              <span className="name">{s.name}</span>
              <span className="px">{s.caught ? "✓" : "CATCH"}</span>
            </Link>
          ))}
        </div>
        <p className="small muted" style={{ textAlign: "center" }}>Catch all {run.stops.length} and be back for your train. +{run.bonus} bonus.</p>
      </>
    );
  }

  return (
    <>
      <h1>BEAT THE T</h1>
      <p className="small muted" style={{ marginTop: -4 }}>How long till your train? Crimson picks a quick loop of Pokebos you can grab and still make it.</p>

      {run && (
        <div className={`box beat-result ${run.completed_at ? "won" : ""}`}>
          <span className="px">{run.completed_at ? `BEAT IT! +${run.bonus}` : "THE TRAIN LEFT..."}</span>
          <span className="small muted">{run.title} · {run.stops.filter((s: any) => s.caught).length}/{run.stops.length} caught</span>
        </div>
      )}

      <div className="box">
        <h3>MINUTES TILL YOUR TRAIN</h3>
        <div className="chips">
          {MINS.map((m) => <button key={m} className={`chip ${mins === m ? "on" : ""}`} onClick={() => { setMins(m); setPreview(null); }}>{m}</button>)}
        </div>
        <h3 style={{ marginTop: 10 }}>IN THE MOOD FOR <span className="muted">(OPTIONAL)</span></h3>
        <input className="field" value={words} maxLength={80} onChange={(e) => setWords(e.target.value)} placeholder="coffee, history, pizza..." onKeyDown={(e) => e.key === "Enter" && roll()} />
        <button className="btn primary block" style={{ marginTop: 12 }} disabled={busy} onClick={roll}>{busy ? "..." : preview ? "REROLL" : "ROLL A RUN"}</button>
        {err && <div className="error" style={{ marginTop: 8 }}>{err}</div>}
      </div>

      {preview && (
        <section className="box hunt-active motion-pop">
          <div className="spread"><h2 style={{ margin: 0 }}>{preview.title.toUpperCase()}</h2><span className="bonus">+{preview.bonus}</span></div>
          <p className="small" style={{ margin: "6px 0 0" }}>{preview.brief}</p>
          {preview.note && <p className="small muted" style={{ margin: "4px 0 0" }}>{preview.note}</p>}
          <TripView plan={preview.plan} pins={preview.stops} />
          <button className="btn go block" disabled={busy} onClick={go}>GO! START THE CLOCK</button>
        </section>
      )}
    </>
  );
}
