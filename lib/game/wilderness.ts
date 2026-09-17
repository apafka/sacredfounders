import { enemyDefinition, VALLEY_ENCOUNTERS, type EncounterKind } from "@/lib/data/enemies";
import { RESPAWN_MS } from "@/lib/combat";
import type { EncounterSave, WolfSave } from "@/lib/types";

export function freshEncounter(id: string, kind: EncounterKind): EncounterSave {
  return {
    id,
    kind,
    alive: true,
    hp: enemyDefinition(kind).health,
    lootDropped: false,
    lootTaken: false,
    diedAt: null,
  };
}

export function freshEncounters(): EncounterSave[] {
  return VALLEY_ENCOUNTERS.map((spot) => freshEncounter(spot.id, spot.kind));
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
      const alive = saved.alive;
      return {
        id: spot.id,
        kind: spot.kind,
        alive,
        hp: alive ? Math.max(1, saved.hp || spot.hp) : 0,
        lootDropped: Boolean(saved.lootDropped),
        lootTaken: Boolean(saved.lootTaken),
        diedAt: alive ? null : (saved.diedAt ?? null),
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
          diedAt: wolf.alive ? null : null,
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

export function encounterReadyToRevive(item: EncounterSave, now: number, windowMs = RESPAWN_MS): boolean {
  if (item.alive || windowMs <= 0) return false;
  if (item.diedAt == null) return false;
  return now - item.diedAt >= windowMs;
}

export function reviveTimedEncounters(
  encounters: EncounterSave[],
  now: number,
  windowMs = RESPAWN_MS,
): { encounters: EncounterSave[]; revived: string[] } {
  const revived: string[] = [];
  const next = encounters.map((item) => {
    if (!encounterReadyToRevive(item, now, windowMs)) return item;
    revived.push(item.id);
    return freshEncounter(item.id, item.kind);
  });
  return { encounters: next, revived };
}

export function encounterKindFromId(id: string): EncounterKind {
  return VALLEY_ENCOUNTERS.find((spot) => spot.id === id)?.kind ?? "wolf";
}
