import assert from "node:assert/strict";
import test from "node:test";
import { stepToward } from "./move";

test("stepToward arrives and does not overshoot a short gap", () => {
  const mid = stepToward(0, 0, 100, 0, 50, 1);
  assert.equal(mid.arrived, false);
  assert.equal(mid.x, 50);
  const end = stepToward(98, 0, 100, 0, 50, 1);
  assert.equal(end.arrived, true);
  assert.equal(end.x, 100);
});
