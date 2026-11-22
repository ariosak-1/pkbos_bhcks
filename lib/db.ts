import { SEED, REWARDS, HUNTS, RARITY_POINTS } from "./seed-data";

// One query interface over either real Postgres (DATABASE_URL, e.g. TigerData/Timescale)
// or embedded PGlite (zero-setup local dev, stored in ./data/pglite).
type Q = { query: <T = any>(sql: string, params?: any[]) => Promise<{ rows: T[] }>; exec: (sql: string) => Promise<unknown>; kind: "pg" | "pglite" };

const g = globalThis as unknown as { __pkdb?: Promise<Q> };

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  pass_hash TEXT NOT NULL,
  trainer_type TEXT NOT NULL CHECK (trainer_type IN ('college','resident','tourist')),
  college TEXT,
  tutorial_done BOOLEAN NOT NULL DEFAULT FALSE,
  tracking BOOLEAN NOT NULL DEFAULT FALSE,
  solana_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS pokebos (
  id TEXT PRIMARY KEY,
  dex_no INT NOT NULL,
  name TEXT NOT NULL,
  types TEXT[] NOT NULL,
  rarity TEXT NOT NULL,
  points INT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  domain TEXT,
  blurb TEXT,
  source TEXT NOT NULL DEFAULT 'curated',
  place_id TEXT UNIQUE,
  season_from TEXT,
  season_to TEXT,
  is_event BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE TABLE IF NOT EXISTS abilities (id SERIAL PRIMARY KEY, pokebos_id TEXT NOT NULL REFERENCES pokebos(id) ON DELETE CASCADE, name TEXT NOT NULL, type TEXT NOT NULL, hint TEXT, points INT NOT NULL DEFAULT 15, UNIQUE (pokebos_id, name));
CREATE TABLE IF NOT EXISTS photos (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pokebos_id TEXT NOT NULL REFERENCES pokebos(id),
  storage_key TEXT NOT NULL,
  content_type TEXT NOT NULL,
  taken_at TIMESTAMPTZ,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  lat DOUBLE PRECISION, lng DOUBLE PRECISION,
  ai_confidence REAL,
  flagged BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE TABLE IF NOT EXISTS catches (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pokebos_id TEXT NOT NULL REFERENCES pokebos(id),
  photo_id INT REFERENCES photos(id),
  caught_on DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, pokebos_id, caught_on)
);
CREATE TABLE IF NOT EXISTS user_abilities (user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE, ability_id INT NOT NULL REFERENCES abilities(id) ON DELETE CASCADE, photo_id INT REFERENCES photos(id), created_at TIMESTAMPTZ NOT NULL DEFAULT now(), PRIMARY KEY (user_id, ability_id));
CREATE TABLE IF NOT EXISTS likes (user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE, photo_id INT NOT NULL REFERENCES photos(id) ON DELETE CASCADE, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), PRIMARY KEY (user_id, photo_id));
CREATE TABLE IF NOT EXISTS points_ledger (id SERIAL PRIMARY KEY, user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE, points INT NOT NULL, reason TEXT NOT NULL, ref TEXT, chain_sig TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS points_ledger_time ON points_ledger (created_at);
CREATE TABLE IF NOT EXISTS rewards (id TEXT PRIMARY KEY, name TEXT NOT NULL, domain TEXT, cost INT NOT NULL);
CREATE TABLE IF NOT EXISTS redemptions (id SERIAL PRIMARY KEY, user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE, reward_id TEXT NOT NULL REFERENCES rewards(id), points INT NOT NULL, code TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS hunts (id TEXT PRIMARY KEY, name TEXT NOT NULL, line TEXT, bonus INT NOT NULL, pokebos_ids TEXT[] NOT NULL);
CREATE TABLE IF NOT EXISTS user_hunts (user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE, hunt_id TEXT NOT NULL REFERENCES hunts(id), started_at TIMESTAMPTZ NOT NULL DEFAULT now(), completed_at TIMESTAMPTZ, PRIMARY KEY (user_id, hunt_id));
CREATE TABLE IF NOT EXISTS user_badges (user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE, badge_id TEXT NOT NULL, chain_sig TEXT, earned_at TIMESTAMPTZ NOT NULL DEFAULT now(), PRIMARY KEY (user_id, badge_id));
CREATE TABLE IF NOT EXISTS location_pings (user_id INT NOT NULL, ts TIMESTAMPTZ NOT NULL DEFAULT now(), lat DOUBLE PRECISION NOT NULL, lng DOUBLE PRECISION NOT NULL, speed_kmh REAL, on_transit BOOLEAN NOT NULL DEFAULT FALSE, meters REAL NOT NULL DEFAULT 0);
CREATE INDEX IF NOT EXISTS location_pings_user_ts ON location_pings (user_id, ts DESC);
ALTER TABLE pokebos ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE pokebos ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ;
CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
`;

async function connect(): Promise<Q> {
  let q: Q;
  if (process.env.DATABASE_URL) {
    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_URL.includes("sslmode=disable") ? false : { rejectUnauthorized: false } });
    q = { kind: "pg", query: (s, p) => pool.query(s, p) as any, exec: (s) => pool.query(s) };
  } else {
    const { PGlite } = await import("@electric-sql/pglite");
    const fs = await import("fs");
    fs.mkdirSync("./data", { recursive: true });
    const db = new PGlite("./data/pglite");
    await db.waitReady;
    q = { kind: "pglite", query: (s, p) => db.query(s, p) as any, exec: (s) => db.exec(s) };
  }
  await q.exec(SCHEMA);
  if (q.kind === "pg") {
    // TigerData / Timescale: location pings become a hypertable. Silently skipped on vanilla Postgres.
    try {
      await q.exec("CREATE EXTENSION IF NOT EXISTS timescaledb");
      await q.exec("SELECT create_hypertable('location_pings', 'ts', if_not_exists => TRUE, migrate_data => TRUE)");
    } catch { /* not timescale */ }
  }
  await seed(q);
  return q;
}

async function seed(q: Q) {
  const { rows } = await q.query<{ n: number }>("SELECT count(*)::int AS n FROM pokebos WHERE source IN ('curated','event')");
  if (rows[0].n >= SEED.length) return;
  let dex = 1;
  for (const p of SEED) {
    await q.query(
      `INSERT INTO pokebos (id, dex_no, name, types, rarity, points, lat, lng, domain, blurb, source, season_from, season_to, is_event)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) ON CONFLICT (id) DO NOTHING`,
      [p.id, dex++, p.name, p.types, p.rarity, RARITY_POINTS[p.rarity], p.lat, p.lng, p.domain ?? null, p.blurb, p.event ? "event" : "curated", p.season?.[0] ?? null, p.season?.[1] ?? null, !!p.event]
    );
    for (const [name, type, hint] of p.abilities)
      await q.query("INSERT INTO abilities (pokebos_id, name, type, hint) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING", [p.id, name, type, hint]);
  }
  for (const r of REWARDS) await q.query("INSERT INTO rewards VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING", [r.id, r.name, r.domain, r.cost]);
  for (const h of HUNTS) await q.query("INSERT INTO hunts VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING", [h.id, h.name, h.line, h.bonus, h.pokebos]);
}

export function db(): Promise<Q> {
  g.__pkdb ??= connect().catch((e) => { g.__pkdb = undefined; throw e; });
  return g.__pkdb;
}

export async function sql<T = any>(text: string, params: any[] = []): Promise<T[]> {
  const d = await db();
  return (await d.query<T>(text, params)).rows;
}

export function inSeason(from: string | null, to: string | null, date = new Date()) {
  if (!from || !to) return true;
  const md = date.toLocaleDateString("en-CA", { timeZone: "America/New_York" }).slice(5);
  return from <= to ? md >= from && md <= to : md >= from || md <= to;
}
