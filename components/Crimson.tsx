// Placeholder pixel sprite for Professor Crimson (swap for final animations in /public/crimson/*).
const ROWS = [
  ".....kkkkkk.....",
  "....khhhhhhk....",
  "...khhhhhhhhk...",
  "...khsssssshk...",
  "...ksessssesk...",
  "...kssssssssk...",
  "...kssskksssk...",
  "....kssssssk....",
  "..kccssssssccck.",
  ".kcccccccccccck.",
  ".kccccwccwcccck.",
  ".kccccwwwwcccck.",
  ".kccccwccwcccck.",
  ".ksccccccccccsk.",
  "..kcccccccccck..",
  "...kppppppppk...",
  "...kpppkkpppk...",
  "...kpppkkpppk...",
  "...kkkkk.kkkkk..",
];
const PAL: Record<string, string> = { k: "#181818", h: "#c8c8c8", s: "#f8c890", e: "#181818", c: "#a51c30", w: "#f8f8f8", p: "#304060" };

export function Crimson({ size = 96, talking = false, className = "" }: { size?: number; talking?: boolean; className?: string }) {
  return (
    <svg className={`crimson ${talking ? "talking" : ""} ${className}`} width={size} height={size * (19 / 16)} viewBox="0 0 16 19" shapeRendering="crispEdges" aria-label="Professor Crimson">
      {ROWS.flatMap((row, y) => [...row].map((ch, x) => (PAL[ch] ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={PAL[ch]} /> : null)))}
    </svg>
  );
}

export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges" aria-label="Pokebos">
      <circle cx="8" cy="8" r="7.5" fill="#181818" />
      <path d="M1.5 7.5 A6.5 6.5 0 0 1 14.5 7.5 Z" fill="#DA291C" />
      <path d="M1.5 8.5 A6.5 6.5 0 0 0 14.5 8.5 Z" fill="#f8f8f8" />
      <circle cx="8" cy="8" r="3" fill="#181818" />
      <circle cx="8" cy="8" r="2" fill="#f8f8f8" />
      <path d="M6.8 6.8h2.4v.7h-.85v2.7h-.7V7.5H6.8z" fill="#181818" />
    </svg>
  );
}
