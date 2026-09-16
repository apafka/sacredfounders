import assert from "node:assert/strict";
import test from "node:test";
import { cropStage, CROPS } from "./data/crops";
import { GROW_MS } from "./types";
import { plotReady, plotStage } from "./crops";

test("grain, root, and herb use distinct growth times around 45s", () => {
  assert.equal(CROPS.grain.growthTime, 45_000);
  assert.equal(CROPS.root.growthTime, 50_000);
  assert.equal(CROPS.herb.growthTime, 40_000);
  assert.equal(GROW_MS.grain, 45_000);
});

test("crop stages move planted → sprout → growing → ready", () => {
  const plantedAt = 0;
  assert.equal(cropStage(plantedAt, "grain", 0), "planted");
  assert.equal(plotStage(plantedAt, "root", CROPS.root.growthTime * 0.3), "sprout");
  assert.equal(plotStage(plantedAt, "herb", CROPS.herb.growthTime * 0.7), "growing");
  assert.equal(plotStage(plantedAt, "grain", GROW_MS.grain), "ready");
  assert.equal(plotReady(plantedAt, "herb", 0, GROW_MS.herb), true);
  assert.equal(plotReady(plantedAt, "herb", 0, GROW_MS.herb - 1), false);
});
