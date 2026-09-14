import type { CropId, PlayerState } from "@/lib/types";

export type WorldEvent =
  | { type: "ready" }
  | { type: "fail"; error?: unknown }
  | { type: "hint"; text: string }
  | { type: "plant"; plotId: number }
  | { type: "harvest"; plotId: number }
  | { type: "fish" }
  | { type: "cook" }
  | { type: "open-market" }
  | { type: "door"; scene: "hearth" | "valley" }
  | { type: "wolf-loot"; kind?: "pack" | "elite" }
  | { type: "combat"; you: number; wolf: number; elite?: number; xp?: number; level?: number };

export type WorldBridge = {
  getPlayer: () => PlayerState;
  getSeed: () => CropId;
  isBusy: () => boolean;
  emit: (event: WorldEvent) => void;
};

export const BRIDGE_KEY = "bridge";

let strikeQueued = false;

export function queueValleyStrike() {
  strikeQueued = true;
}

export function pullValleyStrike() {
  if (!strikeQueued) return false;
  strikeQueued = false;
  return true;
}
