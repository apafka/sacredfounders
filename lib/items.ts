import type { ItemId, TileKind } from "./types";
import { ITEM_IDS } from "./types";

export type ItemDef = {
  id: ItemId;
  name: string;
  mark: string;
  blurb: string;
};

export const ITEMS: Record<ItemId, ItemDef> = {
  "ember-scale": {
    id: "ember-scale",
    name: "Ember Scale",
    mark: "◈",
    blurb: "Warm plate shed by a sleeping dragon.",
  },
  moonpetal: {
    id: "moonpetal",
    name: "Moonpetal",
    mark: "❀",
    blurb: "Pale flower that opens only in shade.",
  },
  "river-clay": {
    id: "river-clay",
    name: "River Clay",
    mark: "◌",
    blurb: "Cool clay from the sanctuary stream.",
  },
  "spirit-thread": {
    id: "spirit-thread",
    name: "Spirit Thread",
    mark: "⌇",
    blurb: "Fine strand caught on river stones.",
  },
  ashwood: {
    id: "ashwood",
    name: "Ashwood",
    mark: "↟",
    blurb: "Light timber from the grove’s old trees.",
  },
  "temple-salt": {
    id: "temple-salt",
    name: "Temple Salt",
    mark: "✧",
    blurb: "Crystal salt from the shrine bowls.",
  },
  "dawn-ore": {
    id: "dawn-ore",
    name: "Dawn Ore",
    mark: "▣",
    blurb: "Copper-bright stone from the ember banks.",
  },
  "whisper-bone": {
    id: "whisper-bone",
    name: "Whisper Bone",
    mark: "☽",
    blurb: "A hollow bone that hums if you listen.",
  },
  "honey-wax": {
    id: "honey-wax",
    name: "Honey Wax",
    mark: "●",
    blurb: "Gold wax from the hollow’s wild hives.",
  },
  "rune-ink": {
    id: "rune-ink",
    name: "Rune Ink",
    mark: "✒",
    blurb: "Temple-made ink: moonpetal crushed with ember scale.",
  },
};

export const ITEM_LIST = ITEM_IDS.map((id) => ITEMS[id]);

export const ITEM_TYPE_INDEX: Record<ItemId, number> = {
  "ember-scale": 1,
  moonpetal: 2,
  "river-clay": 3,
  "spirit-thread": 4,
  ashwood: 5,
  "temple-salt": 6,
  "dawn-ore": 7,
  "whisper-bone": 8,
  "honey-wax": 9,
  "rune-ink": 10,
};

export const EMPTY_INVENTORY = Object.fromEntries(
  ITEM_IDS.map((id) => [id, 0]),
) as Record<ItemId, number>;

export const TILE_DROPS: Partial<Record<TileKind, { primary: ItemId; secondary: ItemId }>> = {
  grove: { primary: "moonpetal", secondary: "ashwood" },
  river: { primary: "river-clay", secondary: "spirit-thread" },
  ember: { primary: "ember-scale", secondary: "dawn-ore" },
  shrine: { primary: "temple-salt", secondary: "spirit-thread" },
  hollow: { primary: "honey-wax", secondary: "whisper-bone" },
};

export function isItemId(value: string): value is ItemId {
  return (ITEM_IDS as readonly string[]).includes(value);
}
