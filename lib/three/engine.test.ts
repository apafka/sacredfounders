import assert from "node:assert/strict";
import test from "node:test";
import { VIEW_HEIGHT, VIEW_WIDTH } from "../phaser/layout";
import { ISO_VIEW_HEIGHT, isoCameraPosition, isoZoomForViewport, preferredRenderer } from "./engine";

test("orthographic zoom shows the same ~28×18 tile window as the zoomed-out Phaser view", () => {
  const zoom = isoZoomForViewport(VIEW_HEIGHT);
  assert.equal(ISO_VIEW_HEIGHT, 18);
  assert.equal(zoom, VIEW_HEIGHT / 18);
  const visibleH = VIEW_HEIGHT / zoom;
  const visibleW = VIEW_WIDTH / zoom;
  assert.equal(visibleH, 18);
  assert.ok(visibleW >= 27 && visibleW <= 29);
});

test("isometric camera sits above the target on the classic 1,1,1 diagonal", () => {
  const pos = isoCameraPosition(10, 8);
  assert.ok(pos.y > 12);
  assert.ok(pos.x > 10);
  assert.ok(pos.z > 8);
  const dx = pos.x - 10;
  const dz = pos.z - 8;
  assert.ok(Math.abs(dx - dz) < 0.001);
});

test("playable door defaults to isometric; Phaser is an explicit fallback", () => {
  assert.equal(preferredRenderer(""), "iso");
  assert.equal(preferredRenderer("?view=iso"), "iso");
  assert.equal(preferredRenderer("?view=phaser"), "phaser");
});
