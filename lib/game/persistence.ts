import type { PlayerState } from "@/lib/types";

export const PERSISTENCE_VERSION = 1;
export const STORAGE_PREFIX = "sf.dragon-world.v1.";

export type GameSnapshot = {
  version: number;
  playerId: string;
  savedAt: number;
  player: PlayerState;
};

export interface GamePersistence {
  save(snapshot: GameSnapshot): void;
  load(playerId: string): GameSnapshot | null;
  clear(playerId: string): void;
}

function keyFor(playerId: string): string {
  return `${STORAGE_PREFIX}${playerId}`;
}

export function createMemoryPersistence(store = new Map<string, string>()): GamePersistence {
  return {
    save(snapshot) {
      store.set(keyFor(snapshot.playerId), JSON.stringify(snapshot));
    },
    load(playerId) {
      const raw = store.get(keyFor(playerId));
      return raw ? parseSnapshot(raw, playerId) : null;
    },
    clear(playerId) {
      store.delete(keyFor(playerId));
    },
  };
}

export function createLocalStoragePersistence(storage?: Storage | null): GamePersistence {
  const mem = createMemoryPersistence();
  const readStorage = (): Storage | null => {
    if (storage) return storage;
    if (typeof window === "undefined") return null;
    try {
      return window.localStorage;
    } catch {
      return null;
    }
  };

  return {
    save(snapshot) {
      const json = JSON.stringify(snapshot);
      const ls = readStorage();
      if (ls) {
        try {
          ls.setItem(keyFor(snapshot.playerId), json);
          return;
        } catch {
          // fall through to memory
        }
      }
      mem.save(snapshot);
    },
    load(playerId) {
      const ls = readStorage();
      if (ls) {
        try {
          const raw = ls.getItem(keyFor(playerId));
          if (raw) return parseSnapshot(raw, playerId);
        } catch {
          // ignore quota / private mode
        }
      }
      return mem.load(playerId);
    },
    clear(playerId) {
      const ls = readStorage();
      try {
        ls?.removeItem(keyFor(playerId));
      } catch {
        // ignore
      }
      mem.clear(playerId);
    },
  };
}

export function parseSnapshot(raw: string, playerId: string): GameSnapshot | null {
  try {
    const parsed = JSON.parse(raw) as GameSnapshot;
    if (!parsed?.player || parsed.player.id !== playerId) return null;
    if (parsed.version !== PERSISTENCE_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function toSnapshot(player: PlayerState, now = Date.now()): GameSnapshot {
  return {
    version: PERSISTENCE_VERSION,
    playerId: player.id,
    savedAt: now,
    player,
  };
}

/** Prefer the local snapshot for play fields; keep cookie identity. */
export function mergeSession(cookie: PlayerState, local: GameSnapshot | null): PlayerState {
  if (!local || local.playerId !== cookie.id) return cookie;
  return {
    ...local.player,
    id: cookie.id,
    name: cookie.name,
    enteredAt: cookie.enteredAt,
    walletAddress: cookie.walletAddress,
  };
}
