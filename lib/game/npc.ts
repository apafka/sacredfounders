import { BREN } from "@/lib/data/npcs";
import type { ItemId } from "@/lib/data/items";

export type NpcIntent =
  | { type: "greet"; line: string }
  | { type: "offer-buy"; line: string; itemId: ItemId; price: number; qty: number }
  | { type: "thanks"; line: string };

export type NpcContext = {
  cropCount: number;
};

/** Swap later for AgentBrain. Rendering stays out of this module. */
export interface NpcBrain {
  decide(ctx: NpcContext): NpcIntent;
}

export class DeterministicBrain implements NpcBrain {
  constructor(private readonly npc = BREN) {}

  decide(ctx: NpcContext): NpcIntent {
    if (ctx.cropCount > 0) {
      return {
        type: "offer-buy",
        line: this.npc.offer,
        itemId: this.npc.buyItem,
        price: this.npc.buyPrice,
        qty: ctx.cropCount,
      };
    }
    return { type: "greet", line: this.npc.emptyHands };
  }
}

export const brenBrain = new DeterministicBrain();
