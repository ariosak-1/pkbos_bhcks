"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, useApi, fmtDate } from "@/lib/client";
import { useMe } from "@/components/AppShell";
import { Sprite } from "@/components/Sprite";
import { Crimson } from "@/components/Crimson";

export default function Trainer() {
  const { me, reload, replayTutorial } = useMe();
  const router = useRouter();
  const { data: rewards } = useApi<any[]>("/api/rewards");
  const [msg, setMsg] = useState("");
  if (!me?.user) return null;
  const { user, stats, badges, redemptions, features } = me;

  async function redeem(id: string) {
    try { const r = await api("/api/rewards", { method: "POST", json: { rewardId: id } }); setMsg(`${r.name}: ${r.code}`); reload(); }
    catch (e: any) { setMsg(e.message); }
  }
  async function toggleTracking() {
    if (!user.tracking && navigator.geolocation) navigator.geolocation.getCurrentPosition(() => {}, () => {});
    await api("/api/me", { method: "PATCH", json: { tracking: !user.tracking } });
    reload();
  }

  return (
    <>
      <div className="box">
        <div className="spread"><h1 style={{ margin: 0 }}>TRAINER CARD</h1><span className="px muted" style={{ fontSize: 8 }}>ID {String(user.id).padStart(5, "0")}</span></div>
        <div className="row" style={{ marginTop: 12, alignItems: "flex-start" }}>
          <div style={{ flex: 1, display: "grid", gap: 6 }} className="small">
            <div className="spread"><span>NAME</span><b className="px" style={{ fontSize: 10 }}>{user.name}</b></div>
            <div className="spread"><span>TYPE</span><span>{user.college || user.trainer_type}</span></div>
            <div className="spread"><span>DEX</span><span>{stats.caught}/{stats.dexTotal}</span></div>
            <div className="spread"><span>POINTS EARNED</span><span>{stats.earned}</span></div>
            <div className="spread"><span>BALANCE</span><span>{stats.balance}</span></div>
            <div className="spread"><span>T MILES</span><span>{stats.tMiles}</span></div>
          </div>
          <Crimson size={64} />
        </div>
      </div>

      <h2>BADGES</h2>
      <div className="badgecase">
        {badges.map((b: any) => (
          <a key={b.id} className={`badge ${b.earned ? "" : "off"}`} href={b.chainUrl || undefined} target="_blank" rel="noreferrer">
            <i style={{ background: b.color }} />{b.earned ? b.name.toUpperCase() : "???"}
          </a>
        ))}
      </div>

      <h2>TRACKING</h2>
      <div className="box spread">
        <span className="small">Passive T miles + nearby alerts</span>
        <button className={`btn ${user.tracking ? "go" : ""}`} onClick={toggleTracking}>{user.tracking ? "ON" : "OFF"}</button>
      </div>

      <h2>REWARDS</h2>
      {msg && <div className="dialog" style={{ marginBottom: 10 }}>{msg}</div>}
      {rewards?.map((r) => (
        <div key={r.id} className="mon">
          <Sprite domain={r.domain} name={r.name} caught size={32} />
          <div style={{ flex: 1 }} className="name">{r.name.toUpperCase()}</div>
          <button className="btn" disabled={stats.balance < r.cost} onClick={() => redeem(r.id)}>{r.cost}</button>
        </div>
      ))}
      {redemptions.length > 0 && (
        <table className="rank" style={{ marginTop: 10 }}><tbody>
          {redemptions.map((r: any) => <tr key={r.code}><td>{r.name}</td><td className="px" style={{ fontSize: 9 }}>{r.code}</td><td className="muted">{fmtDate(r.created_at)}</td></tr>)}
        </tbody></table>
      )}

      <div className="row" style={{ marginTop: 24 }}>
        <button className="btn" onClick={replayTutorial}>TUTORIAL</button>
        <button className="btn" onClick={async () => { await api("/api/auth/logout", { method: "POST" }); router.replace("/start"); reload(); }}>SIGN OUT</button>
      </div>
      <div className="small muted" style={{ marginTop: 16 }}>
        AI {features.ai ? "online" : "offline"} · Solana ledger {features.solana ? "on" : "off"} · DB {features.postgres ? "Postgres" : "local"}
      </div>
    </>
  );
}
