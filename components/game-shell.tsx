"use client";

import { useCallback, useEffect, useState } from "react";
import { AuthControls } from "./auth-controls";
import { WorldStage } from "./world-stage";
import type { ClassId, CropId, PlayerState } from "@/lib/types";

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
  const [player, setPlayer] = useState<PlayerState | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [seed, setSeed] = useState<CropId>("grain");

  const apply = useCallback((data: View) => {
    setPlayer(data.player);
    if (data.message) setMessage(data.message);
  }, []);

  useEffect(() => {
    fetch("/api/game")
      .then((r) => r.json())
      .then((data: View) => setPlayer(data.player))
      .finally(() => setLoaded(true));
  }, []);

  async function run(action: string, extra: Record<string, unknown> = {}) {
    if (busy) return;
    setBusy(true);
    try {
      apply(await act(action, extra));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed");
    } finally {
      setBusy(false);
    }
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
        <p className="eyebrow">Sacred Founders</p>
        <h1>Dragon World</h1>
        <p className="lede">A hearth to keep. A door to the valley. You keep what you earn.</p>
        <AuthControls busy={busy} onEnter={() => run("enter")} />
        {message ? <p className="banner">{message}</p> : null}
      </main>
    );
  }

  if (!player.classId) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-6 py-16">
        <p className="eyebrow">Pilgrim Gate</p>
        <h1>How will you walk?</h1>
        <p className="lede">This stays on your pilgrim. Refresh keeps it.</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <button className="card-btn" type="button" disabled={busy} onClick={() => run("choose-class", { classId: "fighter" satisfies ClassId })}>
            <strong>Fighter</strong>
            <span>Toward paladin-like power. The valley wolf answers your strike.</span>
          </button>
          <button className="card-btn" type="button" disabled={busy} onClick={() => run("choose-class", { classId: "spiritual" satisfies ClassId })}>
            <strong>Spiritual</strong>
            <span>Development through garden, herb, and quiet trade with Old Bren.</span>
          </button>
        </div>
        {message ? <p className="banner">{message}</p> : null}
      </main>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-6xl flex-col px-4 py-4 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
        <div>
          <p className="eyebrow">Sacred Founders · Dragon World</p>
          <h1 className="!text-[1.65rem]">{player.scene === "valley" ? "Northern hills" : "Hearth"}</h1>
        </div>
        <p className="text-sm text-[var(--muted)]">
          {player.name} · {player.classId === "fighter" ? "Fighter" : "Spiritual"} · {player.coins} coins · farm {player.farmSkill} · fish {player.fishSkill} · cook {player.cookSkill}
        </p>
      </header>
      {message ? <p className="banner">{message}</p> : null}
      {player.whisper ? <p className="mt-2 text-sm text-[var(--muted)]">{player.whisper}</p> : null}

      <WorldStage
        player={player}
        seed={seed}
        setSeed={setSeed}
        busy={busy}
        onPlant={(plotId) => run("plant", { plotId, crop: seed })}
        onHarvest={(plotId) => run("harvest", { plotId })}
        onFish={() => run("fish")}
        onCook={() => run("cook")}
        onSell={(good) => run("sell", { good })}
        onDoor={(scene) => run("door", { scene })}
        onLoot={() => run("wolf-loot")}
      />
    </div>
  );
}
