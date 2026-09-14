import { BREN_PRICES, CROP_META, GROW_MS, type CropId } from "./types";

export { BREN_PRICES, CROP_META, GROW_MS };

export function isCropId(value: string): value is CropId {
  return value === "grain" || value === "root" || value === "herb";
}

export function growDuration(crop: CropId, farmSkill: number): number {
  const faster = Math.min(0.35, farmSkill * 0.02);
  return Math.round(GROW_MS[crop] * (1 - faster));
}

export function plotReady(plantedAt: number, crop: CropId, farmSkill: number, now: number): boolean {
  return now - plantedAt >= growDuration(crop, farmSkill);
}
