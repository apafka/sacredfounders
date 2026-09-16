import type { ItemId } from "./items";

export type EncounterKind = "wolf" | "dire";

export type EnemyDefinition = {
  id: EncounterKind;
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

export const DIRE_WOLF: EnemyDefinition = {
  id: "dire",
  name: "Dire Wolf",
  health: 28,
  damage: 4,
  attackSpeed: 1.0,
  playerDamage: 3,
  playerAttackSpeed: 0.65,
  drops: [{ itemId: "dire_hide", qty: 1 }],
  xp: 60,
};

export const ENEMIES: Record<EncounterKind, EnemyDefinition> = {
  wolf: WOLF,
  dire: DIRE_WOLF,
};

export function enemyDefinition(kind: EncounterKind): EnemyDefinition {
  return ENEMIES[kind] ?? WOLF;
}

export type EncounterSpot = {
  id: string;
  kind: EncounterKind;
  col: number;
  row: number;
};

/**
 * Valley pads, south → north. Door sits further south; the dire wolf is the deep threat.
 * Coordinates match VALLEY_CORE in layout.ts.
 */
export const VALLEY_ENCOUNTERS: EncounterSpot[] = [
  { id: "wolf-near", kind: "wolf", col: 10, row: 18 },
  { id: "wolf-mid", kind: "wolf", col: 12, row: 13 },
  { id: "wolf-far", kind: "wolf", col: 8, row: 9 },
  { id: "dire", kind: "dire", col: 10, row: 4 },
];
