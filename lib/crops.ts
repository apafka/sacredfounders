import { CROPS, cropStage, isCropId, type CropId, type CropStage } from "./data/crops";
import { BREN_PRICES, CROP_META, GOODS_META, GROW_MS, GOODS_IDS, type GoodsId } from "./types";

export { BREN_PRICES, CROP_META, GOODS_META, GROW_MS, isCropId };
export type { CropStage };

export function isGoodsId(value: string): value is GoodsId {
  return (GOODS_IDS as readonly string[]).includes(value);
}

export function growDuration(crop: CropId, _farmSkill = 0): number {
  return CROPS[crop].growthTime;
}

export function plotReady(plantedAt: number, crop: CropId, farmSkill: number, now: number): boolean {
  return now - plantedAt >= growDuration(crop, farmSkill);
}

export function plotStage(plantedAt: number, crop: CropId, now: number): CropStage {
  return cropStage(plantedAt, crop, now);
}
