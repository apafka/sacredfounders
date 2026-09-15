/** Classic orthographic isometric: equal X/Z, slightly elevated Y. */
export const ISO_OFFSET = { x: 1, y: 1.18, z: 1 } as const;
export const ISO_DISTANCE = 34;
/**
 * Vertical world units (tiles) visible in the 576px-tall view.
 * 18 tiles tall × ~28 tiles wide matches the zoomed-out Phaser viewport.
 */
export const ISO_VIEW_HEIGHT = 18;

export function isoZoomForViewport(heightPx: number, viewHeight = ISO_VIEW_HEIGHT): number {
  if (heightPx <= 0) return 32;
  return heightPx / viewHeight;
}

export function isoCameraPosition(
  targetX: number,
  targetZ: number,
  distance = ISO_DISTANCE,
): { x: number; y: number; z: number } {
  const len = Math.hypot(ISO_OFFSET.x, ISO_OFFSET.y, ISO_OFFSET.z) || 1;
  return {
    x: targetX + (ISO_OFFSET.x / len) * distance,
    y: (ISO_OFFSET.y / len) * distance,
    z: targetZ + (ISO_OFFSET.z / len) * distance,
  };
}

export type WorldRenderer = "iso" | "phaser";

export function preferredRenderer(
  search = typeof window === "undefined" ? "" : window.location.search,
): WorldRenderer {
  const view = new URLSearchParams(search).get("view");
  if (view === "phaser") return "phaser";
  return "iso";
}
