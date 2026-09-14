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
