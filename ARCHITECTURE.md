# Dragon World V1 — architecture

North star: *A world people would inhabit if every token were worth zero.*

This slice is **Next.js 16 + an isometric Three.js door** (R3F, orthographic camera, warm low-poly placeholders). Phaser 3 remains a zoomed-out fallback (`?view=phaser`). No wallet UI, no chain gameplay. `ENABLE_CHAIN` stays off.

## Scene hierarchy

```
IsoSim (default) / Phaser BootScene (fallback)
  ├─ Hearth   cottage + garden + baker
  └─ Valley   longer path + forest + pack, boar, spider, dire wolf
```

React HUD overlays the canvas. The renderer owns the world; React owns inventory, dialogue, and persistence wiring. Economy still lives in `lib/game-store.ts` — the isometric scene emits the same `WorldBridge` events as Phaser.

```
Hearth
  Ground (tiles → instanced boxes / Phaser tilemap)
  Cottage furniture: bed, fireplace, chest, workbench
  Garden: 3 plots (crop stages)
  Old Bren (person + DeterministicBrain)
  Door (to valley)
  Pilgrim (isometric follow camera)

Valley
  Ground (path → darker forest, longer walk from the door)
  Dragon presence: tracks, scale, carving (not a boss)
  Pack wolves, forest boar, forest spider, dire wolf
  Drops: Wolf Pelt, Boar Tusk, Spider Silk, Dire Hide
  30s respawn at pads while the pilgrim stays
  Door (home)
```

Viewport is **896×576** (28×18 tiles at TILE 32) — about **1.8×** the old 640×448 window — with a following camera. Maps pad east/south so the wider view shows countryside, not empty canvas. The isometric camera shows **22** world units vertically so the 3D cottage does not fill the frame.

## Systems (data-first)

| Layer | Lives in | Notes |
| --- | --- | --- |
| Rendering (iso) | `lib/three/*` | Orthographic isometric camera, lights, low-poly world. No economy math. |
| Rendering (tiles) | `lib/phaser/scenes/*` | Fallback sprites, camera, FX. |
| Game rules | `lib/game-store.ts` | Pure functions. Client + tests + `/api/game`. |
| Items / crops / enemies / NPCs | `lib/data/*` + `lib/types.ts` | Definitions, not scene code. |
| Inventory | `lib/game/inventory.ts` | 20 slots, stacking. |
| Skills | `lib/game/skills.ts` | Attack, Defense, Farming, Cooking. 50 XP / level. |
| Economy | wheat/root/herb → gold; wheat → bread (sink); Bren demand | Baker is a person with needs, not an infinite shop. |
| Quest | `lib/data/quests.ts` | One starter: Two Pelts for Bren. |
| NPC brain | `lib/game/npc.ts` | `DeterministicBrain` demand + buy; `AgentBrain` later. No LLM. |
| Combat | `lib/phaser/wolf-ai.ts` + `lib/combat.ts` | Click → approach → auto-attack. Shared by both renderers. Per-foe 30s respawn. |
| Persistence | `lib/game/persistence.ts` | `GamePersistence.save/load`. |

## Data models

```ts
ItemDefinition   { id, name, type, stackable, maxStack, value }
CropDefinition   { id, name, growthTime, seedItem, harvestItem, harvestAmount, xp, stages }
EnemyDefinition  { id, name, health, damage, attackSpeed, drops, xp }
NpcDefinition    { id, name, lines, buyItem, buyPrice }
SkillState       { xp, level }          // level = 1 + floor(xp / 50)
InventorySlot    { itemId, qty }
Plot             { id, crop, plantedAt } // stage derived from time
GameSnapshot     { version, playerId, savedAt, player }
```

V1 content:

- 3 plots, 1 seed of each crop (wheat / root / herb). Growth **45s / 50s / 40s**. Seed returns on harvest.
- Oven: **1 wheat → 1 bread**. Eat bread for **+6 HP** (Cooking +1 heal / 2 levels). Potion **+10**. Bed full rest. Bake **+12 Cooking XP**.
- Old Bren buys wheat **2**, root **3**, herb **5**, bread **4**. Demand: 3 loaves → **+18 gold** + Farming XP, then 3 grain → **+10 gold**.
- Quest **Two Pelts for Bren**: 2 Wolf Pelts → **+12 gold** + **40 Attack XP**.
- Wilderness: 4 pack wolves, 1 boar, 1 spider, 1 dire wolf. Dead foes respawn in **30s** if you stay. Home still resets.
- Skills: Attack (hits + kills), Defense (taking hits), Farming (harvest / Bren), Cooking (bake). Combat level = floor((Attack+Defense)/2).

## State machine

```
boot → pilgrim gate (cookie identity)
     → playing
          hearth: idle | walk | interact (plot/furniture/bren/door)
          valley: idle | walk | combat | loot
     panels: inventory (I) | dialogue | none
     ESC closes panels

crop:  empty → planted → sprout → growing → ready → empty
wolf:  idle → wander → chase → attack → dead → loot on ground → respawn 30s
bren:  greet | demand (loaves/grain) | quest (two pelts) | offer-buy | shop (DeterministicBrain)
oven:  1 wheat → 1 bread
```

Pilgrim cookie `sf_pilgrim` still identifies the session. `GamePersistence` (localStorage) is the gameplay source of truth for position, gold, inventory, skills, and crops. Cookie writes remain a backup and must not be required mid-combat.

## Implementation order

1. World camera + hearth furniture + WASD/click move
2. Inventory + items HUD
3. Three plots + 45s growth stages
4. Baker dialogue + sell for gold
5. One wolf, auto-attack, HP, damage numbers
6. Pelt pickup + Combat XP
7. GamePersistence
8. Polish (warm light, forest presence, toasts)
9. Zoom out the viewport; isometric Three.js door on the same loop

Out of slice: chain, wallet, marketplace, multiplayer, LLM, second continent, fishing as a feature, class pick, raids.
