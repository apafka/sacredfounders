import assert from "node:assert/strict";
import test from "node:test";
import {
  CAMERA_ZOOM,
  COLS,
  HEARTH_PLOTS,
  HEARTH_SPOTS,
  HEARTH_TILES,
  LEGACY_VIEW_HEIGHT,
  LEGACY_VIEW_WIDTH,
  TILE,
  TILESET_KEYS,
  TILE_CHARS,
  TILE_INDEX,
  VALLEY_SPOTS,
  VALLEY_TILES,
  VIEW_COLS,
  VIEW_HEIGHT,
  VIEW_ROWS,
  VIEW_WIDTH,
  expandTileMap,
  inBounds,
  isDoorTile,
  isWalkable,
  tileAt,
  tilesToData,
} from "./layout";

test("hearth and valley maps are rectangular and wider than the view", () => {
  assert.equal(TILE, 32);
  assert.equal(COLS, 32);
  assert.ok(HEARTH_TILES.every((row) => row.length === COLS));
  assert.ok(VALLEY_TILES.every((row) => row.length === COLS));
  assert.ok(HEARTH_TILES.length >= VIEW_ROWS);
  assert.ok(VALLEY_TILES.length >= VIEW_ROWS);
});

test("viewport shows about 1.6–2× more world than the 640×448 slice", () => {
  assert.equal(VIEW_COLS, 28);
  assert.equal(VIEW_ROWS, 18);
  assert.equal(VIEW_WIDTH, 896);
  assert.equal(VIEW_HEIGHT, 576);
  assert.equal(CAMERA_ZOOM, 1);
  const area = VIEW_WIDTH * VIEW_HEIGHT;
  const legacy = LEGACY_VIEW_WIDTH * LEGACY_VIEW_HEIGHT;
  assert.equal(legacy, 640 * 448);
  assert.ok(area >= legacy * 1.6, `visible area ${area} should be ≥ 1.6× ${legacy}`);
  assert.ok(area <= legacy * 2.05, `visible area ${area} should stay ≤ 2.05× so tiles remain readable`);
});

test("expandTileMap pads east and south without moving existing cells", () => {
  const src = ["####", "#=D#", "#,,#", "####"];
  const grown = expandTileMap(src, 6, 6);
  assert.equal(grown.length, 6);
  assert.ok(grown.every((row) => row.length === 6));
  assert.equal(grown[0], "######");
  assert.equal(grown[1][1], "=");
  assert.equal(grown[1][2], "D");
  assert.equal(grown[1][3], ",");
  assert.equal(grown[5], "######");
});

test("hearth has three garden plots, cottage furniture pads, baker, and a door", () => {
  assert.equal(HEARTH_PLOTS.length, 3);
  const ids = new Set(HEARTH_PLOTS.map((p) => p.id));
  assert.equal(ids.size, 3);
  for (const plot of HEARTH_PLOTS) {
    assert.ok(inBounds(plot.col, plot.row, COLS, HEARTH_TILES.length));
    assert.ok(isWalkable(tileAt(HEARTH_TILES, plot.col, plot.row)));
  }
  for (const spot of Object.values(HEARTH_SPOTS)) {
    assert.ok(inBounds(spot.col, spot.row, COLS, HEARTH_TILES.length));
    assert.ok(isWalkable(tileAt(HEARTH_TILES, spot.col, spot.row)));
  }
  assert.ok(isDoorTile(tileAt(HEARTH_TILES, HEARTH_SPOTS.door.col, HEARTH_SPOTS.door.row)));
  assert.equal(tileAt(HEARTH_TILES, HEARTH_SPOTS.spawn.col, HEARTH_SPOTS.spawn.row), ".");
});

test("valley path reaches one wolf pad, presence markers, and a door home", () => {
  for (const spot of Object.values(VALLEY_SPOTS)) {
    assert.ok(inBounds(spot.col, spot.row, COLS, VALLEY_TILES.length));
    assert.ok(isWalkable(tileAt(VALLEY_TILES, spot.col, spot.row)));
  }
  const chars = VALLEY_TILES.join("");
  assert.ok(chars.includes(","));
  assert.ok(chars.includes("="));
  assert.ok(chars.includes("T"));
  assert.ok(chars.includes("D"));
  assert.ok(isDoorTile(tileAt(VALLEY_TILES, VALLEY_SPOTS.door.col, VALLEY_SPOTS.door.row)));
  assert.equal(tileAt(VALLEY_TILES, VALLEY_SPOTS.wolf.col, VALLEY_SPOTS.wolf.row), "=");
});

test("walls collide; path, grass, floor, forest, and door do not", () => {
  assert.equal(isWalkable("#"), false);
  assert.equal(isWalkable("="), true);
  assert.equal(isWalkable(","), true);
  assert.equal(isWalkable("."), true);
  assert.equal(isWalkable("T"), true);
  assert.equal(isWalkable("D"), true);
  assert.ok(!isWalkable(tileAt(HEARTH_TILES, 0, 0)));
});

test("tileset indices include forest after the original six", () => {
  assert.deepEqual([...TILESET_KEYS], [
    "tile-grass",
    "tile-path",
    "tile-floor",
    "tile-creek",
    "tile-wall",
    "tile-door",
    "tile-forest",
  ]);
  assert.equal(TILE_CHARS[","], TILE_INDEX.grass);
  assert.equal(TILE_CHARS["="], TILE_INDEX.path);
  assert.equal(TILE_CHARS["."], TILE_INDEX.floor);
  assert.equal(TILE_CHARS["#"], TILE_INDEX.wall);
  assert.equal(TILE_CHARS.D, TILE_INDEX.door);
  assert.equal(TILE_CHARS.T, TILE_INDEX.forest);
  const data = tilesToData(["#=D"]);
  assert.deepEqual(data, [[TILE_INDEX.wall, TILE_INDEX.path, TILE_INDEX.door]]);
});
