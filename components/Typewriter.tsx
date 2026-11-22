"use client";
import { useEffect, useState } from "react";

export function Typewriter({ text, skip, onDone, speed = 22 }: { text: string; skip?: boolean; onDone?: () => void; speed?: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (skip) { setN(text.length); return; }
    if (n >= text.length) { onDone?.(); return; }
    const t = setTimeout(() => setN(n + 1), speed);
    return () => clearTimeout(t);
  }, [n, skip, text, speed, onDone]);
  return <span>{text.slice(0, skip ? text.length : n)}</span>;
}
