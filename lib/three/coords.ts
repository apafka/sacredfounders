import { TILE, worldCenter, type Spot } from "../phaser/layout";

/** 3D world uses 1 unit per tile so the sim can stay in Phaser pixel space. */
export function pxToWorld(x: number, y: number): { x: number; z: number } {
  return { x: x / TILE, z: y / TILE };
}

export function worldToPx(x: number, z: number): { x: number; y: number } {
  return { x: x * TILE, y: z * TILE };
}

export function tileToWorld(col: number, row: number): { x: number; z: number } {
  const c = worldCenter(col, row);
  return pxToWorld(c.x, c.y);
}

export function spotToWorld(spot: Spot): { x: number; z: number } {
  return tileToWorld(spot.col, spot.row);
}

export function clampDelta(dt: number, max = 0.05): number {
  if (!Number.isFinite(dt) || dt < 0) return 0;
  return Math.min(dt, max);
}
