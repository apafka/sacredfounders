import assert from "node:assert/strict";
import test from "node:test";
import {
  COLS,
  HEARTH_PLOTS,
  HEARTH_SPOTS,
  HEARTH_TILES,
  ROWS,
  TILE,
  VALLEY_SPOTS,
  VALLEY_TILES,
  inBounds,
  isWalkable,
  tileAt,
} from "./layout";

test("hearth map is a closed 20x14 temple floor", () => {
  assert.equal(TILE, 32);
  assert.equal(HEARTH_TILES.length, ROWS);
  assert.ok(HEARTH_TILES.every((row) => row.length === COLS));
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
});

test("valley map has walkable spawn, wolf, and door", () => {
  assert.equal(VALLEY_TILES.length, ROWS);
  for (const spot of Object.values(VALLEY_SPOTS)) {
    assert.ok(inBounds(spot.col, spot.row));
    assert.ok(isWalkable(tileAt(VALLEY_TILES, spot.col, spot.row)));
  }
});
