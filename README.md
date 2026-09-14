# Dragon World

Public door: **[alanpafka.com/game.html](https://alanpafka.com/game.html)** (CBO wires deploy + blog). This repo is the playable app. Do not block on sacredfounders.com DNS.

Hearth first. Door to the valley. Fun before chain (Polygon + USDC + NFT behind `ENABLE_CHAIN`, off).

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) or [http://localhost:3000/game.html](http://localhost:3000/game.html) → **Enter as pilgrim**.

```bash
npm test
npm run build
```

## Loop (this branch)

1. Pilgrim Gate — no wallet modal. Cookie `sf_pilgrim` survives refresh. **Still the old text UI.**
2. Class — **Fighter** or **Spiritual**. Persists. **Still the old text UI.**
3. Hearth — Phaser 3 top-down **tilemap** (tap/click to walk). Spawn at the hearth. Garden beds plant/harvest; creek **fish**; kitchen **loaf**; walk to **Old Bren** to open sell. Same `/api/game` actions.
4. Door — walk the door tile hearth ↔ valley. Valley: grass/path, three wolves + a dire wolf (multi-hit), HP bars, ~25s respawn, +xp. Old Bren sells an **Iron Blade** for 12 coins (harder Strike). Walls collide.
5. Chain — `POST /api/chain`. `ENABLE_CHAIN=false` by default.

If Phaser fails to boot, the written hearth and valley stay available (**Text view**). Basket, Old Bren prices, and the session log remain HTML overlays.

## Deploy (CBO)

No Vercel project is linked from this environment (CLI logged out; MCP needs auth). After merge:

1. [Import `apafka/sacredfounders`](https://vercel.com/new) → Framework Preset **Next.js** → root of the repo.
2. Deploy **Production**. Note the `*.vercel.app` URL.
3. Blog entry / public door: `https://alanpafka.com/game.html` (and `www`) may **iframe** the production URL. This app sends `Content-Security-Policy: frame-ancestors 'self' https://alanpafka.com https://www.alanpafka.com;` and does not set `X-Frame-Options`. It also rewrites `/game.html` → `/` if that host is attached as a Vercel domain.
4. Ignore sacredfounders.com until later.

**Public play / embed:** Production must stay off Vercel Authentication and SSO Protection. If those are on, anonymous visitors (and the alanpafka.com iframe) get a 403 login wall instead of Dragon World. Preview protection can stay on.

## DEV NOTES

**Found.** `apafka/sacredfounders` had no prior Dragon World tree. Prior cloud branches were not on this remote.

**Merged.** One Next.js tree: pilgrim → Fighter/Spiritual → garden / fish / cook → Old Bren → valley wolf. No second game.

**2D slice.** Phaser 3.90, top-down (not isometric). Warm temple palette. Canvas is a progressive enhancement: `next/dynamic` + `ssr: false`, and a text fallback so a WebGL/canvas miss does not brick the app.

**Tilemap v0.** One 20×28 world in `lib/phaser/layout.ts`: valley (north 14 rows) + hearth (south 14 rows). Each scene mounts its slice as a Phaser Tilemap: grass, path, hearth interior, creek, wall, door. Border walls collide; the door tile stays walkable and still posts `/api/game` `door`. Colored placeholder tiles are generated in BootScene.

**Combat v0.** Three pack wolves + one dire wolf. Soft XP (+15 / +40), level every 50 xp, persisted on the pilgrim cookie. Kills still grant coins via `/api/game` `wolf-loot`. Iron Blade is a Bren buy (`buy-sword`). ENABLE_CHAIN stays off.

**Art-pack swap.** Placeholders are colored rectangles generated in `lib/phaser/scenes/boot-scene.ts`. To replace them with real pixels:

1. Drop 32×32 (or 16×16 displayed at `TILE`) PNGs in `public/game/art/` using the filenames in `lib/phaser/art.ts`.
2. Ground tiles, in tileset order: `grass.png`, `path.png`, `floor.png` (hearth interior), `creek.png`, `wall.png`, `door-tile.png`. BootScene stitches those into the Phaser tileset key `world-tiles`. Sprites stay separate (`pilgrim.png`, `wolf.png`, `door.png` for the door prop, crop frames, …).
3. Set `USE_ART_PACK = true` in `lib/phaser/art.ts`.
4. Leave texture *keys* (`tile-grass`, `world-tiles`, `sprite-pilgrim`, …) unchanged so scenes keep working.

**Still old UI.** Pilgrim gate, class pick, basket, Old Bren price list, session log, chain stub, and the **Text view** copies of hearth/valley.

**Still open.** Fishing/cooking minigames. Privy + live Amoy/USDC/NFT after the farm is fun. CBO: Vercel production URL + alanpafka.com/game.html blog wire.
