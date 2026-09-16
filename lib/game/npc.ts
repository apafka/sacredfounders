import { BREN } from "@/lib/data/npcs";
import type { ItemId } from "@/lib/data/items";
import type { BrenDemand } from "@/lib/types";

export type NpcIntent =
  | { type: "greet"; line: string }
  | { type: "offer-buy"; line: string; itemId: ItemId; price: number; qty: number }
  | { type: "demand"; line: string; itemId: ItemId; qty: number; ready: boolean }
  | { type: "thanks"; line: string };

export type NpcContext = {
  wheat: number;
  bread: number;
  root: number;
  herb: number;
  demand: BrenDemand | null;
};

/** Swap later for AgentBrain. Rendering stays out of this module. Never moves real-world value. */
export interface NpcBrain {
  decide(ctx: NpcContext): NpcIntent;
}

export function demandItem(kind: BrenDemand["kind"]): ItemId {
  return kind === "bread" ? "bread" : "wheat";
}

export function demandHeld(ctx: NpcContext, demand: BrenDemand): number {
  return demand.kind === "bread" ? ctx.bread : ctx.wheat;
}

export class DeterministicBrain implements NpcBrain {
  constructor(private readonly npc = BREN) {}

  decide(ctx: NpcContext): NpcIntent {
    const demand = ctx.demand && ctx.demand.fulfilledAt == null ? ctx.demand : null;
    if (demand) {
      const held = demandHeld(ctx, demand);
      const ready = held >= demand.qty;
      return {
        type: "demand",
        line: ready
          ? demand.kind === "bread"
            ? this.npc.demandReadyBread
            : this.npc.demandReadyGrain
          : demand.kind === "bread"
            ? this.npc.demandBread
            : this.npc.demandGrain,
        itemId: demandItem(demand.kind),
        qty: demand.qty,
        ready,
      };
    }
    if (ctx.wheat > 0) {
      return {
        type: "offer-buy",
        line: this.npc.offer,
        itemId: this.npc.buyItem,
        price: this.npc.buyPrice,
        qty: ctx.wheat,
      };
    }
    if (ctx.root > 0 || ctx.herb > 0 || ctx.bread > 0) {
      return { type: "greet", line: this.npc.offer };
    }
    return { type: "greet", line: this.npc.emptyHands };
  }
}

export const brenBrain = new DeterministicBrain();
