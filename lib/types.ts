export const CROP_IDS = ["grain", "root", "herb"] as const;
export type CropId = (typeof CROP_IDS)[number];
export const GOODS_IDS = ["grain", "root", "herb", "fish", "loaf"] as const;
export type GoodsId = (typeof GOODS_IDS)[number];
export type ClassId = "fighter" | "spiritual";
export type Scene = "hearth" | "valley";

export type Plot = {
  id: number;
  crop: CropId | null;
  plantedAt: number | null;
};

export type LogEntry = { at: number; text: string };

export type PlayerState = {
  id: string;
  name: string;
  classId: ClassId | null;
  scene: Scene;
  coins: number;
  farmSkill: number;
  fishSkill: number;
  cookSkill: number;
  harvests: number;
  wolves: number;
  xp: number;
  level: number;
  hasSword: boolean;
  strikeDamage: number;
  lastFishAt: number;
  seeds: Record<CropId, number>;
  basket: Record<GoodsId, number>;
  plots: Plot[];
  whisper: string;
  log: LogEntry[];
  walletAddress: string;
  enteredAt: number;
};

export const BREN_PRICES: Record<GoodsId, number> = {
  grain: 4,
  root: 5,
  herb: 6,
  fish: 5,
  loaf: 8,
};

export const GROW_MS: Record<CropId, number> = {
  grain: 4000,
  root: 6000,
  herb: 5000,
};

export const CROP_META: Record<CropId, { name: string; mark: string }> = {
  grain: { name: "Grain", mark: "🌾" },
  root: { name: "Root", mark: "🥕" },
  herb: { name: "Herb", mark: "🌿" },
};

export const GOODS_META: Record<GoodsId, { name: string; mark: string }> = {
  ...CROP_META,
  fish: { name: "Fish", mark: "🐟" },
  loaf: { name: "Loaf", mark: "🍞" },
};
