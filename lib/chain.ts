import { ITEM_TYPE_INDEX } from "./items";
import type { ItemId, Relic } from "./types";

export function chainStatus() {
  const privateKey = process.env.MINTER_PRIVATE_KEY;
  const contract = process.env.RELICS_CONTRACT_ADDRESS;
  const configured = Boolean(privateKey && contract && privateKey.startsWith("0x"));
  return {
    configured,
    chainId: 80002,
    name: "Polygon Amoy",
    contract: contract || undefined,
    rpc: process.env.POLYGON_RPC_URL ?? "https://rpc-amoy.polygon.technology",
  };
}

export async function mintOnChain(
  _to: string,
  itemId: ItemId,
  serial: number,
): Promise<{ status: Relic["status"]; chain: Relic["chain"]; tokenId: string; txHash?: string }> {
  const tokenId = `${ITEM_TYPE_INDEX[itemId]}-${serial}`;
  return { status: "ledger", chain: "sanctuary-ledger", tokenId };
}
