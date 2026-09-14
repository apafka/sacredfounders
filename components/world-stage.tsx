"use client";

import dynamic from "next/dynamic";
import { Component, useCallback, useState, type ReactNode } from "react";
import { CROP_META } from "@/lib/crops";
import type { WorldEvent } from "@/lib/phaser/bridge";
import { CROP_IDS, type CropId, type GoodsId, type PlayerState } from "@/lib/types";
import { BasketPanel } from "./basket-panel";
import { HearthView } from "./hearth-view";
import { MarketPanel } from "./market-panel";
import { SessionLog } from "./session-log";
import { ValleyCombat } from "./valley-combat";

const PhaserCanvas = dynamic(() => import("./phaser-canvas"), {
  ssr: false,
  loading: () => (
    <div className="world-stage grid place-items-center text-sm text-[var(--muted)]">Lighting the tiles…</div>
  ),
});

class PhaserGuard extends Component<{ onFail: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onFail();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export function WorldStage({
  player,
  seed,
  setSeed,
  busy,
  onPlant,
  onHarvest,
  onFish,
  onCook,
  onSell,
  onDoor,
  onLoot,
}: {
  player: PlayerState;
  seed: CropId;
  setSeed: (crop: CropId) => void;
  busy: boolean;
  onPlant: (plotId: number) => void;
  onHarvest: (plotId: number) => void;
  onFish: () => void;
  onCook: () => void;
  onSell: (good: GoodsId) => void;
  onDoor: (scene: "hearth" | "valley") => void;
  onLoot: () => void;
}) {
  const [mode, setMode] = useState<"phaser" | "text">("phaser");
  const [failed, setFailed] = useState(false);
  const [hint, setHint] = useState("");
  const [marketOpen, setMarketOpen] = useState(false);
  const [strikeTick, setStrikeTick] = useState(0);

  const useText = mode === "text" || failed;
  const inValley = player.scene === "valley";

  const onEvent = useCallback(
    (event: WorldEvent) => {
      switch (event.type) {
        case "fail":
          setFailed(true);
          setHint("Tiles would not light. Using the written hearth.");
          break;
        case "hint":
          setHint(event.text);
          break;
        case "plant":
          onPlant(event.plotId);
          break;
        case "harvest":
          onHarvest(event.plotId);
          break;
        case "fish":
          onFish();
          break;
        case "cook":
          onCook();
          break;
        case "open-market":
          setMarketOpen(true);
          break;
        case "door":
          setMarketOpen(false);
          onDoor(event.scene);
          break;
        case "wolf-loot":
          onLoot();
          break;
        default:
          break;
      }
    },
    [onCook, onDoor, onFish, onHarvest, onLoot, onPlant],
  );

  return (
    <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(16rem,0.75fr)]">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {!useText && !inValley ? (
            <div className="flex flex-wrap gap-2">
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
          ) : null}
          {!useText && inValley ? (
            <div className="flex flex-wrap gap-2">
              <button className="btn-primary" type="button" disabled={busy} onClick={() => setStrikeTick((n) => n + 1)}>
                Strike
              </button>
              <button className="btn-quiet" type="button" onClick={() => onDoor("hearth")}>
                Back through the door
              </button>
            </div>
          ) : null}
          <button
            className="btn-quiet"
            type="button"
            onClick={() => {
              if (useText) {
                setFailed(false);
                setMode("phaser");
              } else {
                setMode("text");
              }
            }}
          >
            {useText ? "2D view" : "Text view"}
          </button>
        </div>

        {useText ? (
          inValley ? (
            <ValleyCombat busy={busy} onLoot={onLoot} onHome={() => onDoor("hearth")} />
          ) : (
            <HearthView
              player={player}
              seed={seed}
              setSeed={setSeed}
              busy={busy}
              onPlant={onPlant}
              onHarvest={onHarvest}
              onFish={onFish}
              onCook={onCook}
              onDoor={() => onDoor("valley")}
            />
          )
        ) : (
          <div className="relative">
            <PhaserGuard onFail={() => onEvent({ type: "fail" })}>
              <PhaserCanvas
                player={player}
                seed={seed}
                busy={busy}
                strikeTick={strikeTick}
                onEvent={onEvent}
              />
            </PhaserGuard>
            {marketOpen ? (
              <div className="absolute inset-3 z-10 overflow-auto rounded-sm bg-[#faf7ef]/95 p-2 shadow-sm">
                <div className="mb-2 flex justify-end">
                  <button className="btn-tiny" type="button" onClick={() => setMarketOpen(false)}>
                    Close
                  </button>
                </div>
                <MarketPanel player={player} busy={busy} onSell={onSell} />
              </div>
            ) : null}
          </div>
        )}

        {hint ? <p className="text-sm text-[var(--muted)]">{hint}</p> : null}
      </div>

      <div className="flex flex-col gap-4">
        <BasketPanel player={player} />
        <MarketPanel player={player} busy={busy} onSell={onSell} />
        <SessionLog player={player} />
      </div>
    </div>
  );
}
