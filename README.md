# Dragon World at Sacred Founders

Playable slice of Dragon World on [sacredfounders.com](https://sacredfounders.com): pilgrim gate → Fighter/Seeker → one zone → 10-item pack → seal (NFT) → market.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
npm test
npm run build
```

## Play loop

1. **Enter as pilgrim** — no wallet modal. Cookie session (`sf_pilgrim`) survives refresh.
2. **Pick Fighter or Seeker** — written onto player state.
3. **Economy** — walk Ember Sanctuary, gather (class bonus on matching tiles), craft Rune Ink at the temple, **Seal as relic** (Polygon Amoy when keys exist; otherwise temple ledger), list/bid in USDC. The keeper drafts copy; it never moves funds.

## Polygon mint (optional)

Set these for a real Amoy mint. Without them, sealing still puts a relic in inventory.

```
SESSION_SECRET=
MINTER_PRIVATE_KEY=
RELICS_CONTRACT_ADDRESS=
POLYGON_RPC_URL=https://rpc-amoy.polygon.technology
```

Deploy `contracts/EmberRelics.sol` with the minter address, then set `RELICS_CONTRACT_ADDRESS`.

## sacredfounders.com

This repo was a static GitHub Pages stub (`frequencydealer.com` CNAME, empty `index.html`). The live domain currently uses Parity lander nameservers (`ns1.lander.d.parity.domains`) and returns SSL/500 — that is DNS/hosting, not this app.

After this app is on Vercel:

1. Add domain `sacredfounders.com` to the Vercel project.
2. At the registrar, change nameservers/records off the lander and onto Vercel (`cname.vercel-dns.com` or the A records Vercel shows).
3. `runewow.com` is later — do not block on it.

## DEV NOTES

**Found.** `apafka/sacredfounders` on `main` had no Dragon World: newsletter/apply HTML only. Prior agent [bc-01a09acd](https://cursor.com/agents/bc-01a09acd-665e-776b-86cd-cc9f261502bb) is not readable from this workspace (different cloud environment, not this GitHub repo). No commits, artifacts, or extra folders to port. `/tmp/dragon-world` is only this run’s empty `create-next-app` scaffold — not a second game tree.

**Merged.** One Next.js app here. Engine already described the three systems (`createPlayer` / `chooseClass` / gather-craft-mint-market). This pass wired `/api/play` + UI so gate → class → economy is one cookie-backed loop. Old site files live in `legacy/` and are not served.

**Still open.** Privy embedded wallet + paymaster; live Polygon Amoy contract + USDC settlement; Vercel project + DNS for sacredfounders.com (needs Alan/CBO); Postgres if the world ledger must survive across serverless instances (market listings are in-memory plus cookie player state).
