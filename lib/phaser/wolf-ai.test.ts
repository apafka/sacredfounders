import assert from "node:assert/strict";
import test from "node:test";
import { HIT_RANGE, RESPAWN_MS, nearestLiving, tickPack, tickWolf, tryStrike } from "./wolf-ai";

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
  const blade = tryStrike({ x: 0, y: 0, hp: 3 }, { x: 20, y: 0, hp: 8, telegraph: 0, lunging: 0 }, 2);
  assert.equal(blade?.hp, 6);
});

test("dead wolves respawn on their pad and nearest living skips corpses", () => {
  const pack = [
    {
      id: 0,
      kind: "pack" as const,
      x: 10,
      y: 0,
      hp: 0,
      maxHp: 3,
      telegraph: 0,
      lunging: 0,
      spawnX: 40,
      spawnY: 8,
      respawnIn: 30,
    },
  ];
  const waiting = tickPack({ x: 0, y: 0, hp: 3 }, pack, 0.01, () => 1);
  assert.equal(waiting.wolves[0].hp, 0);
  const back = tickPack({ x: 0, y: 0, hp: 3 }, pack, 1, () => 1);
  assert.equal(back.wolves[0].hp, 3);
  assert.equal(back.wolves[0].x, 40);
  assert.equal(nearestLiving({ x: 0, y: 0, hp: 3 }, waiting.wolves), null);
  assert.equal(RESPAWN_MS, 25_000);
});
