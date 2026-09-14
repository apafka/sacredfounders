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
3. Hearth — plant/harvest grain, root, herb. Farm skill from harvests. Sell to **Old Bren** for soft coins. Whisper: baker needs three loaves.
4. Door — Diablo-style wolf (move / strike / dodge red lunge) → coins.
5. Chain — `POST /api/chain` exists. `ENABLE_CHAIN` is **off** by default.

## sacredfounders.com

Live 500 is DNS (Parity lander nameservers), not this app. Point the domain at a Vercel project of this repo after merge.

## DEV NOTES

**Found.** This GitHub repo had no prior Dragon World tree: no `hearth-view`, `Old Bren`, `valley-combat`, `game-store`, or `dragon-world/` folder. Branches `cursor/hearth-garden-baker-02bb` and `cursor/valley-combat-door-02bb` are not on this remote. The earlier Ember Sanctuary 10-item rewrite in this same PR was the wrong product.

**Merged.** Replaced that rewrite with the described first slice only: pilgrim → Fighter/Spiritual → garden/baker → valley wolf. One Next.js app at repo root (Sacred Founders does not use a nested `dragon-world/` folder). Named files match the prior list (`hearth-view`, `valley-combat`, `game-store`, `/api/game`, `/api/chain`).

**Still open.** Recover the original Still/cloud workspace if it still exists (this environment cannot read it). Privy keys, live Amoy mint when `ENABLE_CHAIN=true`, USDC, marketing pages (`/faq`, `/how-it-works`, `llms.txt`). Vercel + DNS for sacredfounders.com needs Alan/CBO.
