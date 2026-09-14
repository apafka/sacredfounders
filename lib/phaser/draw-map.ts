import * as Phaser from "phaser";
import { TILE, TILE_INDEX, tilesToData } from "./layout";

export function createGround(scene: Phaser.Scene, tiles: readonly string[]) {
  const map = scene.make.tilemap({
    data: tilesToData(tiles),
    tileWidth: TILE,
    tileHeight: TILE,
  });
  const tileset = map.addTilesetImage("world-tiles", "world-tiles", TILE, TILE);
  if (!tileset) {
    throw new Error("world-tiles tileset missing");
  }
  const layer = map.createLayer(0, tileset, 0, 0);
  if (!layer) {
    throw new Error("ground layer missing");
  }
  layer.setDepth(0);
  layer.setCollision(TILE_INDEX.wall);
  return { map, layer };
}

export function label(scene: Phaser.Scene, x: number, y: number, text: string) {
  return scene.add
    .text(x, y, text, {
      fontFamily: "Georgia, serif",
      fontSize: "12px",
      color: "#2c241c",
      backgroundColor: "#f3efe4",
      padding: { x: 4, y: 2 },
    })
    .setOrigin(0.5, 1)
    .setDepth(4)
    .setResolution(2);
}

export function paintHpBar(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  ratio: number,
  width = 28,
) {
  const r = Math.max(0, Math.min(1, ratio));
  g.clear();
  g.fillStyle(0x2c241c, 0.85);
  g.fillRect(x - width / 2, y, width, 5);
  g.fillStyle(r > 0.34 ? 0x6d7a4e : 0xb33a2b, 1);
  g.fillRect(x - width / 2 + 1, y + 1, Math.max(0, (width - 2) * r), 3);
}

export function bindClickToMove(
  scene: Phaser.Scene,
  onWorldTap: (x: number, y: number) => void,
) {
  scene.input.on("pointerup", (pointer: Phaser.Input.Pointer) => {
    if (pointer.getDuration() > 600) return;
    const { worldX, worldY } = pointer;
    onWorldTap(worldX, worldY);
  });
}
