"use client";

import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useRef, useState, type MutableRefObject } from "react";
import * as THREE from "three";
import { PLAYER_MAX_HP, RESPAWN_MS, mitigateDamage, playerStrikeDamage } from "@/lib/combat";
import { CROPS } from "@/lib/data/crops";
import { plotReady, plotStage } from "@/lib/crops";
import { countItem } from "@/lib/game/inventory";
import { enemyDefinition } from "@/lib/data/enemies";
import { CROP_META, type Scene } from "@/lib/types";
import type { WorldBridge } from "@/lib/phaser/bridge";
import { consumeInteract, windowAxis } from "@/lib/phaser/keys";
import {
  HEARTH_PLOTS,
  HEARTH_SPOTS,
  HEARTH_TILES,
  TILE,
  VALLEY_SPOTS,
  VALLEY_TILES,
  isDoorTile,
  isWalkable,
  tileAt,
  tileFromWorld,
  worldCenter,
} from "@/lib/phaser/layout";
import { hearthRoute, slide, stepToward } from "@/lib/phaser/move";
import {
  ATTACK_RANGE,
  PLAYER_ATTACK_MS,
  PLAYER_SPEED,
  STRIKE_RANGE,
  lootVisible,
  nearestLiving,
  spawnValleyFoes,
  spawnWanderBounds,
  tickWolf,
  tryStrike,
  valleyMapBounds,
  type Foe,
} from "@/lib/phaser/wolf-ai";
import { clampDelta, pxToWorld, worldToPx } from "./coords";
import { ISO_DISTANCE, isoCameraPosition, isoZoomForViewport } from "./engine";
import { PALETTE } from "./palette";
import { FloatText, HpBar, MarkerRing, PeltDrop, PilgrimMesh, WolfMesh } from "./prefabs";
import { HearthWorld, ValleyWorld, type HearthJob, type ValleyJob } from "./world";

const REACH_HEARTH = 28;
const INTERACT = 36;
const REACH_VALLEY = 12;

type Floater = { id: number; text: string; color: string; x: number; z: number; born: number };
type Tint = "hit" | "agro" | "dead" | null;

function jobPos(job: HearthJob): { x: number; y: number } {
  if (job.kind === "plot") {
    const plot = HEARTH_PLOTS.find((item) => item.id === job.plotId) ?? HEARTH_PLOTS[0];
    return worldCenter(plot.col, plot.row);
  }
  const spot = HEARTH_SPOTS[job.kind];
  return worldCenter(spot.col, spot.row);
}

function nearestHearthJob(x: number, y: number): HearthJob | null {
  for (const plot of HEARTH_PLOTS) {
    const pos = worldCenter(plot.col, plot.row);
    if (Math.hypot(x - pos.x, y - pos.y) < TILE) return { kind: "plot", plotId: plot.id };
  }
  const furniture: { kind: Exclude<HearthJob["kind"], "plot">; radius: number }[] = [
    { kind: "fire", radius: TILE * 1.2 },
    { kind: "bed", radius: TILE * 1.35 },
    { kind: "chest", radius: TILE * 1.2 },
    { kind: "workbench", radius: TILE * 1.45 },
    { kind: "bren", radius: TILE * 1.8 },
    { kind: "door", radius: TILE * 1.1 },
  ];
  for (const item of furniture) {
    const pos = worldCenter(HEARTH_SPOTS[item.kind].col, HEARTH_SPOTS[item.kind].row);
    if (Math.hypot(x - pos.x, y - pos.y) < item.radius) return { kind: item.kind };
  }
  return null;
}

function sceneStart(bridge: WorldBridge, scene: Scene) {
  const player = bridge.getPlayer();
  const saved = player.position && player.scene === scene ? player.position : null;
  const pad = scene === "valley" ? VALLEY_SPOTS.spawn : HEARTH_SPOTS.spawn;
  const start = saved ?? worldCenter(pad.col, pad.row);
  return { player, start };
}

