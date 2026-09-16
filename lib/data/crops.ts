import type { ItemId } from "./items";

export const CROP_IDS = ["grain", "root", "herb"] as const;
export type CropId = (typeof CROP_IDS)[number];

export type CropStage = "empty" | "planted" | "sprout" | "growing" | "ready";

export type CropDefinition = {
  id: CropId;
  name: string;
  mark: string;
  /** Development growth time. V1 is 30–60s, not realistic seasons. */
  growthTime: number;
  seedItem: ItemId;
  harvestItem: ItemId;
  harvestAmount: number;
  /** Seeds returned with the crop so the garden stays sustainable. */
  seedReturn: number;
  xp: number;
  stages: { at: number; stage: Exclude<CropStage, "empty" | "ready"> }[];
};

export const CROPS: Record<CropId, CropDefinition> = {
  grain: {
    id: "grain",
    name: "Wheat",
    mark: "W",
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
  root: {
    id: "root",
    name: "Root",
    mark: "R",
    growthTime: 50_000,
    seedItem: "root_seed",
    harvestItem: "root",
    harvestAmount: 1,
    seedReturn: 1,
    xp: 16,
    stages: [
      { at: 0, stage: "planted" },
      { at: 0.22, stage: "sprout" },
      { at: 0.55, stage: "growing" },
    ],
  },
  herb: {
    id: "herb",
    name: "Herb",
    mark: "H",
    growthTime: 40_000,
    seedItem: "herb_seed",
    harvestItem: "herb",
    harvestAmount: 1,
    seedReturn: 1,
    xp: 20,
    stages: [
      { at: 0, stage: "planted" },
      { at: 0.22, stage: "sprout" },
      { at: 0.55, stage: "growing" },
    ],
  },
};

export const GROW_MS: Record<CropId, number> = {
  grain: CROPS.grain.growthTime,
  root: CROPS.root.growthTime,
  herb: CROPS.herb.growthTime,
};

export const CROP_META: Record<CropId, { name: string; mark: string }> = {
  grain: { name: CROPS.grain.name, mark: CROPS.grain.mark },
  root: { name: CROPS.root.name, mark: CROPS.root.mark },
  herb: { name: CROPS.herb.name, mark: CROPS.herb.mark },
};

export function isCropId(value: string): value is CropId {
  return value === "grain" || value === "root" || value === "herb";
}

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
