import assert from "node:assert/strict";
import test from "node:test";
import { HEARTH_TILES, TILE, worldCenter } from "./layout";
import { canStand, hearthRoute, lineBlocked, slide, stepToward } from "./move";

test("stepToward arrives and does not overshoot a short gap", () => {
  const mid = stepToward(0, 0, 100, 0, 50, 1);
  assert.equal(mid.arrived, false);
  assert.equal(mid.x, 50);
  const end = stepToward(98, 0, 100, 0, 50, 1);
  assert.equal(end.arrived, true);
  assert.equal(end.x, 100);
});

test("hearthRoute uses the cottage mouth when a straight line hits a wall", () => {
  const inside = worldCenter(6, 8);
  const garden = worldCenter(6, 3);
  assert.equal(lineBlocked(HEARTH_TILES, inside.x, inside.y, garden.x, garden.y), true);
  const route = hearthRoute(inside.x, inside.y, garden.x, garden.y);
  assert.ok(route.length >= 2);
  assert.equal(route[route.length - 1].x, garden.x);
  assert.equal(route[route.length - 1].y, garden.y);
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
