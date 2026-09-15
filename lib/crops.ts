import { cropStage as cropStageFromDef } from "./data/crops";
import { BREN_PRICES, CROP_META, GOODS_META, GROW_MS, type CropId, type GoodsId } from "./types";
import { GOODS_IDS } from "./types";

export { BREN_PRICES, CROP_META, GOODS_META, GROW_MS };
export type { CropStage } from "./data/crops";

export function isCropId(value: string): value is CropId {
  return value === "grain" || value === "root" || value === "herb";
}

export function isGoodsId(value: string): value is GoodsId {
  return (GOODS_IDS as readonly string[]).includes(value);
}

export function growDuration(crop: CropId, _farmSkill = 0): number {
  return GROW_MS[crop];
}

export function plotReady(plantedAt: number, crop: CropId, farmSkill: number, now: number): boolean {
  return now - plantedAt >= growDuration(crop, farmSkill);
}

export function plotStage(plantedAt: number, crop: CropId, now: number) {
  if (crop !== "grain") {
    const ready = now - plantedAt >= GROW_MS[crop];
    if (ready) return "ready" as const;
    const t = (now - plantedAt) / GROW_MS[crop];
    if (t < 0.22) return "planted" as const;
    if (t < 0.55) return "sprout" as const;
    return "growing" as const;
  }
  return cropStageFromDef(plantedAt, "grain", now);
}
