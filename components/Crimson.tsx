"use client";
import { useMe } from "./AppShell";

// tiny pixel-art renderer: rows of chars -> rects
function Pixels({ rows, pal, size, label, className = "" }: { rows: string[]; pal: Record<string, string>; size: number; label: string; className?: string }) {
  const w = rows[0].length, h = rows.length;
  return (
    <svg className={className} width={size} height={size * (h / w)} viewBox={`0 0 ${w} ${h}`} shapeRendering="crispEdges" aria-label={label} role="img">
      {rows.flatMap((row, y) => [...row].map((ch, x) => (pal[ch] ? <rect key={`${x}-${y}`} x={x} y={y} width={1.02} height={1.02} fill={pal[ch]} /> : null)))}
    </svg>
  );
}

// ---------- Professor Crimson ----------
const HEAD = [
  ".....kkkkkk.....",
  "....khhhhhhk....",
  "...khhhhhhhhk...",
  "...khsssssshk...",
  "...ksessssesk...",
  "...kssssssssk...",
  "...kssskksssk...",
  "....kssssssk....",
  "..kccssssssccck.",
];
const HEAD_SHE = [
  ".....kkkkkk.....",
  "....khhhhhhk....",
  "...khhhhhhhhk...",
  "..khhsssssshhk..",
  "..khsesssseshk..",
  "..khsssssssshk..",
  "..khsssrrssshk..",
  "..khksssssskhk..",
  "..khcssssssccck.",
];
const HAT = [
  "....kkkkkkkk....",
  "...kttttttttk...",
  ".kkttttttttttkk.",
];
const BODY = [
  ".kcccccccccccck.",
  ".kcccccccccccck.",
  ".kcccccccccccck.",
  ".kcccccccccccck.",
  ".ksccccccccccsk.",
  "..kcccccccccck..",
  "...kppppppppk...",
  "...kpppkkpppk...",
  "...kpppkkpppk...",
  "...kkkkk.kkkkk..",
];

// 4-row chest letters
const GLYPH: Record<string, string[]> = {
  H: ["w..w", "wwww", "w..w", "w..w"],
  M: ["ww.ww", "w.w.w", "w...w", "w...w"],
  B: ["ww.", "www", "w.w", "ww."],
  N: ["w..w", "ww.w", "w.ww", "w..w"],
  T: ["www", ".w.", ".w.", ".w."],
  E: ["www", "w..", "ww.", "www"],
  S: [".ww", "w..", "..w", "ww."],
  U: ["w.w", "w.w", "w.w", "www"],
  W: ["w...w", "w...w", "w.w.w", ".w.w."],
  note: [".ww", ".w.", "ww.", "ww."],
};

type Outfit = { shirt: string; ink: string; glyph?: string };
const SCHOOL: Record<string, Outfit> = {
  Harvard: { shirt: "#a51c30", ink: "#f8f8f8", glyph: "H" },
  MIT: { shirt: "#8a8b8c", ink: "#a31f34", glyph: "M" },
  BU: { shirt: "#cc0000", ink: "#f8f8f8", glyph: "B" },
  BC: { shirt: "#8a100b", ink: "#d4af37", glyph: "B" },
  Northeastern: { shirt: "#c8102e", ink: "#181818", glyph: "N" },
  Tufts: { shirt: "#3e8ede", ink: "#f8f8f8", glyph: "T" },
  Emerson: { shirt: "#4b2e83", ink: "#f2c75c", glyph: "E" },
  Suffolk: { shirt: "#003a70", ink: "#f2b300", glyph: "S" },
  "UMass Boston": { shirt: "#005a8b", ink: "#f8f8f8", glyph: "U" },
  Berklee: { shirt: "#2b2b2b", ink: "#f8f8f8", glyph: "note" },
  Simmons: { shirt: "#002f5f", ink: "#7fc4e8", glyph: "S" },
  Wentworth: { shirt: "#ffb81c", ink: "#181818", glyph: "W" },
  Other: { shirt: "#168b90", ink: "#f8f8f8" },
};

export type Look = { type?: string | null; college?: string | null; she?: boolean };

