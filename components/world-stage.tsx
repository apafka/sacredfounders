"use client";

import dynamic from "next/dynamic";
import { Component, useCallback, useEffect, useState, type ReactNode } from "react";
import { CROP_META, plotStage } from "@/lib/crops";
import type { ShopSku } from "@/lib/data/npcs";
import type { WorldEvent } from "@/lib/phaser/bridge";
import { preferredRenderer, type WorldRenderer } from "@/lib/three/engine";
import type { CropId, GoodsId, PlayerState } from "@/lib/types";
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
  seed,
  busy,
  inventoryOpen,
  dialogueOpen,
  toast,
  hint,
  onHint,
  onToast,
  onSeed,
  onPlant,
  onHarvest,
  onSell,
  onBuy,
  onBake,
  onFulfill,
  onRest,
  onUsePotion,
  onEatBread,
  onDoor,
  onWolfDown,
  onPickupPelt,
  onRespawn,
  onHealth,
  onPosition,
  onToggleInventory,
  onToggleDialogue,
}: {
  player: PlayerState;
  seed: CropId;
  busy: boolean;
  inventoryOpen: boolean;
  dialogueOpen: boolean;
  toast: string;
  hint: string;
  onHint: (text: string) => void;
  onToast: (text: string) => void;
  onSeed: (crop: CropId) => void;
  onPlant: (plotId: number) => void;
  onHarvest: (plotId: number) => void;
  onSell: (good?: GoodsId) => void;
  onBuy: (sku: ShopSku) => void;
  onBake: () => void;
  onFulfill: () => void;
  onRest: () => void;
  onUsePotion: () => void;
  onEatBread: () => void;
  onDoor: (scene: "hearth" | "valley") => void;
  onWolfDown: (id?: string) => void;
  onPickupPelt: (id?: string) => void;
  onRespawn: () => void;
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
          onWolfDown(event.id);
          break;
        case "pickup-pelt":
          onPickupPelt(event.id);
          break;
        case "rest-bed":
          onRest();
          break;
        case "use-potion":
          onUsePotion();
          break;
        case "eat-bread":
          onEatBread();
          break;
        case "bake-bread":
          onBake();
          break;
        case "fulfill-demand":
          onFulfill();
          break;
        case "respawn-wilderness":
          onRespawn();
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
    [engine, isoFailed, onBake, onBuy, onDoor, onEatBread, onFulfill, onHarvest, onHealth, onHint, onPickupPelt, onPlant, onPosition, onRest, onRespawn, onToast, onToggleDialogue, onToggleInventory, onUsePotion, onWolfDown],
  );

  const usePhaser = engine === "phaser" || isoFailed;

  if (phaserFailed) {
    return (
      <div className="game-frame">
        <TextSlice
          player={player}
          seed={seed}
          busy={busy}
          onPlant={onPlant}
          onHarvest={onHarvest}
          onSell={onSell}
          onBuy={onBuy}
          onBake={onBake}
          onDoor={onDoor}
          onWolfDown={onWolfDown}
          onPickupPelt={onPickupPelt}
          onRest={onRest}
        />
        <GameHud
          player={player}
          seed={seed}
          toast={toast}
          hint={hint}
          onInventory={() => onToggleInventory()}
          onUsePotion={onUsePotion}
          onEatBread={onEatBread}
          onBake={onBake}
          onRest={onRest}
          onSeed={onSeed}
        />
        {inventoryOpen ? (
          <InventoryPanel
            player={player}
            onClose={() => onToggleInventory(false)}
            onUsePotion={onUsePotion}
            onEatBread={onEatBread}
          />
        ) : null}
        {dialogueOpen ? (
          <DialoguePanel
            player={player}
            onSell={onSell}
            onBuy={onBuy}
            onBake={onBake}
            onFulfill={onFulfill}
            onClose={() => onToggleDialogue(false)}
          />
        ) : null}
      </div>
    );
  }

  return (
    <div className="game-frame">
      <CanvasGuard key={usePhaser ? "phaser" : "iso"} onFail={() => onEvent({ type: "fail" })}>
        {usePhaser ? (
          <PhaserCanvas player={player} seed={seed} busy={busy} onEvent={onEvent} />
        ) : (
          <IsoCanvas player={player} seed={seed} busy={busy} onEvent={onEvent} />
        )}
      </CanvasGuard>
      <GameHud
        player={player}
        seed={seed}
        toast={toast}
        hint={hint}
        onInventory={() => onToggleInventory()}
        onUsePotion={onUsePotion}
        onEatBread={onEatBread}
        onBake={onBake}
        onRest={onRest}
        onSeed={onSeed}
      />
      {inventoryOpen ? (
        <>
          <button className="hud-backdrop" type="button" aria-label="Close pack" onClick={() => onToggleInventory(false)} />
          <InventoryPanel
            player={player}
            onClose={() => onToggleInventory(false)}
            onUsePotion={onUsePotion}
            onEatBread={onEatBread}
          />
        </>
      ) : null}
      {dialogueOpen ? (
        <>
          <button className="hud-backdrop" type="button" aria-label="Close conversation" onClick={() => onToggleDialogue(false)} />
          <DialoguePanel
            player={player}
            onSell={onSell}
            onBuy={onBuy}
            onBake={onBake}
            onFulfill={onFulfill}
            onClose={() => onToggleDialogue(false)}
          />
        </>
      ) : null}
    </div>
  );
}

