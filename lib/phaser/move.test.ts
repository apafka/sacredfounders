import assert from "node:assert/strict";
import test from "node:test";
import { HEARTH_TILES, TILE, worldCenter } from "./layout";
import { canStand, slide, stepToward } from "./move";

test("stepToward arrives and does not overshoot a short gap", () => {
  const mid = stepToward(0, 0, 100, 0, 50, 1);
  assert.equal(mid.arrived, false);
  assert.equal(mid.x, 50);
  const end = stepToward(98, 0, 100, 0, 50, 1);
  assert.equal(end.arrived, true);
  assert.equal(end.x, 100);
});

test("slide stops at walls and continues along open tiles", () => {
  const inside = worldCenter(4, 11);
  assert.equal(canStand(HEARTH_TILES, inside.x, inside.y), true);
  const intoWall = slide(HEARTH_TILES, inside.x, inside.y, TILE / 2, inside.y);
  assert.ok(intoWall.x > TILE, "must not enter the west wall");
  const along = slide(HEARTH_TILES, inside.x, inside.y, inside.x + TILE, inside.y);
  assert.equal(along.x, inside.x + TILE);
  assert.equal(along.y, inside.y);
});
