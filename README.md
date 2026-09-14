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

1. Pilgrim Gate — no wallet modal. Cookie `sf_pilgrim` survives refresh.
2. Class — **Fighter** or **Spiritual**. Persists.
3. Hearth — plant/harvest grain, root, herb. Creek **fish** and kitchen **loaf** stubs. Sell all of it to **Old Bren** for soft coins.
4. Door — wolf (move / strike / dodge red lunge) → coins.
5. Chain — `POST /api/chain`. `ENABLE_CHAIN=false` by default.

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

**Still open.** Fishing/cooking minigames. Privy + live Amoy/USDC/NFT after the farm is fun. CBO: Vercel production URL + alanpafka.com/game.html blog wire.
