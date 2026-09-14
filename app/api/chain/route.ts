import { NextResponse } from "next/server";
import { chainStatus, mintIfEnabled } from "@/lib/chain";
import { readPlayer } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(chainStatus());
}

export async function POST() {
  const player = await readPlayer();
  if (!player) return NextResponse.json({ error: "Enter as pilgrim first." }, { status: 401 });
  const result = await mintIfEnabled(player.walletAddress, "hearth-relic");
  return NextResponse.json({ ...chainStatus(), ...result });
}
