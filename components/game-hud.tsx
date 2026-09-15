"use client";

import type { PlayerState } from "@/lib/types";

export function GameHud({
  player,
  toast,
  hint,
  onInventory,
}: {
  player: PlayerState;
  toast: string;
  hint: string;
  onInventory: () => void;
}) {
  const hp = Math.max(0, player.health);
  const ratio = player.maxHealth > 0 ? hp / player.maxHealth : 0;

  return (
    <div className="game-hud">
      <div className="hud-top">
        <div className="hud-cluster">
          <div className="hud-health" title="Health">
            <span>Health</span>
            <div className="hp-track">
              <div className="hp-fill" style={{ width: `${Math.round(ratio * 100)}%` }} />
            </div>
            <em>
              {hp}/{player.maxHealth}
            </em>
          </div>
          <p className="hud-skills">
            Farming {player.skills.farming.level}
            <span> · </span>
            Combat {player.skills.combat.level}
          </p>
        </div>
        <div className="hud-gold">
          Gold <strong>{player.coins}</strong>
        </div>
      </div>
      {toast ? <p className="hud-toast">{toast}</p> : null}
      <div className="hud-bottom">
        {hint ? <p className="hud-hint">{hint}</p> : <p className="hud-hint">WASD / click. E interact. I pack.</p>}
        <button className="btn-tiny" type="button" onClick={onInventory}>
          Pack (I)
        </button>
      </div>
    </div>
  );
}
