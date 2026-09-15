import { ITEMS, type ItemId } from "@/lib/data/items";

export const INVENTORY_SIZE = 20;

export type InventorySlot = {
  itemId: ItemId;
  qty: number;
};

export function emptyInventory(): InventorySlot[] {
  return [];
}

export function countItem(slots: InventorySlot[], itemId: ItemId): number {
  return slots.reduce((sum, slot) => (slot.itemId === itemId ? sum + slot.qty : sum), 0);
}

export function addItem(
  slots: InventorySlot[],
  itemId: ItemId,
  qty: number,
): InventorySlot[] | null {
  if (qty <= 0) return slots.map((slot) => ({ ...slot }));
  const def = ITEMS[itemId];
  const next = slots.map((slot) => ({ ...slot }));
  let remaining = qty;

  if (def.stackable) {
    for (const slot of next) {
      if (slot.itemId !== itemId) continue;
      const room = def.maxStack - slot.qty;
      if (room <= 0) continue;
      const take = Math.min(room, remaining);
      slot.qty += take;
      remaining -= take;
      if (remaining <= 0) return next;
    }
  }

  while (remaining > 0) {
    if (next.length >= INVENTORY_SIZE) return null;
    const take = def.stackable ? Math.min(def.maxStack, remaining) : 1;
    next.push({ itemId, qty: take });
    remaining -= take;
  }
  return next;
}

export function removeItem(
  slots: InventorySlot[],
  itemId: ItemId,
  qty: number,
): InventorySlot[] | null {
  if (qty <= 0) return slots.map((slot) => ({ ...slot }));
  if (countItem(slots, itemId) < qty) return null;
  let remaining = qty;
  const next: InventorySlot[] = [];
  for (const slot of slots) {
    if (slot.itemId !== itemId || remaining <= 0) {
      next.push({ ...slot });
      continue;
    }
    if (slot.qty > remaining) {
      next.push({ itemId, qty: slot.qty - remaining });
      remaining = 0;
    } else {
      remaining -= slot.qty;
    }
  }
  return next;
}
