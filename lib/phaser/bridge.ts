import type { CropId, PlayerState } from "@/lib/types";

export type WorldEvent =
  | { type: "ready" }
  | { type: "fail"; error?: unknown }
  | { type: "hint"; text: string }
  | { type: "toast"; text: string }
  | { type: "plant"; plotId: number }
  | { type: "harvest"; plotId: number }
  | { type: "talk-bren" }
  | { type: "door"; scene: "hearth" | "valley" }
  | { type: "wolf-down" }
  | { type: "pickup-pelt" }
  | { type: "combat"; you: number }
  | { type: "health"; health: number }
  | { type: "position"; x: number; y: number }
  | { type: "inventory" };

export type WorldBridge = {
  getPlayer: () => PlayerState;
  getSeed: () => CropId;
  isBusy: () => boolean;
  emit: (event: WorldEvent) => void;
};

export const BRIDGE_KEY = "bridge";
