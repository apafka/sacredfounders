"use client";

import { CROP_META } from "@/lib/crops";
import { countItem } from "@/lib/game/inventory";
import { CROPS, CROP_IDS, type CropId } from "@/lib/data/crops";
import type { PlayerState } from "@/lib/types";

export function GameHud({
  player,
  seed,
  toast,
  hint,
  onInventory,
  onUsePotion,
  onEatBread,
  onRest,
  onSeed,
}: {
  player: PlayerState;
  seed?: CropId;
  toast: string;
  hint: string;
  onInventory: () => void;
  onUsePotion?: () => void;
  onEatBread?: () => void;
  onRest?: () => void;
  onSeed?: (crop: CropId) => void;
}) {
  const hp = Math.max(0, player.health);
  const ratio = player.maxHealth > 0 ? hp / player.maxHealth : 0;
  const potions = countItem(player.inventory, "health_potion");
  const bread = countItem(player.inventory, "bread");
  const gear = [player.hasSword ? "Blade" : null, player.hasArmor ? "Armor" : null].filter(Boolean).join(" · ");
  const selected = seed ?? "grain";

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
          {onSeed ? (
            <div className="seed-row" role="group" aria-label="Seed to plant">
              {CROP_IDS.map((id) => {
                const have = countItem(player.inventory, CROPS[id].seedItem);
                return (
                  <button
                    key={id}
                    type="button"
                    className={`btn-tiny ${selected === id ? "tab-on" : ""}`}
                    onClick={() => onSeed(id)}
                  >
                    {CROP_META[id].name} {have}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
        <div className="hud-gold">
          Gold <strong>{player.coins}</strong>
        </div>
      </div>
      {toast ? <p className="hud-toast">{toast}</p> : null}
      <div className="hud-bottom">
        {hint ? (
          <p className="hud-hint">{hint}</p>
        ) : (
          <p className="hud-hint">WASD / click. E interact. I pack. Q potion. B bread.</p>
        )}
        <div className="flex flex-wrap gap-2">
          {player.scene === "hearth" && onRest ? (
            <button className="btn-tiny" type="button" onClick={onRest}>
              Rest
            </button>
          ) : null}
          {bread > 0 && onEatBread ? (
            <button className="btn-tiny" type="button" onClick={onEatBread}>
              Eat bread ({bread})
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
