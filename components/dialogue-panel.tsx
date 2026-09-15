"use client";

import { BREN } from "@/lib/data/npcs";
import { countItem } from "@/lib/game/inventory";
import { brenBrain } from "@/lib/game/npc";
import type { PlayerState } from "@/lib/types";

export function DialoguePanel({
  player,
  onSell,
  onClose,
}: {
  player: PlayerState;
  onSell: () => void;
  onClose: () => void;
}) {
  const wheat = countItem(player.inventory, "wheat");
  const intent = brenBrain.decide({ cropCount: wheat });
  const gold = wheat * BREN.buyPrice;

  return (
    <div className="hud-panel" role="dialog" aria-label="Old Bren">
      <p className="eyebrow">{BREN.title}</p>
      <h2>{BREN.name}</h2>
      <p className="mt-2 text-[1.02rem] leading-relaxed">{BREN.greet}</p>
      <p className="mt-2 text-sm text-[var(--muted)]">{intent.line}</p>
      <p className="mt-2 text-sm text-[var(--muted)]">{BREN.rumor}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {wheat > 0 ? (
          <button className="btn-primary" type="button" onClick={onSell}>
            Sell {wheat} wheat · +{gold} Gold
          </button>
        ) : (
          <button className="btn-quiet" type="button" onClick={onClose}>
            Not today
          </button>
        )}
        <button className="btn-quiet" type="button" onClick={onClose}>
          Step back
        </button>
      </div>
    </div>
  );
}
