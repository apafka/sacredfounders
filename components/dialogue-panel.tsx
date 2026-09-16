"use client";

import { BREN, BREN_SHOP, type ShopSku } from "@/lib/data/npcs";
import { BREN_PRICES } from "@/lib/data/economy";
import { countItem } from "@/lib/game/inventory";
import { brenBrain } from "@/lib/game/npc";
import type { GoodsId, PlayerState } from "@/lib/types";

export function DialoguePanel({
  player,
  onSell,
  onBuy,
  onBake,
  onFulfill,
  onClose,
}: {
  player: PlayerState;
  onSell: (good?: GoodsId) => void;
  onBuy: (sku: ShopSku) => void;
  onBake?: () => void;
  onFulfill?: () => void;
  onClose: () => void;
}) {
  const wheat = countItem(player.inventory, "wheat");
  const bread = countItem(player.inventory, "bread");
  const root = countItem(player.inventory, "root");
  const herb = countItem(player.inventory, "herb");
  const intent = brenBrain.decide({
    wheat,
    bread,
    root,
    herb,
    demand: player.brenDemand,
  });
  const canFulfill = intent.type === "demand" && intent.ready;

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
      <p className="mt-2 text-sm text-[var(--muted)]">{BREN.bake}</p>
      <p className="mt-2 text-sm text-[var(--muted)]">{BREN.shop}</p>
      <p className="mt-2 text-sm text-[var(--muted)]">{BREN.rumor}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {canFulfill && onFulfill ? (
          <button className="btn-primary" type="button" onClick={onFulfill}>
            {intent.type === "demand" && intent.itemId === "bread"
              ? `Deliver ${intent.qty} loaves`
              : `Deliver ${intent.type === "demand" ? intent.qty : 3} wheat`}
          </button>
        ) : null}
        {wheat > 0 ? (
          <button className="btn-primary" type="button" onClick={() => onSell("grain")}>
            Sell {wheat} wheat · +{wheat * BREN.buyPrice} Gold
          </button>
        ) : null}
        {root > 0 ? (
          <button className="btn-quiet" type="button" onClick={() => onSell("root")}>
            Sell {root} root · +{root * BREN_PRICES.root} Gold
          </button>
        ) : null}
        {herb > 0 ? (
          <button className="btn-quiet" type="button" onClick={() => onSell("herb")}>
            Sell {herb} herb · +{herb * BREN_PRICES.herb} Gold
          </button>
        ) : null}
        {bread > 0 ? (
          <button className="btn-quiet" type="button" onClick={() => onSell("loaf")}>
            Sell {bread} bread · +{bread * BREN_PRICES.loaf} Gold
          </button>
        ) : null}
        {wheat > 0 && onBake ? (
          <button className="btn-quiet" type="button" onClick={onBake}>
            Bake bread (1 wheat)
          </button>
        ) : null}
        {wheat < 1 && root < 1 && herb < 1 && bread < 1 && !canFulfill ? (
          <button className="btn-quiet" type="button" onClick={onClose}>
            Not today
          </button>
        ) : null}
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
