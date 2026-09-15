import type { ItemId } from "./items";

export type EnemyDefinition = {
  id: string;
  name: string;
  health: number;
  damage: number;
  attackSpeed: number;
  playerDamage: number;
  playerAttackSpeed: number;
  drops: { itemId: ItemId; qty: number }[];
  xp: number;
};

export const WOLF: EnemyDefinition = {
  id: "wolf",
  name: "Wolf",
  health: 12,
  damage: 2,
  attackSpeed: 1.1,
  playerDamage: 3,
  playerAttackSpeed: 0.65,
  drops: [{ itemId: "wolf_pelt", qty: 1 }],
  xp: 25,
};
