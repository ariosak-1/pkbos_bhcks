"use client";
import { api, useApi } from "@/lib/client";
import { useMe } from "@/components/AppShell";
import { Sprite } from "@/components/Sprite";
import { LINES } from "@/lib/mbta-snapshot";
import Link from "next/link";

export default function Hunts() {
  const { me, reload } = useMe();
  const { data, reload: again } = useApi<any[]>("/api/hunts");
  async function start(id: string) {
    await api(`/api/hunts/${id}`, { method: "POST" });
    if (!me?.user.tracking) await api("/api/me", { method: "PATCH", json: { tracking: true } }); // a hunt tracks your route
    again(); reload();
  }
  return (
    <>
      <h1>HUNTS</h1>
      {data?.map((h) => {
        const done = h.stops.filter((s: any) => s.caught).length;
        return (
          <div key={h.id} className="box" style={{ borderColor: LINES[h.line]?.color }}>
            <div className="spread">
              <h3 style={{ margin: 0 }}><span className="linepill" style={{ background: LINES[h.line]?.color }} />{h.name.toUpperCase()}</h3>
              <span className="px" style={{ fontSize: 9 }}>+{h.bonus}</span>
            </div>
            <div className="row" style={{ margin: "12px 0", gap: 8 }}>
              {h.stops.map((s: any, i: number) => (
                <Link key={s.id} href={`/dex/${s.id}`} className="row" style={{ gap: 4 }}>
                  <Sprite domain={s.domain} name={s.name} caught={s.caught} size={32} />
                  {i < h.stops.length - 1 && <span className="muted">→</span>}
                </Link>
              ))}
            </div>
            {h.completed_at ? <span className="px" style={{ fontSize: 9, color: "var(--green)" }}>COMPLETE</span>
              : h.started_at ? <div><div className="bar"><i style={{ width: `${(done / h.stops.length) * 100}%` }} /></div><span className="small">{done}/{h.stops.length}</span></div>
              : <button className="btn go" onClick={() => start(h.id)}>START</button>}
          </div>
        );
      })}
    </>
  );
}
