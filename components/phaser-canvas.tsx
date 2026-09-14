"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import type { WorldBridge, WorldEvent } from "@/lib/phaser/bridge";
import { queueValleyStrike } from "@/lib/phaser/bridge";
import type { CropId, PlayerState } from "@/lib/types";

type GameHandle = {
  destroy: (removeCanvas: boolean, noReturn?: boolean) => void;
  events: { emit: (event: string) => void };
  scale: { refresh: () => void };
  scene: {
    isActive: (key: string) => boolean;
    stop: (key: string) => void;
    start: (key: string) => void;
  };
};

export default function PhaserCanvas({
  player,
  seed,
  busy,
  strikeTick,
  onEvent,
}: {
  player: PlayerState;
  seed: CropId;
  busy: boolean;
  strikeTick: number;
  onEvent: (event: WorldEvent) => void;
}) {
  const parentRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<GameHandle | null>(null);
  const live = useRef({ player, seed, busy, onEvent });
  useLayoutEffect(() => {
    live.current = { player, seed, busy, onEvent };
  }, [player, seed, busy, onEvent]);

  const bridgeRef = useRef<WorldBridge>({
    getPlayer: () => live.current.player,
    getSeed: () => live.current.seed,
    isBusy: () => live.current.busy,
    emit: (event) => live.current.onEvent(event),
  });

  useEffect(() => {
    const parent = parentRef.current;
    if (!parent) return;
    let cancelled = false;
    let game: GameHandle | null = null;
    const timeout = window.setTimeout(() => {
      if (!cancelled && !gameRef.current) {
        live.current.onEvent({ type: "fail", error: new Error("Phaser did not boot") });
      }
    }, 8000);

    import("@/lib/phaser/create-game")
      .then(({ createDragonWorld }) => {
        if (cancelled || !parent.isConnected) return;
        const instance = createDragonWorld(parent, bridgeRef.current) as unknown as GameHandle;
        game = instance;
        gameRef.current = instance;
        instance.scale.refresh();
      })
      .catch((error: unknown) => {
        live.current.onEvent({ type: "fail", error });
      });

    const ro = new ResizeObserver(() => gameRef.current?.scale.refresh());
    ro.observe(parent);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      ro.disconnect();
      game?.destroy(true);
      gameRef.current = null;
      parent.replaceChildren();
    };
  }, []);

  useEffect(() => {
    const game = gameRef.current;
    if (!game) return;
    if (game.scene.isActive("boot")) return;
    const want = player.scene === "valley" ? "valley" : "hearth";
    if (game.scene.isActive(want)) return;
    game.scene.stop("hearth");
    game.scene.stop("valley");
    game.scene.start(want);
  }, [player.scene]);

  useEffect(() => {
    if (!strikeTick) return;
    queueValleyStrike();
    gameRef.current?.events.emit("valley-strike");
  }, [strikeTick]);

  return (
    <div
      ref={parentRef}
      className="world-stage"
      role="application"
      aria-label={player.scene === "valley" ? "Northern hills" : "Hearth"}
    />
  );
}
