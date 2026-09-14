"use client";

export function AuthControls({ busy, onEnter }: { busy: boolean; onEnter: () => void }) {
  return (
    <button className="btn-primary mt-8" type="button" disabled={busy} onClick={onEnter}>
      Enter as pilgrim
    </button>
  );
}
