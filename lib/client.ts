"use client";
import { useCallback, useEffect, useState } from "react";

export async function api<T = any>(path: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const { json, ...rest } = init || {};
  const res = await fetch(path, {
    ...rest,
    headers: json !== undefined ? { "content-type": "application/json", ...(rest.headers || {}) } : rest.headers,
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || `Error ${res.status}`), { status: res.status, data });
  return data;
}

export function useApi<T = any>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(() => {
    if (!path) return;
    api<T>(path).then(setData, (e) => setError(e.message));
  }, [path]);
  useEffect(load, [load]);
  return { data, error, reload: load, setData };
}

export function getPosition(timeout = 8000): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve(null),
      { timeout, maximumAge: 60000 }
    );
  });
}

export const TYPE_COLORS: Record<string, string> = {
  historic: "#a51c30", restaurant: "#e07b39", cafe: "#7a5230", sports: "#2a6bd1", career: "#3a8f5c",
};
export const RARITY_STARS: Record<string, string> = { common: "★", uncommon: "★★", rare: "★★★", legendary: "★★★★" };
// meters -> "350 ft" / "0.4 mi"
export const miles = (m: number) => {
  const mi = m / 1609.34;
  return mi < 0.1 ? `${Math.max(50, Math.round((m * 3.281) / 50) * 50)} ft` : `${mi < 10 ? mi.toFixed(1) : Math.round(mi)} mi`;
};
export const dexNo = (n: number) => `#${String(n).padStart(3, "0")}`;
export const fmtDate = (d: string | Date) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
