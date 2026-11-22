"use client";
import Link from "next/link";
import { useState } from "react";
import { useApi, dexNo } from "@/lib/client";
import { Sprite } from "@/components/Sprite";

const TABS = ["all", "caught", "historic", "restaurant", "cafe", "sports", "career", "events"];

export default function Dex() {
  const { data } = useApi<any[]>("/api/pokebos");
  const [tab, setTab] = useState("all");
  const list = (data || []).filter((p) =>
    tab === "all" ? true : tab === "caught" ? p.level > 0 : tab === "events" ? p.is_event : p.types.includes(tab));
  const caught = (data || []).filter((p) => p.level > 0).length;
  return (
    <>
      <div className="spread"><h1>BOSTON DEX</h1><span className="px" style={{ fontSize: 10 }}>{caught}/{data?.length ?? "-"}</span></div>
      <div className="chips" style={{ marginBottom: 12 }}>
        {TABS.map((t) => <button key={t} className={`chip ${tab === t ? "on" : ""}`} onClick={() => setTab(t)}>{t.toUpperCase()}</button>)}
      </div>
      <div className="dexgrid motion-stagger">
        {list.map((p) => (
          <Link key={p.id} href={`/dex/${p.id}`} className="dexcell collectible" data-caught={p.level > 0} data-rarity={p.rarity}>
            <span className="no">{dexNo(p.dex_no)}</span>
            {p.level > 0 && <span className="lv">Lv{p.level}</span>}
            <div className="collectible-art">
              <Sprite domain={p.domain} name={p.name} caught={p.level > 0} size={48} />
            </div>
            <span className="name">{p.name}</span>
          </Link>
        ))}
      </div>
    </>
  );
}
