import type { CropId } from "@/lib/types";

/** Top-down tile size. Swap art at this resolution (or 16px and scale 2x). */
export const TILE = 32;
export const COLS = 20;
export const ROWS = 14;

/**
 * One world covering valley (north, rows 0–13) and hearth (south, rows 14–27).
 *
 *   , grass     = path     . hearth interior
 *   ~ creek     # wall     D door (hearth ↔ valley)
 *
 * Each Phaser scene mounts its 20×14 slice as a Tilemap layer. Door tiles stay
 * walkable; `/api/game` door still switches the pilgrim between scenes.
 */
export const WORLD_TILES = [
  // --- valley (north) ---
  "####################",
  "#,,,,,,,,,,,,,,,,,,#",
  "#,,,,,,,,,,,,====,,#",
  "#,,,,,,,,,,,,====,,#",
  "#,,,,,,,,,,,,====,,#",
  "#,,,,,,,,,,,,,===,,#",
  "#,,,,,,,,,,,,,===,,#",
  "#,,,,,,,,,,,,,===,,#",
  "#,,,,,,,,,,,,,===,,#",
  "#,,===============,#",
  "#,,==============,,#",
  "#,,=============D,,#",
  "#,,,,,,,,,,,,,,,,,,#",
  "####################",
  // --- hearth (south) ---
  "####################",
  "#~~~~~~~~~~~~~~~~~~#",
  "#~~~~==========~~~~#",
  "#...=========......#",
  "#...=...=..........#",
  "#...=...=.....=....#",
  "#.......=..........#",
  "#.........=........#",
  "#..........=.......#",
  "#...........=======#",
  "#...============...#",
  "#...============D..#",
  "#..................#",
  "####################",
] as const;

export const VALLEY_TILES = WORLD_TILES.slice(0, ROWS);
export const HEARTH_TILES = WORLD_TILES.slice(ROWS, ROWS * 2);

/** Phaser tileset strip order (see BootScene / art.ts). */
export const TILE_INDEX = {
  grass: 0,
  path: 1,
  floor: 2,
  creek: 3,
  wall: 4,
  door: 5,
} as const;

export const TILE_CHARS: Record<string, number> = {
  ",": TILE_INDEX.grass,
  "=": TILE_INDEX.path,
  ".": TILE_INDEX.floor,
  "~": TILE_INDEX.creek,
  "#": TILE_INDEX.wall,
  D: TILE_INDEX.door,
};

export const TILESET_KEYS = [
  "tile-grass",
  "tile-path",
  "tile-floor",
  "tile-creek",
  "tile-wall",
  "tile-door",
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

export const VALLEY_WOLF_PADS: Spot[] = [
  { col: 16, row: 4 },
  { col: 13, row: 2 },
  { col: 15, row: 7 },
];

export const VALLEY_ELITE = { col: 7, row: 3 } as const;

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
  return tiles.map((line) =>
    Array.from(line, (ch) => TILE_CHARS[ch] ?? TILE_INDEX.wall),
  );
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