function emptyUi(foes: Foe[]) {
  const visible: Record<string, boolean> = {};
  const tint: Record<string, Tint> = {};
  const loot: Record<string, boolean> = {};
  for (const foe of foes) {
    visible[foe.id] = foe.hp > 0;
    tint[foe.id] = foe.hp > 0 ? null : "dead";
    loot[foe.id] = false;
  }
  return { visible, tint, loot };
}

export function IsoSim({ bridge, scene }: { bridge: WorldBridge; scene: Scene }) {
  const boot = sceneStart(bridge, scene);
  const startWorld = pxToWorld(boot.start.x, boot.start.y);
  const pilgrim = useRef<THREE.Group>(null);
  const foeMeshes = useRef<Record<string, THREE.Group | null>>({});
  const look = useRef(startWorld);
  const body = useRef({ x: boot.start.x, y: boot.start.y, hp: boot.player.health || PLAYER_MAX_HP });
  const dest = useRef({ x: boot.start.x, y: boot.start.y });
  const waypoints = useRef<{ x: number; y: number }[]>([]);
  const moving = useRef(false);
  const huntingId = useRef<string | null>(null);
  const job = useRef<HearthJob | null>(null);
  const foes = useRef<Foe[]>(spawnValleyFoes(boot.player));
  const attackCd = useRef(0);
  const usedDoor = useRef(false);
  const reported = useRef(new Set(foes.current.filter((foe) => foe.hp <= 0).map((foe) => foe.id)));
  const persistAt = useRef(0);
  const cropTick = useRef(0);
  const flipped = useRef(false);
  const timerArmed = useRef(false);
  const [marker, setMarker] = useState({ x: 0, z: 0, on: false });
  const [floats, setFloats] = useState<Floater[]>([]);
  const [lootOn, setLootOn] = useState<Record<string, boolean>>(() => {
    const loot: Record<string, boolean> = {};
    for (const foe of foes.current) loot[foe.id] = lootVisible(boot.player, foe.id);
    return loot;
  });
  const [foeTint, setFoeTint] = useState<Record<string, Tint>>(() => {
    const tint: Record<string, Tint> = {};
    for (const foe of foes.current) tint[foe.id] = foe.hp > 0 ? null : "dead";
    return tint;
  });
  const [foeVisible, setFoeVisible] = useState<Record<string, boolean>>(() => {
    const visible: Record<string, boolean> = {};
    for (const foe of foes.current) visible[foe.id] = foe.hp > 0;
    return visible;
  });
  const [tick, setTick] = useState(0);
  const floatId = useRef(1);

  const spawn = () => {
    const next = sceneStart(bridge, scene);
    body.current = { x: next.start.x, y: next.start.y, hp: next.player.health || PLAYER_MAX_HP };
    dest.current = { x: next.start.x, y: next.start.y };
    look.current = pxToWorld(next.start.x, next.start.y);
    foes.current = spawnValleyFoes(next.player);
    usedDoor.current = false;
    huntingId.current = null;
    timerArmed.current = false;
    reported.current = new Set(foes.current.filter((foe) => foe.hp <= 0).map((foe) => foe.id));
    const ui = emptyUi(foes.current);
    for (const foe of foes.current) ui.loot[foe.id] = lootVisible(next.player, foe.id);
    setLootOn(ui.loot);
    setFoeVisible(ui.visible);
    setFoeTint(ui.tint);
    setMarker({ x: 0, z: 0, on: false });
  };

  useEffect(() => {
    spawn();
    const w = look.current;
    pilgrim.current?.position.set(w.x, 0, w.z);
    for (const foe of foes.current) {
      const mesh = foeMeshes.current[foe.id];
      if (!mesh) continue;
      const ww = pxToWorld(foe.x, foe.y);
      mesh.position.set(ww.x, 0, ww.z);
    }
    if (scene === "hearth") {
      bridge.emit({
        type: "hint",
        text: "This is your hearth. Three beds, three seeds. WASD or click to walk. Oven inside. Old Bren waits on the path.",
      });
    } else {
      const living = foes.current.filter((foe) => foe.hp > 0).length;
      bridge.emit({
        type: "hint",
        text:
          living > 0
            ? "The woods run longer now. A pack on the path, something larger further in. Click to fight."
            : "The forest keeps its own counsel. Home will wake the pack again.",
      });
    }
    // spawn + hint once per scene mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene]);

  const puff = (x: number, z: number, text: string, color: string) => {
    const id = floatId.current;
    floatId.current += 1;
    setFloats((list) => [...list.slice(-6), { id, text, color, x, z, born: performance.now() }]);
    window.setTimeout(() => {
      setFloats((list) => list.filter((item) => item.id !== id));
    }, 800);
  };

  const walkTo = (px: number, py: number, nextJob: HearthJob | null = null) => {
    const route =
      scene === "hearth" ? hearthRoute(body.current.x, body.current.y, px, py) : [{ x: px, y: py }];
    const first = route[0] ?? { x: px, y: py };
    waypoints.current = route.slice(1);
    dest.current = first;
    job.current = nextJob;
    moving.current = true;
    huntingId.current = null;
    flipped.current = first.x < body.current.x;
    const w = pxToWorld(px, py);
    setMarker({ x: w.x, z: w.z, on: true });
    if (Math.hypot(body.current.x - px, body.current.y - py) < REACH_HEARTH) {
      moving.current = false;
      waypoints.current = [];
      setMarker((m) => ({ ...m, on: false }));
      if (nextJob) runHearthJob(nextJob);
    }
  };

  const runHearthJob = (next: HearthJob) => {
    job.current = null;
    if (bridge.isBusy()) {
      bridge.emit({ type: "hint", text: "A breath — the hearth is still working." });
      return;
    }
    const player = bridge.getPlayer();
    if (next.kind === "plot") {
      const plot = player.plots[next.plotId];
      if (!plot) return;
      if (!plot.crop) {
        const seed = bridge.getSeed();
        const def = CROPS[seed];
        if (countItem(player.inventory, def.seedItem) < 1) {
          bridge.emit({
            type: "hint",
            text: `No ${def.name.toLowerCase()} seed. Pick another crop (1–3), or harvest.`,
          });
          return;
        }
        bridge.emit({ type: "plant", plotId: next.plotId });
        puff(look.current.x, look.current.z, `Planted ${def.name}`, "#c4a35a");
        return;
      }
      if (plot.plantedAt != null && plotReady(plot.plantedAt, plot.crop, player.skills.farming.xp, Date.now())) {
        bridge.emit({ type: "harvest", plotId: next.plotId });
        puff(look.current.x, look.current.z, "Harvested", "#c4a35a");
      } else {
        const stage = plot.plantedAt != null ? plotStage(plot.plantedAt, plot.crop, Date.now()) : "empty";
        bridge.emit({ type: "hint", text: `${CROP_META[plot.crop].name} is still ${stage}.` });
      }
      return;
    }
    if (next.kind === "fire") {
      bridge.emit({ type: "hint", text: "The fire kept. Warmth enough to stay a week — or leave in a minute." });
      return;
    }
    if (next.kind === "bed") {
      const missing = player.maxHealth - player.health;
      if (missing > 0) {
        body.current.hp = player.maxHealth;
        puff(look.current.x, look.current.z, `+${missing} HP`, "#6d7a4e");
      } else {
        puff(look.current.x, look.current.z, "Already rested", "#c4a35a");
        bridge.emit({ type: "hint", text: "You lie down. You are already rested." });
      }
      bridge.emit({ type: "rest-bed" });
      return;
    }
    if (next.kind === "chest") {
      bridge.emit({ type: "inventory" });
      bridge.emit({ type: "hint", text: "A chest for later. For now, what you carry is on you. Press I." });
      return;
    }
    if (next.kind === "workbench") {
      if (countItem(player.inventory, "wheat") < 1) {
        bridge.emit({ type: "hint", text: "The oven wants a sheaf of wheat. Harvest the garden, then come back." });
        return;
      }
      puff(look.current.x, look.current.z, "Baked", "#c4a35a");
      bridge.emit({ type: "bake-bread" });
      return;
    }
    if (next.kind === "bren") {
      bridge.emit({ type: "talk-bren" });
      return;
    }
    openDoor("valley");
  };

  const openDoor = (target: Scene) => {
    if (usedDoor.current || bridge.isBusy()) return;
    usedDoor.current = true;
    if (scene === "valley") bridge.emit({ type: "health", health: body.current.hp });
    bridge.emit({ type: "door", scene: target });
  };

  const takePelt = (id: string) => {
    if (!lootOn[id] || bridge.isBusy()) return;
    setLootOn((prev) => ({ ...prev, [id]: false }));
    const foe = foes.current.find((item) => item.id === id);
    const text = foe?.kind === "dire" ? "Dire Hide acquired." : "Wolf Pelt acquired.";
    bridge.emit({ type: "pickup-pelt", id });
    bridge.emit({ type: "toast", text });
    if (foe) {
      const w = pxToWorld(foe.x, foe.y);
      puff(w.x, w.z, text, "#c4a35a");
    }
  };

  const onFoeDown = (foe: Foe) => {
    if (reported.current.has(foe.id)) return;
    reported.current.add(foe.id);
    if (huntingId.current === foe.id) huntingId.current = null;
    foe.mode = "dead";
    setFoeTint((prev) => ({ ...prev, [foe.id]: "dead" }));
    setFoeVisible((prev) => ({ ...prev, [foe.id]: false }));
    setLootOn((prev) => ({ ...prev, [foe.id]: true }));
    const w = pxToWorld(foe.x, foe.y);
    puff(w.x, w.z, foe.kind === "dire" ? "The dire wolf falls" : "The wolf falls", "#c4a35a");
    bridge.emit({ type: "wolf-down", id: foe.id });
    bridge.emit({
      type: "hint",
      text: foe.kind === "dire" ? "A heavy hide in the grass. Click it." : "A pelt in the grass. Click it.",
    });
  };

  const tryAttack = (id: string) => {
    const foe = foes.current.find((item) => item.id === id);
    if (!foe || foe.hp <= 0 || body.current.hp <= 0) {
      huntingId.current = null;
      return false;
    }
    const damage = playerStrikeDamage(bridge.getPlayer().hasSword);
    const next = tryStrike(body.current, foe, damage);
    if (next) {
      foe.hp = next.hp;
      foe.hitFlash = 180;
      foe.mode = next.hp <= 0 ? "dead" : foe.mode;
      attackCd.current = PLAYER_ATTACK_MS;
      setFoeTint((prev) => ({ ...prev, [foe.id]: "hit" }));
      window.setTimeout(() => {
        setFoeTint((prev) => ({ ...prev, [foe.id]: foe.hp > 0 ? "agro" : "dead" }));
      }, 140);
      const w = pxToWorld(foe.x, foe.y);
      puff(w.x, w.z, `-${damage}`, "#f3efe4");
      flipped.current = foe.x < body.current.x;
      if (foe.hp <= 0) onFoeDown(foe);
      return true;
    }
    huntingId.current = foe.id;
    walkTo(foe.x, foe.y);
    return false;
  };

  const onHearthJob = (next: HearthJob) => {
    const pos = jobPos(next);
    walkTo(pos.x, pos.y, next);
  };

  const onValleyJob = (next: ValleyJob) => {
    if (next.kind === "walk") {
      const px = worldToPx(next.x, next.z);
      walkTo(px.x, px.y);
      return;
    }
    if (next.kind === "door") {
      huntingId.current = null;
      const pos = worldCenter(VALLEY_SPOTS.door.col, VALLEY_SPOTS.door.row);
      walkTo(pos.x, pos.y);
      return;
    }
    if (next.kind === "pelt") {
      const id = next.id ?? foes.current.find((foe) => lootOn[foe.id])?.id;
      if (!id) return;
      const foe = foes.current.find((item) => item.id === id);
      if (!foe) return;
      if (Math.hypot(body.current.x - foe.x, body.current.y - foe.y) < TILE * 1.2) takePelt(id);
      else walkTo(foe.x, foe.y + 10);
      return;
    }
    if (next.kind === "tracks") {
      bridge.emit({
        type: "hint",
        text: "Prints larger than any wolf. Whatever walked here did not hurry.",
      });
      return;
    }
    if (next.kind === "scale") {
      bridge.emit({
        type: "hint",
        text: "A scale in the soil, too broad for a bird. You leave it where it caught the light.",
      });
      return;
    }
    if (next.kind === "carving") {
      bridge.emit({
        type: "hint",
        text: "An old spiral cut into stone. Villagers tell two stories. Neither agrees.",
      });
      return;
    }
    const target =
      (next.id ? foes.current.find((foe) => foe.id === next.id) : null) ??
      nearestLiving(foes.current, body.current.x, body.current.y, TILE * 6);
    if (!target || target.hp <= 0) return;
    huntingId.current = target.id;
    bridge.emit({ type: "hint", text: target.kind === "dire" ? "You set on the dire wolf." : "You set on the wolf." });
    tryAttack(target.id);
  };

  const onWalk = (wx: number, wz: number) => {
    const px = worldToPx(wx, wz);
    const tiles = scene === "valley" ? VALLEY_TILES : HEARTH_TILES;
    const { col, row } = tileFromWorld(px.x, px.y);
    if (!isWalkable(tileAt(tiles, col, row))) return;

    if (scene === "hearth") {
      if (isDoorTile(tileAt(tiles, col, row))) {
        const door = worldCenter(HEARTH_SPOTS.door.col, HEARTH_SPOTS.door.row);
        walkTo(door.x, door.y, { kind: "door" });
        return;
      }
      const plot = HEARTH_PLOTS.find((item) => {
        const pos = worldCenter(item.col, item.row);
        return Math.hypot(px.x - pos.x, px.y - pos.y) < TILE * 0.9;
      });
      if (plot) {
        const pos = worldCenter(plot.col, plot.row);
        walkTo(pos.x, pos.y, { kind: "plot", plotId: plot.id });
        return;
      }
      const near = nearestHearthJob(px.x, px.y);
      if (near) {
        walkTo(jobPos(near).x, jobPos(near).y, near);
        return;
      }
    } else {
      const door = worldCenter(VALLEY_SPOTS.door.col, VALLEY_SPOTS.door.row);
      if (Math.hypot(px.x - door.x, px.y - door.y) < TILE) {
        huntingId.current = null;
        walkTo(door.x, door.y);
        return;
      }
      const lootFoe = foes.current.find(
        (foe) => lootOn[foe.id] && Math.hypot(px.x - foe.x, px.y - foe.y) < TILE,
      );
      if (lootFoe) {
        onValleyJob({ kind: "pelt", id: lootFoe.id });
        return;
      }
      const wolf = nearestLiving(foes.current, px.x, px.y, TILE * 1.8);
      if (wolf) {
        onValleyJob({ kind: "wolf", id: wolf.id });
        return;
      }
    }

    huntingId.current = null;
    walkTo(px.x, px.y, null);
  };

  useFrame((_, rawDt) => {
    const dt = clampDelta(rawDt);
    const ms = dt * 1000;
    attackCd.current = Math.max(0, attackCd.current - ms);
    cropTick.current += dt;
    if (cropTick.current > 0.4) {
      cropTick.current = 0;
      setTick((n) => n + 1);
    }

    const stored = bridge.getPlayer();
    if (stored.health > body.current.hp) body.current.hp = stored.health;

    if (job.current) {
      const pos = jobPos(job.current);
      if (Math.hypot(body.current.x - pos.x, body.current.y - pos.y) < INTERACT) {
        moving.current = false;
        setMarker((m) => ({ ...m, on: false }));
        runHearthJob(job.current);
      }
    }

    if (scene === "hearth" && consumeInteract()) {
      const near = nearestHearthJob(body.current.x, body.current.y);
      if (near) runHearthJob(near);
    }

    const axis = windowAxis();
    const tiles = scene === "valley" ? VALLEY_TILES : HEARTH_TILES;
    const hunted = huntingId.current ? foes.current.find((foe) => foe.id === huntingId.current) : null;
    if (axis.x !== 0 || axis.y !== 0) {
      moving.current = false;
      huntingId.current = null;
      job.current = null;
      waypoints.current = [];
      setMarker((m) => (m.on ? { ...m, on: false } : m));
      const next = slide(
        tiles,
        body.current.x,
        body.current.y,
        body.current.x + axis.x * PLAYER_SPEED * dt,
        body.current.y + axis.y * PLAYER_SPEED * dt,
      );
      body.current.x = next.x;
      body.current.y = next.y;
      flipped.current = axis.x < 0;
    } else if (scene === "valley" && hunted && hunted.hp > 0 && body.current.hp > 0) {
      const dist = Math.hypot(body.current.x - hunted.x, body.current.y - hunted.y);
      if (dist <= ATTACK_RANGE && attackCd.current <= 0) tryAttack(hunted.id);
      else if (dist > ATTACK_RANGE) {
        const stepped = stepToward(body.current.x, body.current.y, hunted.x, hunted.y, PLAYER_SPEED, dt, REACH_VALLEY);
        const slid = slide(tiles, body.current.x, body.current.y, stepped.x, stepped.y);
        body.current.x = slid.x;
        body.current.y = slid.y;
        flipped.current = hunted.x < body.current.x;
      }
    } else if (moving.current) {
      const prevX = body.current.x;
      const prevY = body.current.y;
      const stepped = stepToward(prevX, prevY, dest.current.x, dest.current.y, PLAYER_SPEED, dt, scene === "hearth" ? REACH_HEARTH : REACH_VALLEY);
      const slid = slide(tiles, prevX, prevY, stepped.x, stepped.y);
      body.current.x = slid.x;
      body.current.y = slid.y;
      if (stepped.arrived) {
        const nextStop = waypoints.current.shift();
        if (nextStop) {
          dest.current = nextStop;
          moving.current = true;
        } else {
          moving.current = false;
          setMarker((m) => ({ ...m, on: false }));
          if (job.current) runHearthJob(job.current);
        }
      } else if (slid.x === prevX && slid.y === prevY) {
        const nextStop = waypoints.current.shift();
        if (nextStop) {
          dest.current = nextStop;
          moving.current = true;
        } else {
          moving.current = false;
          setMarker((m) => ({ ...m, on: false }));
        }
      }
    }

    if (scene === "valley") {
      const mapBounds = valleyMapBounds();
      let hp = body.current.hp;
      for (let i = 0; i < foes.current.length; i += 1) {
        const foe = foes.current[i];
        if (foe.hp <= 0) continue;
        const bite = mitigateDamage(enemyDefinition(foe.kind).damage, stored.hasArmor);
        const ticked = tickWolf(
          { ...body.current, hp },
          foe,
          dt,
          Math.random,
          spawnWanderBounds(foe.spawnX, foe.spawnY, TILE * 2.5, mapBounds),
          bite,
        );
        foes.current[i] = { ...foe, ...ticked.wolf };
        if (ticked.wolfHit && ticked.player.hp < hp) {
          const w = pxToWorld(body.current.x, body.current.y);
          puff(w.x, w.z, `-${ticked.wolfHit}`, "#b33a2b");
          setFoeTint((prev) => ({ ...prev, [foe.id]: "agro" }));
        }
        hp = ticked.player.hp;
        const mesh = foeMeshes.current[foe.id];
        if (mesh) {
          const wpos = pxToWorld(foes.current[i].x, foes.current[i].y);
          mesh.position.set(wpos.x, 0, wpos.z);
          mesh.rotation.y = look.current.x < wpos.x ? Math.PI : 0;
        }
      }
      body.current.hp = hp;
    }

    if (scene === "valley" && consumeInteract()) {
      const lootFoe = foes.current.find(
        (foe) => lootOn[foe.id] && Math.hypot(body.current.x - foe.x, body.current.y - foe.y) < TILE * 1.4,
      );
      if (lootFoe) takePelt(lootFoe.id);
      else {
        const near = nearestLiving(foes.current, body.current.x, body.current.y, STRIKE_RANGE);
        if (near) {
          huntingId.current = near.id;
          tryAttack(near.id);
        }
      }
    }

    if (scene === "valley") {
      for (const foe of foes.current) {
        if (!lootOn[foe.id]) continue;
        if (Math.hypot(body.current.x - foe.x, body.current.y - foe.y) < REACH_VALLEY + 10) {
          if (moving.current && Math.hypot(dest.current.x - foe.x, dest.current.y - foe.y) < 18) {
            moving.current = false;
            setMarker((m) => ({ ...m, on: false }));
            takePelt(foe.id);
          }
        }
      }
    }

    if (scene === "valley" && !timerArmed.current && RESPAWN_MS > 0 && stored.wildernessWipedAt) {
      if (Date.now() - stored.wildernessWipedAt >= RESPAWN_MS) {
        timerArmed.current = true;
        bridge.emit({ type: "respawn-wilderness" });
        foes.current = spawnValleyFoes({
          ...stored,
          encounters: stored.encounters.map((item) => ({
            ...item,
            alive: true,
            hp: enemyDefinition(item.kind).health,
            lootDropped: false,
            lootTaken: false,
          })),
        });
        reported.current.clear();
        const ui = emptyUi(foes.current);
        setLootOn(ui.loot);
        setFoeVisible(ui.visible);
        setFoeTint(ui.tint);
        bridge.emit({ type: "hint", text: "The pack answers again from the trees." });
      }
    }

    if (body.current.hp <= 0) {
      body.current.hp = PLAYER_MAX_HP;
      const pad = worldCenter(VALLEY_SPOTS.spawn.col, VALLEY_SPOTS.spawn.row);
      body.current.x = pad.x;
      body.current.y = pad.y;
      huntingId.current = null;
      bridge.emit({ type: "health", health: body.current.hp });
      bridge.emit({ type: "hint", text: "You wake with the fire still in you. The hearth would take you back." });
    }

    const tile = tileFromWorld(body.current.x, body.current.y);
    if (scene === "hearth" && isDoorTile(tileAt(HEARTH_TILES, tile.col, tile.row))) openDoor("valley");
    if (scene === "valley" && isDoorTile(tileAt(VALLEY_TILES, tile.col, tile.row))) openDoor("hearth");

    const wpos = pxToWorld(body.current.x, body.current.y);
    look.current = wpos;
    if (pilgrim.current) {
      pilgrim.current.position.set(wpos.x, 0, wpos.z);
      pilgrim.current.rotation.y = flipped.current ? Math.PI : 0;
    }

    persistAt.current += ms;
    if (persistAt.current > 1100) {
      persistAt.current = 0;
      bridge.emit({ type: "position", x: body.current.x, y: body.current.y });
      if (scene === "valley") {
        bridge.emit({ type: "health", health: body.current.hp });
        bridge.emit({ type: "combat", you: body.current.hp });
      }
    }
  });

  const maxHp = boot.player.maxHealth || PLAYER_MAX_HP;
  const playerHp = body.current.hp / maxHp;

  return (
    <>
      <IsoRig target={look} />
      <group userData={{ cropRevision: tick }}>
      {scene === "hearth" ? (
        <HearthWorld bridge={bridge} onWalk={onWalk} onJob={onHearthJob} />
      ) : (
        <ValleyWorld onWalk={onWalk} onJob={onValleyJob} />
      )}
      <group ref={pilgrim} position={[look.current.x, 0, look.current.z]}>
        <PilgrimMesh />
        <HpBar ratio={playerHp} />
      </group>
      {scene === "valley"
        ? foes.current.map((foe) => {
            const world = pxToWorld(foe.x, foe.y);
            const pelt = pxToWorld(foe.x, foe.y + 8);
            const ratio = foe.maxHp > 0 ? foe.hp / foe.maxHp : 0;
            return (
              <group key={foe.id}>
                <group
                  ref={(el) => {
                    foeMeshes.current[foe.id] = el;
                  }}
                  position={[world.x, 0, world.z]}
                  visible={foeVisible[foe.id] !== false && foe.hp > 0}
                  onPointerUp={(event: ThreeEvent<PointerEvent>) => {
                    event.stopPropagation();
                    onValleyJob({ kind: "wolf", id: foe.id });
                  }}
                >
                  <WolfMesh tinted={foeTint[foe.id] ?? null} kind={foe.kind} />
                  {foeVisible[foe.id] !== false ? <HpBar ratio={ratio} width={foe.kind === "dire" ? 1.15 : 0.85} /> : null}
                </group>
                {lootOn[foe.id] ? (
                  <group
                    position={[pelt.x, 0.08, pelt.z]}
                    onPointerUp={(event: ThreeEvent<PointerEvent>) => {
                      event.stopPropagation();
                      onValleyJob({ kind: "pelt", id: foe.id });
                    }}
                  >
                    <PeltDrop position={[0, 0, 0]} dire={foe.kind === "dire"} />
                  </group>
                ) : null}
              </group>
            );
          })
        : null}
      <MarkerRing position={[marker.x, 0.05, marker.z]} visible={marker.on} />
      {floats.map((item) => (
        <group key={item.id} position={[item.x, 1.4, item.z]}>
          <FloatText text={item.text} color={item.color} />
        </group>
      ))}
      </group>
    </>
  );
}

function IsoRig({ target }: { target: MutableRefObject<{ x: number; z: number }> }) {
  const { camera, size } = useThree();
  const scratch = useRef(new THREE.Vector3());
  useEffect(() => {
    const cam = camera as THREE.OrthographicCamera;
    cam.near = 0.1;
    cam.far = 220;
    cam.zoom = isoZoomForViewport(size.height);
    cam.updateProjectionMatrix();
  }, [camera, size.height]);

  useFrame(() => {
    const cam = camera as THREE.OrthographicCamera;
    const pos = isoCameraPosition(target.current.x, target.current.z, ISO_DISTANCE);
    scratch.current.set(pos.x, pos.y, pos.z);
    cam.position.lerp(scratch.current, 0.1);
    cam.lookAt(target.current.x, 0.45, target.current.z);
  });
  return null;
}

export function WorldLights({ scene }: { scene: Scene }) {
  return (
    <>
      <color attach="background" args={[scene === "valley" ? "#8aa090" : PALETTE.sky]} />
      <hemisphereLight args={[PALETTE.cream, PALETTE.skyGround, scene === "valley" ? 0.55 : 0.78]} />
      <ambientLight intensity={scene === "valley" ? 0.18 : 0.28} color={PALETTE.sun} />
      <directionalLight
        castShadow
        position={[18, 28, 12]}
        intensity={scene === "valley" ? 1.15 : 1.55}
        color={PALETTE.sun}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-24}
        shadow-camera-right={24}
        shadow-camera-top={24}
        shadow-camera-bottom={-24}
        shadow-camera-near={2}
        shadow-camera-far={90}
        shadow-bias={-0.0007}
        shadow-radius={4}
      />
      <fog attach="fog" args={[scene === "valley" ? "#8aa090" : "#c5d4c8", 26, 58]} />
    </>
  );
}
