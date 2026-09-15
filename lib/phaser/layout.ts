import type { CropId } from "@/lib/types";
import type { CropStage } from "@/lib/crops";

/** Top-down tile size. Swap art at this resolution (or 16px and scale 2x). */
export const TILE = 32;
/** World width in tiles (east/south padding beyond the original 24-wide slice). */
export const COLS = 32;
/**
 * Viewport was 20×14 (640×448) — too tight on cottage + garden.
 * 28×18 at TILE 32 → 896×576, ~1.8× more world in view, tiles still readable.
 */
export const VIEW_COLS = 28;
export const VIEW_ROWS = 18;
export const VIEW_WIDTH = VIEW_COLS * TILE;
export const VIEW_HEIGHT = VIEW_ROWS * TILE;
/** Previous production viewport; tests assert the zoom-out against this. */
export const LEGACY_VIEW_WIDTH = 20 * TILE;
export const LEGACY_VIEW_HEIGHT = 14 * TILE;
export const CAMERA_ZOOM = 1;

/**
 * Hearth (cottage + garden + baker) and valley (path + forest edge).
 *
 *   , grass     = path     . cottage floor
 *   T forest    # wall     D door
 *
 * Core maps stay 24 tiles wide so furniture / plot / door columns do not move.
 * expandTileMap pads east and south with countryside so the wider camera has world to show.
 */
const HEARTH_CORE = [
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

const VALLEY_CORE = [
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

/**
 * Grow a walled map east and south. Existing tile indices (and therefore
 * HEARTH_SPOTS / VALLEY_SPOTS) stay valid; extra cells are countryside.
 */
export function expandTileMap(
  tiles: readonly string[],
  cols: number,
  rows: number,
  fill = ",",
): string[] {
  if (cols < 2 || rows < 2) {
    throw new Error("expandTileMap needs room for walls");
  }
  const wall = "#".repeat(cols);
  const out: string[] = [wall];
  const interior = tiles.slice(1, Math.max(1, tiles.length - 1));
  for (const row of interior) {
    const core = row.startsWith("#") && row.endsWith("#") ? row.slice(1, -1) : row;
    const clipped = core.slice(0, Math.max(0, cols - 2));
    const pad = Math.max(0, cols - 2 - clipped.length);
    out.push(`#${clipped}${fill.repeat(pad)}#`);
    if (out.length >= rows - 1) break;
  }
  while (out.length < rows - 1) {
    out.push(`#${fill.repeat(cols - 2)}#`);
  }
  out.push(wall);
  return out;
}

export const HEARTH_TILES = expandTileMap(HEARTH_CORE, COLS, 22);
export const VALLEY_TILES = expandTileMap(VALLEY_CORE, COLS, 24);

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
  { col: 22, row: 3 },
  { col: 24, row: 6 },
  { col: 26, row: 2 },
  { col: 28, row: 4 },
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
