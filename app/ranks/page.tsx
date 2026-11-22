"use client";
import { useState } from "react";
import { useApi } from "@/lib/client";
import { useMe } from "@/components/AppShell";

const BOARDS = ["overall", "college", "resident", "tourist"];
function months() {
  const out: string[] = [];
  const d = new Date();
  for (let i = 0; i < 6; i++) { out.push(new Date(d.getFullYear(), d.getMonth() - i, 1).toLocaleDateString("en-CA").slice(0, 7)); }
  return out;
}

export default function Ranks() {
  const { me } = useMe();
  const [board, setBoard] = useState("overall");
  const ms = months();
  const [month, setMonth] = useState(ms[0]);
  const { data } = useApi<any>(`/api/leaderboard?board=${board}&month=${month}`);
  return (
    <>
      <h1>LEADERBOARD</h1>
      <div className="chips" style={{ marginBottom: 8 }}>
        {BOARDS.map((b) => <button key={b} className={`chip ${board === b ? "on" : ""}`} onClick={() => setBoard(b)}>{b.toUpperCase()}</button>)}
      </div>
      <select className="field" value={month} onChange={(e) => setMonth(e.target.value)} style={{ marginBottom: 14 }}>
        {ms.map((m) => <option key={m} value={m}>{new Date(m + "-15").toLocaleDateString("en-US", { month: "long", year: "numeric" }).toUpperCase()}</option>)}
        <option value="all">ALL TIME</option>
      </select>
      {board === "college" && data?.colleges?.length > 0 && (
        <>
          <h2>SCHOOLS</h2>
          <table className="rank"><thead><tr><th>#</th><th>SCHOOL</th><th>TRAINERS</th><th>PTS</th></tr></thead><tbody>
            {data.colleges.map((c: any, i: number) => <tr key={c.name} className={c.name === me?.user.college ? "me" : ""}><td className="pos">{i + 1}</td><td>{c.name}</td><td>{c.trainers}</td><td>{c.points}</td></tr>)}
          </tbody></table>
          <h2>TRAINERS</h2>
        </>
      )}
      <table className="rank"><thead><tr><th>#</th><th>TRAINER</th><th></th><th>PTS</th></tr></thead><tbody>
        {data?.trainers?.map((t: any, i: number) => (
          <tr key={t.name} className={t.name === me?.user.name ? "me" : ""}>
            <td className="pos">{i + 1}</td><td>{t.name}</td><td className="muted">{t.college || t.trainer_type}</td><td>{t.points}</td>
          </tr>
        ))}
        {data && !data.trainers.length && <tr><td colSpan={4} className="muted">No points yet this month.</td></tr>}
      </tbody></table>
    </>
  );
}
