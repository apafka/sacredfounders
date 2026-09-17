export const ITEM_IDS = [
  "wheat_seed",
  "wheat",
  "root_seed",
  "root",
  "herb_seed",
  "herb",
  "bread",
  "wolf_pelt",
  "dire_hide",
  "boar_tusk",
  "spider_silk",
  "health_potion",
  "iron_blade",
  "hide_armor",
] as const;
export type ItemId = (typeof ITEM_IDS)[number];

export type ItemType = "seed" | "crop" | "material" | "consumable" | "gear";

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
  root_seed: {
    id: "root_seed",
    name: "Root Seed",
    type: "seed",
    stackable: true,
    maxStack: 99,
    value: 0,
  },
  root: {
    id: "root",
    name: "Root",
    type: "crop",
    stackable: true,
    maxStack: 99,
    value: 3,
  },
  herb_seed: {
    id: "herb_seed",
    name: "Herb Seed",
    type: "seed",
    stackable: true,
    maxStack: 99,
    value: 0,
  },
  herb: {
    id: "herb",
    name: "Herb",
    type: "crop",
    stackable: true,
    maxStack: 99,
    value: 5,
  },
  bread: {
    id: "bread",
    name: "Bread",
    type: "consumable",
    stackable: true,
    maxStack: 20,
    value: 4,
  },
  wolf_pelt: {
    id: "wolf_pelt",
    name: "Wolf Pelt",
    type: "material",
    stackable: true,
    maxStack: 20,
    value: 0,
  },
  dire_hide: {
    id: "dire_hide",
    name: "Dire Hide",
    type: "material",
    stackable: true,
    maxStack: 10,
    value: 0,
  },
  boar_tusk: {
    id: "boar_tusk",
    name: "Boar Tusk",
    type: "material",
    stackable: true,
    maxStack: 20,
    value: 0,
  },
  spider_silk: {
    id: "spider_silk",
    name: "Spider Silk",
    type: "material",
    stackable: true,
    maxStack: 20,
    value: 0,
  },
  health_potion: {
    id: "health_potion",
    name: "Health Potion",
    type: "consumable",
    stackable: true,
    maxStack: 10,
    value: 5,
  },
  iron_blade: {
    id: "iron_blade",
    name: "Iron Blade",
    type: "gear",
    stackable: false,
    maxStack: 1,
    value: 12,
  },
  hide_armor: {
    id: "hide_armor",
    name: "Hide Armor",
    type: "gear",
    stackable: false,
    maxStack: 1,
    value: 15,
  },
};

export function isItemId(value: string): value is ItemId {
  return value in ITEMS;
}
