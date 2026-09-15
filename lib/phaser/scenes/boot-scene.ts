import * as Phaser from "phaser";
import { ART_PACK_DIR, ART_PACK_FILES, PLACEHOLDER_COLORS as C, USE_ART_PACK } from "../art";
import { BRIDGE_KEY, type WorldBridge } from "../bridge";
import { TILE, TILESET_KEYS } from "../layout";

function gfx(scene: Phaser.Scene): Phaser.GameObjects.Graphics {
  return new Phaser.GameObjects.Graphics(scene);
}

function tile(scene: Phaser.Scene, key: string, fill: number, edge: number, paint?: (g: Phaser.GameObjects.Graphics) => void) {
  const g = gfx(scene);
  g.fillStyle(fill, 1);
  g.fillRect(0, 0, TILE, TILE);
  g.lineStyle(1, edge, 0.9);
  g.strokeRect(1, 1, TILE - 2, TILE - 2);
  paint?.(g);
  g.generateTexture(key, TILE, TILE);
  g.destroy();
}

function crop(scene: Phaser.Scene, key: string, fill: number, h: number) {
  const g = gfx(scene);
  const y = TILE - 4 - h;
  g.fillStyle(0x6b5344, 1);
  g.fillRect(10, TILE - 8, 12, 6);
  g.fillStyle(fill, 1);
  g.fillRect(11, y, 10, h);
  if (h > 14) {
    g.fillStyle(0xd4c46a, 1);
    g.fillRect(9, y - 2, 4, 4);
    g.fillRect(19, y, 4, 4);
  }
  g.generateTexture(key, TILE, TILE);
  g.destroy();
}

function person(scene: Phaser.Scene, key: string, body: number, head: number, extra?: (g: Phaser.GameObjects.Graphics) => void) {
  const g = gfx(scene);
  g.fillStyle(body, 1);
  g.fillRect(6, 14, 16, 18);
  g.fillStyle(head, 1);
  g.fillRect(8, 4, 12, 12);
  extra?.(g);
  g.generateTexture(key, 28, 32);
  g.destroy();
}

function prop(scene: Phaser.Scene, key: string, w: number, h: number, fill: number, extra?: (g: Phaser.GameObjects.Graphics) => void) {
  const g = gfx(scene);
  g.fillStyle(fill, 1);
  g.fillRect(0, 0, w, h);
  g.lineStyle(1, 0x2c241c, 0.45);
  g.strokeRect(0.5, 0.5, w - 1, h - 1);
  extra?.(g);
  g.generateTexture(key, w, h);
  g.destroy();
}

function worldTilesetStrip(scene: Phaser.Scene) {
  const g = gfx(scene);
  const swatches: Record<(typeof TILESET_KEYS)[number], [number, number]> = {
    "tile-grass": [C.grass, C.grassEdge],
    "tile-path": [C.path, C.pathEdge],
    "tile-floor": [C.floor, C.floorEdge],
    "tile-creek": [C.creek, C.creekEdge],
    "tile-wall": [C.wall, C.wallEdge],
    "tile-door": [C.doorTile, C.doorTileEdge],
    "tile-forest": [C.forest, C.forestEdge],
  };
  TILESET_KEYS.forEach((key, i) => {
    const [fill, edge] = swatches[key];
    const x = i * TILE;
    g.fillStyle(fill, 1);
    g.fillRect(x, 0, TILE, TILE);
    g.lineStyle(1, edge, 0.9);
    g.strokeRect(x + 1, 1, TILE - 2, TILE - 2);
    if (key === "tile-path") {
      g.fillStyle(0xe8dcc0, 0.45);
      g.fillRect(x + 6, 12, TILE - 12, 8);
    }
    if (key === "tile-door") {
      g.fillStyle(0xc4a35a, 1);
      g.fillRect(x + 20, 14, 5, 5);
    }
    if (key === "tile-forest") {
      g.fillStyle(0x2c241c, 0.22);
      g.fillRect(x + 8, 6, 6, 18);
    }
    if (key === "tile-grass") {
      g.fillStyle(0xb39d74, 0.35);
      g.fillRect(x + 7, 18, 3, 3);
      g.fillRect(x + 18, 9, 2, 2);
    }
  });
  g.generateTexture("world-tiles", TILE * TILESET_KEYS.length, TILE);
  g.destroy();
}

export function composeWorldTileset(scene: Phaser.Scene) {
  if (scene.textures.exists("world-tiles")) return;
  const rt = scene.make.renderTexture({ width: TILE * TILESET_KEYS.length, height: TILE }, false);
  TILESET_KEYS.forEach((key, i) => {
    if (scene.textures.exists(key)) rt.draw(key, i * TILE, 0);
  });
  rt.saveTexture("world-tiles");
  rt.destroy();
}