function sprite(look: Look) {
  const tourist = look.type === "tourist";
  const head = [...(look.she ? HEAD_SHE : HEAD)];
  if (tourist) head.splice(0, 3, ...HAT);
  const body = BODY.map((r) => [...r]);
  let o: Outfit = SCHOOL.Harvard;
  if (look.type === "resident") o = { shirt: "#1d2b4f", ink: "#e84637", glyph: "B" };
  else if (look.type === "college") o = SCHOOL[look.college || ""] || SCHOOL.Other;
  if (tourist) {
    o = { shirt: "#2bb3a3", ink: "#ff7aa8" };
    // flowers + a camera on a strap
    for (const [x, y, c] of [[3, 0, "w"], [11, 1, "f"], [4, 3, "f"], [12, 3, "w"], [5, 5, "w"], [10, 5, "f"]] as const) body[y][x] = c;
    for (const [x, y] of [[4, 0], [5, 1], [10, 0], [9, 1]]) body[y][x] = "k";
    for (let x = 6; x <= 9; x++) { body[2][x] = "k"; body[3][x] = "k"; }
    body[2][7] = "g"; body[3][8] = "g";
  } else if (o.glyph) {
    const g = GLYPH[o.glyph];
    const x0 = Math.floor((16 - g[0].length) / 2);
    g.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === "w") body[1 + y][x0 + x] = "w"; }));
  }
  const pal = { k: "#181818", h: "#c8c8c8", s: "#f8c890", e: "#181818", r: "#d0506a", c: o.shirt, w: o.ink, p: "#304060", t: "#d9c08a", f: "#ffd54a", g: "#9fd3e6" };
  return { rows: [...head, ...body.map((r) => r.join(""))], pal };
}

export function Crimson({ size = 96, talking = false, className = "", look }: { size?: number; talking?: boolean; className?: string; look?: Look }) {
  const { me } = useMe();
  const u = me?.user;
  const l = look ?? (u ? { type: u.trainer_type, college: u.college, she: u.crimson_she } : {});
  const { rows, pal } = sprite(l);
  return <Pixels rows={rows} pal={pal} size={size} label="Professor Crimson" className={`crimson ${talking ? "talking" : ""} ${className}`} />;
}

// ---------- logo: chunky pixel ball ----------
const BALL = [
  ".....kkkkkk.....",
  "...kkrrrrrrkk...",
  "..krrrrrrrrrrk..",
  ".krwwrrrrrrrrrk.",
  ".krwrrrrrrrrrrk.",
  "krrrrrkkkkrrrrrk",
  "krrrrkwwwwkrrrrk",
  "kkkkkwkkkkwkkkkk",
  "kwwwkwwkkwwkwwwk",
  "kwwwwkwkkwkwwwwk",
  "kwwwwwkkkkwwwwwk",
  ".kwwwwwwwwwwwwk.",
  ".kwwwwwwwwwwwwk.",
  "..kwwwwwwwwwwk..",
  "...kkwwwwwwkk...",
  ".....kkkkkk.....",
];
export function Logo({ size = 28, className = "" }: { size?: number; className?: string }) {
  return <Pixels rows={BALL} pal={{ k: "#181818", r: "#DA291C", w: "#f8f8f8" }} size={size} label="Pokebos" className={className} />;
}

// ---------- T train, front view ----------
const TRAIN = [
  "..kkkkkkkkkkkk..",
  ".kRRRRRRRRRRRRk.",
  ".kRkkkkkkkkkkRk.",
  ".kRkbbbbbbbbkRk.",
  ".kRkbbbbbbbbkRk.",
  ".kRkbbbbbbbbkRk.",
  ".kRkkkkkkkkkkRk.",
  ".kRRRwwwwwwRRRk.",
  ".kRRwkkkkkkwRRk.",
  ".kRRwwwkkwwwRRk.",
  ".kRRRwwkkwwRRRk.",
  ".kRyyRRRRRRyyRk.",
  ".kRyyRRRRRRyyRk.",
  ".kRRRRRRRRRRRRk.",
  ".kkkkkkkkkkkkkk.",
  "..kk........kk..",
];
export function Train({ size = 64, className = "" }: { size?: number; className?: string }) {
  return <Pixels rows={TRAIN} pal={{ k: "#181818", R: "#DA291C", b: "#9fd3e6", w: "#f8f8f8", y: "#ffd54a" }} size={size} label="" className={className} />;
}
