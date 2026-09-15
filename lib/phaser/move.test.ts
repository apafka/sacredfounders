import assert from "node:assert/strict";
import test from "node:test";
import { HEARTH_PLOTS, HEARTH_SPOTS, HEARTH_TILES, TILE, worldCenter } from "./layout";
import { PLAYER_SPEED } from "./wolf-ai";
import { canStand, hearthRoute, lineBlocked, slide, stepToward } from "./move";

test("stepToward arrives and does not overshoot a short gap", () => {
  const mid = stepToward(0, 0, 100, 0, 50, 1);
  assert.equal(mid.arrived, false);
  assert.equal(mid.x, 50);
  const end = stepToward(98, 0, 100, 0, 50, 1);
  assert.equal(end.arrived, true);
  assert.equal(end.x, 100);
});

function followHearth(fromX: number, fromY: number, toX: number, toY: number) {
  const route = hearthRoute(fromX, fromY, toX, toY);
  let x = fromX;
  let y = fromY;
  const pending = [...route];
  let dest = pending.shift() ?? { x: toX, y: toY };
  for (let i = 0; i < 2400; i += 1) {
    const prevX = x;
    const prevY = y;
    const stepped = stepToward(prevX, prevY, dest.x, dest.y, PLAYER_SPEED, 1 / 30, 28);
    const slid = slide(HEARTH_TILES, prevX, prevY, stepped.x, stepped.y);
    x = slid.x;
    y = slid.y;
    if (stepped.arrived) {
      const next = pending.shift();
      if (next) dest = next;
      else break;
    } else if (slid.x === prevX && slid.y === prevY) {
      const next = pending.shift();
      if (next) dest = next;
      else break;
    }
  }
  return { x, y, route };
}

test("hearthRoute uses the cottage mouth when a straight line hits a wall", () => {
  const inside = worldCenter(6, 8);
  const garden = worldCenter(6, 3);
  assert.equal(lineBlocked(HEARTH_TILES, inside.x, inside.y, garden.x, garden.y), true);
  const route = hearthRoute(inside.x, inside.y, garden.x, garden.y);
  assert.ok(route.length >= 2);
  assert.equal(route[route.length - 1].x, garden.x);
  assert.equal(route[route.length - 1].y, garden.y);
});

test("hearth click-to-move walks garden, baker, and door without stalling on walls", () => {
  const spawn = worldCenter(HEARTH_SPOTS.spawn.col, HEARTH_SPOTS.spawn.row);
  const door = worldCenter(HEARTH_SPOTS.door.col, HEARTH_SPOTS.door.row);
  const bren = worldCenter(HEARTH_SPOTS.bren.col, HEARTH_SPOTS.bren.row);
  const plots = HEARTH_PLOTS.map((plot) => worldCenter(plot.col, plot.row));
  const pairs = [
    [spawn, plots[0]!],
    [plots[0]!, spawn],
    [spawn, bren],
    [bren, door],
    [door, plots[1]!],
    [plots[2]!, door],
    [door, bren],
  ] as const;
  for (const [from, to] of pairs) {
    const arrived = followHearth(from.x, from.y, to.x, to.y);
    assert.ok(
      Math.hypot(arrived.x - to.x, arrived.y - to.y) < 36,
      `stalled ${from.x},${from.y} → ${to.x},${to.y} at ${arrived.x},${arrived.y} via ${arrived.route.length} stops`,
    );
    for (let i = 0; i < arrived.route.length; i += 1) {
      const a = i === 0 ? from : arrived.route[i - 1]!;
      const b = arrived.route[i]!;
      assert.equal(
        lineBlocked(HEARTH_TILES, a.x, a.y, b.x, b.y),
        false,
        `blocked segment ${a.x},${a.y} → ${b.x},${b.y}`,
      );
    }
  }
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
