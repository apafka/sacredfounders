"use client";

import { CROP_META } from "@/lib/crops";
import { TWO_PELTS } from "@/lib/data/quests";
import { countItem } from "@/lib/game/inventory";
import { combatLevel, xpProgress } from "@/lib/game/skills";
import { CROPS, CROP_IDS, type CropId } from "@/lib/data/crops";
import type { PlayerState, SkillId } from "@/lib/types";
import { MiniMap } from "./minimap";

const SKILL_ORDER: { id: SkillId; label: string }[] = [
  { id: "attack", label: "Attack" },
  { id: "defense", label: "Defense" },
  { id: "farming", label: "Farming" },
  { id: "cooking", label: "Cooking" },
];

function SkillRow({ id, label, player }: { id: SkillId; label: string; player: PlayerState }) {
  const skill = player.skills[id];
  const progress = xpProgress(skill.xp);
  return (
    <div className="skill-row" title={`${label} · ${progress.into}/${progress.need} XP`}>
      <span>
        {label} <strong>{skill.level}</strong>
      </span>
      <div className="xp-track">
        <div className="xp-fill" style={{ width: `${Math.round(progress.ratio * 100)}%` }} />
      </div>
    </div>
  );
}

function QuestCard({ player }: { player: PlayerState }) {
  const quest = player.quest;
  if (!quest || quest.status === "complete") {
    return (
      <div className="hud-quest">
        <p className="eyebrow">Quest</p>
        <p>{quest?.status === "complete" ? "Two Pelts for Bren — done." : "Ask Old Bren for work."}</p>
      </div>
    );
  }
  if (quest.status === "available") {
    return (
      <div className="hud-quest">
        <p className="eyebrow">Quest</p>
        <p>
          <strong>{TWO_PELTS.title}</strong>
        </p>
        <p>Talk to Old Bren to accept.</p>
      </div>
    );
  }
  const have = Math.min(countItem(player.inventory, TWO_PELTS.itemId), TWO_PELTS.need);
  return (
    <div className="hud-quest">
      <p className="eyebrow">Quest</p>
      <p>
        <strong>{TWO_PELTS.title}</strong>
      </p>
      <p>
        Wolf Pelts {have}/{TWO_PELTS.need}
      </p>
    </div>
  );
}

export function GameHud({
  player,
  seed,
  toast,
  hint,
  onInventory,
  onUsePotion,
  onEatBread,
  onBake,
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
  onBake?: () => void;
  onRest?: () => void;
  onSeed?: (crop: CropId) => void;
}) {
  const hp = Math.max(0, player.health);
  const ratio = player.maxHealth > 0 ? hp / player.maxHealth : 0;
  const potions = countItem(player.inventory, "health_potion");
  const bread = countItem(player.inventory, "bread");
  const wheat = countItem(player.inventory, "wheat");
  const gear = [player.hasSword ? "Blade" : null, player.hasArmor ? "Armor" : null].filter(Boolean).join(" · ");
  const selected = seed ?? "grain";
  const combat = combatLevel(player.skills);

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
          {gear ? <p className="hud-skills">{gear}</p> : null}
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
      <aside className="hud-rail" aria-label="Skills and map">
        <QuestCard player={player} />
        <div className="hud-skill-panel">
          <p className="eyebrow">Skills</p>
          <p className="combat-level">Combat {combat}</p>
          {SKILL_ORDER.map((skill) => (
            <SkillRow key={skill.id} id={skill.id} label={skill.label} player={player} />
          ))}
        </div>
        <MiniMap player={player} />
      </aside>
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
          {player.scene === "hearth" && onBake ? (
            <button className="btn-tiny" type="button" disabled={wheat < 1} onClick={onBake}>
              Bake bread{wheat > 0 ? ` (${wheat})` : ""}
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
