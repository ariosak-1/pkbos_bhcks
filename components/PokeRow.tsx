"use client";
import Link from "next/link";
import { Sprite, Types, Stars } from "./Sprite";
import { dexNo } from "@/lib/client";

export function PokeRow({ p, extra }: { p: any; extra?: React.ReactNode }) {
  const caught = p.level > 0;
  return (
    <Link href={`/dex/${p.id}`} className="mon">
      <Sprite domain={p.domain} name={p.name} caught={caught} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="name">{p.name}</div>
        <div className="row" style={{ gap: 6 }}>
          {p.types && <Types types={p.types} />}
          {p.rarity && <Stars rarity={p.rarity} />}
        </div>
        <div className="meta">
          {p.dex_no ? dexNo(p.dex_no) + " · " : ""}{caught ? `Lv ${p.level}` : "Not caught"}{p.dist != null ? ` · ${p.dist < 1000 ? p.dist + "m" : (p.dist / 1000).toFixed(1) + "km"}` : ""}
        </div>
        {extra}
      </div>
      {caught && <span className="ball" />}
    </Link>
  );
}

export function PokeCard({ p }: { p: any }) {
  return (
    <Link href={`/dex/${p.id}`} className="card">
      <Sprite domain={p.domain} name={p.name} caught={p.level > 0} size={56} />
      <div className="name">{p.name}</div>
      <Stars rarity={p.rarity} />
    </Link>
  );
}
