import assert from "node:assert/strict";
import test from "node:test";
import {
  COLS,
  HEARTH_PLOTS,
  HEARTH_SPOTS,
  HEARTH_TILES,
  ROWS,
  TILE,
  TILESET_KEYS,
  TILE_CHARS,
  TILE_INDEX,
  VALLEY_ELITE,
  VALLEY_SPOTS,
  VALLEY_TILES,
  VALLEY_WOLF_PADS,
  WORLD_TILES,
  inBounds,
  isDoorTile,
  isWalkable,
  tileAt,
  tilesToData,
} from "./layout";

test("one 20x28 world covers valley north and hearth south", () => {
  assert.equal(TILE, 32);
  assert.equal(WORLD_TILES.length, ROWS * 2);
  assert.ok(WORLD_TILES.every((row) => row.length === COLS));
  assert.deepEqual([...VALLEY_TILES], [...WORLD_TILES.slice(0, ROWS)]);
  assert.deepEqual([...HEARTH_TILES], [...WORLD_TILES.slice(ROWS)]);
});

test("hearth slice keeps garden, creek, spawn, and a door tile", () => {
  assert.equal(HEARTH_TILES.length, ROWS);
  assert.equal(HEARTH_PLOTS.length, 6);
  const ids = new Set(HEARTH_PLOTS.map((p) => p.id));
  assert.equal(ids.size, 6);
  for (const plot of HEARTH_PLOTS) {
    assert.ok(inBounds(plot.col, plot.row));
    assert.ok(isWalkable(tileAt(HEARTH_TILES, plot.col, plot.row)));
  }
  for (const spot of Object.values(HEARTH_SPOTS)) {
    assert.ok(inBounds(spot.col, spot.row));
    assert.ok(isWalkable(tileAt(HEARTH_TILES, spot.col, spot.row)));
  }
  assert.equal(tileAt(HEARTH_TILES, HEARTH_SPOTS.creek.col, HEARTH_SPOTS.creek.row), "~");
  assert.ok(isDoorTile(tileAt(HEARTH_TILES, HEARTH_SPOTS.door.col, HEARTH_SPOTS.door.row)));
  assert.equal(tileAt(HEARTH_TILES, HEARTH_SPOTS.spawn.col, HEARTH_SPOTS.spawn.row), "=");
});

test("valley slice has grass, path, wolf, and door", () => {
  assert.equal(VALLEY_TILES.length, ROWS);
  for (const spot of Object.values(VALLEY_SPOTS)) {
    assert.ok(inBounds(spot.col, spot.row));
    assert.ok(isWalkable(tileAt(VALLEY_TILES, spot.col, spot.row)));
  }
  const chars = VALLEY_TILES.join("");
  assert.ok(chars.includes(","));
  assert.ok(chars.includes("="));
  assert.ok(chars.includes("D"));
  assert.ok(chars.includes("#"));
  assert.ok(isDoorTile(tileAt(VALLEY_TILES, VALLEY_SPOTS.door.col, VALLEY_SPOTS.door.row)));
  assert.equal(tileAt(VALLEY_TILES, VALLEY_SPOTS.wolf.col, VALLEY_SPOTS.wolf.row), "=");
  assert.equal(VALLEY_WOLF_PADS.length, 3);
  for (const pad of [...VALLEY_WOLF_PADS, VALLEY_ELITE]) {
    assert.ok(inBounds(pad.col, pad.row));
    assert.ok(isWalkable(tileAt(VALLEY_TILES, pad.col, pad.row)));
  }
});

test("walls collide; path, grass, floor, creek, and door do not", () => {
  assert.equal(isWalkable("#"), false);
  assert.equal(isWalkable("="), true);
  assert.equal(isWalkable(","), true);
  assert.equal(isWalkable("."), true);
  assert.equal(isWalkable("~"), true);
  assert.equal(isWalkable("D"), true);
  assert.ok(!isWalkable(tileAt(HEARTH_TILES, 0, 0)));
  assert.ok(!isWalkable(tileAt(VALLEY_TILES, 0, 7)));
});

test("tileset indices match grass, path, interior, creek, wall, door", () => {
  assert.deepEqual([...TILESET_KEYS], [
    "tile-grass",
    "tile-path",
    "tile-floor",
    "tile-creek",
    "tile-wall",
    "tile-door",
  ]);
  assert.equal(TILE_CHARS[","], TILE_INDEX.grass);
  assert.equal(TILE_CHARS["="], TILE_INDEX.path);
  assert.equal(TILE_CHARS["."], TILE_INDEX.floor);
  assert.equal(TILE_CHARS["~"], TILE_INDEX.creek);
  assert.equal(TILE_CHARS["#"], TILE_INDEX.wall);
  assert.equal(TILE_CHARS.D, TILE_INDEX.door);
  const data = tilesToData(["#=D"]);
  assert.deepEqual(data, [[TILE_INDEX.wall, TILE_INDEX.path, TILE_INDEX.door]]);
});
