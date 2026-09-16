import type { ItemId } from "./items";

export const CROP_IDS = ["grain"] as const;
export type CropId = (typeof CROP_IDS)[number];

export type CropStage = "empty" | "planted" | "sprout" | "growing" | "ready";

export type CropDefinition = {
  id: CropId;
  name: string;
  /** Development growth time. V1 is 30–60s, not realistic seasons. */
  growthTime: number;
  seedItem: ItemId;
  harvestItem: ItemId;
  harvestAmount: number;
  /** Seeds returned with the sheaf so the garden can feed Bren again. */
  seedReturn: number;
  xp: number;
  stages: { at: number; stage: Exclude<CropStage, "empty" | "ready"> }[];
};

export const CROPS: Record<CropId, CropDefinition> = {
  grain: {
    id: "grain",
    name: "Wheat",
    growthTime: 45_000,
    seedItem: "wheat_seed",
    harvestItem: "wheat",
    harvestAmount: 1,
    seedReturn: 1,
    xp: 18,
    stages: [
      { at: 0, stage: "planted" },
      { at: 0.22, stage: "sprout" },
      { at: 0.55, stage: "growing" },
    ],
  },
};

export function cropStage(plantedAt: number, crop: CropId, now: number): CropStage {
  const def = CROPS[crop];
  const t = (now - plantedAt) / def.growthTime;
  if (t >= 1) return "ready";
  let stage: CropStage = "planted";
  for (const step of def.stages) {
    if (t >= step.at) stage = step.stage;
  }
  return stage;
}
