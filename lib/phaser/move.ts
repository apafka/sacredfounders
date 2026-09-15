import { HEARTH_TILES, isWalkable, tileAt, tileFromWorld, worldCenter } from "./layout";

export function stepToward(
  x: number,
  y: number,
  tx: number,
  ty: number,
  speed: number,
  dt: number,
  arriveAt = 6,
): { x: number; y: number; arrived: boolean } {
  const dx = tx - x;
  const dy = ty - y;
  const dist = Math.hypot(dx, dy);
  if (dist <= arriveAt) return { x: tx, y: ty, arrived: true };
  const step = speed * dt;
  if (step >= dist) return { x: tx, y: ty, arrived: true };
  return { x: x + (dx / dist) * step, y: y + (dy / dist) * step, arrived: false };
}

export function clampToRect(
  x: number,
  y: number,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
): { x: number; y: number } {
  return {
    x: Math.max(minX, Math.min(maxX, x)),
    y: Math.max(minY, Math.min(maxY, y)),
  };
}

const FEET = 8;

export function canStand(map: readonly string[], x: number, y: number): boolean {
  const points: [number, number][] = [
    [x, y],
    [x - FEET, y],
    [x + FEET, y],
    [x, y - FEET],
    [x, y + FEET],
  ];
  return points.every(([px, py]) => {
    const { col, row } = tileFromWorld(px, py);
    return isWalkable(tileAt(map, col, row));
  });
}

/** Move as far as the tilemap allows, sliding along walls. */
export function slide(
  map: readonly string[],
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
): { x: number; y: number } {
  if (canStand(map, toX, toY)) return { x: toX, y: toY };
  if (canStand(map, toX, fromY)) return { x: toX, y: fromY };
  if (canStand(map, fromX, toY)) return { x: fromX, y: toY };
  return { x: fromX, y: fromY };
}

export type Point = { x: number; y: number };

export function lineBlocked(
  map: readonly string[],
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  step = 8,
): boolean {
  const dist = Math.hypot(toX - fromX, toY - fromY);
  const n = Math.max(1, Math.ceil(dist / step));
  for (let i = 1; i <= n; i += 1) {
    const t = i / n;
    if (!canStand(map, fromX + (toX - fromX) * t, fromY + (toY - fromY) * t)) return true;
  }
  return false;
}

type Tile = { col: number; row: number };

function tileKey(col: number, row: number) {
  return `${col},${row}`;
}

/** 4-neighbour walkable path on the hearth map. */
export function findTilePath(
  map: readonly string[],
  start: Tile,
  goal: Tile,
): Tile[] | null {
  if (!isWalkable(tileAt(map, start.col, start.row))) return null;
  if (!isWalkable(tileAt(map, goal.col, goal.row))) return null;
  if (start.col === goal.col && start.row === goal.row) return [start];
  const came = new Map<string, Tile | null>();
  came.set(tileKey(start.col, start.row), null);
  const queue: Tile[] = [start];
  const dirs: [number, number][] = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  while (queue.length > 0) {
    const cur = queue.shift();
    if (!cur) break;
    if (cur.col === goal.col && cur.row === goal.row) {
      const tiles: Tile[] = [];
      let step: Tile | null = cur;
      while (step) {
        tiles.push(step);
        step = came.get(tileKey(step.col, step.row)) ?? null;
      }
      return tiles.reverse();
    }
    for (const [dc, dr] of dirs) {
      const next = { col: cur.col + dc, row: cur.row + dr };
      const key = tileKey(next.col, next.row);
      if (came.has(key)) continue;
      if (!isWalkable(tileAt(map, next.col, next.row))) continue;
      came.set(key, cur);
      queue.push(next);
    }
  }
  return null;
}

/** Keep the farthest waypoint still visible from the previous one. */
export function pullWaypoints(fromX: number, fromY: number, points: Point[]): Point[] {
  if (points.length === 0) return [];
  const out: Point[] = [];
  let sx = fromX;
  let sy = fromY;
  let i = 0;
  while (i < points.length) {
    let best = i;
    for (let j = points.length - 1; j >= i; j -= 1) {
      const point = points[j];
      if (point && !lineBlocked(HEARTH_TILES, sx, sy, point.x, point.y)) {
        best = j;
        break;
      }
    }
    const chosen = points[best];
    if (!chosen) break;
    out.push(chosen);
    sx = chosen.x;
    sy = chosen.y;
    i = best + 1;
  }
  return out;
}

/**
 * Click-to-move is a straight slide when the line is open. Cottage walls
 * block garden ↔ interior ↔ yard, so fall back to a walkable tile path
 * pulled into a few mouth waypoints.
 */
export function hearthRoute(fromX: number, fromY: number, toX: number, toY: number): Point[] {
  const dest = { x: toX, y: toY };
  if (!lineBlocked(HEARTH_TILES, fromX, fromY, toX, toY)) return [dest];
  const from = tileFromWorld(fromX, fromY);
  const to = tileFromWorld(toX, toY);
  const tiles = findTilePath(HEARTH_TILES, from, to);
  if (!tiles || tiles.length === 0) return [dest];
  const world = tiles.map((tile) => worldCenter(tile.col, tile.row));
  world[world.length - 1] = dest;
  const pulled = pullWaypoints(fromX, fromY, world);
  const points = pulled.length > 0 ? pulled : [dest];
  return points.filter((point, index) => {
    if (index === points.length - 1) return true;
    return Math.hypot(point.x - fromX, point.y - fromY) > 18;
  });
}
