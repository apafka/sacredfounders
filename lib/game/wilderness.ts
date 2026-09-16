import { enemyDefinition, VALLEY_ENCOUNTERS, type EncounterKind } from "@/lib/data/enemies";
import { RESPAWN_MS } from "@/lib/combat";
import type { EncounterSave, WolfSave } from "@/lib/types";

export function freshEncounters(): EncounterSave[] {
  return VALLEY_ENCOUNTERS.map((spot) => ({
    id: spot.id,
    kind: spot.kind,
    alive: true,
    hp: enemyDefinition(spot.kind).health,
    lootDropped: false,
    lootTaken: false,
  }));
}

export function mirrorWolf(encounters: EncounterSave[]): WolfSave {
  const first = encounters[0];
  if (!first) return { alive: true, hp: 12, peltDropped: false, peltTaken: false };
  return {
    alive: first.alive,
    hp: first.hp,
    peltDropped: first.lootDropped,
    peltTaken: first.lootTaken,
  };
}

export function ensureEncounters(raw?: EncounterSave[] | null, wolf?: WolfSave | null): EncounterSave[] {
  const base = freshEncounters();
  if (raw && raw.length > 0) {
    const byId = new Map(raw.map((item) => [item.id, item]));
    return base.map((spot) => {
      const saved = byId.get(spot.id);
      if (!saved) return spot;
      return {
        id: spot.id,
        kind: saved.kind === "dire" ? "dire" : spot.kind,
        alive: saved.alive,
        hp: saved.alive ? Math.max(1, saved.hp || spot.hp) : 0,
        lootDropped: Boolean(saved.lootDropped),
        lootTaken: Boolean(saved.lootTaken),
      };
    });
  }
  if (!wolf) return base;
  return base.map((spot, index) =>
    index === 0
      ? {
          ...spot,
          alive: wolf.alive,
          hp: wolf.alive ? wolf.hp || spot.hp : 0,
          lootDropped: wolf.peltDropped,
          lootTaken: wolf.peltTaken,
        }
      : spot,
  );
}

export function allEncountersDown(encounters: EncounterSave[]): boolean {
  return encounters.length > 0 && encounters.every((item) => !item.alive);
}

export function shouldTimerRespawn(wipedAt: number | null, now: number, windowMs = RESPAWN_MS): boolean {
  if (!wipedAt || windowMs <= 0) return false;
  return now - wipedAt >= windowMs;
}

export function encounterKindFromId(id: string): EncounterKind {
  return VALLEY_ENCOUNTERS.find((spot) => spot.id === id)?.kind ?? "wolf";
}
