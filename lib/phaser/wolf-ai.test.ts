import assert from "node:assert/strict";
import test from "node:test";
import { HIT_RANGE, tickWolf, tryStrike } from "./wolf-ai";

test("wolf telegraph becomes a lunge that can hit", () => {
  const never = () => 1;
  const start = tickWolf({ x: 0, y: 0, hp: 3 }, { x: 40, y: 0, hp: 3, telegraph: 0, lunging: 0 }, 0.016, never);
  assert.equal(start.wolf.telegraph, 0);
  const windup = tickWolf({ x: 0, y: 0, hp: 3 }, { x: 80, y: 0, hp: 3, telegraph: 0, lunging: 0 }, 0.016, never);
  assert.ok(windup.wolf.x < 80);

  const wolf = { x: 10, y: 0, hp: 3, telegraph: 1, lunging: 0 };
  const lunge = tickWolf({ x: 0, y: 0, hp: 3 }, wolf, 0.05);
  assert.ok(lunge.wolf.lunging > 0);

  const hit = tickWolf({ x: 0, y: 0, hp: 3 }, { x: HIT_RANGE / 2, y: 0, hp: 3, telegraph: 0, lunging: 100 }, 0.05);
  assert.equal(hit.player.hp, 2);
  assert.equal(hit.wolf.lunging, 0);
  assert.ok(hit.wolf.telegraph > 0);
});

test("strike only lands in range", () => {
  const far = tryStrike({ x: 0, y: 0, hp: 3 }, { x: 200, y: 0, hp: 3, telegraph: 0, lunging: 0 });
  assert.equal(far, null);
  const near = tryStrike({ x: 0, y: 0, hp: 3 }, { x: 20, y: 0, hp: 3, telegraph: 10, lunging: 10 });
  assert.equal(near?.hp, 2);
  assert.equal(near?.lunging, 0);
});
