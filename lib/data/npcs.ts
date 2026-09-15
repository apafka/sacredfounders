import type { ItemId } from "./items";

export type NpcDefinition = {
  id: string;
  name: string;
  title: string;
  greet: string;
  offer: string;
  thanks: string;
  rumor: string;
  emptyHands: string;
  buyItem: ItemId;
  buyPrice: number;
};

export const BREN: NpcDefinition = {
  id: "bren",
  name: "Old Bren",
  title: "Baker",
  greet: "Morning. Got anything from the garden?",
  offer: "Wheat's what the oven wants. Two gold a sheaf — fair for a first harvest.",
  thanks: "That'll rise by dusk. Don't spend it all staring at the trees.",
  rumor: "Tracks on the north path aren't mine. Some say a dragon slept beyond the pines. Some say it's only weather that walks.",
  emptyHands: "Nothing green on you. The beds out front will wait.",
  buyItem: "wheat",
  buyPrice: 2,
};
