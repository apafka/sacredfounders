import { NextResponse } from "next/server";
import { chainStatus } from "@/lib/chain";
import { isCropId, isGoodsId } from "@/lib/crops";
import {
  buySword,
  chooseClass,
  cookLoaf,
  createPlayer,
  fishCreek,
  harvest,
  hydratePlayer,
  pickupPelt,
  plant,
  sellToBren,
  sellWheat,
  setHealth,
  setPosition,
  setScene,
  wolfFalls,
  type Result,
} from "@/lib/game-store";
import { newPlayerId, readPlayer, writePlayer } from "@/lib/session";
import type { ClassId, GoodsId, PlayerState } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function payload(player: PlayerState | null, message?: string) {
  return { player, chain: chainStatus(), message };
}

export async function GET() {
  const player = await readPlayer();
  return NextResponse.json(payload(player ? hydratePlayer(player) : null));
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
  }

  const action = String(body.action ?? "");
  let player = await readPlayer();

  if (action === "enter") {
    player = createPlayer(newPlayerId(), String(body.name ?? "Pilgrim"));
    await writePlayer(player);
    return NextResponse.json(payload(player, "You wake at the hearth."));
  }

  if (!player) {
    return NextResponse.json({ error: "Enter as pilgrim first." }, { status: 401 });
  }

  player = hydratePlayer(player);

  if (action === "sync") {
    const incoming = body.player as PlayerState | undefined;
    if (!incoming || incoming.id !== player.id) {
      return NextResponse.json({ error: "Session mismatch." }, { status: 400 });
    }
    const merged = hydratePlayer({
      ...incoming,
      id: player.id,
      name: player.name,
      enteredAt: player.enteredAt,
      walletAddress: player.walletAddress,
    });
    await writePlayer(merged);
    return NextResponse.json(payload(merged));
  }

  let result: Result;
  switch (action) {
    case "choose-class":
      result = chooseClass(player, body.classId as ClassId);
      break;
    case "plant":
      if (!isCropId(String(body.crop ?? "grain"))) {
        return NextResponse.json({ error: "Unknown crop." }, { status: 400 });
      }
      result = plant(player, Number(body.plotId), (body.crop as "grain" | "root" | "herb") ?? "grain");
      break;
    case "harvest":
      result = harvest(player, Number(body.plotId));
      break;
    case "fish":
      result = fishCreek(player);
      break;
    case "cook":
      result = cookLoaf(player);
      break;
    case "sell":
      if (body.all === true || String(body.crop ?? body.good ?? "grain") === "grain") {
        result = sellWheat(player);
        break;
      }
      if (!isGoodsId(String(body.crop ?? body.good))) {
        return NextResponse.json({ error: "Unknown good." }, { status: 400 });
      }
      result = sellToBren(player, String(body.crop ?? body.good) as GoodsId);
      break;
    case "door":
      result = setScene(player, body.scene === "hearth" ? "hearth" : "valley");
      break;
    case "wolf-loot":
    case "wolf-down":
      result = wolfFalls(player);
      break;
    case "pickup-pelt":
      result = pickupPelt(player);
      break;
    case "buy-sword":
      result = buySword(player);
      break;
    case "health":
      result = {
        player: setHealth(player, Number(body.health)),
        ok: true,
        message: "",
      };
      break;
    case "position":
      result = {
        player: setPosition(player, Number(body.x), Number(body.y)),
        ok: true,
        message: "",
      };
      break;
    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  await writePlayer(result.player);
  return NextResponse.json(payload(result.player, result.message));
}
