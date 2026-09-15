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

/**
 * Click-to-move is a straight slide. The cottage walls block garden ↔ interior,
 * so route through the north/south path mouths when a direct line is blocked.
 */
export function hearthRoute(fromX: number, fromY: number, toX: number, toY: number): Point[] {
  const dest = { x: toX, y: toY };
  if (!lineBlocked(HEARTH_TILES, fromX, fromY, toX, toY)) return [dest];
  const from = tileFromWorld(fromX, fromY);
  const to = tileFromWorld(toX, toY);
  const hall = worldCenter(10, 8);
  const north = worldCenter(10, 5);
  const south = worldCenter(10, 11);
  const fromGarden = from.row <= 5;
  const toGarden = to.row <= 5;
  const fromYard = from.row >= 11;
  const toYard = to.row >= 11;
  let points: Point[] = [dest];
  if (fromGarden && toGarden) points = [dest];
  else if (fromYard && toYard) points = [dest];
  else if (toGarden) points = [hall, north, dest];
  else if (fromGarden) points = [north, hall, dest];
  else if (toYard) points = [hall, south, dest];
  else if (fromYard) points = [south, hall, dest];
  return points.filter((point, index) => {
    if (index === points.length - 1) return true;
    return Math.hypot(point.x - fromX, point.y - fromY) > 18;
  });
}
