import type { CropId } from "@/lib/types";

/** Top-down tile size. Swap art at this resolution (or 16px and scale 2x). */
export const TILE = 32;
export const COLS = 20;
export const ROWS = 14;

export const HEARTH_TILES = [
  "####################",
  "#~~~~~~~~~~~~~~~~~~#",
  "#~~~~..........~~~~#",
  "#..................#",
  "#..................#",
  "#..................#",
  "#..................#",
  "#..................#",
  "#..................#",
  "#..................#",
  "#..................#",
  "#..................#",
  "#..................#",
  "####################",
] as const;

export const VALLEY_TILES = [
  "####################",
  "#,,,,,,,,,,,,,,,,,,#",
  "#,,,,,,,,,,,,,,,,,,#",
  "#,,,,,,,,,,,,,,,,,,#",
  "#,,,,,,,,,,,,,,,,,,#",
  "#,,,,,,,,,,,,,,,,,,#",
  "#,,,,,,,,,,,,,,,,,,#",
  "#,,,,,,,,,,,,,,,,,,#",
  "#,,,,,,,,,,,,,,,,,,#",
  "#,,,,,,,,,,,,,,,,,,#",
  "#,,,,,,,,,,,,,,,,,,#",
  "#,,,,,,,,,,,,,,,,,,#",
  "#,,,,,,,,,,,,,,,,,,#",
  "####################",
] as const;

export type Spot = { col: number; row: number };

export const HEARTH_PLOTS: { id: number; col: number; row: number }[] = [
  { id: 0, col: 5, row: 4 },
  { id: 1, col: 6, row: 4 },
  { id: 2, col: 7, row: 4 },
  { id: 3, col: 5, row: 5 },
  { id: 4, col: 6, row: 5 },
  { id: 5, col: 7, row: 5 },
];

export const HEARTH_SPOTS = {
  creek: { col: 4, row: 1 },
  kitchen: { col: 14, row: 5 },
  bren: { col: 11, row: 8 },
  door: { col: 16, row: 11 },
  spawn: { col: 4, row: 11 },
} as const;

export const VALLEY_SPOTS = {
  spawn: { col: 3, row: 10 },
  wolf: { col: 16, row: 4 },
  door: { col: 16, row: 11 },
} as const;

export function tileAt(map: readonly string[], col: number, row: number): string {
  return map[row]?.[col] ?? "#";
}

export function isWalkable(ch: string): boolean {
  return ch !== "#";
}

export function worldCenter(col: number, row: number): { x: number; y: number } {
  return { x: col * TILE + TILE / 2, y: row * TILE + TILE / 2 };
}

export function tileFromWorld(x: number, y: number): { col: number; row: number } {
  return { col: Math.floor(x / TILE), row: Math.floor(y / TILE) };
}

export function inBounds(col: number, row: number): boolean {
  return col >= 0 && row >= 0 && col < COLS && row < ROWS;
}

export function cropTexture(crop: CropId, ready: boolean): string {
  return `crop-${crop}-${ready ? "ready" : "grow"}`;
}
