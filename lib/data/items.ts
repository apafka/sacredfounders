export const ITEM_IDS = ["wheat_seed", "wheat", "wolf_pelt"] as const;
export type ItemId = (typeof ITEM_IDS)[number];

export type ItemType = "seed" | "crop" | "material";

export type ItemDefinition = {
  id: ItemId;
  name: string;
  type: ItemType;
  stackable: boolean;
  maxStack: number;
  value: number;
};

export const ITEMS: Record<ItemId, ItemDefinition> = {
  wheat_seed: {
    id: "wheat_seed",
    name: "Wheat Seed",
    type: "seed",
    stackable: true,
    maxStack: 99,
    value: 0,
  },
  wheat: {
    id: "wheat",
    name: "Wheat",
    type: "crop",
    stackable: true,
    maxStack: 99,
    value: 2,
  },
  wolf_pelt: {
    id: "wolf_pelt",
    name: "Wolf Pelt",
    type: "material",
    stackable: true,
    maxStack: 20,
    value: 0,
  },
};

export function isItemId(value: string): value is ItemId {
  return value in ITEMS;
}
