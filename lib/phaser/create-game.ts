import * as Phaser from "phaser";
import type { WorldBridge } from "./bridge";
import { BRIDGE_KEY } from "./bridge";
import { VIEW_HEIGHT, VIEW_WIDTH } from "./layout";
import { BootScene } from "./scenes/boot-scene";
import { HearthScene } from "./scenes/hearth-scene";
import { ValleyScene } from "./scenes/valley-scene";

export const GAME_WIDTH = VIEW_WIDTH;
export const GAME_HEIGHT = VIEW_HEIGHT;

export function createDragonWorld(parent: HTMLElement, bridge: WorldBridge): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: "#3d3228",
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
