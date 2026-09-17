import { ITEMS, type ItemId } from "./items";

export type EncounterKind = "wolf" | "dire" | "boar" | "spider";

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

/**
 * Wilderness bestiary (shared by iso + Phaser).
 *
 * | Kind   | HP | Bite | Attack XP on kill | Drop         |
 * |--------|----|------|-------------------|--------------|
 * | Wolf   | 12 | 2    | 25                | Wolf Pelt    |
 * | Boar   | 18 | 3    | 35                | Boar Tusk    |
 * | Spider | 10 | 3    | 30                | Spider Silk  |
 * | Dire   | 28 | 4    | 60                | Dire Hide    |
 *
 * Player base strike is 3 (plus Attack, plus blade). Attack speed 0.65s.
 */
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

export const BOAR: EnemyDefinition = {
  id: "boar",
  name: "Forest Boar",
  health: 18,
  damage: 3,
  attackSpeed: 1.15,
  playerDamage: 3,
  playerAttackSpeed: 0.65,
  drops: [{ itemId: "boar_tusk", qty: 1 }],
  xp: 35,
};

export const FOREST_SPIDER: EnemyDefinition = {
  id: "spider",
  name: "Forest Spider",
  health: 10,
  damage: 3,
  attackSpeed: 0.9,
  playerDamage: 3,
  playerAttackSpeed: 0.65,
  drops: [{ itemId: "spider_silk", qty: 1 }],
  xp: 30,
};

export const ENEMIES: Record<EncounterKind, EnemyDefinition> = {
  wolf: WOLF,
  dire: DIRE_WOLF,
  boar: BOAR,
  spider: FOREST_SPIDER,
};

export function enemyDefinition(kind: EncounterKind): EnemyDefinition {
  return ENEMIES[kind] ?? WOLF;
}

export function isEncounterKind(value: string): value is EncounterKind {
  return value in ENEMIES;
}

export type EncounterSpot = {
  id: string;
  kind: EncounterKind;
  col: number;
  row: number;
};

/**
 * Valley pads, south → north. Door sits further south; the dire wolf is the deep threat.
 * Boar in the west wallow, spider off the east pad. Coordinates match VALLEY_CORE in layout.ts.
 */
export const VALLEY_ENCOUNTERS: EncounterSpot[] = [
  { id: "wolf-near", kind: "wolf", col: 14, row: 32 },
  { id: "wolf-mid", kind: "wolf", col: 11, row: 26 },
  { id: "wolf-bend", kind: "wolf", col: 12, row: 20 },
  { id: "wolf-far", kind: "wolf", col: 10, row: 14 },
  { id: "boar-west", kind: "boar", col: 4, row: 24 },
  { id: "spider-east", kind: "spider", col: 26, row: 17 },
  { id: "dire", kind: "dire", col: 10, row: 4 },
];

export function dropLabel(kind: EncounterKind): string {
  const itemId = enemyDefinition(kind).drops[0]?.itemId;
  return itemId ? ITEMS[itemId].name : "Loot";
}

export function foeSpriteKey(kind: EncounterKind): string {
  if (kind === "dire") return "sprite-dire";
  if (kind === "boar") return "sprite-boar";
  if (kind === "spider") return "sprite-spider";
  return "sprite-wolf";
}

export function lootSpriteKey(kind: EncounterKind): string {
  if (kind === "dire") return "sprite-hide";
  if (kind === "boar") return "sprite-tusk";
  if (kind === "spider") return "sprite-silk";
  return "sprite-pelt";
}

export function huntHint(kind: EncounterKind): string {
  if (kind === "dire") return "You set on the dire wolf.";
  if (kind === "boar") return "You set on the boar.";
  if (kind === "spider") return "You set on the spider.";
  return "You set on the wolf.";
}

export function fallHint(kind: EncounterKind): string {
  return `${enemyDefinition(kind).name} falls. ${dropLabel(kind)} in the grass. Click it.`;
}
