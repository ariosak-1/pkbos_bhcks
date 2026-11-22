"use client";
import Link from "next/link";
import { api, useApi, fmtDate } from "@/lib/client";
import { Sprite } from "@/components/Sprite";

export default function Feed() {
  const { data, setData } = useApi<any[]>("/api/feed");
  async function like(id: number) {
    const r = await api(`/api/photos/${id}/like`, { method: "POST" }).catch(() => null);
    if (r) setData((d) => d!.map((p) => (p.id === id ? { ...p, likes: r.likes, liked: true } : p)));
  }
  if (data && !data.length) return <div className="dialog">No catches yet. Go catch something!</div>;
  return (
    <>
      {data?.map((p) => (
        <article key={p.id} className="post">
          <header>
            <Link href={`/dex/${p.pokebos_id}`}><Sprite domain={p.domain} name={p.pokebos} caught size={32} /></Link>
            <div style={{ flex: 1 }}>
              <div className="px" style={{ fontSize: 10 }}>{p.trainer}</div>
              <Link href={`/dex/${p.pokebos_id}`} className="small muted">{p.pokebos} · {fmtDate(p.taken_at || p.uploaded_at)}</Link>
            </div>
            <span className="px muted" style={{ fontSize: 7 }}>{(p.college || p.trainer_type).toUpperCase()}</span>
          </header>
          <img className="photo" src={`/api/photos/${p.id}`} alt="" loading="lazy" />
          <footer>
            <button className={`like ${p.liked ? "on" : ""}`} disabled={p.liked || p.mine} onClick={() => like(p.id)}>♥ {p.likes}</button>
          </footer>
        </article>
      ))}
    </>
  );
}
