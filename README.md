# Dragon World at Sacred Founders

Hearth first. Door to the valley. Fun before chain.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) → **Enter as pilgrim**.

```bash
npm test
npm run build
```

## Loop

1. Pilgrim Gate — no wallet modal. Cookie `sf_pilgrim` survives refresh.
2. Class — **Fighter** (valley strike) or **Spiritual** (garden / herb / Bren). Persists on the player.
3. Hearth — plant/harvest grain, root, herb (farm). Creek fish and kitchen loaf are stubs. All of it sells to **Old Bren** for soft coins. Whisper: baker needs three loaves.
4. Door — Diablo-style wolf (move / strike / dodge red lunge) → coins.
5. Chain — `POST /api/chain` exists. `ENABLE_CHAIN` is **off** by default. Polygon + USDC + NFT ownable assets come after the farm loop is fun.

## sacredfounders.com

Live 500 is DNS (Parity lander nameservers), not this app. Point the domain at a Vercel project of this repo after merge.

## DEV NOTES

**Found.** This GitHub repo had no prior Dragon World tree: no `hearth-view`, `Old Bren`, `valley-combat`, `game-store`, or `dragon-world/` folder. Branches `cursor/hearth-garden-baker-02bb` and `cursor/valley-combat-door-02bb` are not on this remote. The earlier Ember Sanctuary 10-item rewrite in this same PR was the wrong product.

**Merged.** Replaced that rewrite with the described first slice: pilgrim → Fighter/Spiritual → garden/baker → valley wolf. Then added fishing + cooking stubs on the same hearth/Bren sell loop (no second game). Named files match the prior list (`hearth-view`, `valley-combat`, `game-store`, `/api/game`, `/api/chain`).

**Still open.** Fishing/cooking are stubs (creek click, 1 grain → loaf), not minigames. Original cloud workspace if it still exists. Privy keys, live Amoy mint when `ENABLE_CHAIN=true`, USDC/NFT economy after the farm loop. Marketing pages. Vercel + DNS for sacredfounders.com needs Alan/CBO.
