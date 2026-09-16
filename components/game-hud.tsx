"use client";

import { countItem } from "@/lib/game/inventory";
import type { PlayerState } from "@/lib/types";

export function GameHud({
  player,
  toast,
  hint,
  onInventory,
  onUsePotion,
  onRest,
}: {
  player: PlayerState;
  toast: string;
  hint: string;
  onInventory: () => void;
  onUsePotion?: () => void;
  onRest?: () => void;
}) {
  const hp = Math.max(0, player.health);
  const ratio = player.maxHealth > 0 ? hp / player.maxHealth : 0;
  const potions = countItem(player.inventory, "health_potion");
  const gear = [player.hasSword ? "Blade" : null, player.hasArmor ? "Armor" : null].filter(Boolean).join(" · ");

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
            {gear ? (
              <>
                <span> · </span>
                {gear}
              </>
            ) : null}
          </p>
        </div>
        <div className="hud-gold">
          Gold <strong>{player.coins}</strong>
        </div>
      </div>
      {toast ? <p className="hud-toast">{toast}</p> : null}
      <div className="hud-bottom">
        {hint ? <p className="hud-hint">{hint}</p> : <p className="hud-hint">WASD / click. E interact. I pack. Q potion.</p>}
        <div className="flex flex-wrap gap-2">
          {player.scene === "hearth" && onRest ? (
            <button className="btn-tiny" type="button" onClick={onRest}>
              Rest
            </button>
          ) : null}
          {potions > 0 && onUsePotion ? (
            <button className="btn-tiny" type="button" onClick={onUsePotion}>
              Drink potion ({potions})
            </button>
          ) : null}
          <button className="btn-tiny" type="button" onClick={onInventory}>
            Pack (I)
          </button>
        </div>
      </div>
    </div>
  );
}
