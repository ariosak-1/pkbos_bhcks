"use client";
import { useEffect, useLayoutEffect, useState } from "react";
import { Crimson } from "./Crimson";
import { Typewriter } from "./Typewriter";

const steps = (name: string) => [
  { sel: null, text: `Welcome to your new home, ${name}! Let me show you around.` },
  { sel: "home", text: "HOME shows Pokebos picked for you, rare sightings, and your hunts." },
  { sel: "map", text: "The MAP is the whole T. Filter a line, tap a stop, see which Pokebos live there." },
  { sel: "catch", text: "Found one? Snap a photo here. I'll figure out which Pokebos it is!" },
  { sel: "dex", text: "Your BOSTON DEX. Caught Pokebos show their colors. The rest are shadows." },
  { sel: "feed", text: "The FEED. Every like on your photos is worth 1 point." },
  { sel: "search", text: "Craving sushi? SEARCH finds a Pokebos and the fastest T route." },
  { sel: "ranks", text: "LEADERBOARDS reset every month. Colleges, residents, tourists. Fight!" },
  { sel: "trainer", text: "Your TRAINER CARD: badges, T miles, and gift card rewards." },
  { sel: null, text: "That's all! Your Boston adventure starts now!" },
];

export function Tutorial({ onDone, name }: { onDone: () => void; name: string }) {
  const all = steps(name);
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [typed, setTyped] = useState(false);
  const step = all[i];

  useLayoutEffect(() => {
    const el = step.sel ? document.querySelector(`[data-tut="${step.sel}"]`) : null;
    setRect(el ? el.getBoundingClientRect() : null);
    setTyped(false);
  }, [i, step.sel]);
  useEffect(() => {
    const onResize = () => { const el = step.sel && document.querySelector(`[data-tut="${step.sel}"]`); setRect(el ? el.getBoundingClientRect() : null); };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [step.sel]);

  const next = () => { if (!typed) return setTyped(true); i + 1 < all.length ? setI(i + 1) : onDone(); };
  const pad = 6;
  const spot = rect ? { left: rect.left - pad, top: rect.top - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 } : { left: window.innerWidth / 2, top: window.innerHeight / 2, width: 0, height: 0 };
  const atTop = rect ? rect.top < 120 : false;
  const cw = 72;
  const crim = rect
    ? { left: Math.min(Math.max(8, rect.left + rect.width / 2 - cw / 2), window.innerWidth - cw - 8), top: atTop ? rect.bottom + 14 : rect.top - cw * 1.2 - 14 }
    : { left: window.innerWidth / 2 - 60, top: window.innerHeight / 2 - 160 };

  return (
    <div className="tut-mask" onClick={next}>
      <div className="tut-spot" style={spot} />
      <div className="tut-crimson" style={crim}><Crimson size={rect ? cw : 120} talking={!typed} /></div>
      <div className={`tut-dialog dialog ${atTop ? "" : "top"}`}>
        <Typewriter key={i} text={step.text} skip={typed} onDone={() => setTyped(true)} />
        {typed && <span className="next">▼</span>}
      </div>
    </div>
  );
}
