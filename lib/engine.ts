import { EMPTY_INVENTORY, ITEMS, TILE_DROPS } from "./items";
import type { ClassId, ItemId, PlayerState, Relic, WorldState } from "./types";
import { ITEM_IDS } from "./types";
import { adjacent, tileAt, walkable, ZONE } from "./world";

export type Rng = () => number;

export type EngineResult = {
  player: PlayerState;
  world?: WorldState;
  ok: boolean;
  message: string;
};

const DIRS: Record<string, { x: number; y: number }> = {
  n: { x: 0, y: -1 },
  s: { x: 0, y: 1 },
  w: { x: -1, y: 0 },
  e: { x: 1, y: 0 },
};

export function emptyWorld(): WorldState {
  return {
    listings: [
      {
        id: "keeper-ember-1",
        relicId: "keeper-relic-1",
        itemId: "ember-scale",
        sellerId: "keeper",
        sellerName: "Keeper of the Vale",
        priceUsdc: "0.50",
        status: "open",
        at: Date.now(),
      },
      {
        id: "keeper-petal-1",
        relicId: "keeper-relic-2",
        itemId: "moonpetal",
        sellerId: "keeper",
        sellerName: "Keeper of the Vale",
        priceUsdc: "0.25",
        status: "open",
        at: Date.now(),
      },
    ],
    quest: "Gather one gift from the land, then seal it at the temple so it is yours.",
  };
}

export function sessionWalletAddress(playerId: string): string {
  let hash = 2166136261;
  const input = `sf-embedded:${playerId}`;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const hex = Math.abs(hash).toString(16).padStart(8, "0");
  const rest = Array.from(playerId.replace(/-/g, ""))
    .map((ch) => ch.charCodeAt(0).toString(16).slice(-2))
    .join("")
    .padEnd(32, "a");
  return `0x${(hex + rest).slice(0, 40)}`;
}

export function createPlayer(id: string, name: string, now = Date.now()): PlayerState {
  const trimmed = name.trim().slice(0, 24) || "Pilgrim";
  return {
    id,
    name: trimmed,
    classId: null,
    enteredAt: now,
    x: ZONE.spawn.x,
    y: ZONE.spawn.y,
    lastActionAt: 0,
    gatherCount: 0,
    inventory: { ...EMPTY_INVENTORY },
    relics: [],
    listings: [],
    log: [
      {
        at: now,
        text: "You stand at the temple threshold. Choose how you will walk.",
      },
    ],
    receipts: [],
    walletAddress: sessionWalletAddress(id),
    nextSerial: 1,
  };
}

function pushLog(player: PlayerState, text: string, now: number): PlayerState {
  return {
    ...player,
    log: [{ at: now, text }, ...player.log].slice(0, 10),
  };
}

function cooldownOk(player: PlayerState, now: number, ms = 280): boolean {
  return now - player.lastActionAt >= ms;
}

export function chooseClass(player: PlayerState, classId: ClassId, now = Date.now()): EngineResult {
  if (player.classId) {
    return { player, ok: false, message: "You already chose a path." };
  }
  if (classId !== "fighter" && classId !== "seeker") {
    return { player, ok: false, message: "Unknown path." };
  }
  const label = classId === "fighter" ? "Fighter" : "Seeker";
  return {
    player: pushLog(
      { ...player, classId, lastActionAt: now },
      `${label}. The sanctuary opens. You keep what you earn.`,
      now,
    ),
    ok: true,
    message: `${label} path taken.`,
  };
}

export function move(player: PlayerState, dir: string, now = Date.now()): EngineResult {
  if (!player.classId) return { player, ok: false, message: "Choose a path first." };
  const step = DIRS[dir];
  if (!step) return { player, ok: false, message: "You cannot go that way." };
  const x = player.x + step.x;
  const y = player.y + step.y;
  if (!walkable(x, y)) return { player, ok: false, message: "Stone blocks the way." };
  return {
    player: { ...player, x, y, lastActionAt: now },
    ok: true,
    message: `Moved to ${tileAt(x, y)}.`,
  };
}

export function moveTo(player: PlayerState, x: number, y: number, now = Date.now()): EngineResult {
  if (!player.classId) return { player, ok: false, message: "Choose a path first." };
  if (x === player.x && y === player.y) {
    return { player, ok: true, message: "You are here." };
  }
  if (!adjacent(player.x, player.y, x, y) || !walkable(x, y)) {
    return { player, ok: false, message: "Take one step at a time." };
  }
  return {
    player: { ...player, x, y, lastActionAt: now },
    ok: true,
    message: `Moved to ${tileAt(x, y)}.`,
  };
}

