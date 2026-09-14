"use client";

export function PrivyAuth({ address }: { address: string }) {
  return (
    <p className="text-xs text-[var(--muted)]">
      Embedded wallet {address.slice(0, 6)}…{address.slice(-4)} · no modal mid-play
    </p>
  );
}
