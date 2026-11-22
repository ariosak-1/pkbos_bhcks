// runs once when the server boots: sync the dex now (if stale) and then once a day
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.DISABLE_SYNC) return;
  const { syncAll } = await import("./lib/sync");
  const run = () => syncAll().catch((e) => console.warn("[sync] failed:", e.message));
  setTimeout(run, 5000);
  setInterval(run, 24 * 3600e3);
}
