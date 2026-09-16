"use client";

import { BREN, BREN_SHOP, type ShopSku } from "@/lib/data/npcs";
import { countItem } from "@/lib/game/inventory";
import { brenBrain } from "@/lib/game/npc";
import type { PlayerState } from "@/lib/types";

export function DialoguePanel({
  player,
  onSell,
  onBuy,
  onClose,
}: {
  player: PlayerState;
  onSell: () => void;
  onBuy: (sku: ShopSku) => void;
  onClose: () => void;
}) {
  const wheat = countItem(player.inventory, "wheat");
  const intent = brenBrain.decide({ cropCount: wheat });
  const gold = wheat * BREN.buyPrice;

  function owned(sku: ShopSku) {
    if (sku === "sword") return player.hasSword;
    if (sku === "armor") return player.hasArmor;
    return false;
  }

  return (
    <div className="hud-panel" role="dialog" aria-label="Old Bren">
      <p className="eyebrow">{BREN.title}</p>
      <h2>{BREN.name}</h2>
      <p className="mt-2 text-[1.02rem] leading-relaxed">{BREN.greet}</p>
      <p className="mt-2 text-sm text-[var(--muted)]">{intent.line}</p>
      <p className="mt-2 text-sm text-[var(--muted)]">{BREN.shop}</p>
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
      <ul className="shop-list mt-4">
        {BREN_SHOP.map((listing) => {
          const have = owned(listing.sku);
          const canAfford = player.coins >= listing.cost;
          return (
            <li key={listing.sku} className="shop-row">
              <div>
                <strong>{listing.name}</strong>
                <span>{listing.blurb}</span>
              </div>
              {have ? (
                <em>Yours</em>
              ) : (
                <button
                  className="btn-tiny"
                  type="button"
                  disabled={!canAfford}
                  onClick={() => onBuy(listing.sku)}
                >
                  {canAfford ? `Buy · ${listing.cost} Gold` : `${listing.cost} Gold`}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
