import { createHash, createHmac, randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import type { PlayerState } from "./types";

const COOKIE = "sf_pilgrim";

function key(): Buffer {
  const raw = process.env.SESSION_SECRET ?? "sacred-founders-dragon-world-bootstrap";
  return createHash("sha256").update(raw).digest();
}

function sign(payload: string): string {
  return createHmac("sha256", key()).update(payload).digest("base64url");
}

export function newPlayerId(): string {
  return randomUUID();
}

export function encodePlayer(player: PlayerState): string {
  const json = Buffer.from(JSON.stringify(player), "utf8").toString("base64url");
  return `${json}.${sign(json)}`;
}

export function decodePlayer(token: string | undefined): PlayerState | null {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot < 1) return null;
  const json = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (sign(json) !== sig) return null;
  try {
    const parsed = JSON.parse(Buffer.from(json, "base64url").toString("utf8")) as PlayerState;
    if (!parsed?.id || !parsed.basket || !parsed.plots || !parsed.walletAddress) return null;
    return {
      ...parsed,
      fishSkill: parsed.fishSkill ?? 0,
      cookSkill: parsed.cookSkill ?? 0,
      lastFishAt: parsed.lastFishAt ?? 0,
      basket: {
        grain: parsed.basket.grain ?? 0,
        root: parsed.basket.root ?? 0,
        herb: parsed.basket.herb ?? 0,
        fish: parsed.basket.fish ?? 0,
        loaf: parsed.basket.loaf ?? 0,
      },
    };
  } catch {
    return null;
  }
}

export async function readPlayer(): Promise<PlayerState | null> {
  const jar = await cookies();
  return decodePlayer(jar.get(COOKIE)?.value);
}

export async function writePlayer(player: PlayerState): Promise<void> {
  const jar = await cookies();
  const embedded = process.env.NODE_ENV === "production";
  jar.set(COOKIE, encodePlayer(player), {
    httpOnly: true,
    // Third-party iframe on alanpafka.com needs SameSite=None; Secure.
    // frame-ancestors still limits who may embed the app.
    sameSite: embedded ? "none" : "lax",
    secure: embedded,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}
