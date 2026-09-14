/**
 * Placeholder textures are generated in BootScene (colored 16–32px tiles).
 *
 * Art-pack swap path
 * ------------------
 * 1. Drop PNGs in `public/game/art/` using the filenames below (32×32 tiles,
 *    16×20 pilgrim, 22×16 wolf — or any size; Phaser will display at TILE).
 * 2. Set `USE_ART_PACK = true`.
 * 3. BootScene will `load.image` these keys instead of drawing rectangles.
 *
 * Do not change the *keys* (left column) without updating the scenes.
 */
export const USE_ART_PACK = false;

export const ART_PACK_DIR = "/game/art";

/** Phaser texture key → file under public/game/art/ */
export const ART_PACK_FILES: Record<string, string> = {
  "tile-floor": "floor.png",
  "tile-wall": "wall.png",
  "tile-creek": "creek.png",
  "tile-grass": "grass.png",
  "tile-soil": "soil.png",
  "crop-grain-grow": "grain-grow.png",
  "crop-grain-ready": "grain-ready.png",
  "crop-root-grow": "root-grow.png",
  "crop-root-ready": "root-ready.png",
  "crop-herb-grow": "herb-grow.png",
  "crop-herb-ready": "herb-ready.png",
  "sprite-pilgrim": "pilgrim.png",
  "sprite-wolf": "wolf.png",
  "sprite-kitchen": "kitchen.png",
  "sprite-stall": "stall.png",
  "sprite-door": "door.png",
  "sprite-marker": "marker.png",
};

export const PLACEHOLDER_COLORS = {
  floor: 0xcbb892,
  floorEdge: 0xb39d74,
  wall: 0x6b5344,
  wallEdge: 0x4a3a30,
  creek: 0x6a8a8a,
  creekEdge: 0x557070,
  grass: 0x8a9a6a,
  grassEdge: 0x6f7d54,
  soil: 0x8a6a4a,
  grainGrow: 0x9a8a4a,
  grainReady: 0xc4a35a,
  rootGrow: 0x8a5a3a,
  rootReady: 0xa56b48,
  herbGrow: 0x5d6a42,
  herbReady: 0x6d7a4e,
  pilgrim: 0x2c241c,
  pilgrimHead: 0x8b5e3c,
  wolf: 0x5a4630,
  kitchen: 0x7a5a40,
  stall: 0x8b5e3c,
  door: 0x5a4030,
  marker: 0xe8d9b0,
} as const;
