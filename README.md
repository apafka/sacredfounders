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
3. Hearth — Phaser 3 top-down 32px tiles (tap/click to walk). Garden beds plant/harvest; creek **fish**; kitchen **loaf**; walk to **Old Bren** to open sell. Same `/api/game` actions.
4. Door — Phaser valley: tap-to-move, Strike (or tap the wolf), dodge the red lunge → coins.
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

**Art-pack swap.** Placeholders are colored rectangles generated in `lib/phaser/scenes/boot-scene.ts`. To swap a real pack:

1. Drop PNGs in `public/game/art/` named as in `lib/phaser/art.ts` (`floor.png`, `pilgrim.png`, `wolf.png`, crop frames, …). 32×32 tiles (or 16×16 displayed at `TILE`) keep the current grid.
2. Set `USE_ART_PACK = true` in `lib/phaser/art.ts`.
3. Leave texture *keys* (`tile-floor`, `sprite-pilgrim`, …) unchanged so scenes keep working.

**Still old UI.** Pilgrim gate, class pick, basket, Old Bren price list, session log, chain stub, and the **Text view** copies of hearth/valley.

**Still open.** Fishing/cooking minigames. Privy + live Amoy/USDC/NFT after the farm is fun. CBO: Vercel production URL + alanpafka.com/game.html blog wire.
