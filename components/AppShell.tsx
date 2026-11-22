"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { api } from "@/lib/client";
import { Logo } from "./Crimson";
import { Tutorial } from "./Tutorial";

type Me = { user: any; stats: any; badges: any[]; redemptions: any[]; features: { ai: boolean; solana: boolean; postgres: boolean } };
const MeCtx = createContext<{ me: Me | null; reload: () => void; replayTutorial: () => void }>({ me: null, reload: () => {}, replayTutorial: () => {} });
export const useMe = () => useContext(MeCtx);

const NAV = [
  { href: "/", label: "HOME", glyph: "⌂", tut: "home" },
  { href: "/map", label: "MAP", glyph: "▦", tut: "map" },
  { href: "/catch", label: "CATCH", glyph: "", tut: "catch" },
  { href: "/dex", label: "DEX", glyph: "▤", tut: "dex" },
  { href: "/feed", label: "FEED", glyph: "♥", tut: "feed" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [tut, setTut] = useState(false);
  const [alert, setAlert] = useState<{ id: string; name: string; dist: number } | null>(null);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const reload = (forPath = path) =>
    api<Me>("/api/me").then(setMe, () => setMe({ user: null } as Me)).finally(() => setLoadedFor(forPath));
  useEffect(() => { reload(path); }, [path]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!me || loadedFor !== path) return;
    if (!me.user && path !== "/start") router.replace("/start");
    if (me.user && path === "/start" && !document.querySelector(".intro:not(.title)")) router.replace("/");
    if (me.user && !me.user.tutorial_done && path === "/") setTut(true);
  }, [me, path, loadedFor, router]);

  // Opt-in passive tracking: T miles + "wild Pokebos nearby" alerts.
  const lastPing = useRef(0);
  const seen = useRef(new Set<string>());
  useEffect(() => {
    if (!me?.user?.tracking || !navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(async (p) => {
      if (Date.now() - lastPing.current < 30000) return;
      lastPing.current = Date.now();
      const r = await api("/api/ping", { method: "POST", json: { lat: p.coords.latitude, lng: p.coords.longitude } }).catch(() => null);
      const fresh = r?.nearby?.find((n: any) => !seen.current.has(n.id));
      if (fresh) { seen.current.add(fresh.id); setAlert(fresh); navigator.vibrate?.(200); }
    }, undefined, { enableHighAccuracy: true });
    return () => navigator.geolocation.clearWatch(id);
  }, [me?.user?.tracking]);

  if (path === "/start") return <MeCtx.Provider value={{ me, reload: () => reload(), replayTutorial: () => {} }}>{children}</MeCtx.Provider>;
  if (!me?.user) return <div className="intro title"><Logo size={64} /></div>;

  return (
    <MeCtx.Provider value={{ me, reload: () => reload(), replayTutorial: () => { router.push("/"); setTut(true); } }}>
      <div className="app">
        <header className="topbar">
          <Link href="/" className="brand"><Logo /> <span>POKEBOS</span></Link>
          <Link href="/search" className="icon" data-tut="search" aria-label="Search">⌕</Link>
          <Link href="/ranks" className="icon" data-tut="ranks" aria-label="Leaderboards">♛</Link>
          <Link href="/trainer" className="icon" data-tut="trainer" aria-label="Trainer">☺</Link>
        </header>
        <main>{children}</main>
        <nav className="bottombar">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} data-tut={n.tut} className={`${path === n.href || (n.href !== "/" && path.startsWith(n.href)) ? "on" : ""} ${n.href === "/catch" ? "catch-btn" : ""}`}>
              {n.href === "/catch" ? <Logo size={52} /> : <span className="glyph">{n.glyph}</span>}
              {n.label}
            </Link>
          ))}
        </nav>
      </div>
      {alert && (
        <div className="toast dialog" onClick={() => { router.push(`/dex/${alert.id}`); setAlert(null); }}>
          A wild {alert.name.toUpperCase()} is {alert.dist}m away!
          <span className="next">▼</span>
        </div>
      )}
      {tut && <Tutorial onDone={() => { setTut(false); api("/api/me", { method: "PATCH", json: { tutorialDone: true } }); }} name={me.user.name} />}
    </MeCtx.Provider>
  );
}
