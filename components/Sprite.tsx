"use client";
import { useState } from "react";

// sprite = the place's favicon. not caught yet = blurred + grey with a ? on top
export function Sprite({ domain, name, caught, size = 48 }: { domain?: string | null; name: string; caught: boolean; size?: number }) {
  const [broken, setBroken] = useState(false);
  const inner = !domain || broken
    ? <div className="sprite sprite-fallback" style={{ width: size, height: size, fontSize: size * 0.45 }}>{name[0]}</div>
    : <img className="sprite" width={size} height={size} alt={caught ? name : "???"} src={`https://www.google.com/s2/favicons?domain=${domain}&sz=128`} onError={() => setBroken(true)} />;
  return (
    <span className={`spritebox ${caught ? "" : "unknown"}`} style={{ width: size, height: size }}>
      {inner}
      {!caught && <span className="q" style={{ fontSize: Math.max(10, size * 0.35) }}>?</span>}
    </span>
  );
}

export function Types({ types }: { types: string[] }) {
  return <span className="types">{types.map((t) => <span key={t} className={`type type-${t}`}>{t}</span>)}</span>;
}

export function Stars({ rarity }: { rarity: string }) {
  const n = { common: 1, uncommon: 2, rare: 3, legendary: 4 }[rarity] || 1;
  return <span className={`stars r-${rarity}`} title={rarity}>{"★".repeat(n)}</span>;
}
