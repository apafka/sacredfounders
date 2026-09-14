import { isWalkable, tileAt, tileFromWorld } from "./layout";

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
