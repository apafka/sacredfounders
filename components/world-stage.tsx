"use client";

import dynamic from "next/dynamic";
import { Component, useCallback, useEffect, useState, type ReactNode } from "react";
import { plotStage } from "@/lib/crops";
import type { WorldEvent } from "@/lib/phaser/bridge";
import { preferredRenderer, type WorldRenderer } from "@/lib/three/engine";
import type { PlayerState } from "@/lib/types";
import { DialoguePanel } from "./dialogue-panel";
import { GameHud } from "./game-hud";
import { InventoryPanel } from "./inventory-panel";

const loadingStage = (
  <div className="world-stage grid place-items-center text-sm text-[var(--muted)]">Lighting the hearth…</div>
);

const PhaserCanvas = dynamic(() => import("./phaser-canvas"), {
  ssr: false,
  loading: () => loadingStage,
});

const IsoCanvas = dynamic(() => import("./iso-canvas"), {
  ssr: false,
  loading: () => loadingStage,
});

class CanvasGuard extends Component<{ onFail: () => void; children: ReactNode }, { failed: boolean }> {
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
  busy,
  inventoryOpen,
  dialogueOpen,
  toast,
  hint,
  onHint,
  onToast,
  onPlant,
  onHarvest,
  onSell,
  onDoor,
  onWolfDown,
  onPickupPelt,
  onHealth,
  onPosition,
  onToggleInventory,
  onToggleDialogue,
}: {
  player: PlayerState;
  busy: boolean;
  inventoryOpen: boolean;
  dialogueOpen: boolean;
  toast: string;
  hint: string;
  onHint: (text: string) => void;
  onToast: (text: string) => void;
  onPlant: (plotId: number) => void;
  onHarvest: (plotId: number) => void;
  onSell: () => void;
  onDoor: (scene: "hearth" | "valley") => void;
  onWolfDown: () => void;
  onPickupPelt: () => void;
  onHealth: (health: number) => void;
  onPosition: (x: number, y: number) => void;
  onToggleInventory: (open?: boolean) => void;
  onToggleDialogue: (open?: boolean) => void;
}) {
  const [engine, setEngine] = useState<WorldRenderer>("iso");
  const [isoFailed, setIsoFailed] = useState(false);
  const [phaserFailed, setPhaserFailed] = useState(false);

  useEffect(() => {
    setEngine(preferredRenderer());
  }, []);

  const onEvent = useCallback(
    (event: WorldEvent) => {
      switch (event.type) {
        case "fail":
          if (engine === "iso" && !isoFailed) {
            setIsoFailed(true);
            setEngine("phaser");
            onHint("The isometric hearth stumbled. Classic tiles still stand — add ?view=phaser to start there.");
          } else {
            setPhaserFailed(true);
            onHint("The tiles would not light. The written hearth still stands.");
          }
          break;
        case "hint":
          onHint(event.text);
          break;
        case "toast":
          onToast(event.text);
          break;
        case "plant":
          onPlant(event.plotId);
          break;
        case "harvest":
          onHarvest(event.plotId);
          break;
        case "talk-bren":
          onToggleDialogue(true);
          break;
        case "door":
          onToggleDialogue(false);
          onDoor(event.scene);
          break;
        case "wolf-down":
          onWolfDown();
          break;
        case "pickup-pelt":
          onPickupPelt();
          break;
        case "combat":
        case "health":
          onHealth("health" in event ? event.health : event.you);
          break;
        case "position":
          onPosition(event.x, event.y);
          break;
        case "inventory":
          onToggleInventory(true);
          break;
        default:
          break;
      }
    },
    [engine, isoFailed, onDoor, onHarvest, onHealth, onHint, onPickupPelt, onPlant, onPosition, onToast, onToggleDialogue, onToggleInventory, onWolfDown],
  );

  const usePhaser = engine === "phaser" || isoFailed;

  if (phaserFailed) {
    return (
      <div className="game-frame">
        <TextSlice
          player={player}
          busy={busy}
          onPlant={onPlant}
          onHarvest={onHarvest}
          onSell={onSell}
          onDoor={onDoor}
          onWolfDown={onWolfDown}
          onPickupPelt={onPickupPelt}
        />
        <GameHud player={player} toast={toast} hint={hint} onInventory={() => onToggleInventory()} />
        {inventoryOpen ? <InventoryPanel player={player} onClose={() => onToggleInventory(false)} /> : null}
        {dialogueOpen ? (
          <DialoguePanel player={player} onSell={onSell} onClose={() => onToggleDialogue(false)} />
        ) : null}
      </div>
    );
  }

  return (
    <div className="game-frame">
      <CanvasGuard key={usePhaser ? "phaser" : "iso"} onFail={() => onEvent({ type: "fail" })}>
        {usePhaser ? (
          <PhaserCanvas player={player} seed="grain" busy={busy} onEvent={onEvent} />
        ) : (
          <IsoCanvas player={player} seed="grain" busy={busy} onEvent={onEvent} />
        )}
      </CanvasGuard>
      <GameHud player={player} toast={toast} hint={hint} onInventory={() => onToggleInventory()} />
      {inventoryOpen ? (
        <>
          <button className="hud-backdrop" type="button" aria-label="Close pack" onClick={() => onToggleInventory(false)} />
          <InventoryPanel player={player} onClose={() => onToggleInventory(false)} />
        </>
      ) : null}
      {dialogueOpen ? (
        <>
          <button className="hud-backdrop" type="button" aria-label="Close conversation" onClick={() => onToggleDialogue(false)} />
          <DialoguePanel
            player={player}
            onSell={() => {
              onSell();
              onToggleDialogue(false);
            }}
            onClose={() => onToggleDialogue(false)}
          />
        </>
      ) : null}
    </div>
  );
}

