import * as Phaser from "phaser";
import { TILE } from "./layout";

export function paintTiles(scene: Phaser.Scene, tiles: readonly string[]) {
  for (let row = 0; row < tiles.length; row++) {
    const line = tiles[row];
    for (let col = 0; col < line.length; col++) {
      const ch = line[col];
      const key = ch === "#" ? "tile-wall" : ch === "~" ? "tile-creek" : ch === "," ? "tile-grass" : "tile-floor";
      scene.add.image(col * TILE + TILE / 2, row * TILE + TILE / 2, key).setDepth(0);
    }
  }
}

export function label(scene: Phaser.Scene, x: number, y: number, text: string) {
  return scene.add
    .text(x, y, text, {
      fontFamily: "Georgia, serif",
      fontSize: "10px",
      color: "#2c241c",
    })
    .setOrigin(0.5, 1)
    .setDepth(4)
    .setResolution(2);
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
