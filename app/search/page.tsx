"use client";
import { useState } from "react";
import { api, getPosition } from "@/lib/client";
import { PokeRow } from "@/components/PokeRow";
import { RouteLegs } from "@/components/RouteLegs";
import { Crimson } from "@/components/Crimson";

export default function Search() {
  const [q, setQ] = useState("");
  const [res, setRes] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState("");

  async function go(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    setBusy(true); setAnswer("");
    const pos = await getPosition(4000);
    const loc = pos ? `&lat=${pos.lat}&lng=${pos.lng}` : "";
    api(`/api/search?q=${encodeURIComponent(q)}${loc}`).then(setRes).finally(() => setBusy(false));
  }
  async function ask() {
    setAnswer("...");
    const pos = await getPosition(3000);
    api("/api/ask", { method: "POST", json: { q, ...pos } }).then((r) => setAnswer(r.answer), (e) => setAnswer(e.message));
  }

  return (
    <>
      <form onSubmit={go} className="row" style={{ flexWrap: "nowrap" }}>
        <input className="field" value={q} onChange={(e) => setQ(e.target.value)} placeholder="JAPANESE FOOD, HOCKEY, MUSEUMS..." autoFocus />
        <button className="btn primary" disabled={busy}>GO</button>
      </form>
      {res && (
        <>
          <div className="small muted" style={{ margin: "10px 0" }}>{res.terms.slice(0, 8).join(" · ")}</div>
          {res.results.length ? res.results.map((p: any) => (
            <PokeRow key={p.id} p={p} extra={
              <>
                {p.matched?.length > 0 && <div className="small">◆ {p.matched.join(", ")}</div>}
                {p.route && <RouteLegs plan={p.route} />}
              </>
            } />
          )) : <div className="dialog">No Pokebos match that. Try asking the Professor.</div>}
          <div className="box row" style={{ marginTop: 16, alignItems: "flex-end" }}>
            <Crimson size={48} talking={answer === "..."} />
            <div style={{ flex: 1 }}>
              {answer ? <div className="small">{answer}</div> : <button className="btn" onClick={ask}>ASK PROF. CRIMSON</button>}
            </div>
          </div>
        </>
      )}
    </>
  );
}
