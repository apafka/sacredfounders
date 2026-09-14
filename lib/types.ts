export const ITEM_IDS = [
  "ember-scale",
  "moonpetal",
  "river-clay",
  "spirit-thread",
  "ashwood",
  "temple-salt",
  "dawn-ore",
  "whisper-bone",
  "honey-wax",
  "rune-ink",
] as const;

export type ItemId = (typeof ITEM_IDS)[number];
export type ClassId = "fighter" | "seeker";
export type TileKind =
  | "stone"
  | "path"
  | "grove"
  | "river"
  | "ember"
  | "shrine"
  | "hollow"
  | "temple";

export type RelicStatus = "ledger" | "polygon";

export type Relic = {
  id: string;
  itemId: ItemId;
  tokenId: string;
  serial: number;
  status: RelicStatus;
  chain: "sanctuary-ledger" | "polygon-amoy";
  txHash?: string;
  listed: boolean;
  mintedAt: number;
};

export type LogEntry = {
  at: number;
  text: string;
};

export type Bid = {
  id: string;
  listingId: string;
  priceUsdc: string;
  from: string;
  at: number;
};

export type MarketListing = {
  id: string;
  relicId: string;
  itemId: ItemId;
  sellerId: string;
  sellerName: string;
  priceUsdc: string;
  status: "open" | "draft" | "approved";
  bid?: Bid;
  at: number;
};

export type Receipt = {
  id: string;
  at: number;
  title: string;
  body: string;
};

export type PlayerState = {
  id: string;
  name: string;
  classId: ClassId | null;
  enteredAt: number;
  x: number;
  y: number;
  lastActionAt: number;
  gatherCount: number;
  inventory: Record<ItemId, number>;
  relics: Relic[];
  listings: string[];
  log: LogEntry[];
  receipts: Receipt[];
  walletAddress: string;
  nextSerial: number;
};

export type WorldState = {
  listings: MarketListing[];
  quest: string;
};

export type PlayView = {
  player: PlayerState;
  world: WorldState;
  chain: {
    configured: boolean;
    chainId: number;
    name: string;
    contract?: string;
  };
  message?: string;
};
