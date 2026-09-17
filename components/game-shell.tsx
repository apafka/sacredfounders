"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AuthControls } from "./auth-controls";
import { WorldStage } from "./world-stage";
import {
  bakeBread,
  eatBread,
  fulfillBrenDemand,
  harvest,
  hydratePlayer,
  pickupLoot,
  plant,
  refreshBrenDemand,
  restAtBed,
  sellToBren,
  sellWheat,
  setHealth,
  setPosition,
  setScene,
  buyFromBren,
  usePotion,
  enemyFalls,
  wolfFalls,
  maybeTimerRespawn,
  recordStrike,
  recordWound,
  acceptQuest,
  turnInQuest,
} from "@/lib/game-store";
import { createLocalStoragePersistence, mergeSession, toSnapshot } from "@/lib/game/persistence";
import type { CropId, GoodsId, PlayerState } from "@/lib/types";

type View = { player: PlayerState | null; message?: string };

async function act(action: string, extra: Record<string, unknown> = {}) {
  const res = await fetch("/api/game", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action, ...extra }),
  });
  const data = (await res.json()) as View & { error?: string };
  if (!res.ok) throw new Error(data.error || data.message || "Failed");
  return data;
}

export function GameShell() {
  const persist = useRef(createLocalStoragePersistence());
  const playerRef = useRef<PlayerState | null>(null);
  const [player, setPlayer] = useState<PlayerState | null>(null);
  const [message, setMessage] = useState("");
  const [hint, setHint] = useState("");
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [dialogueOpen, setDialogueOpen] = useState(false);
  const [seed, setSeed] = useState<CropId>("grain");

  const commit = useCallback((next: PlayerState, note?: string, cookie = true) => {
    playerRef.current = next;
    setPlayer(next);
    persist.current.save(toSnapshot(next));
    if (note) setMessage(note);
    if (!cookie) return;
    void fetch("/api/game", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "sync", player: next }),
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    fetch("/api/game")
      .then((r) => r.json())
      .then((data: View) => {
        if (!data.player) {
          setPlayer(null);
          return;
        }
        const local = persist.current.load(data.player.id);
        const merged = hydratePlayer(mergeSession(data.player, local));
        playerRef.current = merged;
        setPlayer(merged);
      })
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(""), 2400);
    return () => window.clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if (event.key === "i" || event.key === "I") {
        event.preventDefault();
        setInventoryOpen((open) => !open);
        setDialogueOpen(false);
      }
      if (event.key === "q" || event.key === "Q") {
        event.preventDefault();
        const cur = playerRef.current;
        if (!cur) return;
        const next = usePotion(cur);
        if (!next.ok) {
          setHint(next.message);
          return;
        }
        commit(next.player, next.message);
        setToast(next.message);
      }
      if (event.key === "b" || event.key === "B") {
        event.preventDefault();
        const cur = playerRef.current;
        if (!cur) return;
        const next = eatBread(cur);
        if (!next.ok) {
          setHint(next.message);
          return;
        }
        commit(next.player, next.message);
        setToast(next.message);
      }
      if (event.key === "1") setSeed("grain");
      if (event.key === "2") setSeed("root");
      if (event.key === "3") setSeed("herb");
      if (event.key === "Escape") {
        setInventoryOpen(false);
        setDialogueOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [commit]);

  async function enter() {
    if (busy) return;
    setBusy(true);
    try {
      const data = await act("enter");
      if (data.player) commit(data.player, data.message);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  function applyLocal(next: { player: PlayerState; ok: boolean; message: string }, cookie = true) {
    if (!next.ok) {
      setHint(next.message);
      return;
    }
    commit(next.player, next.message, cookie);
    if (
      next.message.startsWith("+") ||
      next.message.includes("Pelt") ||
      next.message.includes("Hide") ||
      next.message.includes("Harvested") ||
      next.message.includes("Planted") ||
      next.message.includes("rested") ||
      next.message.includes("Blade") ||
      next.message.includes("Armor") ||
      next.message.includes("Baked") ||
      next.message.includes("bread") ||
      next.message.includes("fed") ||
      next.message.includes("Attack") ||
      next.message.includes("Defense") ||
      next.message.includes("Cooking") ||
      next.message.includes("pelts")
    ) {
      setToast(next.message);
    }
  }

  function current(): PlayerState {
    return playerRef.current!;
  }

  function sell(good?: GoodsId) {
    if (!good || good === "grain") {
      applyLocal(sellWheat(current()));
      return;
    }
    applyLocal(sellToBren(current(), good));
  }

  function openBren() {
    const refreshed = refreshBrenDemand(current());
    commit(refreshed.player);
    setInventoryOpen(false);
    setDialogueOpen(true);
  }

  if (!loaded) {
    return (
      <main className="grid min-h-dvh place-items-center">
        <p className="text-[var(--muted)]">Opening the hearth…</p>
      </main>
    );
  }

  if (!player) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-6 py-16">
        <p className="eyebrow">Dragon World</p>
        <h1>A hearth to keep</h1>
        <p className="lede">
          You live here. Farm a week, or walk out and meet a wolf. The world does not judge.
        </p>
        <AuthControls busy={busy} onEnter={enter} />
        {message ? <p className="banner">{message}</p> : null}
      </main>
    );
  }

  return (
    <div className="game-app">
      <WorldStage
        player={player}
        seed={seed}
        busy={busy}
        inventoryOpen={inventoryOpen}
        dialogueOpen={dialogueOpen}
        toast={toast}
        hint={hint}
        onHint={setHint}
        onToast={setToast}
        onSeed={setSeed}
        onPlant={(plotId) => applyLocal(plant(current(), plotId, seed))}
        onHarvest={(plotId) => applyLocal(harvest(current(), plotId))}
        onSell={sell}
        onBuy={(sku) => applyLocal(buyFromBren(current(), sku))}
        onBake={() => applyLocal(bakeBread(current()))}
        onFulfill={() => applyLocal(fulfillBrenDemand(current()))}
        onAcceptQuest={() => applyLocal(acceptQuest(current()))}
        onTurnInQuest={() => applyLocal(turnInQuest(current()))}
        onRest={() => applyLocal(restAtBed(current()))}
        onUsePotion={() => applyLocal(usePotion(current()))}
        onEatBread={() => applyLocal(eatBread(current()))}
        onDoor={(scene) => applyLocal(setScene(current(), scene))}
        onWolfDown={(id) => applyLocal(id ? enemyFalls(current(), id) : wolfFalls(current()))}
        onPickupPelt={(id) =>
          applyLocal(
            pickupLoot(
              current(),
              id ?? current().encounters.find((item) => item.lootDropped && !item.lootTaken)?.id ?? "wolf-near",
            ),
          )
        }
        onRespawn={() => applyLocal(maybeTimerRespawn(current()))}
        onStrike={() => applyLocal(recordStrike(current()), false)}
        onWound={() => applyLocal(recordWound(current()), false)}
        onHealth={(health) => {
          const cur = current();
          if (cur.health === health) return;
          commit(setHealth(cur, health), undefined, false);
        }}
        onPosition={(x, y) => {
          const cur = current();
          const pos = cur.position;
          if (pos && Math.hypot(pos.x - x, pos.y - y) < 4) return;
          commit(setPosition(cur, x, y), undefined, false);
        }}
        onToggleInventory={(open) => setInventoryOpen((prev) => (open == null ? !prev : open))}
        onToggleDialogue={(open) => {
          const next = open == null ? !dialogueOpen : open;
          if (next) openBren();
          else setDialogueOpen(false);
        }}
      />
    </div>
  );
}
