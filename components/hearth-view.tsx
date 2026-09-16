"use client";

import { CROP_META, plotReady } from "@/lib/crops";
import type { CropId, PlayerState } from "@/lib/types";
import { CROP_IDS } from "@/lib/types";
import { useEffect, useState } from "react";

export function HearthView({
  player,
  seed,
  setSeed,
  busy,
  onPlant,
  onHarvest,
  onFish,
  onCook,
  onDoor,
}: {
  player: PlayerState;
  seed: CropId;
  setSeed: (crop: CropId) => void;
  busy: boolean;
  onPlant: (plotId: number) => void;
  onHarvest: (plotId: number) => void;
  onFish: () => void;
  onCook: () => void;
  onDoor: () => void;
}) {
  const [now, setNow] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 400);
    return () => window.clearInterval(id);
  }, []);

  return (
    <section className="panel">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2>Garden</h2>
        <button className="btn-quiet" type="button" disabled={busy} onClick={onDoor}>
          Door to the valley
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {CROP_IDS.map((id) => (
          <button
            key={id}
            type="button"
            className={`btn-tiny ${seed === id ? "tab-on" : ""}`}
            onClick={() => setSeed(id)}
          >
            {CROP_META[id].name} seed {player.seeds[id]}
          </button>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {player.plots.map((plot) => {
          const ready = plot.crop && plot.plantedAt != null && plotReady(plot.plantedAt, plot.crop, player.farmSkill, now);
          return (
            <button
              key={plot.id}
              type="button"
              disabled={busy}
              className="min-h-24 rounded-sm border border-[var(--line)] bg-[#f7f1e4] p-2 text-left text-sm"
              onClick={() => {
                if (!plot.crop) onPlant(plot.id);
                else if (ready) onHarvest(plot.id);
              }}
            >
              <div className="text-xs text-[var(--muted)]">Bed {plot.id + 1}</div>
              {!plot.crop ? <div>Empty · plant {CROP_META[seed].name}</div> : null}
              {plot.crop && !ready ? <div>{CROP_META[plot.crop].name} growing…</div> : null}
              {plot.crop && ready ? <div>{CROP_META[plot.crop].name} ready</div> : null}
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-sm text-[var(--muted)]">
        Plant, wait, harvest. Farm skill rises with harvests. The dragon is a statue rumor here — not a boss.
      </p>
      <div className="mt-4 flex flex-wrap gap-2 border-t border-[var(--line)] pt-3">
        <button className="btn-quiet" type="button" disabled={busy} onClick={onFish}>
          Creek · fish
        </button>
        <button className="btn-quiet" type="button" disabled={busy || player.basket.grain < 1} onClick={onCook}>
          Oven · bread (1 wheat)
        </button>
      </div>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Fishing is a stub. The oven turns wheat into bread. Bread is eaten, not a bed rest.
      </p>
    </section>
  );
}
