import { ARMOR_COST, POTION_COST, POTION_HEAL, SWORD_COST, SWORD_DAMAGE } from "../combat";
import type { ItemId } from "./items";

export type NpcDefinition = {
  id: string;
  name: string;
  title: string;
  greet: string;
  offer: string;
  thanks: string;
  rumor: string;
  emptyHands: string;
  shop: string;
  bake: string;
  demandBread: string;
  demandGrain: string;
  demandReadyBread: string;
  demandReadyGrain: string;
  demandThanksBread: string;
  demandThanksGrain: string;
  buyItem: ItemId;
  buyPrice: number;
};

export const BREN: NpcDefinition = {
  id: "bren",
  name: "Old Bren",
  title: "Baker",
  greet: "Morning. Garden looking honest?",
  offer: "Wheat's what the oven wants. Two gold a sheaf — fair for a first harvest. Roots three, herbs five if you've got the patience.",
  thanks: "That'll rise by dusk. Don't spend it all staring at the trees.",
  rumor: "Tracks on the north path aren't mine. Some say a dragon slept beyond the pines. Some say it's only weather that walks.",
  emptyHands: "Nothing green on you. The beds out front will wait.",
  shop: "Gold spends. A potion for the path, a blade if the trees answer back, a hide coat if they bite.",
  bake: "Wheat in, bread out. That's the whole trick. Creation spends what it makes.",
  demandBread: "I need three loaves by dusk. The shelf will notice if it's empty.",
  demandGrain: "Bring me grain. Three sheaves and the oven stays honest.",
  demandReadyBread: "Those loaves will do. Hand them here — I'll see you paid like a neighbor, not a stall.",
  demandReadyGrain: "That's the grain. In with you, then gold.",
  demandThanksBread: "Three loaves. The shelf is honest. Don't spend it all staring at the trees.",
  demandThanksGrain: "Grain in the bin. The oven can work. Take this for the trouble.",
  buyItem: "wheat",
  buyPrice: 2,
};

export type ShopSku = "potion" | "sword" | "armor";

export type ShopListing = {
  sku: ShopSku;
  name: string;
  cost: number;
  blurb: string;
  itemId?: ItemId;
};

export const BREN_SHOP: ShopListing[] = [
  {
    sku: "potion",
    name: "Health Potion",
    cost: POTION_COST,
    blurb: `Restores ${POTION_HEAL} health.`,
    itemId: "health_potion",
  },
  {
    sku: "sword",
    name: "Iron Blade",
    cost: SWORD_COST,
    blurb: `Your strike hits for ${SWORD_DAMAGE}.`,
    itemId: "iron_blade",
  },
  {
    sku: "armor",
    name: "Hide Armor",
    cost: ARMOR_COST,
    blurb: "Takes a point off each bite.",
    itemId: "hide_armor",
  },
];
