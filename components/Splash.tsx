"use client";
import { Logo, Train } from "./Crimson";

// ball rolls in, a red line train rushes the screen, then it fades to the app.
// intro=false is the plain "still loading" version
export function Splash({ intro = true, onDone }: { intro?: boolean; onDone?: () => void }) {
  return (
    <div className={`splash ${intro ? "intro-run" : "idle"}`} onClick={onDone} onAnimationEnd={(e) => e.target === e.currentTarget && onDone?.()} aria-hidden="true">
      <div className="sparks">{Array.from({ length: 14 }, (_, i) => <i key={i} style={{ ["--i" as any]: i }} />)}</div>
      <div className="splash-ball"><Logo size={168} /></div>
      {intro && <div className="splash-train"><Train size={120} /></div>}
      <div className="splash-word">POKEBOS</div>
    </div>
  );
}
