# Dragon World V1 — architecture

North star: *A world people would inhabit if every token were worth zero.*

This slice is **Next.js 16 + an isometric Three.js door** (R3F, orthographic camera, warm low-poly placeholders). Phaser 3 remains a zoomed-out fallback (`?view=phaser`). No wallet UI, no chain gameplay. `ENABLE_CHAIN` stays off.

## Scene hierarchy

```
IsoSim (default) / Phaser BootScene (fallback)
  ├─ Hearth   cottage + garden + baker
  └─ Valley   path + forest edge + one wolf
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
  Ground (path → darker forest)
  Dragon presence: tracks, scale, carving (not a boss)
  One wolf
  Wolf Pelt drop
  Door (home)
```

Viewport is **896×576** (28×18 tiles at TILE 32) — about **1.8×** the old 640×448 window — with a following camera. Maps pad east/south so the wider view shows countryside, not empty canvas. The isometric camera uses the same 18-tile vertical window.

## Systems (data-first)

| Layer | Lives in | Notes |
| --- | --- | --- |
| Rendering (iso) | `lib/three/*` | Orthographic isometric camera, lights, low-poly world. No economy math. |
| Rendering (tiles) | `lib/phaser/scenes/*` | Fallback sprites, camera, FX. |
| Game rules | `lib/game-store.ts` | Pure functions. Client + tests + `/api/game`. |
| Items / crops / enemies / NPCs | `lib/data/*` + `lib/types.ts` | Definitions, not scene code. |
| Inventory | `lib/game/inventory.ts` | 20 slots, stacking. |
| Skills | `lib/game/skills.ts` | Farming + Combat; add more later. |
| Economy | sell wheat → gold | Baker is a sink, not an infinite shop. |
| NPC brain | `lib/game/npc.ts` | `DeterministicBrain` now; `AgentBrain` later. No LLM. |
| Combat | `lib/phaser/wolf-ai.ts` + `lib/combat.ts` | Click → approach → auto-attack. Shared by both renderers. |
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

- 3 plots, 3 wheat seeds, wheat grows in **45s** (planted → sprout → growing → ready).
- Old Bren buys wheat at **2 gold** (three crops → **+6 Gold**).
- One wolf: **12 HP**, player hit **3**, click-to-fight, **Wolf Pelt** drop.
- Skills: harvest → Farming XP; pickup pelt → Combat XP.

## State machine

```
boot → pilgrim gate (cookie identity)
     → playing
          hearth: idle | walk | interact (plot/furniture/bren/door)
          valley: idle | walk | combat | loot
     panels: inventory (I) | dialogue | none
     ESC closes panels

crop:  empty → planted → sprout → growing → ready → empty
wolf:  idle → wander → chase → attack → dead → pelt on ground
bren:  greet | offer-buy (DeterministicBrain)
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

Out of slice: chain, wallet, marketplace, multiplayer, LLM, second continent, fishing/cooking as features, class pick, pack wolves.
