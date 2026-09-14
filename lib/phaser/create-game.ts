import * as Phaser from "phaser";
import type { WorldBridge } from "./bridge";
import { BRIDGE_KEY } from "./bridge";
import { COLS, ROWS, TILE } from "./layout";
import { BootScene } from "./scenes/boot-scene";
import { HearthScene } from "./scenes/hearth-scene";
import { ValleyScene } from "./scenes/valley-scene";

export const GAME_WIDTH = COLS * TILE;
export const GAME_HEIGHT = ROWS * TILE;

export function createDragonWorld(parent: HTMLElement, bridge: WorldBridge): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: "#4a3f32",
    pixelArt: true,
    roundPixels: true,
    audio: { noAudio: true },
    banner: false,
    input: { activePointers: 1 },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
    },
    render: { antialias: false, pixelArt: true },
    scene: [BootScene, HearthScene, ValleyScene],
    callbacks: {
      preBoot(game) {
        game.registry.set(BRIDGE_KEY, bridge);
      },
    },
  });
}
