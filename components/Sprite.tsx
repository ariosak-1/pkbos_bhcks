"use client";
import { useState } from "react";

// Pokebos sprite = the business favicon, pixelated. Uncaught = black silhouette.
export function Sprite({ domain, name, caught, size = 48 }: { domain?: string | null; name: string; caught: boolean; size?: number }) {
  const [broken, setBroken] = useState(false);
  const cls = `sprite ${caught ? "" : "silhouette"}`;
  if (!domain || broken)
    return <div className={`${cls} sprite-fallback`} style={{ width: size, height: size, fontSize: size * 0.5 }}>{name[0]}</div>;
  return (
    <img className={cls} width={size} height={size} alt={caught ? name : "???"}
      src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`} onError={() => setBroken(true)} />
  );
}

export function Types({ types }: { types: string[] }) {
  return <span className="types">{types.map((t) => <span key={t} className={`type type-${t}`}>{t}</span>)}</span>;
}

export function Stars({ rarity }: { rarity: string }) {
  const n = { common: 1, uncommon: 2, rare: 3, legendary: 4 }[rarity] || 1;
  return <span className={`stars r-${rarity}`} title={rarity}>{"★".repeat(n)}</span>;
}
