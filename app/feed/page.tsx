"use client";
import Link from "next/link";
import { useState } from "react";
import { api, useApi } from "@/lib/client";
import { Sprite } from "@/components/Sprite";

const Heart = ({ full }: { full?: boolean }) => (
  <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M12 20.5 4.2 12.9A4.9 4.9 0 0 1 12 6.6a4.9 4.9 0 0 1 7.8 6.3Z" fill={full ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>
);
const Bubble = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M20 11.5a8 7.5 0 0 1-11.6 6.7L4 19.5l1.3-3.8A7.4 7.4 0 0 1 4 11.5a8 7.5 0 0 1 16 0Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>
);
const Book = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3Zm0 13a3 3 0 0 1 3-3h11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>
);

const ago = (d: string) => {
  const m = Math.round((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 60) return `${Math.max(m, 1)}m`;
  if (m < 1440) return `${Math.round(m / 60)}h`;
  return `${Math.round(m / 1440)}d`;
};

function Post({ p, onLike }: { p: any; onLike: () => void }) {
  const [comments, setComments] = useState<any[]>(p.comments || []);
  const [count, setCount] = useState(p.comment_count || 0);
  const [all, setAll] = useState(false);
  const [text, setText] = useState("");
  const [pop, setPop] = useState(false);
  const canLike = !p.liked && !p.mine;

  function like() {
    if (!canLike) return;
    setPop(true); setTimeout(() => setPop(false), 600);
    onLike();
  }
  async function more() {
    setComments(await api(`/api/photos/${p.id}/comments`)); setAll(true);
  }
  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    const c = await api(`/api/photos/${p.id}/comments`, { method: "POST", json: { body: text } }).catch(() => null);
    if (c) { setComments((cs) => [...cs, c]); setCount((n: number) => n + 1); setText(""); }
  }

  return (
    <article className="post motion-pop">
      <header>
        <Link href={`/dex/${p.pokebos_id}`}><Sprite domain={p.domain} name={p.pokebos} caught size={34} /></Link>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="who">{p.trainer} <span className="muted">· {ago(p.uploaded_at)}</span></div>
          <Link href={`/dex/${p.pokebos_id}`} className="where">{p.pokebos}</Link>
        </div>
        <span className="tagline">{(p.college || p.trainer_type).toUpperCase()}</span>
      </header>
      <div className="photo-wrap" onDoubleClick={like}>
        <img className="photo" src={`/api/photos/${p.id}`} alt={`${p.trainer}'s catch of ${p.pokebos}`} loading="lazy" />
        {pop && <span className="heart-pop"><Heart full /></span>}
      </div>
      <div className="actions">
        <button className={`act ${p.liked ? "on" : ""}`} onClick={like} disabled={!canLike} aria-label="Like"><Heart full={p.liked} /></button>
        <label className="act" htmlFor={`c${p.id}`} aria-label="Comment"><Bubble /></label>
        <Link className="act" href={`/dex/${p.pokebos_id}`} aria-label="Open in Dex"><Book /></Link>
      </div>
      <div className="post-body">
        <div className="likes">{p.likes} like{p.likes === 1 ? "" : "s"}</div>
        <div><b>{p.trainer}</b> caught <Link href={`/dex/${p.pokebos_id}`}>{p.pokebos}</Link></div>
        {count > comments.length && !all && <button className="linkish" onClick={more}>View all {count} comments</button>}
        {comments.map((c) => <div key={c.id} className="comment"><b>{c.trainer}</b> {c.body}</div>)}
        <form className="addcomment" onSubmit={send}>
          <input id={`c${p.id}`} value={text} maxLength={200} onChange={(e) => setText(e.target.value)} placeholder="Add a comment..." />
          {text.trim() && <button>Post</button>}
        </form>
      </div>
    </article>
  );
}

export default function Feed() {
  const { data, setData } = useApi<any[]>("/api/feed");
  async function like(id: number) {
    setData((d) => d!.map((p) => (p.id === id ? { ...p, likes: p.likes + 1, liked: true } : p)));
    const r = await api(`/api/photos/${id}/like`, { method: "POST" }).catch(() => null);
    if (r) setData((d) => d!.map((p) => (p.id === id ? { ...p, likes: r.likes } : p)));
  }
  if (data && !data.length) return <div className="dialog">No catches yet. Go catch something!</div>;
  return <div className="feed">{data?.map((p) => <Post key={p.id} p={p} onLike={() => like(p.id)} />)}</div>;
}
