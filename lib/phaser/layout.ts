import type { CropId } from "@/lib/types";
import type { CropStage } from "@/lib/crops";

/** Top-down tile size. Swap art at this resolution (or 16px and scale 2x). */
export const TILE = 32;
export const COLS = 24;
export const VIEW_COLS = 20;
export const VIEW_ROWS = 14;
export const VIEW_WIDTH = VIEW_COLS * TILE;
export const VIEW_HEIGHT = VIEW_ROWS * TILE;

/**
 * Hearth (cottage + garden + baker) and valley (path + forest edge).
 *
 *   , grass     = path     . cottage floor
 *   T forest    # wall     D door
 */
export const HEARTH_TILES = [
  "########################",
  "#,,,,,,,,,,,,,,,,,,,,,,#",
  "#,,==========,,,,,,,,,,#",
  "#,,==========,,,,,,,,,,#",
  "#,,==========,,,,,,,,,,#",
  "#,,,,,,,,==,,,,,,,,,,,,#",
  "#..######==######......#",
  "#..#............#......#",
  "#..#............#......#",
  "#..#............#......#",
  "#..######==######......#",
  "#,,,,,,,,==,,,,,,,,,,,,#",
  "#,,,,,,,,==,,,,,,,,,,,,#",
  "#,,,,,,,,========D.....#",
  "#,,,,,,,,,,,,,,,,,,,,,,#",
  "########################",
] as const;

export const VALLEY_TILES = [
  "########################",
  "#TTTTTTTTTTTTTTTTTTTTTT#",
  "#TTTTT========TTTTTTTTT#",
  "#TTTTT========TTTTTTTTT#",
  "#TTTTT========TTTTTTTTT#",
  "#TTTTTT======TTTTTTTTTT#",
  "#TTTTTTT====TTTTTTTTTTT#",
  "#,,,,,,,,====,,,,,,,,,,#",
  "#,,,,,,,,,====,,,,,,,,,#",
  "#,,,,,,,,,,====,,,,,,,,#",
  "#,,,,,,,,,,,===,,,,,,,,#",
  "#,,,,,,,,,,,,==,,,,,,,,#",
  "#,,,,,,,,,,,,==,,,,,,,,#",
  "#,,,,,,,,,,,,,,=,,,,,,,#",
  "#,,,,,,,,,,,,,,==D.....#",
  "#,,,,,,,,,,,,,,,,,,,,,,#",
  "#,,,,,,,,,,,,,,,,,,,,,,#",
  "########################",
] as const;

export const HEARTH_ROWS = HEARTH_TILES.length;
export const VALLEY_ROWS = VALLEY_TILES.length;
export const ROWS = VIEW_ROWS;

/** Phaser tileset strip order (see BootScene / art.ts). */
export const TILE_INDEX = {
  grass: 0,
  path: 1,
  floor: 2,
  creek: 3,
  wall: 4,
  door: 5,
  forest: 6,
} as const;

export const TILE_CHARS: Record<string, number> = {
  ",": TILE_INDEX.grass,
  "=": TILE_INDEX.path,
  ".": TILE_INDEX.floor,
  "~": TILE_INDEX.creek,
  "#": TILE_INDEX.wall,
  D: TILE_INDEX.door,
  T: TILE_INDEX.forest,
};

export const TILESET_KEYS = [
  "tile-grass",
  "tile-path",
  "tile-floor",
  "tile-creek",
  "tile-wall",
  "tile-door",
  "tile-forest",
] as const;

export type Spot = { col: number; row: number };

export const HEARTH_PLOTS: { id: number; col: number; row: number }[] = [
  { id: 0, col: 5, row: 3 },
  { id: 1, col: 6, row: 3 },
  { id: 2, col: 7, row: 3 },
];

export const HEARTH_SPOTS = {
  fire: { col: 5, row: 8 },
  bed: { col: 8, row: 9 },
  chest: { col: 12, row: 8 },
  workbench: { col: 14, row: 8 },
  bren: { col: 13, row: 4 },
  door: { col: 17, row: 13 },
  spawn: { col: 6, row: 8 },
} as const;

export const VALLEY_SPOTS = {
  spawn: { col: 16, row: 13 },
  wolf: { col: 10, row: 5 },
  door: { col: 17, row: 14 },
  tracks: { col: 12, row: 9 },
  scale: { col: 8, row: 6 },
  carving: { col: 10, row: 11 },
} as const;

export const VALLEY_TREES: Spot[] = [
  { col: 3, row: 2 },
  { col: 4, row: 4 },
  { col: 18, row: 2 },
  { col: 19, row: 4 },
  { col: 2, row: 5 },
  { col: 20, row: 5 },
  { col: 6, row: 1 },
  { col: 15, row: 1 },
  { col: 9, row: 2 },
  { col: 14, row: 5 },
];

export function tileAt(map: readonly string[], col: number, row: number): string {
  return map[row]?.[col] ?? "#";
}

export function isWalkable(ch: string): boolean {
  return ch !== "#";
}

export function isDoorTile(ch: string): boolean {
  return ch === "D";
}

export function tilesToData(tiles: readonly string[]): number[][] {
  return tiles.map((line) => Array.from(line, (ch) => TILE_CHARS[ch] ?? TILE_INDEX.wall));
}

export function worldCenter(col: number, row: number): { x: number; y: number } {
  return { x: col * TILE + TILE / 2, y: row * TILE + TILE / 2 };
}

export function tileFromWorld(x: number, y: number): { col: number; row: number } {
  return { col: Math.floor(x / TILE), row: Math.floor(y / TILE) };
}

export function inBounds(col: number, row: number, cols: number = COLS, rows: number = HEARTH_ROWS): boolean {
  return col >= 0 && row >= 0 && col < cols && row < rows;
}

export function cropTexture(crop: CropId, stage: CropStage | boolean): string {
  if (typeof stage === "boolean") return `crop-${crop}-${stage ? "ready" : "grow"}`;
  if (stage === "empty") return "crop-grain-planted";
  if (crop !== "grain") {
    return stage === "ready" ? "crop-grain-ready" : "crop-grain-grow";
  }
  if (stage === "ready") return "crop-grain-ready";
  if (stage === "growing") return "crop-grain-grow";
  if (stage === "sprout") return "crop-grain-sprout";
  return "crop-grain-planted";
}