export function makePlaceholderTextures(scene: Phaser.Scene) {
  tile(scene, "tile-grass", C.grass, C.grassEdge, (g) => {
    g.fillStyle(0xb39d74, 0.35);
    g.fillRect(7, 18, 3, 3);
    g.fillRect(18, 9, 2, 2);
  });
  tile(scene, "tile-path", C.path, C.pathEdge, (g) => {
    g.fillStyle(0xe8dcc0, 0.45);
    g.fillRect(6, 12, TILE - 12, 8);
  });
  tile(scene, "tile-floor", C.floor, C.floorEdge, (g) => {
    g.fillStyle(0x8b4b32, 0.12);
    g.fillRect(4, 4, 8, 8);
  });
  tile(scene, "tile-creek", C.creek, C.creekEdge);
  tile(scene, "tile-wall", C.wall, C.wallEdge);
  tile(scene, "tile-door", C.doorTile, C.doorTileEdge, (g) => {
    g.fillStyle(0xc4a35a, 1);
    g.fillRect(20, 14, 5, 5);
  });
  tile(scene, "tile-forest", C.forest, C.forestEdge, (g) => {
    g.fillStyle(0x2c241c, 0.28);
    g.fillRect(10, 4, 8, 22);
  });
  tile(scene, "tile-soil", C.soil, C.floorEdge);

  const planted = gfx(scene);
  planted.fillStyle(0x6b5344, 1);
  planted.fillRect(8, 18, 16, 10);
  planted.fillStyle(C.grainPlanted, 1);
  planted.fillRect(12, 10, 8, 12);
  planted.fillStyle(0x9aaa6a, 1);
  planted.fillRect(14, 6, 4, 6);
  planted.generateTexture("crop-grain-planted", TILE, TILE);
  planted.destroy();

  crop(scene, "crop-grain-sprout", C.grainSprout, 10);
  crop(scene, "crop-grain-grow", C.grainGrow, 16);
  crop(scene, "crop-grain-ready", C.grainReady, 22);

  person(scene, "sprite-pilgrim", C.pilgrim, C.pilgrimHead);
  person(scene, "sprite-bren", 0x6a3a28, 0xc4a07a, (g) => {
    g.fillStyle(0xf3efe4, 1);
    g.fillRect(4, 18, 20, 10);
  });

  const wolf = gfx(scene);
  wolf.fillStyle(0x3d2a1c, 1);
  wolf.fillRect(6, 12, 28, 16);
  wolf.fillRect(0, 14, 10, 10);
  wolf.fillRect(28, 4, 10, 14);
  wolf.fillStyle(0x8a6a4a, 1);
  wolf.fillRect(10, 14, 8, 5);
  wolf.fillStyle(0xd7cfc0, 0.9);
  wolf.fillRect(3, 16, 4, 3);
  wolf.generateTexture("sprite-wolf", 40, 28);
  wolf.destroy();

  prop(scene, "sprite-bed", 28, 16, 0x7a4a38, (g) => {
    g.fillStyle(0xd7cfc0, 1);
    g.fillRect(2, 2, 16, 12);
  });
  prop(scene, "sprite-fire", 22, 26, 0x4a3228, (g) => {
    g.fillStyle(0xc45a28, 1);
    g.fillRect(6, 6, 10, 14);
    g.fillStyle(0xe8c46a, 1);
    g.fillRect(8, 10, 6, 8);
  });
  prop(scene, "sprite-chest", 22, 16, 0x6a4a30, (g) => {
    g.fillStyle(0xc4a35a, 1);
    g.fillRect(9, 6, 4, 4);
  });
  prop(scene, "sprite-bench", 28, 16, 0x7a5a40, (g) => {
    g.fillStyle(0x3d3428, 1);
    g.fillRect(4, 4, 20, 5);
  });
  prop(scene, "sprite-door", 24, 32, C.door, (g) => {
    g.fillStyle(0xc4a35a, 1);
    g.fillRect(16, 14, 4, 4);
  });
  prop(scene, "sprite-tree", 18, 28, 0x2c3a22, (g) => {
    g.fillStyle(0x4a3228, 1);
    g.fillRect(7, 20, 4, 8);
  });
  prop(scene, "sprite-tracks", 36, 16, 0x000000, (g) => {
    g.clear();
    g.fillStyle(0x3d2a1c, 0.55);
    g.fillEllipse(10, 8, 14, 8);
    g.fillEllipse(26, 9, 16, 9);
  });
  prop(scene, "sprite-scale", 12, 10, 0xb8c4c0, (g) => {
    g.fillStyle(0xdfe8e4, 1);
    g.fillRect(2, 2, 8, 6);
  });
  prop(scene, "sprite-carving", 18, 16, 0x6b5344, (g) => {
    g.lineStyle(1, 0xcbb892, 1);
    g.strokeCircle(9, 8, 5);
  });
  prop(scene, "sprite-pelt", 20, 12, 0x5a3a28, (g) => {
    g.fillStyle(0x8a6a4a, 1);
    g.fillRect(3, 3, 14, 6);
  });

  const marker = gfx(scene);
  marker.fillStyle(C.marker, 0.85);
  marker.fillCircle(6, 6, 5);
  marker.generateTexture("sprite-marker", 12, 12);
  marker.destroy();
  worldTilesetStrip(scene);
}

export class BootScene extends Phaser.Scene {
  constructor() {
    super("boot");
  }

  preload() {
    if (!USE_ART_PACK) return;
    for (const [key, file] of Object.entries(ART_PACK_FILES)) {
      this.load.image(key, `${ART_PACK_DIR}/${file}`);
    }
  }

  create() {
    try {
      if (!USE_ART_PACK) makePlaceholderTextures(this);
      else composeWorldTileset(this);
      const bridge = this.registry.get(BRIDGE_KEY) as WorldBridge;
      const scene = bridge.getPlayer().scene === "valley" ? "valley" : "hearth";
      bridge.emit({ type: "ready" });
      this.scene.start(scene);
    } catch (error) {
      const bridge = this.registry.get(BRIDGE_KEY) as WorldBridge | undefined;
      bridge?.emit({ type: "fail", error });
    }
  }
}
