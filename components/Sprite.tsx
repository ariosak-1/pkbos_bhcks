"use client";
import { useState } from "react";

// sprite = the place's favicon. not caught yet = same logo with a grey tint
// google hands back a 16px globe when a site has no icon, treat that as "no logo" and show a letter
const src = (d: string) =>
  d.includes("/")
    ? `https://www.google.com/s2/favicons?domain_url=${encodeURIComponent("https://" + d)}&sz=128`
    : `https://www.google.com/s2/favicons?domain=${d}&sz=128`;

export function Sprite({ domain, name, caught, size = 48 }: { domain?: string | null; name: string; caught: boolean; size?: number }) {
  const [broken, setBroken] = useState(false);
  return (
    <span className={`spritebox ${caught ? "" : "unknown"}`} style={{ width: size, height: size }}>
      {!domain || broken ? (
        <div className="sprite sprite-fallback" style={{ width: size, height: size, fontSize: size * 0.45 }}>{name[0]}</div>
      ) : (
        <img className="sprite" width={size} height={size} alt={caught ? name : "???"} src={src(domain)}
          onLoad={(e) => e.currentTarget.naturalWidth <= 16 && setBroken(true)} onError={() => setBroken(true)} />
      )}
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
