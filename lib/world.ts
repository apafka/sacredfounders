import type { TileKind } from "./types";

export const ZONE = {
  id: "ember-sanctuary",
  name: "Ember Sanctuary",
  width: 9,
  height: 7,
  spawn: { x: 4, y: 3 },
} as const;

const LAYOUT = [
  "#########",
  "#..G.S..#",
  "#.R...E.#",
  "#...T...#",
  "#.H...E.#",
  "#..G.R..#",
  "#########",
] as const;

const GLYPH: Record<string, TileKind> = {
  "#": "stone",
  ".": "path",
  G: "grove",
  R: "river",
  E: "ember",
  S: "shrine",
  H: "hollow",
  T: "temple",
};

export const TILE_LABEL: Record<TileKind, string> = {
  stone: "Stone",
  path: "Path",
  grove: "Grove",
  river: "River",
  ember: "Ember bank",
  shrine: "Shrine",
  hollow: "Hollow",
  temple: "Temple",
};

export function tileAt(x: number, y: number): TileKind {
  const row = LAYOUT[y];
  if (!row || x < 0 || x >= row.length) return "stone";
  return GLYPH[row[x] ?? "#"] ?? "stone";
}

export function inBounds(x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < ZONE.width && y < ZONE.height;
}

export function walkable(x: number, y: number): boolean {
  return inBounds(x, y) && tileAt(x, y) !== "stone";
}

export function adjacent(ax: number, ay: number, bx: number, by: number): boolean {
  return Math.abs(ax - bx) + Math.abs(ay - by) === 1;
}