export function gather(player: PlayerState, rng: Rng = Math.random, now = Date.now()): EngineResult {
  if (!player.classId) return { player, ok: false, message: "Choose a path first." };
  if (!cooldownOk(player, now)) return { player, ok: false, message: "A breath, then again." };
  const tile = tileAt(player.x, player.y);
  if (tile === "temple") {
    return {
      player: pushLog(player, "The temple is for sealing and craft, not gathering.", now),
      ok: false,
      message: "Nothing to gather here. Use the temple to craft or seal.",
    };
  }
  const drops = TILE_DROPS[tile];
  if (!drops) {
    return { player, ok: false, message: "Bare path. Step to grove, river, ember, shrine, or hollow." };
  }

  const bonusTile =
    (player.classId === "fighter" && (tile === "ember" || tile === "hollow")) ||
    (player.classId === "seeker" && (tile === "grove" || tile === "shrine" || tile === "river"));
  const takeSecondary = rng() < (bonusTile ? 0.55 : 0.18);
  const itemId = takeSecondary ? drops.secondary : drops.primary;
  const extra = bonusTile && rng() < 0.22 ? 1 : 0;
  const amount = 1 + extra;
  const inventory = { ...player.inventory, [itemId]: player.inventory[itemId] + amount };
  const itemName = ITEMS[itemId].name;
  const text =
    amount > 1
      ? `Your path helps. You gather ${amount} ${itemName}.`
      : `You gather ${itemName}.`;
  return {
    player: pushLog(
      {
        ...player,
        inventory,
        gatherCount: player.gatherCount + 1,
        lastActionAt: now,
      },
      text,
      now,
    ),
    ok: true,
    message: text,
  };
}

export function craft(player: PlayerState, recipe: string, now = Date.now()): EngineResult {
  if (!player.classId) return { player, ok: false, message: "Choose a path first." };
  if (tileAt(player.x, player.y) !== "temple") {
    return { player, ok: false, message: "Craft at the temple." };
  }
  if (recipe !== "rune-ink") return { player, ok: false, message: "Unknown recipe." };
  if (player.inventory.moonpetal < 1 || player.inventory["ember-scale"] < 1) {
    return { player, ok: false, message: "Rune Ink needs 1 Moonpetal and 1 Ember Scale." };
  }
  const inventory = {
    ...player.inventory,
    moonpetal: player.inventory.moonpetal - 1,
    "ember-scale": player.inventory["ember-scale"] - 1,
    "rune-ink": player.inventory["rune-ink"] + 1,
  };
  const text = "You grind moonpetal into ember scale. Rune Ink is ready.";
  return {
    player: pushLog({ ...player, inventory, lastActionAt: now }, text, now),
    ok: true,
    message: text,
  };
}

export function mintItem(
  player: PlayerState,
  itemId: ItemId,
  minted: { status: Relic["status"]; chain: Relic["chain"]; tokenId: string; txHash?: string },
  now = Date.now(),
): EngineResult {
  if (!player.classId) return { player, ok: false, message: "Choose a path first." };
  if (!ITEM_IDS.includes(itemId)) return { player, ok: false, message: "Unknown item." };
  if (player.inventory[itemId] < 1) {
    return { player, ok: false, message: `No ${ITEMS[itemId].name} to seal.` };
  }
  const relic: Relic = {
    id: `relic-${player.id}-${player.nextSerial}`,
    itemId,
    tokenId: minted.tokenId,
    serial: player.nextSerial,
    status: minted.status,
    chain: minted.chain,
    txHash: minted.txHash,
    listed: false,
    mintedAt: now,
  };
  const inventory = { ...player.inventory, [itemId]: player.inventory[itemId] - 1 };
  const where =
    minted.status === "polygon"
      ? `Polygon Amoy as #${minted.tokenId}`
      : `the temple ledger as #${minted.tokenId}`;
  const text = `Sealed ${ITEMS[itemId].name} to ${where}. It is yours.`;
  return {
    player: pushLog(
      {
        ...player,
        inventory,
        relics: [relic, ...player.relics].slice(0, 16),
        nextSerial: player.nextSerial + 1,
        lastActionAt: now,
      },
      text,
      now,
    ),
    ok: true,
    message: text,
  };
}

function validUsdc(price: string): boolean {
  return /^\d+(\.\d{1,2})?$/.test(price) && Number(price) > 0 && Number(price) <= 10000;
}

