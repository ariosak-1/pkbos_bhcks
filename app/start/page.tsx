"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { Crimson, Logo } from "@/components/Crimson";
import { Typewriter } from "@/components/Typewriter";
import { COLLEGES } from "@/lib/seed-data";
import { useMe } from "@/components/AppShell";

type Phase = "title" | "login" | "talk" | "name" | "kind" | "college" | "password" | "outro";

const INTRO = [
  "Hi there! Welcome to the world of POKEBOS!",
  "I'm CRIMSON. Folks around the Square call me the Pokebos Professor.",
  "This city is full of creatures called POKEBOS: cafes, stadiums, museums, legendary events...",
  "Trainers ride the T, find them, and catch them with a single photo.",
  "Me? I study them. And I never take off this sweatshirt.",
];

export default function Start() {
  const router = useRouter();
  const { me } = useMe();
  const [phase, setPhase] = useState<Phase>("title");
  const [line, setLine] = useState(0);
  const [typed, setTyped] = useState(false);
  const [form, setForm] = useState({ name: "", trainerType: "", college: "", password: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (me?.user && (phase === "title" || phase === "login")) router.replace("/");
  }, [me, phase, router]);

  const advance = () => {
    if (!typed) return setTyped(true);
    setTyped(false);
    if (line + 1 < INTRO.length) setLine(line + 1);
    else setPhase("name");
  };

  async function create() {
    if (busy || form.password.length < 4) return;
    setBusy(true); setErr("");
    try {
      await api("/api/auth/signup", { method: "POST", json: form });
      setPhase("outro"); setTyped(false);
    } catch (e: any) {
      setErr(e.message);
      if (e.status === 409) setPhase("name");
    } finally { setBusy(false); }
  }

  async function login(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setErr("");
    try { await api("/api/auth/login", { method: "POST", json: { name: form.name, password: form.password } }); router.replace("/"); }
    catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }

  if (phase === "title" || phase === "login")
    return (
      <div className="intro title">
        <Logo size={88} />
        <div className="logo">POKEBOS</div>
        <div className="sub">BOSTON VERSION</div>
        {phase === "title" ? (
          <div className="menu">
            <button className="choice" autoFocus onClick={() => { setErr(""); setPhase("talk"); }}>NEW GAME</button>
            <button className="choice" onClick={() => { setErr(""); setPhase("login"); }}>CONTINUE</button>
          </div>
        ) : (
          <form className="menu" onSubmit={login}>
            <input className="field" placeholder="NAME" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
            <input className="field" placeholder="PASSWORD" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            {err && <div className="error" role="alert">{err}</div>}
            <button className="btn primary" disabled={busy}>CONTINUE</button>
            <button type="button" className="choice" onClick={() => setPhase("title")}>BACK</button>
          </form>
        )}
      </div>
    );

  const say = (text: string, onClick?: () => void) => (
    <div className="dialog" onClick={onClick}>
      <Typewriter key={text} text={text} skip={typed} onDone={() => setTyped(true)} />
      {onClick && (
        <button type="button" className="btn" style={{ display: "flex", margin: "12px 0 0 auto" }} onClick={(event) => {
          event.stopPropagation();
          onClick();
        }}>
          {typed ? phase === "outro" ? "START GAME" : "NEXT" : "SHOW TEXT"}
        </button>
      )}
    </div>
  );

  return (
    <div className="intro">
      <div className="stage"><Crimson size={150} talking={!typed} /></div>
      {phase === "talk" && say(INTRO[line], advance)}

      {phase === "name" && (
        <form onSubmit={(e) => {
          e.preventDefault();
          if (!/^[A-Z0-9 _.-]{2,12}$/.test(form.name.trim())) {
            setErr("Use 2–12 letters, numbers, spaces, or _ . - in your name.");
            return;
          }
          setTyped(false);
          setPhase("kind");
          setErr("");
        }} className="grid">
          {say("First, what is your name?")}
          <input className="field" maxLength={12} autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value.toUpperCase() })} placeholder="NAME" />
          {err && <div className="error" role="alert">{err}</div>}
          <button className="btn primary">OK</button>
        </form>
      )}

      {phase === "kind" && (
        <div className="grid">
          {say(`${form.name}! And what brings you to Boston?`)}
          {[["college", "STUDENT"], ["resident", "RESIDENT"], ["tourist", "TOURIST"]].map(([k, label]) => (
            <button key={k} className="choice" onClick={() => { setForm({ ...form, trainerType: k }); setPhase(k === "college" ? "college" : "password"); setTyped(false); }}>{label}</button>
          ))}
        </div>
      )}

      {phase === "college" && (
        <div className="grid">
          {say("Which school? Choose wisely. There is a leaderboard.")}
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))" }}>
            {COLLEGES.map((c) => <button key={c} className="choice" onClick={() => { setForm({ ...form, college: c }); setPhase("password"); setTyped(false); }}>{c.toUpperCase()}</button>)}
          </div>
        </div>
      )}

      {phase === "password" && (
        <form onSubmit={(e) => { e.preventDefault(); create(); }} className="grid">
          {say("Last thing. A secret word, so nobody steals your Dex.")}
          <input className="field" type="password" autoFocus value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="PASSWORD" />
          {err && <div className="error" role="alert">{err}</div>}
          <button className="btn primary" disabled={busy || form.password.length < 4}>OK</button>
        </form>
      )}

      {phase === "outro" && say(`${form.name}! Your very own Pokebos legend is about to unfold! Let's go!`, () => (typed ? router.replace("/") : setTyped(true)))}
    </div>
  );
}
