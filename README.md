# Pokebos

Catch Boston on the T. Places are Pokebos, the MBTA is the map, a photo is a Pokeball. maybeee we shld make it another thing tho lowk

## Run it

```bash
npm install
cp .env.example .env.local   # every key is optional
npm run dev                  # http://localhost:3000
```

With no keys, the app uses embedded Postgres (PGlite) in `./data`, stores photos in `./data/uploads`, uses MBTA public rate limits, and matches catches by GPS. The map shows subway lines and stops, and a CARTO Basemaps key enables the street background.

## Keys

| Env var | Unlocks |
|---|---|
| `GOOGLE_GENERATIVE_AI_API_KEY` | Gemini (via Mastra): photo → Pokebos matching, abilities seen in photos, smarter search, Prof. Crimson chat |
| `MBTA_API_KEY` | Higher MBTA V3 rate limits (live shapes + predictions) |
| `NEXT_PUBLIC_CARTO_BASEMAP_API_KEY` | CARTO Voyager background tiles on the map. The browser sends this key with tile requests. |
| `DATABASE_URL` | Real Postgres. Point it at TigerData and `location_pings` becomes a Timescale hypertable |
| `GOOGLE_PLACES_API_KEY` | `npm run seed:places` bulk import of establishments near T stops |
| `SOLANA_SECRET_KEY` | Every point award and badge is mirrored to Solana devnet as a memo tx |
| `S3_*` | Photos in S3-compatible object storage instead of local disk |

## How it fits together

- **Next.js 16** app router. Pages in `app/`, API in `app/api/`.
- **Boston Dex**: hand-curated places + seasonal events in `lib/seed-data.ts` (Harvard–Yale, Head of the Charles, Marathon...). Events can only be caught with a photo taken inside their window. `scripts/import-places.ts` pulls everything else from Google Places and types it automatically; abilities come from repeated terms in reviews (Gemini, or keyword frequency offline).
- **Map**: MBTA V3 shapes, with a bundled stop snapshot (`lib/mbta-snapshot.ts`) as offline fallback. Pokebos within 750m of a stop show in its side panel.
- **T routes**: Dijkstra over the subway graph (`lib/mbta.ts`) with transfer penalties, plus live MBTA predictions for each boarding.
- **Catching** (`app/api/catch`): EXIF date + GPS → candidates near the photo → Gemini picks one (or the closest within 120m without AI, or the trainer picks). Same Pokebos same day = "Oops! Looks like you already caught X today." Repeat catches on new days level it up.
- **Points**: catch by rarity (10/25/60/150), level-up +5, ability +15, like +1, hunt bonus. Leaderboards only count earned points (spending on gift cards never lowers rank) and reset monthly.
- **Data**: everything user-generated lives in our Postgres; photos in object storage (key only in the DB). Third-party APIs are read-only inputs.

## Anti-cheat (later)

Already in: photos older than 3 days are rejected, event windows are checked against EXIF dates, with AI on abilities must be visible in the photo, photos without metadata or that the AI couldn't confirm are flagged out of the feed, likes can't be undone or self-given.

Next: perceptual-hash duplicate photos across users, EXIF GPS vs device GPS mismatch, rate limits per trainer, review queue for flagged photos, server-signed upload timestamps.

## Swapping art

Professor Crimson is a placeholder pixel sprite in `components/Crimson.tsx`. Drop final animations into `public/crimson/` and swap the component.
