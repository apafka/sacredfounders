import { NextResponse } from "next/server";
import { keeperDraft, type DraftKind } from "@/lib/agent";
import { mintOnChain, chainStatus } from "@/lib/chain";
import {
  approveTrade,
  chooseClass,
  craft,
  createPlayer,
  gather,
  listRelic,
  mintItem,
  move,
  moveTo,
  placeBid,
  sessionReceipt,
  type EngineResult,
} from "@/lib/engine";
import { isItemId } from "@/lib/items";
import { newPlayerId, readPlayer, writePlayer } from "@/lib/session";
import { getWorld, setWorld } from "@/lib/store";
import type { ClassId, ItemId, PlayView, PlayerState } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function view(player: PlayerState | null, message?: string): PlayView {
  return {
    player: player as PlayerState,
    world: getWorld(),
    chain: chainStatus(),
    message,
  };
}

function applyResult(result: EngineResult): EngineResult {
  if (result.world) setWorld(result.world);
  return result;
}

export async function GET() {
  const player = await readPlayer();
  return NextResponse.json({
    player,
    world: getWorld(),
    chain: chainStatus(),
  });
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
    return NextResponse.json(view(player, "Entered as pilgrim."));
  }

  if (!player) {
    return NextResponse.json({ error: "Enter as pilgrim first." }, { status: 401 });
  }

  let result: EngineResult;

  switch (action) {
    case "choose-class": {
      const classId = body.classId as ClassId;
      result = chooseClass(player, classId);
      break;
    }
    case "move":
      result = move(player, String(body.dir ?? ""));
      break;
    case "move-to":
      result = moveTo(player, Number(body.x), Number(body.y));
      break;
    case "gather":
      result = gather(player);
      break;
    case "craft":
      result = craft(player, String(body.recipe ?? "rune-ink"));
      break;
    case "mint": {
      if (!isItemId(String(body.itemId))) {
        return NextResponse.json({ error: "Unknown item." }, { status: 400 });
      }
      const itemId = body.itemId as ItemId;
      try {
        const minted = await mintOnChain(player.walletAddress, itemId, player.nextSerial);
        result = mintItem(player, itemId, minted);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Mint failed";
        return NextResponse.json({ ...view(player, message), error: message }, { status: 502 });
      }
      break;
    }
    case "list":
      result = applyResult(
        listRelic(player, getWorld(), String(body.relicId ?? ""), String(body.priceUsdc ?? "")),
      );
      break;
    case "bid":
      result = applyResult(
        placeBid(player, getWorld(), String(body.listingId ?? ""), String(body.priceUsdc ?? "")),
      );
      break;
    case "approve":
      result = applyResult(approveTrade(player, getWorld(), String(body.listingId ?? "")));
      break;
    case "receipt":
      result = sessionReceipt(player);
      break;
    case "draft": {
      const kind = String(body.kind ?? "quest") as DraftKind;
      const text = await keeperDraft(kind, player, getWorld());
      player = {
        ...player,
        log: [{ at: Date.now(), text }, ...player.log].slice(0, 10),
      };
      await writePlayer(player);
      return NextResponse.json(view(player, text));
    }
    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  await writePlayer(result.player);
  return NextResponse.json(view(result.player, result.message));
}
