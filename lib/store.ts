import { emptyWorld } from "./engine";
import type { WorldState } from "./types";

const globalStore = globalThis as typeof globalThis & {
  __sfWorld?: WorldState;
};

export function getWorld(): WorldState {
  if (!globalStore.__sfWorld) {
    globalStore.__sfWorld = emptyWorld();
  }
  return globalStore.__sfWorld;
}

export function setWorld(world: WorldState): void {
  globalStore.__sfWorld = world;
}
