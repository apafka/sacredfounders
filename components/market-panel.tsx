"use client";

import { BREN_PRICES, GOODS_META } from "@/lib/crops";
import type { GoodsId, PlayerState } from "@/lib/types";
import { GOODS_IDS } from "@/lib/types";

export function MarketPanel({
  player,
  busy,
  onSell,
}: {
  player: PlayerState;
  busy: boolean;
  onSell: (good: GoodsId) => void;
}) {
  return (
    <section className="panel">
      <h2>Old Bren</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">Soft coins. He never takes a chain signature for you.</p>
      <ul className="mt-2 space-y-2">
        {GOODS_IDS.map((id) => (
          <li key={id} className="flex items-center justify-between gap-2 text-sm">
            <span>
              {GOODS_META[id].name} · {BREN_PRICES[id]}
              {player.classId === "spiritual" && id === "herb" ? "+1" : ""} coins
            </span>
            <button className="btn-tiny" type="button" disabled={busy || player.basket[id] < 1} onClick={() => onSell(id)}>
              Sell
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