export function listRelic(
  player: PlayerState,
  world: WorldState,
  relicId: string,
  priceUsdc: string,
  now = Date.now(),
): EngineResult {
  if (!validUsdc(priceUsdc)) {
    return { player, world, ok: false, message: "Price must be a USDC amount like 0.50." };
  }
  const relic = player.relics.find((r) => r.id === relicId);
  if (!relic) return { player, world, ok: false, message: "That relic is not in your pack." };
  if (relic.listed) return { player, world, ok: false, message: "Already listed." };
  const listingId = `list-${relic.id}`;
  const listing = {
    id: listingId,
    relicId: relic.id,
    itemId: relic.itemId,
    sellerId: player.id,
    sellerName: player.name,
    priceUsdc,
    status: "open" as const,
    at: now,
  };
  const relics = player.relics.map((r) => (r.id === relicId ? { ...r, listed: true } : r));
  const text = `Listed ${ITEMS[relic.itemId].name} for ${priceUsdc} USDC. Trade waits for your approve.`;
  return {
    player: pushLog(
      { ...player, relics, listings: [listingId, ...player.listings], lastActionAt: now },
      text,
      now,
    ),
    world: { ...world, listings: [listing, ...world.listings].slice(0, 24) },
    ok: true,
    message: text,
  };
}

export function placeBid(
  player: PlayerState,
  world: WorldState,
  listingId: string,
  priceUsdc: string,
  now = Date.now(),
): EngineResult {
  if (!validUsdc(priceUsdc)) {
    return { player, world, ok: false, message: "Bid must be a USDC amount like 0.50." };
  }
  const listing = world.listings.find((l) => l.id === listingId);
  if (!listing || listing.status !== "open") {
    return { player, world, ok: false, message: "No open listing." };
  }
  if (listing.sellerId === player.id) {
    return { player, world, ok: false, message: "You already posted this listing." };
  }
  const bid = {
    id: `bid-${player.id}-${now}`,
    listingId,
    priceUsdc,
    from: player.name,
    at: now,
  };
  const listings = world.listings.map((l) => (l.id === listingId ? { ...l, bid } : l));
  const text = `Bid ${priceUsdc} USDC on ${ITEMS[listing.itemId].name}. Nothing moves until a human approves.`;
  return {
    player: pushLog({ ...player, lastActionAt: now }, text, now),
    world: { ...world, listings },
    ok: true,
    message: text,
  };
}

export function approveTrade(
  player: PlayerState,
  world: WorldState,
  listingId: string,
  now = Date.now(),
): EngineResult {
  const listing = world.listings.find((l) => l.id === listingId);
  if (!listing) return { player, world, ok: false, message: "No such listing." };
  if (listing.sellerId !== player.id && listing.sellerId !== "keeper") {
    return { player, world, ok: false, message: "Only the seller (or a keeper draft you accept) can approve." };
  }
  const listings = world.listings.map((l) =>
    l.id === listingId ? { ...l, status: "approved" as const } : l,
  );
  const text = `Approved ${ITEMS[listing.itemId].name} at ${listing.bid?.priceUsdc ?? listing.priceUsdc} USDC. Settlement stays paused until Polygon USDC is wired — the agent never moves funds.`;
  return {
    player: pushLog({ ...player, lastActionAt: now }, text, now),
    world: { ...world, listings },
    ok: true,
    message: text,
  };
}

export function sessionReceipt(player: PlayerState, now = Date.now()): EngineResult {
  const sealed = player.relics.length;
  const gathered = ITEM_IDS.reduce((sum, id) => sum + player.inventory[id], 0);
  const body = [
    `${player.name} · ${player.classId ?? "unsworn"}`,
    `Wallet ${player.walletAddress}`,
    `Gathered stacks in pack: ${gathered}`,
    `Relics sealed: ${sealed}`,
    sealed
      ? player.relics
          .slice(0, 6)
          .map((r) => `${ITEMS[r.itemId].name} #${r.tokenId} (${r.status})`)
          .join("; ")
      : "No relics yet.",
  ].join("\n");
  const receipt = {
    id: `rcpt-${now}`,
    at: now,
    title: "Session receipt",
    body,
  };
  return {
    player: {
      ...player,
      receipts: [receipt, ...player.receipts].slice(0, 3),
      lastActionAt: now,
    },
    ok: true,
    message: body,
  };
}

export function inventoryTotal(player: PlayerState): number {
  return ITEM_IDS.reduce((sum, id) => sum + player.inventory[id], 0);
}
