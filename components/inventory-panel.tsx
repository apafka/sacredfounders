"use client";

import { ITEMS } from "@/lib/data/items";
import { INVENTORY_SIZE } from "@/lib/game/inventory";
import type { PlayerState } from "@/lib/types";

export function InventoryPanel({
  player,
  onClose,
  onUsePotion,
  onEatBread,
}: {
  player: PlayerState;
  onClose: () => void;
  onUsePotion?: () => void;
  onEatBread?: () => void;
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
      <p className="mt-1 text-sm text-[var(--muted)]">
        I to toggle. Click bread to eat it, a potion to drink it. B eats, Q drinks.
      </p>
      <ul className="inv-grid mt-3">
        {slots.map((slot, i) => {
          const drink = slot?.itemId === "health_potion" && onUsePotion;
          const eat = slot?.itemId === "bread" && onEatBread;
          return (
            <li key={i} className="inv-slot">
              {slot ? (
                drink || eat ? (
                  <button type="button" className="inv-use" onClick={drink ? onUsePotion : onEatBread}>
                    <span>{ITEMS[slot.itemId].name}</span>
                    <em>
                      {slot.qty} · {drink ? "drink" : "eat"}
                    </em>
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
          );
        })}
      </ul>
    </div>
  );
}
