import { PLACEHOLDER_COLORS as C } from "@/lib/phaser/art";

export function cssHex(n: number): string {
  return `#${n.toString(16).padStart(6, "0")}`;
}

export const PALETTE = {
  grass: cssHex(C.grass),
  grassDark: "#6f7d54",
  path: cssHex(C.path),
  floor: cssHex(C.floor),
  wall: cssHex(C.wall),
  forest: cssHex(C.forest),
  soil: cssHex(C.soil),
  timber: "#7a5a40",
  roof: "#a85a3a",
  roofShadow: "#7a3e2a",
  cream: "#f3efe4",
  ink: "#2c241c",
  pilgrim: cssHex(C.pilgrim),
  pilgrimHead: cssHex(C.pilgrimHead),
  bren: "#6a3a28",
  apron: "#f3efe4",
  wolf: cssHex(C.wolf),
  wolfDark: "#3d2a1c",
  fire: "#c45a28",
  fireHot: "#e8c46a",
  wheat: cssHex(C.grainReady),
  sprout: cssHex(C.grainSprout),
  gold: "#c4a35a",
  root: "#8a4a38",
  rootReady: "#c46a48",
  herb: "#4f7a3e",
  herbReady: "#7cb86a",
  stone: "#8a8478",
  sky: "#b7c9c2",
  skyGround: "#6d7a4e",
  sun: "#fff1d6",
} as const;
