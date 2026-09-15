/**
 * Placeholder textures are generated in BootScene (colored tiles).
 *
 * Art-pack swap path
 * ------------------
 * 1. Drop PNGs in `public/game/art/` using the filenames below.
 * 2. Ground tiles are stitched into the Phaser tileset `world-tiles` in TILESET_KEYS order.
 * 3. Set `USE_ART_PACK = true`.
 * 4. Do not change texture keys without updating the scenes.
 */
export const USE_ART_PACK = false;

export const ART_PACK_DIR = "/game/art";

export const ART_PACK_FILES: Record<string, string> = {
  "tile-grass": "grass.png",
  "tile-path": "path.png",
  "tile-floor": "floor.png",
  "tile-creek": "creek.png",
  "tile-wall": "wall.png",
  "tile-door": "door-tile.png",
  "tile-forest": "forest.png",
  "tile-soil": "soil.png",
  "crop-grain-planted": "grain-planted.png",
  "crop-grain-sprout": "grain-sprout.png",
  "crop-grain-grow": "grain-grow.png",
  "crop-grain-ready": "grain-ready.png",
  "sprite-pilgrim": "pilgrim.png",
  "sprite-wolf": "wolf.png",
  "sprite-bren": "bren.png",
  "sprite-bed": "bed.png",
  "sprite-fire": "fire.png",
  "sprite-chest": "chest.png",
  "sprite-bench": "bench.png",
  "sprite-door": "door.png",
  "sprite-tree": "tree.png",
  "sprite-tracks": "tracks.png",
  "sprite-scale": "scale.png",
  "sprite-carving": "carving.png",
  "sprite-pelt": "pelt.png",
  "sprite-marker": "marker.png",
};

export const PLACEHOLDER_COLORS = {
  floor: 0xcbb892,
  floorEdge: 0xb39d74,
  path: 0xd4c4a0,
  pathEdge: 0xb8a47a,
  wall: 0x6b5344,
  wallEdge: 0x4a3a30,
  creek: 0x6a8a8a,
  creekEdge: 0x557070,
  grass: 0x8a9a6a,
  grassEdge: 0x6f7d54,
  forest: 0x4f5d3e,
  forestEdge: 0x3a452e,
  doorTile: 0x6a4a38,
  doorTileEdge: 0x3d2a1c,
  soil: 0x8a6a4a,
  grainPlanted: 0x6b5344,
  grainSprout: 0x7a8a4a,
  grainGrow: 0x9a8a4a,
  grainReady: 0xc4a35a,
  pilgrim: 0x3e4a5c,
  pilgrimHead: 0xc4a07a,
  wolf: 0x5a4630,
  door: 0x5a4030,
  marker: 0xe8d9b0,
} as const;
