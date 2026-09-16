"use client";

import { ITEMS } from "@/lib/data/items";
import { INVENTORY_SIZE } from "@/lib/game/inventory";
import type { PlayerState } from "@/lib/types";

export function InventoryPanel({
  player,
  onClose,
  onUsePotion,
}: {
  player: PlayerState;
  onClose: () => void;
  onUsePotion?: () => void;
}) {
  const slots = Array.from({ length: INVENTORY_SIZE }, (_, i) => player.inventory[i] ?? null);

  return (
    <div className="hud-panel" role="dialog" aria-label="Inventory">
      <div className="flex items-center justify-between gap-3">
        <h2>Pack</h2>
        <button className="btn-tiny" type="button" onClick={onClose}>
          Close
        </button>
      </div>
      <p className="mt-1 text-sm text-[var(--muted)]">I to toggle. Click a potion to drink it. Q also drinks.</p>
      <ul className="inv-grid mt-3">
        {slots.map((slot, i) => (
          <li key={i} className="inv-slot">
            {slot ? (
              slot.itemId === "health_potion" && onUsePotion ? (
                <button type="button" className="inv-use" onClick={onUsePotion}>
                  <span>{ITEMS[slot.itemId].name}</span>
                  <em>{slot.qty} · drink</em>
                </button>
              ) : (
                <>
                  <span>{ITEMS[slot.itemId].name}</span>
                  <em>{slot.qty}</em>
                </>
              )
            ) : (
              <span className="text-[var(--muted)]">—</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
