export function chainEnabled(): boolean {
  return process.env.ENABLE_CHAIN === "true";
}

export function chainStatus() {
  return {
    enabled: chainEnabled(),
    chainId: 80002,
    name: "Polygon Amoy",
  };
}

export async function mintIfEnabled(address: string, label: string) {
  if (!chainEnabled()) {
    return { ok: true, skipped: true as const, reason: "ENABLE_CHAIN is off", address, label };
  }
  return {
    ok: true,
    skipped: false as const,
    tx: "pending-paymaster",
    address,
    label,
  };
}
