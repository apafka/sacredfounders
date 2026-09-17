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

## Loop (living bakery)

1. Spawn at the hearth — bed, fireplace, chest, oven, door. Warm cottage, garden just outside.
2. Three farm plots and three seeds (wheat, root, herb). HUD buttons or keys 1/2/3 pick the seed. Plant → grow ~40–50s with distinct visuals → harvest returns the seed + Farming XP.
3. Walk to the **oven** (cottage workbench): 1 wheat → 1 bread. Grain is consumed. Baking grants Cooking XP.
4. Walk to **Old Bren**. He wants three loaves (DeterministicBrain demand). He also offers **Two Pelts for Bren** (bring 2 Wolf Pelts). Deliver loaves for a neighbor bonus, or sell crops at 2/3/5 gold. Shop still sells potion, blade, coat.
5. Eat bread from the pack (B, or click) for **+6 HP** (Cooking can add a point). Potion is +10. Bed is a full rest. They are not the same.
6. Path through the door into a longer wilderness. Four pack wolves on the path, a boar in the west wallow, a spider off the east pad, a dire wolf in the deep woods. Dead beasts return after **30 seconds** if you stay. Click to fight. Drops stay on the ground until you pick them up or they respawn.
7. HUD (right rail): Attack, Defense, Farming, Cooking with XP bars, Combat level, the active quest, and a minimap. No wallet, marketplace, or chain copy.
8. `GamePersistence` saves position, gold, inventory, skills, crops, bread, Bren's demand, and the quest. Pilgrim cookie `sf_pilgrim` still identifies the session.
9. Dragon is presence only: tracks, a scale, a carving, Bren's rumor.

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

**World.** Hearth cottage (south) and a longer valley (north). Maps are 32 tiles wide with east padding; the valley is **44** rows so the walk from the door to the dire wolf reads as wilderness. Viewport is **896×576**. Cottage, garden, Bren, door; pack wolves, boar, spider, dire wolf.

**Combat.** Click to close and auto-attack. Unarmed 3, blade 5, plus Attack. Armor and Defense shave incoming bites. Dead wilderness foes respawn at their pads after **30s** while you remain in the valley. Going home still resets the pack.

**Skills.** Attack / Defense / Farming / Cooking. 50 XP per level. Combat level is the mean of Attack and Defense. Right-side HUD + minimap.

**Art-pack swap.** Phaser placeholders are generated in BootScene. To replace them:

1. Drop PNGs in `public/game/art/` using the filenames in `lib/phaser/art.ts`.
2. Ground tiles, in tileset order: `grass.png`, `path.png`, `floor.png`, `creek.png`, `wall.png`, `door-tile.png`, `forest.png`.
3. Set `USE_ART_PACK = true` in `lib/phaser/art.ts`.
4. Leave texture keys unchanged.

**Out of slice.** Class pick, fishing as a feature, wallet/Privy UI, marketplace, chain. `ENABLE_CHAIN` stays off. Files may still exist as stubs.
