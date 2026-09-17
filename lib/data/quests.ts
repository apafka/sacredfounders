import type { ItemId } from "./items";

/**
 * Starter quest (lite). Old Bren wants two wolf pelts from the valley pack.
 *
 * Reward: 12 gold + 40 Attack XP. Persist via PlayerState.quest.
 */
export const QUEST_ID = "two-pelts" as const;
export type QuestId = typeof QUEST_ID;

export type QuestStatus = "available" | "active" | "complete";

export type QuestSave = {
  id: QuestId;
  status: QuestStatus;
  delivered: number;
  completedAt: number | null;
};

export const QUEST_PELTS_NEEDED = 2;
export const QUEST_REWARD_GOLD = 12;
export const QUEST_REWARD_ATTACK_XP = 40;
export const QUEST_ITEM: ItemId = "wolf_pelt";

export const TWO_PELTS = {
  id: QUEST_ID,
  title: "Two Pelts for Bren",
  itemId: QUEST_ITEM,
  need: QUEST_PELTS_NEEDED,
  gold: QUEST_REWARD_GOLD,
  attackXp: QUEST_REWARD_ATTACK_XP,
  offer: "The woods took my last coats. Bring me two wolf pelts and I'll see you paid like a neighbor.",
  active: "Two wolf pelts. The pack on the path will do — don't need the big one.",
  ready: "Those pelts will make a coat. Hand them here.",
  thanks: "Two pelts. That's a coat started. Don't spend it all staring at the trees.",
} as const;

export function openingQuest(): QuestSave {
  return { id: QUEST_ID, status: "available", delivered: 0, completedAt: null };
}

export function hydrateQuest(raw?: QuestSave | null): QuestSave {
  if (!raw || raw.id !== QUEST_ID) return openingQuest();
  const status: QuestStatus =
    raw.status === "active" || raw.status === "complete" || raw.status === "available" ? raw.status : "available";
  return {
    id: QUEST_ID,
    status,
    delivered: Math.max(0, raw.delivered ?? 0),
    completedAt: raw.completedAt ?? null,
  };
}
