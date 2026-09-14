"use client";

import { CROP_META } from "@/lib/crops";
import type { PlayerState } from "@/lib/types";
import { CROP_IDS } from "@/lib/types";
import { PrivyAuth } from "./privy-auth";

export function BasketPanel({ player }: { player: PlayerState }) {
  return (
    <section className="panel">
      <h2>Basket</h2>
      <ul className="mt-2 space-y-1 text-sm">
        {CROP_IDS.map((id) => (
          <li key={id}>
            {CROP_META[id].name}: {player.basket[id]}
          </li>
        ))}
      </ul>
      <PrivyAuth address={player.walletAddress} />
    </section>
  );
}
