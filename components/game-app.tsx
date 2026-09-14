"use client";

import { ITEMS, ITEM_LIST, TILE_DROPS } from "@/lib/items";
import type { ClassId, ItemId, PlayView, PlayerState, WorldState } from "@/lib/types";
import { TILE_LABEL, ZONE, adjacent, tileAt } from "@/lib/world";
import { useCallback, useEffect, useState } from "react";

type Tab = "zone" | "pack" | "market" | "log";

const TILE_CLASS: Record<string, string> = {
  stone: "bg-[#cbbda8] text-[#7a6d5c]",
  path: "bg-[#efe6d4] text-[#6b5d4d]",
  grove: "bg-[#d5e0c8] text-[#3f5340]",
  river: "bg-[#d3e3e6] text-[#35555c]",
  ember: "bg-[#edd4c4] text-[#7a3e28]",
  shrine: "bg-[#e8dfc4] text-[#6a5428]",
  hollow: "bg-[#e4d5b8] text-[#5a4630]",
  temple: "bg-[#f3ead4] text-[#6a4a2a]",
};

async function play(action: string, extra: Record<string, unknown> = {}) {
  const res = await fetch("/api/play", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action, ...extra }),
  });
  const data = (await res.json()) as PlayView & { error?: string };
  if (!res.ok) throw new Error(data.error || data.message || "Action failed");
  return data;
}

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function GameApp() {
  const [player, setPlayer] = useState<PlayerState | null>(null);
  const [world, setWorld] = useState<WorldState | null>(null);
  const [chain, setChain] = useState<PlayView["chain"] | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<Tab>("zone");
  const [price, setPrice] = useState("0.50");
  const [loaded, setLoaded] = useState(false);

  const apply = useCallback((data: PlayView) => {
    setPlayer(data.player ?? null);
    setWorld(data.world);
    setChain(data.chain);
    if (data.message) setMessage(data.message);
  }, []);

  useEffect(() => {
    fetch("/api/play")
      .then((r) => r.json())
      .then((data: PlayView & { player: PlayerState | null }) => {
        setPlayer(data.player);
        setWorld(data.world);
        setChain(data.chain);
      })
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (!player?.classId) return;
      const map: Record<string, string> = {
        ArrowUp: "n",
        ArrowDown: "s",
        ArrowLeft: "w",
        ArrowRight: "e",
        w: "n",
        s: "s",
        a: "w",
        d: "e",
      };
      const dir = map[event.key];
      if (!dir) return;
      event.preventDefault();
      void run("move", { dir });
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player?.classId, busy]);

  async function run(action: string, extra: Record<string, unknown> = {}) {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      apply(await play(action, extra));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  if (!loaded) {
    return (
      <main className="grid min-h-dvh place-items-center">
        <p className="text-[15px] tracking-wide text-[var(--muted)]">Opening the gate…</p>
      </main>
    );
  }

  if (!player) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-6 py-16">
        <p className="eyebrow">Sacred Founders</p>
        <h1>Dragon World</h1>
        <p className="lede">
          A single valley. Spiritual dragons. You keep what you gather. No wallet window at the door.
        </p>
        <button className="btn-primary mt-8" type="button" disabled={busy} onClick={() => run("enter")}>
          Enter as pilgrim
        </button>
        {message ? <p className="mt-4 text-sm text-[var(--ember)]">{message}</p> : null}
      </main>
    );
  }

  if (!player.classId) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-6 py-16">
        <p className="eyebrow">Pilgrim Gate</p>
        <h1>How will you walk the sanctuary?</h1>
        <p className="lede">Your path stays on this pilgrim. Refresh keeps it.</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <button className="card-btn" type="button" disabled={busy} onClick={() => run("choose-class", { classId: "fighter" satisfies ClassId })}>
            <strong>Fighter</strong>
            <span>Steady hands. Ember, ore, and bone answer you.</span>
          </button>
          <button className="card-btn" type="button" disabled={busy} onClick={() => run("choose-class", { classId: "seeker" satisfies ClassId })}>
            <strong>Seeker</strong>
            <span>Quiet eyes. Grove, river, and shrine answer you.</span>
          </button>
        </div>
        {message ? <p className="mt-4 text-sm text-[var(--ember)]">{message}</p> : null}
      </main>
    );
  }

  const tile = tileAt(player.x, player.y);
  const drops = TILE_DROPS[tile];
  const classLabel = player.classId === "fighter" ? "Fighter" : "Seeker";

  return (
    <div className="mx-auto flex min-h-dvh max-w-6xl flex-col px-4 py-4 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--line)] pb-3">
        <div>
          <p className="eyebrow">Sacred Founders · Dragon World</p>
          <h1 className="!text-[1.65rem] !leading-tight">{ZONE.name}</h1>
        </div>
        <p className="text-sm text-[var(--muted)]">
          {player.name} · {classLabel} · {shortAddr(player.walletAddress)}
        </p>
      </header>

      {message ? <p className="banner">{message}</p> : null}

      <div className="mt-4 hidden flex-1 gap-4 lg:grid lg:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.9fr)]">
        <ZonePanel player={player} busy={busy} onMove={(x, y) => run("move-to", { x, y })} onGather={() => run("gather")} />
        <div className="flex flex-col gap-4">
          <PackPanel player={player} busy={busy} onMint={(itemId) => run("mint", { itemId })} onCraft={() => run("craft")} />
          <MarketPanel
            player={player}
            world={world}
            price={price}
            setPrice={setPrice}
            busy={busy}
            onList={(relicId) => run("list", { relicId, priceUsdc: price })}
            onBid={(listingId) => run("bid", { listingId, priceUsdc: price })}
            onApprove={(listingId) => run("approve", { listingId })}
            onDraft={() => run("draft", { kind: "listing" })}
          />
        </div>
      </div>
      <LogPanel player={player} chain={chain} onReceipt={() => run("receipt")} className="mt-4 hidden lg:block" />

      <div className="flex-1 lg:hidden">
        {tab === "zone" ? (
          <ZonePanel player={player} busy={busy} onMove={(x, y) => run("move-to", { x, y })} onGather={() => run("gather")} />
        ) : null}
        {tab === "pack" ? (
          <PackPanel player={player} busy={busy} onMint={(itemId) => run("mint", { itemId })} onCraft={() => run("craft")} />
        ) : null}
        {tab === "market" ? (
          <MarketPanel
            player={player}
            world={world}
            price={price}
            setPrice={setPrice}
            busy={busy}
            onList={(relicId) => run("list", { relicId, priceUsdc: price })}
            onBid={(listingId) => run("bid", { listingId, priceUsdc: price })}
            onApprove={(listingId) => run("approve", { listingId })}
            onDraft={() => run("draft", { kind: "listing" })}
          />
        ) : null}
        {tab === "log" ? <LogPanel player={player} chain={chain} onReceipt={() => run("receipt")} /> : null}
      </div>

      <nav className="sticky bottom-0 mt-4 grid grid-cols-4 gap-2 border-t border-[var(--line)] bg-[var(--parchment)] py-3 lg:hidden">
        {(["zone", "pack", "market", "log"] as Tab[]).map((id) => (
          <button key={id} className={`tab ${tab === id ? "tab-on" : ""}`} type="button" onClick={() => setTab(id)}>
            {id}
          </button>
        ))}
      </nav>

      <p className="mt-3 hidden text-xs text-[var(--muted)] lg:block">
        {TILE_LABEL[tile]}
        {drops ? ` · gather ${ITEMS[drops.primary].name} or ${ITEMS[drops.secondary].name}` : ""} · arrows or WASD to walk
      </p>
    </div>
  );
}

