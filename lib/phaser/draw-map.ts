import * as Phaser from "phaser";
import { CAMERA_ZOOM, TILE, TILE_INDEX, VIEW_HEIGHT, VIEW_WIDTH, tilesToData } from "./layout";

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

export function followActor(scene: Phaser.Scene, target: Phaser.GameObjects.Image, map: readonly string[]) {
  const cam = scene.cameras.main;
  cam.setBounds(0, 0, (map[0]?.length ?? 0) * TILE, map.length * TILE);
  cam.setZoom(CAMERA_ZOOM);
  cam.startFollow(target, true, 0.14, 0.14);
  // Wide deadzone so cottage + garden stay on screen while walking the hearth.
  cam.setDeadzone(Math.floor(VIEW_WIDTH * 0.28), Math.floor(VIEW_HEIGHT * 0.22));
  cam.setRoundPixels(true);
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

export function readAxis(keys?: Record<string, Phaser.Input.Keyboard.Key> | null): { x: number; y: number } {
  if (!keys) return { x: 0, y: 0 };
  let x = 0;
  let y = 0;
  if (keys.A?.isDown || keys.LEFT?.isDown) x -= 1;
  if (keys.D?.isDown || keys.RIGHT?.isDown) x += 1;
  if (keys.W?.isDown || keys.UP?.isDown) y -= 1;
  if (keys.S?.isDown || keys.DOWN?.isDown) y += 1;
  return { x, y };
}

export function bindWalkKeys(scene: Phaser.Scene) {
  return scene.input.keyboard?.addKeys("W,A,S,D,UP,DOWN,LEFT,RIGHT,E") as
    | Record<string, Phaser.Input.Keyboard.Key>
    | undefined;
}

export function floatText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  color = "#f3efe4",
) {
  const labelText = scene.add
    .text(x, y, text, {
      fontFamily: "Georgia, serif",
      fontSize: "13px",
      color,
      stroke: "#2c241c",
      strokeThickness: 3,
    })
    .setOrigin(0.5)
    .setDepth(30)
    .setResolution(2);
  scene.tweens.add({
    targets: labelText,
    y: y - 26,
    alpha: 0,
    duration: 700,
    ease: "Quad.easeOut",
    onComplete: () => labelText.destroy(),
  });
}

export function burst(scene: Phaser.Scene, x: number, y: number, color: number) {
  const g = scene.add.graphics().setDepth(18).setPosition(x, y);
  g.fillStyle(color, 0.9);
  g.fillCircle(0, 0, 5);
  scene.tweens.add({
    targets: g,
    scale: 2.4,
    alpha: 0,
    duration: 280,
    onComplete: () => g.destroy(),
  });
}
