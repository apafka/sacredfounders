import * as Phaser from "phaser";
import { ART_PACK_DIR, ART_PACK_FILES, PLACEHOLDER_COLORS as C, USE_ART_PACK } from "../art";
import { BRIDGE_KEY, type WorldBridge } from "../bridge";
import { TILE } from "../layout";

function gfx(scene: Phaser.Scene): Phaser.GameObjects.Graphics {
  return new Phaser.GameObjects.Graphics(scene);
}

function tile(scene: Phaser.Scene, key: string, fill: number, edge: number) {
  const g = gfx(scene);
  g.fillStyle(fill, 1);
  g.fillRect(0, 0, TILE, TILE);
  g.lineStyle(1, edge, 0.9);
  g.strokeRect(1, 1, TILE - 2, TILE - 2);
  g.fillStyle(edge, 0.18);
  g.fillRect(TILE - 6, TILE - 6, 5, 5);
  g.generateTexture(key, TILE, TILE);
  g.destroy();
}

function crop(scene: Phaser.Scene, key: string, fill: number, tall: boolean) {
  const g = gfx(scene);
  const h = tall ? 22 : 12;
  const y = TILE - 4 - h;
  g.fillStyle(0x6b5344, 1);
  g.fillRect(10, TILE - 8, 12, 6);
  g.fillStyle(fill, 1);
  g.fillRect(8, y, 16, h);
  g.generateTexture(key, TILE, TILE);
  g.destroy();
}

function pilgrim(scene: Phaser.Scene) {
  const g = gfx(scene);
  g.fillStyle(C.pilgrim, 1);
  g.fillRect(3, 8, 10, 12);
  g.fillStyle(C.pilgrimHead, 1);
  g.fillRect(4, 2, 8, 8);
  g.generateTexture("sprite-pilgrim", 16, 20);
  g.destroy();
}

function wolf(scene: Phaser.Scene) {
  const g = gfx(scene);
  g.fillStyle(0x3d2a1c, 1);
  g.fillRect(4, 8, 22, 12);
  g.fillRect(0, 10, 8, 8);
  g.fillRect(22, 2, 8, 10);
  g.fillStyle(0x8a6a4a, 1);
  g.fillRect(6, 10, 6, 4);
  g.generateTexture("sprite-wolf", 30, 22);
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

export function makePlaceholderTextures(scene: Phaser.Scene) {
  tile(scene, "tile-floor", C.floor, C.floorEdge);
  tile(scene, "tile-wall", C.wall, C.wallEdge);
  tile(scene, "tile-creek", C.creek, C.creekEdge);
  tile(scene, "tile-grass", C.grass, C.grassEdge);
  tile(scene, "tile-soil", C.soil, C.floorEdge);
  crop(scene, "crop-grain-grow", C.grainGrow, false);
  crop(scene, "crop-grain-ready", C.grainReady, true);
  crop(scene, "crop-root-grow", C.rootGrow, false);
  crop(scene, "crop-root-ready", C.rootReady, true);
  crop(scene, "crop-herb-grow", C.herbGrow, false);
  crop(scene, "crop-herb-ready", C.herbReady, true);
  pilgrim(scene);
  wolf(scene);
  prop(scene, "sprite-kitchen", 40, 24, C.kitchen, (g) => {
    g.fillStyle(0x3d3428, 1);
    g.fillRect(8, 4, 24, 8);
  });
  prop(scene, "sprite-stall", 40, 28, C.stall, (g) => {
    g.fillStyle(0xcbb892, 1);
    g.fillRect(4, 14, 32, 10);
  });
  prop(scene, "sprite-door", 24, 32, C.door, (g) => {
    g.fillStyle(0xc4a35a, 1);
    g.fillRect(16, 14, 4, 4);
  });
  const marker = gfx(scene);
  marker.fillStyle(C.marker, 0.85);
  marker.fillCircle(6, 6, 5);
  marker.generateTexture("sprite-marker", 12, 12);
  marker.destroy();
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
