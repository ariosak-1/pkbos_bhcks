"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { api } from "@/lib/client";
import { Logo } from "./Crimson";
import { Tutorial } from "./Tutorial";
import { Splash } from "./Splash";

type Me = { user: any; stats: any; badges: any[]; redemptions: any[]; features: { ai: boolean; solana: boolean; postgres: boolean } };
const MeCtx = createContext<{ me: Me | null; reload: () => void; replayTutorial: () => void }>({ me: null, reload: () => {}, replayTutorial: () => {} });
export const useMe = () => useContext(MeCtx);

const NAV = [
  { href: "/", label: "HOME", tut: "home" },
  { href: "/map", label: "MAP", tut: "map" },
  { href: "/catch", label: "CATCH", tut: "catch" },
  { href: "/dex", label: "DEX", tut: "dex" },
  { href: "/feed", label: "FEED", tut: "feed" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [sessionError, setSessionError] = useState(false);
  const [tut, setTut] = useState(false);
  const [alert, setAlert] = useState<{ id: string; name: string; dist: number } | null>(null);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const sessionRequest = useRef(0);
  // intro animation once per browser session
  const [splash, setSplash] = useState(false);
  useEffect(() => {
    try {
      if (sessionStorage.getItem("pkb-splash") || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      sessionStorage.setItem("pkb-splash", "1");
    } catch { /* storage blocked: still fine to show it */ }
    setSplash(true);
  }, []);
  const intro = splash && <Splash onDone={() => setSplash(false)} />;
  const reload = async (forPath = path) => {
    const request = ++sessionRequest.current;
    setSessionError(false);
    setLoadedFor(null);
    try {
      const result = await api<Me>("/api/me", { cache: "no-store" });
      if (request !== sessionRequest.current) return;
      setMe(result);
      setLoadedFor(forPath);
    } catch {
      if (request === sessionRequest.current) setSessionError(true);
    }
  };
  useEffect(() => { reload(path); }, [path]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!me || loadedFor !== path) return;
    if (!me.user && path !== "/start") router.replace("/start");
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

  if (path === "/start") return <MeCtx.Provider value={{ me, reload: () => reload(), replayTutorial: () => {} }}>{children}{intro}</MeCtx.Provider>;
  if (sessionError) return (
    <div className="intro title">
      <Logo size={64} />
      <p role="alert">Couldn’t check your session.</p>
      <button className="btn primary" onClick={() => reload()}>RETRY</button>
    </div>
  );
  if (!me?.user) return intro || <Splash intro={false} />;

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
        <nav className="bottombar" aria-label="Game navigation">
          {NAV.map((n) => {
            const current = path === n.href || (n.href !== "/" && path.startsWith(n.href));
            return (
              <Link key={n.href} href={n.href} data-tut={n.tut} aria-current={current ? "page" : undefined} className={`${current ? "on" : ""} ${n.tut === "catch" ? "catch-btn" : ""}`}>
                <span aria-hidden="true" className={n.tut === "catch" ? "nav-ball" : `nav-pixel ${n.tut}`}>
                  {n.tut === "catch" && <Logo size={25} />}
                </span>
                {n.label}
              </Link>
            );
          })}
        </nav>
      </div>
      {alert && (
        <div className="toast dialog" onClick={() => { router.push(`/dex/${alert.id}`); setAlert(null); }}>
          A wild {alert.name.toUpperCase()} is {alert.dist}m away!
          <span className="next">▼</span>
        </div>
      )}
      {tut && (
        <Tutorial name={me.user.name} onDone={async () => {
          await api("/api/me", { method: "PATCH", json: { tutorialDone: true } });
          setMe((current) => current?.user ? { ...current, user: { ...current.user, tutorial_done: true } } : current);
          setTut(false);
        }} />
      )}
      {intro}
    </MeCtx.Provider>
  );
}
