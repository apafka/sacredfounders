import assert from "node:assert/strict";
import test from "node:test";
import { PLAYER_DAMAGE, WOLF_HP } from "../combat";
import { ATTACK_RANGE, createWolf, nearestLiving, tickWolf, tryStrike } from "./wolf-ai";

test("one wolf wanders until the player is close, then chases and bites", () => {
  const wolf = createWolf(200, 0);
  const idle = tickWolf({ x: 0, y: 0, hp: 20 }, wolf, 0.05, () => 1);
  assert.ok(idle.wolf.mode === "idle" || idle.wolf.mode === "wander");
  const chase = tickWolf({ x: 0, y: 0, hp: 20 }, { ...createWolf(80, 0), wanderWait: 0 }, 0.05, () => 1);
  assert.equal(chase.wolf.mode, "chase");
  assert.ok(chase.wolf.x < 80);
  const bite = tickWolf(
    { x: 200, y: 0, hp: 20 },
    { ...createWolf(200, 0), attackCd: 0 },
    0.016,
    () => 1,
  );
  assert.equal(bite.wolf.mode, "attack");
  assert.equal(bite.player.hp, 18);
  assert.equal(bite.wolfHit, 2);
});

test("click-to-fight strike deals 3 of 12 and only in range", () => {
  const far = tryStrike({ x: 0, y: 0, hp: 20 }, createWolf(200, 0));
  assert.equal(far, null);
  const near = tryStrike({ x: 0, y: 0, hp: 20 }, createWolf(20, 0));
  assert.equal(near?.hp, WOLF_HP - PLAYER_DAMAGE);
  assert.ok(ATTACK_RANGE > 20);
});

test("bite damage can be mitigated by the caller", () => {
  const bite = tickWolf(
    { x: 200, y: 0, hp: 20 },
    { ...createWolf(200, 0), attackCd: 0 },
    0.016,
    () => 1,
    undefined,
    1,
  );
  assert.equal(bite.player.hp, 19);
  assert.equal(bite.wolfHit, 1);
});

test("nearest living foe ignores corpses", () => {
  const live = nearestLiving(
    [
      { ...createWolf(0, 0, 0), id: "dead", kind: "wolf", spawnX: 0, spawnY: 0, hp: 0 },
      { ...createWolf(40, 0), id: "live", kind: "dire", spawnX: 40, spawnY: 0 },
    ],
    0,
    0,
    80,
  );
  assert.equal(live?.id, "live");
});
