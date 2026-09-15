# Dragon World V1 — architecture

North star: *A world people would inhabit if every token were worth zero.*

This slice stays on **Next.js 16 + Phaser 3** (top-down, warm placeholders). No Three.js, no wallet UI, no chain gameplay. `ENABLE_CHAIN` stays off.

## Scene hierarchy

```
BootScene
  └─ generates placeholder textures (or art-pack keys)
      ├─ HearthScene   cottage + garden + baker
      └─ ValleyScene   path + forest edge + one wolf
```

React HUD overlays the canvas. Phaser owns the world; React owns inventory, dialogue, and persistence wiring.

```
HearthScene
  Ground (tilemap)
  Cottage furniture: bed, fireplace, chest, workbench
  Garden: 3 plots (crop stage sprites)
  Old Bren (person + DeterministicBrain)
  Door (to valley)
  Pilgrim (camera follow)

ValleyScene
  Ground (path → darker forest)
  Dragon presence: tracks, scale, carving (not a boss)
  One wolf
  Wolf Pelt drop
  Door (home)
```

Viewport is 640×448 with a following camera. Maps are larger than the view so walking has a destination.

## Systems (data-first)

| Layer | Lives in | Notes |
| --- | --- | --- |
| Rendering | `lib/phaser/scenes/*` | Sprites, camera, FX. No economy math. |
| Game rules | `lib/game-store.ts` | Pure functions. Client + tests + `/api/game`. |
| Items / crops / enemies / NPCs | `lib/data/*` + `lib/types.ts` | Definitions, not scene code. |
| Inventory | `lib/game/inventory.ts` | 20 slots, stacking. |
| Skills | `lib/game/skills.ts` | Farming + Combat; add more later. |
| Economy | sell wheat → gold | Baker is a sink, not an infinite shop. |
| NPC brain | `lib/game/npc.ts` | `DeterministicBrain` now; `AgentBrain` later. No LLM. |
| Combat | `lib/phaser/wolf-ai.ts` + `lib/combat.ts` | Click → approach → auto-attack. |
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

Out of slice: chain, wallet, marketplace, multiplayer, LLM, second continent, fishing/cooking as features, class pick, pack wolves.
