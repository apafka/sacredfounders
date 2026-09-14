import { ITEMS } from "./items";
import type { PlayerState, WorldState } from "./types";

export type DraftKind = "listing" | "bid" | "quest" | "receipt";

export async function keeperDraft(
  kind: DraftKind,
  player: PlayerState,
  world: WorldState,
): Promise<string> {
  const relic = player.relics.find((r) => !r.listed);
  const item = relic ? ITEMS[relic.itemId].name : ITEMS["ember-scale"].name;
  switch (kind) {
    case "listing":
      return relic
        ? `Draft listing: ${item} relic #${relic.tokenId} at 0.75 USDC. You still press list — the keeper does not move the relic.`
        : "Draft listing: seal a gathered gift first, then I can suggest a price in USDC.";
    case "bid": {
      const open = world.listings.find((l) => l.status === "open" && l.sellerId !== player.id);
      return open
        ? `Draft bid: ${ITEMS[open.itemId].name} from ${open.sellerName} — offer ${open.priceUsdc} USDC. Nothing settles until you approve.`
        : "No open stall. List a relic, or wait for the keeper to restock.";
    }
    case "quest":
      return world.quest;
    case "receipt":
      return `${player.name} walked Ember Sanctuary as ${player.classId ?? "an unsworn pilgrim"}. Pack still holds what you gathered. Relics sealed: ${player.relics.length}.`;
    default:
      return "The keeper is quiet.";
  }
}