function TextSlice({
  player,
  busy,
  onPlant,
  onHarvest,
  onSell,
  onDoor,
  onWolfDown,
  onPickupPelt,
}: {
  player: PlayerState;
  busy: boolean;
  onPlant: (plotId: number) => void;
  onHarvest: (plotId: number) => void;
  onSell: () => void;
  onDoor: (scene: "hearth" | "valley") => void;
  onWolfDown: () => void;
  onPickupPelt: () => void;
}) {
  const now = Date.now();
  if (player.scene === "valley") {
    return (
      <section className="panel m-4">
        <h2>Forest edge</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Enormous tracks. A scale in the soil. A carving no two villagers explain the same way.
        </p>
        {player.wolf.alive ? (
          <button className="btn-primary mt-4" type="button" disabled={busy} onClick={onWolfDown}>
            Face the wolf
          </button>
        ) : player.wolf.peltDropped ? (
          <button className="btn-primary mt-4" type="button" disabled={busy} onClick={onPickupPelt}>
            Pick up Wolf Pelt
          </button>
        ) : (
          <p className="mt-4">The trees do not open. What&apos;s beyond that forest?</p>
        )}
        <button className="btn-quiet mt-3" type="button" onClick={() => onDoor("hearth")}>
          Back to the hearth
        </button>
      </section>
    );
  }

  return (
    <section className="panel m-4">
      <h2>Hearth</h2>
      <p className="mt-2 text-sm text-[var(--muted)]">Bed, fire, chest, workbench, door. The garden is just outside.</p>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {player.plots.map((plot) => {
          const stage =
            plot.crop && plot.plantedAt != null ? plotStage(plot.plantedAt, plot.crop, now) : "empty";
          return (
            <button
              key={plot.id}
              type="button"
              disabled={busy}
              className="min-h-20 rounded-sm border border-[var(--line)] bg-[#f7f1e4] p-2 text-left text-sm"
              onClick={() => {
                if (!plot.crop) onPlant(plot.id);
                else if (stage === "ready") onHarvest(plot.id);
              }}
            >
              <div className="text-xs text-[var(--muted)]">Plot {plot.id + 1}</div>
              <div>{stage === "empty" ? "Empty · plant wheat" : stage === "ready" ? "Wheat ready" : `Wheat ${stage}`}</div>
            </button>
          );
        })}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button className="btn-quiet" type="button" onClick={onSell}>
          Talk to Old Bren
        </button>
        <button className="btn-quiet" type="button" onClick={() => onDoor("valley")}>
          Path to the forest
        </button>
      </div>
    </section>
  );
}
