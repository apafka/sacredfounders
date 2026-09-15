import assert from "node:assert/strict";
import test from "node:test";
import { TILE, worldCenter } from "../phaser/layout";
import { clampDelta, pxToWorld, tileToWorld, worldToPx } from "./coords";

test("pixel and tile world conversions round-trip", () => {
  const px = worldCenter(6, 8);
  const w = pxToWorld(px.x, px.y);
  assert.equal(w.x, 6.5);
  assert.equal(w.z, 8.5);
  const back = worldToPx(w.x, w.z);
  assert.equal(back.x, px.x);
  assert.equal(back.y, px.y);
  const fromTile = tileToWorld(6, 8);
  assert.deepEqual(fromTile, w);
  assert.equal(TILE, 32);
});

test("delta time is clamped so a stalled tab cannot teleport", () => {
  assert.equal(clampDelta(0.016), 0.016);
  assert.equal(clampDelta(2), 0.05);
  assert.equal(clampDelta(-1), 0);
});
