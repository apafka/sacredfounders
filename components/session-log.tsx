"use client";

import type { PlayerState } from "@/lib/types";

export function SessionLog({ player }: { player: PlayerState }) {
  return (
    <section className="panel">
      <h2>Log</h2>
      <ul className="mt-2 space-y-1 text-sm">
        {player.log.map((entry) => (
          <li key={`${entry.at}-${entry.text}`}>{entry.text}</li>
        ))}
      </ul>
    </section>
  );
}
