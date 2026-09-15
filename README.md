# Dragon World

Public door: **[alanpafka.com/game.html](https://alanpafka.com/game.html)** (CBO wires deploy + blog). This repo is the playable app. Do not block on sacredfounders.com DNS.

Hearth first. A baker on the path. A wolf at the forest edge. Fun before chain (Polygon + USDC + NFT behind `ENABLE_CHAIN`, off).

North star: *A world people would inhabit if every token were worth zero.*

The playable door is an **isometric Three.js** hearth (WASD + click-to-move). Classic top-down tiles remain at `?view=phaser`.

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

## Loop (V1 vertical slice)

1. Spawn at the hearth — bed, fireplace, chest, workbench, door. Warm cottage, garden just outside.
2. Three farm plots. Start with 3 wheat seeds. Plant → grow ~45s with visual stages → harvest → Farming XP.
3. Walk to **Old Bren** (a baker, not a shop UI). Short dialogue.
4. Sell wheat → **+6 Gold** for three sheaves.
5. Path through the door to the forest edge. One wolf.
6. Click the wolf → auto-attack, HP bars, damage numbers, death.
7. Wolf Pelt drops. Click it → inventory + Combat XP.
8. HUD: health, gold, pack (I), Farming + Combat. No wallet, marketplace, or chain copy.
9. `GamePersistence` saves position, gold, inventory, skills, and crops to localStorage. Pilgrim cookie `sf_pilgrim` still identifies the session.
10. Dragon is presence only: tracks, a scale, a carving, Bren's rumor.

## Deploy (CBO)

No Vercel project is linked from this environment (CLI logged out; MCP needs auth). After merge:

1. [Import `apafka/sacredfounders`](https://vercel.com/new) → Framework Preset **Next.js** → root of the repo.
2. Deploy **Production**. Note the `*.vercel.app` URL.
3. Blog entry / public door: `https://alanpafka.com/game.html` (and `www`) may **iframe** the production URL. This app sends `Content-Security-Policy: frame-ancestors 'self' https://alanpafka.com https://www.alanpafka.com;` and does not set `X-Frame-Options`. It also rewrites `/game.html` → `/` if that host is attached as a Vercel domain.
4. Ignore sacredfounders.com until later.

**Public play / embed:** Production must stay off Vercel Authentication and SSO Protection. If those are on, anonymous visitors (and the alanpafka.com iframe) get a 403 login wall instead of Dragon World. Preview protection can stay on.

## DEV NOTES

See [ARCHITECTURE.md](./ARCHITECTURE.md) for scene hierarchy, data models, and the state machine.

**Stack.** Next.js 16 + Three.js / React Three Fiber (orthographic isometric, default) with Phaser 3.90 as a zoomed-out tile fallback (`?view=phaser`). Canvas is a progressive enhancement: `next/dynamic` + `ssr: false`. If WebGL misses, Phaser loads; if that misses too, a written hearth remains.

**World.** Hearth cottage (south) and valley path (north). Maps are 32 tiles wide with east/south padding; the viewport is **896×576** (~1.8× the old 640×448), so cottage + garden + path read as a place, not a close-up. Same furniture, three plots, Old Bren, door, one wolf, Wolf Pelt.

**Combat.** One wolf at the forest edge. Click to close and auto-attack (3 damage vs 12 HP). No pack, no dire wolf, no Strike button.

**Art-pack swap.** Phaser placeholders are generated in BootScene. To replace them:

1. Drop PNGs in `public/game/art/` using the filenames in `lib/phaser/art.ts`.
2. Ground tiles, in tileset order: `grass.png`, `path.png`, `floor.png`, `creek.png`, `wall.png`, `door-tile.png`, `forest.png`.
3. Set `USE_ART_PACK = true` in `lib/phaser/art.ts`.
4. Leave texture keys unchanged.

**Out of slice.** Class pick, fishing, cooking, Iron Blade shop, wallet/Privy UI, marketplace, chain. `ENABLE_CHAIN` stays off. Files may still exist as stubs.
