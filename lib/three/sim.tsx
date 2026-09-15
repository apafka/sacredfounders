"use client";

import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useRef, useState, type MutableRefObject } from "react";
import * as THREE from "three";
import { PLAYER_MAX_HP } from "@/lib/combat";
import { plotReady, plotStage } from "@/lib/crops";
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
  PLAYER_DAMAGE,
  PLAYER_SPEED,
  STRIKE_RANGE,
  createWolf,
  tickWolf,
  tryStrike,
  type Wolf,
} from "@/lib/phaser/wolf-ai";
import { clampDelta, pxToWorld, worldToPx } from "./coords";
import { ISO_DISTANCE, isoCameraPosition, isoZoomForViewport } from "./engine";
import { PALETTE } from "./palette";
import { FloatText, HpBar, MarkerRing, PeltDrop, PilgrimMesh, WolfMesh } from "./prefabs";
import { HearthWorld, ValleyWorld, type HearthJob, type ValleyJob } from "./world";

const REACH_HEARTH = 28;
const INTERACT = 36;
const REACH_VALLEY = 12;
const MARGIN = TILE + 8;

type Floater = { id: number; text: string; color: string; x: number; z: number; born: number };

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
    { kind: "fire", radius: TILE },
    { kind: "bed", radius: TILE },
    { kind: "chest", radius: TILE },
    { kind: "workbench", radius: TILE },
    { kind: "bren", radius: TILE * 1.15 },
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
  const wolfPad = worldCenter(VALLEY_SPOTS.wolf.col, VALLEY_SPOTS.wolf.row);
  return { player, start, wolfPad };
}