function ZonePanel({
  player,
  busy,
  onMove,
  onGather,
}: {
  player: PlayerState;
  busy: boolean;
  onMove: (x: number, y: number) => void;
  onGather: () => void;
}) {
  const here = tileAt(player.x, player.y);
  return (
    <section className="panel">
      <div className="flex items-center justify-between gap-2">
        <h2>Zone</h2>
        <button className="btn-quiet" type="button" disabled={busy} onClick={onGather}>
          Gather
        </button>
      </div>
      <div
        className="mt-3 grid gap-1"
        style={{ gridTemplateColumns: `repeat(${ZONE.width}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: ZONE.height }).map((_, y) =>
          Array.from({ length: ZONE.width }).map((__, x) => {
            const kind = tileAt(x, y);
            const hereCell = player.x === x && player.y === y;
            const near = adjacent(player.x, player.y, x, y);
            return (
              <button
                key={`${x}-${y}`}
                type="button"
                disabled={busy || kind === "stone" || (!hereCell && !near)}
                onClick={() => (hereCell ? onGather() : onMove(x, y))}
                className={`aspect-square rounded-sm text-[10px] sm:text-xs ${TILE_CLASS[kind]} ${
                  hereCell ? "ring-2 ring-[var(--ink)]" : ""
                }`}
                aria-label={`${TILE_LABEL[kind]} ${x},${y}`}
              >
                {hereCell ? "●" : kind === "path" || kind === "stone" ? "" : TILE_LABEL[kind][0]}
              </button>
            );
          }),
        )}
      </div>
      <p className="mt-3 text-sm text-[var(--muted)]">
        You are on {TILE_LABEL[here]}. Click an adjacent tile to walk. Click your tile or Gather to take from the land.
      </p>
    </section>
  );
}

function PackPanel({
  player,
  busy,
  onMint,
  onCraft,
}: {
  player: PlayerState;
  busy: boolean;
  onMint: (itemId: ItemId) => void;
  onCraft: () => void;
}) {
  return (
    <section className="panel">
      <div className="flex items-center justify-between">
        <h2>Pack</h2>
        <button className="btn-quiet" type="button" disabled={busy} onClick={onCraft}>
          Craft Rune Ink
        </button>
      </div>
      <ul className="mt-3 grid grid-cols-2 gap-2">
        {ITEM_LIST.map((item) => (
          <li key={item.id} className="rounded-sm border border-[var(--line)] px-2 py-2">
            <div className="flex items-baseline justify-between gap-2">
              <span>
                {item.mark} {item.name}
              </span>
              <strong>{player.inventory[item.id]}</strong>
            </div>
            <button
              className="btn-tiny mt-1"
              type="button"
              disabled={busy || player.inventory[item.id] < 1}
              onClick={() => onMint(item.id)}
            >
              Seal as relic
            </button>
          </li>
        ))}
      </ul>
      {player.relics.length ? (
        <div className="mt-3">
          <h3 className="text-sm font-medium">Sealed relics</h3>
          <ul className="mt-1 space-y-1 text-sm">
            {player.relics.map((relic) => (
              <li key={relic.id}>
                {ITEMS[relic.itemId].name} #{relic.tokenId} · {relic.status}
                {relic.listed ? " · listed" : ""}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-3 text-sm text-[var(--muted)]">Seal a gathered gift. It appears here as yours.</p>
      )}
    </section>
  );
}

function MarketPanel({
  player,
  world,
  price,
  setPrice,
  busy,
  onList,
  onBid,
  onApprove,
  onDraft,
}: {
  player: PlayerState;
  world: WorldState | null;
  price: string;
  setPrice: (value: string) => void;
  busy: boolean;
  onList: (relicId: string) => void;
  onBid: (listingId: string) => void;
  onApprove: (listingId: string) => void;
  onDraft: () => void;
}) {
  const unlisted = player.relics.find((r) => !r.listed);
  return (
    <section className="panel">
      <div className="flex items-center justify-between gap-2">
        <h2>Market</h2>
        <button className="btn-quiet" type="button" disabled={busy} onClick={onDraft}>
          Keeper draft
        </button>
      </div>
      <label className="mt-2 block text-sm text-[var(--muted)]">
        USDC
        <input
          className="ml-2 w-24 border border-[var(--line)] bg-transparent px-2 py-1"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
      </label>
      <button
        className="btn-tiny mt-2"
        type="button"
        disabled={busy || !unlisted}
        onClick={() => unlisted && onList(unlisted.id)}
      >
        List my relic
      </button>
      <ul className="mt-3 space-y-2 text-sm">
        {(world?.listings ?? []).map((listing) => (
          <li key={listing.id} className="border-t border-[var(--line)] pt-2">
            <div>
              {ITEMS[listing.itemId].name} · {listing.priceUsdc} USDC · {listing.sellerName} · {listing.status}
            </div>
            {listing.bid ? (
              <div className="text-[var(--muted)]">
                Bid {listing.bid.priceUsdc} from {listing.bid.from}
              </div>
            ) : null}
            <div className="mt-1 flex gap-2">
              {listing.sellerId !== player.id && listing.status === "open" ? (
                <button className="btn-tiny" type="button" disabled={busy} onClick={() => onBid(listing.id)}>
                  Bid
                </button>
              ) : null}
              {(listing.sellerId === player.id || listing.sellerId === "keeper") && listing.status === "open" ? (
                <button className="btn-tiny" type="button" disabled={busy} onClick={() => onApprove(listing.id)}>
                  Approve
                </button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function LogPanel({
  player,
  chain,
  onReceipt,
  className = "",
}: {
  player: PlayerState;
  chain: PlayView["chain"] | null;
  onReceipt: () => void;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      <div className="flex items-center justify-between">
        <h2>Log</h2>
        <button className="btn-quiet" type="button" onClick={onReceipt}>
          Session receipt
        </button>
      </div>
      <p className="mt-1 text-xs text-[var(--muted)]">
        Mint: {chain?.configured ? `Polygon Amoy ${chain.contract}` : "temple ledger until Polygon keys are set"}
      </p>
      <ul className="mt-2 space-y-1 text-sm">
        {player.log.map((entry) => (
          <li key={`${entry.at}-${entry.text}`}>{entry.text}</li>
        ))}
      </ul>
      {player.receipts[0] ? (
        <pre className="mt-3 overflow-auto whitespace-pre-wrap text-xs text-[var(--muted)]">{player.receipts[0].body}</pre>
      ) : null}
    </section>
  );
}
