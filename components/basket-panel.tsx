"use client";

import { GOODS_META } from "@/lib/crops";
import type { PlayerState } from "@/lib/types";
import { GOODS_IDS } from "@/lib/types";
import { PrivyAuth } from "./privy-auth";

export function BasketPanel({ player }: { player: PlayerState }) {
  return (
    <section className="panel">
      <h2>Basket</h2>
      <ul className="mt-2 space-y-1 text-sm">
        {GOODS_IDS.map((id) => (
          <li key={id}>
            {GOODS_META[id].name}: {player.basket[id]}
          </li>
        ))}
      </ul>
      <PrivyAuth address={player.walletAddress} />
    </section>
  );
}