export function IsoSim({ bridge, scene }: { bridge: WorldBridge; scene: Scene }) {
  const boot = sceneStart(bridge, scene);
  const startWorld = pxToWorld(boot.start.x, boot.start.y);
  const pilgrim = useRef<THREE.Group>(null);
  const wolfGroup = useRef<THREE.Group>(null);
  const look = useRef(startWorld);
  const body = useRef({ x: boot.start.x, y: boot.start.y, hp: boot.player.health || PLAYER_MAX_HP });
  const dest = useRef({ x: boot.start.x, y: boot.start.y });
  const waypoints = useRef<{ x: number; y: number }[]>([]);
  const moving = useRef(false);
  const hunting = useRef(false);
  const job = useRef<HearthJob | null>(null);
  const wolf = useRef<Wolf>(
    createWolf(boot.wolfPad.x, boot.wolfPad.y, boot.player.wolf.alive ? boot.player.wolf.hp || 12 : 0),
  );
  const attackCd = useRef(0);
  const usedDoor = useRef(false);
  const reportedDown = useRef(!boot.player.wolf.alive);
  const persistAt = useRef(0);
  const cropTick = useRef(0);
  const flipped = useRef(false);
  const [marker, setMarker] = useState({ x: 0, z: 0, on: false });
  const [floats, setFloats] = useState<Floater[]>([]);
  const [peltOn, setPeltOn] = useState(Boolean(boot.player.wolf.peltDropped && !boot.player.wolf.peltTaken));
  const [wolfTint, setWolfTint] = useState<"hit" | "agro" | "dead" | null>(boot.player.wolf.alive ? null : "dead");
  const [wolfVisible, setWolfVisible] = useState(boot.player.wolf.alive);
  const [tick, setTick] = useState(0);
  const floatId = useRef(1);

  const spawn = () => {
    const next = sceneStart(bridge, scene);
    body.current = { x: next.start.x, y: next.start.y, hp: next.player.health || PLAYER_MAX_HP };
    dest.current = { x: next.start.x, y: next.start.y };
    look.current = pxToWorld(next.start.x, next.start.y);
    wolf.current = createWolf(next.wolfPad.x, next.wolfPad.y, next.player.wolf.alive ? next.player.wolf.hp || 12 : 0);
    if (!next.player.wolf.alive) {
      wolf.current.hp = 0;
      wolf.current.mode = "dead";
    }
    usedDoor.current = false;
    hunting.current = false;
    reportedDown.current = !next.player.wolf.alive;
    setPeltOn(Boolean(next.player.wolf.peltDropped && !next.player.wolf.peltTaken));
    setWolfVisible(next.player.wolf.alive);
    setWolfTint(next.player.wolf.alive ? null : "dead");
    setMarker({ x: 0, z: 0, on: false });
  };

  useEffect(() => {
    spawn();
    const w = look.current;
    pilgrim.current?.position.set(w.x, 0, w.z);
    if (wolfGroup.current) {
      const ww = pxToWorld(wolf.current.x, wolf.current.y);
      wolfGroup.current.position.set(ww.x, 0, ww.z);
    }
    if (scene === "hearth") {
      bridge.emit({
        type: "hint",
        text: "This is your hearth. WASD or click to walk. Garden and Old Bren are just outside. The path leaves east.",
      });
    } else {
      const player = bridge.getPlayer();
      bridge.emit({
        type: "hint",
        text: player.wolf.alive
          ? "The trees close in. A wolf at the forest edge. Click it to fight."
          : player.wolf.peltDropped
            ? "The wolf is still. A pelt in the grass."
            : "The forest keeps its own counsel. What's beyond those pines?",
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
    hunting.current = false;
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
        if (player.seeds.grain < 1) {
          bridge.emit({ type: "hint", text: "No wheat seed left. Harvest what you planted, or walk the path." });
          return;
        }
        bridge.emit({ type: "plant", plotId: next.plotId });
        puff(look.current.x, look.current.z, "Planted", "#c4a35a");
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
      bridge.emit({ type: "hint", text: "Your bed. The day is young." });
      return;
    }
    if (next.kind === "chest") {
      bridge.emit({ type: "inventory" });
      bridge.emit({ type: "hint", text: "A chest for later. For now, what you carry is on you. Press I." });
      return;
    }
    if (next.kind === "workbench") {
      bridge.emit({ type: "hint", text: "A workbench waiting for craft. Not today." });
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

  const takePelt = () => {
    if (!peltOn || bridge.isBusy()) return;
    setPeltOn(false);
    bridge.emit({ type: "pickup-pelt" });
    bridge.emit({ type: "toast", text: "Wolf Pelt acquired." });
    const w = pxToWorld(wolf.current.x, wolf.current.y);
    puff(w.x, w.z, "Wolf Pelt acquired.", "#c4a35a");
  };

  const onWolfDown = () => {
    if (reportedDown.current) return;
    reportedDown.current = true;
    hunting.current = false;
    wolf.current.mode = "dead";
    setWolfTint("dead");
    setWolfVisible(false);
    setPeltOn(true);
    const w = pxToWorld(wolf.current.x, wolf.current.y);
    puff(w.x, w.z, "The wolf falls", "#c4a35a");
    bridge.emit({ type: "wolf-down" });
    bridge.emit({ type: "hint", text: "A pelt in the grass. Click it." });
  };

  const tryAttack = () => {
    if (wolf.current.hp <= 0 || body.current.hp <= 0) {
      hunting.current = false;
      return false;
    }
    const next = tryStrike(body.current, wolf.current, PLAYER_DAMAGE);
    if (next) {
      wolf.current = { ...wolf.current, hp: next.hp, hitFlash: 180, mode: next.hp <= 0 ? "dead" : wolf.current.mode };
      attackCd.current = PLAYER_ATTACK_MS;
      setWolfTint("hit");
      window.setTimeout(() => setWolfTint(wolf.current.hp > 0 ? "agro" : "dead"), 140);
      const w = pxToWorld(wolf.current.x, wolf.current.y);
      puff(w.x, w.z, `-${PLAYER_DAMAGE}`, "#f3efe4");
      flipped.current = wolf.current.x < body.current.x;
      if (wolf.current.hp <= 0) onWolfDown();
      return true;
    }
    hunting.current = true;
    walkTo(wolf.current.x, wolf.current.y);
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
      hunting.current = false;
      const pos = worldCenter(VALLEY_SPOTS.door.col, VALLEY_SPOTS.door.row);
      walkTo(pos.x, pos.y);
      return;
    }
    if (next.kind === "pelt") {
      if (Math.hypot(body.current.x - wolf.current.x, body.current.y - wolf.current.y) < TILE * 1.2) takePelt();
      else walkTo(wolf.current.x, wolf.current.y + 10);
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
    hunting.current = true;
    bridge.emit({ type: "hint", text: "You set on the wolf." });
    tryAttack();
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
        hunting.current = false;
        walkTo(door.x, door.y);
        return;
      }
      if (peltOn && Math.hypot(px.x - wolf.current.x, px.y - wolf.current.y) < TILE) {
        onValleyJob({ kind: "pelt" });
        return;
      }
      if (wolf.current.hp > 0 && Math.hypot(px.x - wolf.current.x, px.y - wolf.current.y) < TILE * 1.5) {
        onValleyJob({ kind: "wolf" });
        return;
      }
    }

    hunting.current = false;
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
    if (axis.x !== 0 || axis.y !== 0) {
      moving.current = false;
      hunting.current = false;
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
    } else if (scene === "valley" && hunting.current && wolf.current.hp > 0 && body.current.hp > 0) {
      const dist = Math.hypot(body.current.x - wolf.current.x, body.current.y - wolf.current.y);
      if (dist <= ATTACK_RANGE && attackCd.current <= 0) tryAttack();
      else if (dist > ATTACK_RANGE) {
        const stepped = stepToward(body.current.x, body.current.y, wolf.current.x, wolf.current.y, PLAYER_SPEED, dt, REACH_VALLEY);
        const slid = slide(tiles, body.current.x, body.current.y, stepped.x, stepped.y);
        body.current.x = slid.x;
        body.current.y = slid.y;
        flipped.current = wolf.current.x < body.current.x;
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

    if (scene === "valley" && wolf.current.hp > 0) {
      const ticked = tickWolf(body.current, wolf.current, dt, Math.random, {
        minX: MARGIN,
        minY: MARGIN,
        maxX: TILE * ((VALLEY_TILES[0]?.length ?? 2) - 2),
        maxY: TILE * 10,
      });
      wolf.current = ticked.wolf;
      if (ticked.wolfHit && ticked.player.hp < body.current.hp) {
        const w = pxToWorld(body.current.x, body.current.y);
        puff(w.x, w.z, `-${ticked.wolfHit}`, "#b33a2b");
        setWolfTint("agro");
      }
      body.current.hp = ticked.player.hp;
      if (wolfGroup.current) {
        const wpos = pxToWorld(wolf.current.x, wolf.current.y);
        wolfGroup.current.position.set(wpos.x, 0, wpos.z);
        wolfGroup.current.rotation.y = look.current.x < wpos.x ? Math.PI : 0;
      }
    }

    if (scene === "valley" && consumeInteract()) {
      if (peltOn && Math.hypot(body.current.x - wolf.current.x, body.current.y - wolf.current.y) < TILE * 1.4) {
        takePelt();
      } else if (wolf.current.hp > 0 && Math.hypot(body.current.x - wolf.current.x, body.current.y - wolf.current.y) < STRIKE_RANGE) {
        hunting.current = true;
        tryAttack();
      }
    }

    if (scene === "valley" && peltOn && Math.hypot(body.current.x - wolf.current.x, body.current.y - wolf.current.y) < REACH_VALLEY + 10) {
      if (moving.current && Math.hypot(dest.current.x - wolf.current.x, dest.current.y - wolf.current.y) < 18) {
        moving.current = false;
        setMarker((m) => ({ ...m, on: false }));
        takePelt();
      }
    }

    if (body.current.hp <= 0) {
      body.current.hp = PLAYER_MAX_HP;
      const pad = worldCenter(VALLEY_SPOTS.spawn.col, VALLEY_SPOTS.spawn.row);
      body.current.x = pad.x;
      body.current.y = pad.y;
      hunting.current = false;
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

  const peltPos = pxToWorld(wolf.current.x, wolf.current.y + 8);
  const wolfWorld = pxToWorld(wolf.current.x, wolf.current.y);
  const playerHp = body.current.hp / PLAYER_MAX_HP;
  const wolfHp = wolf.current.maxHp > 0 ? wolf.current.hp / wolf.current.maxHp : 0;

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
      {scene === "valley" ? (
        <>
          <group
            ref={wolfGroup}
            position={[wolfWorld.x, 0, wolfWorld.z]}
            visible={wolfVisible}
            onPointerUp={(event: ThreeEvent<PointerEvent>) => {
              event.stopPropagation();
              onValleyJob({ kind: "wolf" });
            }}
          >
            <WolfMesh tinted={wolfTint} />
            {wolfVisible ? <HpBar ratio={wolfHp} /> : null}
          </group>
          {peltOn ? (
            <group
              position={[peltPos.x, 0.08, peltPos.z]}
              onPointerUp={(event: ThreeEvent<PointerEvent>) => {
                event.stopPropagation();
                onValleyJob({ kind: "pelt" });
              }}
            >
              <PeltDrop position={[0, 0, 0]} />
            </group>
          ) : null}
        </>
      ) : null}
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
