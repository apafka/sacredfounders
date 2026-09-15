"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import type { WorldBridge, WorldEvent } from "@/lib/phaser/bridge";
import { installWindowKeys } from "@/lib/phaser/keys";
import { DragonWorldCanvas } from "@/lib/three/dragon-world";
import type { CropId, PlayerState } from "@/lib/types";

export default function IsoCanvas({
  player,
  seed,
  busy,
  onEvent,
}: {
  player: PlayerState;
  seed: CropId;
  busy: boolean;
  onEvent: (event: WorldEvent) => void;
}) {
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
    const probe = document.createElement("canvas");
    const gl = probe.getContext("webgl2") || probe.getContext("webgl");
    if (!gl) {
      live.current.onEvent({ type: "fail", error: new Error("WebGL is unavailable") });
    }
    return installWindowKeys();
  }, []);

  return (
    <div
      className="world-stage"
      role="application"
      aria-label={player.scene === "valley" ? "Forest path" : "Hearth"}
    >
      <DragonWorldCanvas bridge={bridgeRef.current} scene={player.scene} />
    </div>
  );
}
