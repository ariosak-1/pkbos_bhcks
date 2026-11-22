"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useRef, useState } from "react";
import { api, getPosition, useApi } from "@/lib/client";
import { useMe } from "@/components/AppShell";
import { Sprite, Types } from "@/components/Sprite";

type Result =
  | { status: "caught"; pokebos: any; level: number; first: boolean; points: number; newAbilities: string[]; huntsCompleted: string[]; badges: string[] }
  | { status: "choose"; candidates: any[] };

function Catch() {
  const preset = useSearchParams().get("id");
  const { reload } = useMe();
  const { data: target } = useApi<any>(preset ? `/api/pokebos/${preset}` : null);
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<Result | null>(null);
  const [err, setErr] = useState("");
  const [ability, setAbility] = useState<number | null>(null);

  async function throwBall(f: File, pokebosId?: string) {
    setBusy(true); setErr(""); setRes(null);
    const fd = new FormData();
    fd.append("photo", f);
    const pos = await getPosition(4000);
    if (pos) { fd.append("lat", String(pos.lat)); fd.append("lng", String(pos.lng)); }
    if (pokebosId) fd.append("pokebosId", pokebosId);
    if (ability) fd.append("abilityId", String(ability));
    const started = Date.now();
    try {
      const r = await api<Result>("/api/catch", { method: "POST", body: fd });
      await new Promise((ok) => setTimeout(ok, Math.max(0, 2200 - (Date.now() - started)))); // let the ball wobble
      setRes(r);
      if (r.status === "caught") reload();
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  }

  function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    throwBall(f, preset || undefined);
  }

  const reset = () => { setFile(null); setPreview(null); setRes(null); setErr(""); if (input.current) input.current.value = ""; };

  return (
    <div className="catchzone">
      {target && !res && (
        <div className="row"><Sprite domain={target.domain} name={target.name} caught={target.level > 0} size={40} /><h1 style={{ margin: 0 }}>{target.name.toUpperCase()}</h1></div>
      )}
      {target && !res && !file && target.abilities.some((a: any) => !a.unlocked) && (
        <div className="chips">
          {target.abilities.filter((a: any) => !a.unlocked).map((a: any) => (
            <button key={a.id} className={`chip ${ability === a.id ? "on" : ""}`} onClick={() => setAbility(ability === a.id ? null : a.id)}>{a.name.toUpperCase()}</button>
          ))}
        </div>
      )}

      {!res && (
        <button className={`bigball ${busy ? "wobble" : ""}`} onClick={() => input.current?.click()} disabled={busy} aria-label="Take photo" />
      )}
      <input ref={input} type="file" accept="image/*" capture="environment" hidden onChange={pick} />
      {preview && !res && <img src={preview} className="preview" alt="" />}
      {busy && <div className="dialog" style={{ width: "100%" }}>...</div>}
      {err && (
        <div className="dialog" style={{ width: "100%" }}>{err}<div className="row" style={{ marginTop: 10 }}><button className="btn" onClick={reset}>OK</button></div></div>
      )}

      {res?.status === "caught" && (
        <>
          <img src={preview!} className="preview motion-reveal" alt="" />
          <div className="dialog achievement motion-pop" role="status" style={{ width: "100%" }}>
            {(res.first || res.badges.length > 0 || res.huntsCompleted.length > 0 || res.newAbilities.length > 0) && (
              <span className="achievement-burst" aria-hidden="true">
                <i /><i /><i /><i /><i /><i />
              </span>
            )}
            {res.first ? `Gotcha! ${res.pokebos.name.toUpperCase()} was caught!` : `${res.pokebos.name.toUpperCase()} grew to Lv ${res.level}!`}
            <br />+{res.points} PTS
            {res.newAbilities.map((a) => <div key={a}>Unlocked ability {a.toUpperCase()}!</div>)}
            {res.huntsCompleted.map((h) => <div key={h}>{h.startsWith("Beat the T") ? `${h.toUpperCase()}! You beat the train!` : `Hunt complete: ${h.toUpperCase()}!`}</div>)}
            {res.badges.map((b) => <div key={b}>You earned the {b.toUpperCase()} badge!</div>)}
          </div>
          <div className="row">
            <Link href={`/dex/${res.pokebos.id}`} className="btn primary">VIEW</Link>
            <button className="btn" onClick={reset}>AGAIN</button>
          </div>
        </>
      )}

      {res?.status === "choose" && (
        <div style={{ width: "100%" }}>
          <div className="dialog" style={{ marginBottom: 12 }}>Hmm, which Pokebos is this?</div>
          {res.candidates.map((c) => (
            <button key={c.id} className="mon" style={{ width: "100%", textAlign: "left" }} onClick={() => file && throwBall(file, c.id)}>
              <div style={{ flex: 1 }}><div className="name">{c.name}</div><Types types={c.types} /></div>
              {c.dist != null && <span className="small muted">{c.dist}m</span>}
            </button>
          ))}
          <button className="btn" style={{ marginTop: 10 }} onClick={reset}>CANCEL</button>
        </div>
      )}
    </div>
  );
}

export default function CatchPage() {
  return <Suspense><Catch /></Suspense>;
}