function TextSlice({
  player,
  seed,
  busy,
  onPlant,
  onHarvest,
  onSell,
  onBuy,
  onBake,
  onDoor,
  onWolfDown,
  onPickupPelt,
  onRest,
}: {
  player: PlayerState;
  seed: CropId;
  busy: boolean;
  onPlant: (plotId: number) => void;
  onHarvest: (plotId: number) => void;
  onSell: (good?: GoodsId) => void;
  onBuy: (sku: ShopSku) => void;
  onBake: () => void;
  onDoor: (scene: "hearth" | "valley") => void;
  onWolfDown: (id?: string) => void;
  onPickupPelt: (id?: string) => void;
  onRest: () => void;
}) {
  const now = Date.now();
  if (player.scene === "valley") {
    const living = player.encounters.filter((item) => item.alive);
    const loot = player.encounters.filter((item) => item.lootDropped && !item.lootTaken);
    return (
      <section className="panel m-4">
        <h2>Forest path</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          The woods run longer now. A pack on the path. A larger shape further in. Enormous tracks. A scale. A carving.
        </p>
        {living.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {living.map((foe) => (
              <button key={foe.id} className="btn-primary" type="button" disabled={busy} onClick={() => onWolfDown(foe.id)}>
                Face the {foe.kind === "dire" ? "dire wolf" : "wolf"}
              </button>
            ))}
          </div>
        ) : loot.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {loot.map((foe) => (
              <button key={foe.id} className="btn-primary" type="button" disabled={busy} onClick={() => onPickupPelt(foe.id)}>
                Pick up {foe.kind === "dire" ? "Dire Hide" : "Wolf Pelt"}
              </button>
            ))}
          </div>
        ) : (
          <p className="mt-4">The trees do not open. Home will wake the pack again.</p>
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
              <div>
                {stage === "empty"
                  ? `Empty · plant ${CROP_META[seed].name}`
                  : stage === "ready"
                    ? `${CROP_META[plot.crop ?? seed].name} ready`
                    : `${CROP_META[plot.crop ?? seed].name} ${stage}`}
              </div>
            </button>
          );
        })}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button className="btn-quiet" type="button" onClick={() => onSell()}>
          Talk to Old Bren
        </button>
        <button className="btn-quiet" type="button" onClick={onBake}>
          Bake bread
        </button>
        <button className="btn-quiet" type="button" onClick={onRest}>
          Rest at the bed
        </button>
        <button className="btn-quiet" type="button" onClick={() => onBuy("potion")}>
          Buy a potion
        </button>
        <button className="btn-quiet" type="button" onClick={() => onDoor("valley")}>
          Path to the forest
        </button>
      </div>
    </section>
  );
}
