import { NextResponse } from "next/server";
import { chainStatus } from "@/lib/chain";
import { isCropId, isGoodsId } from "@/lib/crops";
import {
  chooseClass,
  cookLoaf,
  createPlayer,
  fishCreek,
  harvest,
  plant,
  sellToBren,
  setScene,
  wolfLoot,
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
  return NextResponse.json(payload(await readPlayer()));
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
    return NextResponse.json(payload(player, "Entered as pilgrim."));
  }

  if (!player) {
    return NextResponse.json({ error: "Enter as pilgrim first." }, { status: 401 });
  }

  let result: Result;
  switch (action) {
    case "choose-class":
      result = chooseClass(player, body.classId as ClassId);
      break;
    case "plant":
      if (!isCropId(String(body.crop))) {
        return NextResponse.json({ error: "Unknown crop." }, { status: 400 });
      }
      result = plant(player, Number(body.plotId), body.crop as "grain" | "root" | "herb");
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
      if (!isGoodsId(String(body.crop ?? body.good))) {
        return NextResponse.json({ error: "Unknown good." }, { status: 400 });
      }
      result = sellToBren(player, String(body.crop ?? body.good) as GoodsId);
      break;
    case "door":
      result = setScene(player, body.scene === "hearth" ? "hearth" : "valley");
      break;
    case "wolf-loot":
      result = wolfLoot(player);
      break;
    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  await writePlayer(result.player);
  return NextResponse.json(payload(result.player, result.message));
}
