"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import type { InstancedMesh } from "three";
import { Object3D } from "three";
import { plotStage } from "@/lib/crops";
import type { WorldBridge } from "@/lib/phaser/bridge";
import {
  HEARTH_PLOTS,
  HEARTH_SPOTS,
  HEARTH_TILES,
  VALLEY_SPOTS,
  VALLEY_TILES,
  VALLEY_ENCOUNTERS,
  VALLEY_TREES,
  isWalkable,
} from "@/lib/phaser/layout";
import { tileToWorld } from "./coords";
import { WorldLabel } from "./label";
import { PALETTE } from "./palette";
import {
  BedProp,
  BenchProp,
  BrenMesh,
  CarvingStone,
  ChestProp,
  DoorProp,
  HearthFire,
  Pine,
  ScaleShard,
  SoilBed,
  Tracks,
  WheatStalk,
} from "./prefabs";

const dummy = new Object3D();

function InstancedBoxes({
  cells,
  color,
  size,
  y,
  castShadow = false,
}: {
  cells: { x: number; z: number }[];
  color: string;
  size: [number, number, number];
  y: number;
  castShadow?: boolean;
}) {
  const ref = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    cells.forEach((cell, i) => {
      dummy.position.set(cell.x, y, cell.z);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [cells, y]);
  if (cells.length === 0) return null;
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, cells.length]} receiveShadow castShadow={castShadow} raycast={() => undefined}>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.9} metalness={0} />
    </instancedMesh>
  );
}

function collectTiles(map: readonly string[], ch: string, skipBorder = false) {
  const cells: { x: number; z: number }[] = [];
  for (let row = 0; row < map.length; row += 1) {
    const line = map[row] ?? "";
    for (let col = 0; col < line.length; col += 1) {
      if (line[col] !== ch) continue;
      if (skipBorder && (col === 0 || row === 0 || col === line.length - 1 || row === map.length - 1)) continue;
      const w = tileToWorld(col, row);
      cells.push(w);
    }
  }
  return cells;
}

/** Tall, slightly see-through hit box so isometric clicks land on people and furniture. */
function ClickVolume({
  size = [1.25, 1.7, 1.25],
  y = 0.85,
}: {
  size?: [number, number, number];
  y?: number;
}) {
  return (
    <mesh position={[0, y, 0]}>
      <boxGeometry args={size} />
      <meshBasicMaterial transparent opacity={0.02} depthWrite={false} />
    </mesh>
  );
}

function cottageRoof() {
  const floors = collectTiles(HEARTH_TILES, ".").filter((cell) => {
    const col = Math.floor(cell.x);
    const row = Math.floor(cell.z);
    return col >= 3 && col <= 16 && row >= 6 && row <= 10;
  });
  if (floors.length === 0) return null;
  const xs = floors.map((f) => f.x);
  const zs = floors.map((f) => f.z);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minZ = Math.min(...zs);
  const maxZ = Math.max(...zs);
  const cx = (minX + maxX) / 2;
  const cz = (minZ + maxZ) / 2;
  const w = maxX - minX + 1.15;
  const d = maxZ - minZ + 1.05;
  return { cx, cz, w, d };
}

export type HearthJob =
  | { kind: "plot"; plotId: number }
  | { kind: "fire" }
  | { kind: "bed" }
  | { kind: "chest" }
  | { kind: "workbench" }
  | { kind: "bren" }
  | { kind: "door" };

export function HearthWorld({
  bridge,
  onWalk,
  onJob,
}: {
  bridge: WorldBridge;
  onWalk: (x: number, z: number) => void;
  onJob: (job: HearthJob) => void;
}) {
  const grass = useMemo(() => collectTiles(HEARTH_TILES, ","), []);
  const path = useMemo(() => collectTiles(HEARTH_TILES, "="), []);
  const floor = useMemo(() => collectTiles(HEARTH_TILES, "."), []);
  const walls = useMemo(() => collectTiles(HEARTH_TILES, "#", true), []);
  const doors = useMemo(() => collectTiles(HEARTH_TILES, "D"), []);
  const roof = useMemo(() => cottageRoof(), []);
  const fire = tileToWorld(HEARTH_SPOTS.fire.col, HEARTH_SPOTS.fire.row);
  const bed = tileToWorld(HEARTH_SPOTS.bed.col, HEARTH_SPOTS.bed.row);
  const chest = tileToWorld(HEARTH_SPOTS.chest.col, HEARTH_SPOTS.chest.row);
  const bench = tileToWorld(HEARTH_SPOTS.workbench.col, HEARTH_SPOTS.workbench.row);
  const bren = tileToWorld(HEARTH_SPOTS.bren.col, HEARTH_SPOTS.bren.row);
  const door = tileToWorld(HEARTH_SPOTS.door.col, HEARTH_SPOTS.door.row);
  const garden = tileToWorld(6, 3);

  return (
    <group>
      <GroundPlane tiles={HEARTH_TILES} onWalk={onWalk} />
      <InstancedBoxes cells={grass} color={PALETTE.grass} size={[0.98, 0.08, 0.98]} y={0} />
      <InstancedBoxes cells={path} color={PALETTE.path} size={[0.98, 0.1, 0.98]} y={0.02} />
      <InstancedBoxes cells={floor} color={PALETTE.floor} size={[0.98, 0.1, 0.98]} y={0.02} />
      <InstancedBoxes cells={doors} color="#6a4a38" size={[0.98, 0.12, 0.98]} y={0.03} />
      <InstancedBoxes cells={walls} color={PALETTE.wall} size={[0.92, 1.2, 0.92]} y={0.6} castShadow />
      {roof ? (
        <group position={[roof.cx, 1.85, roof.cz]}>
          <mesh rotation={[0.48, 0, 0]} position={[0, 0.08, -roof.d * 0.22]} castShadow raycast={() => undefined}>
            <boxGeometry args={[roof.w, 0.1, roof.d * 0.58]} />
            <meshStandardMaterial color={PALETTE.roof} roughness={0.85} />
          </mesh>
          <mesh rotation={[-0.48, 0, 0]} position={[0, 0.08, roof.d * 0.22]} castShadow raycast={() => undefined}>
            <boxGeometry args={[roof.w, 0.1, roof.d * 0.58]} />
            <meshStandardMaterial color={PALETTE.roofShadow} roughness={0.85} />
          </mesh>
        </group>
      ) : null}

      {HEARTH_PLOTS.map((plot) => {
        const pos = tileToWorld(plot.col, plot.row);
        const planted = bridge.getPlayer().plots[plot.id];
        const stage =
          planted?.crop && planted.plantedAt != null
            ? plotStage(planted.plantedAt, planted.crop, Date.now())
            : "empty";
        return (
          <group
            key={plot.id}
            position={[pos.x, 0.06, pos.z]}
            onPointerUp={(event: ThreeEvent<PointerEvent>) => {
              event.stopPropagation();
              onJob({ kind: "plot", plotId: plot.id });
            }}
          >
            <SoilBed position={[0, 0, 0]} />
            {stage !== "empty" ? <WheatStalk stage={stage} /> : null}
            <mesh position={[0, 0.45, 0]}>
              <boxGeometry args={[1.05, 0.95, 1.05]} />
              <meshBasicMaterial transparent opacity={0.02} depthWrite={false} />
            </mesh>
          </group>
        );
      })}

      <group
        position={[fire.x, 0, fire.z]}
        onPointerUp={(event: ThreeEvent<PointerEvent>) => {
          event.stopPropagation();
          onJob({ kind: "fire" });
        }}
      >
        <HearthFire position={[0, 0, 0]} />
        <ClickVolume size={[1.4, 2.0, 1.4]} y={0.9} />
      </group>
      <group
        position={[bed.x, 0, bed.z]}
        onPointerUp={(event: ThreeEvent<PointerEvent>) => {
          event.stopPropagation();
          onJob({ kind: "bed" });
        }}
      >
        <BedProp position={[0, 0, 0]} />
        <ClickVolume size={[1.7, 2.5, 1.7]} y={1.15} />
      </group>
      <group
        position={[chest.x, 0, chest.z]}
        onPointerUp={(event: ThreeEvent<PointerEvent>) => {
          event.stopPropagation();
          onJob({ kind: "chest" });
        }}
      >
        <ChestProp position={[0, 0, 0]} />
        <ClickVolume size={[1.4, 2.0, 1.4]} y={0.95} />
      </group>
      <group
        position={[bench.x, 0, bench.z]}
        onPointerUp={(event: ThreeEvent<PointerEvent>) => {
          event.stopPropagation();
          onJob({ kind: "workbench" });
        }}
      >
        <BenchProp position={[0, 0, 0]} />
        <ClickVolume size={[1.5, 2.0, 1.4]} y={0.95} />
      </group>
      <group
        position={[bren.x, 0, bren.z]}
        onPointerUp={(event: ThreeEvent<PointerEvent>) => {
          event.stopPropagation();
          onJob({ kind: "bren" });
        }}
      >
        <BrenMesh />
        <ClickVolume size={[1.5, 2.1, 1.5]} y={0.95} />
      </group>
      <group
        position={[door.x, 0, door.z]}
        onPointerUp={(event: ThreeEvent<PointerEvent>) => {
          event.stopPropagation();
          onJob({ kind: "door" });
        }}
      >
        <DoorProp position={[0, 0, 0]} />
        <ClickVolume size={[1.4, 2.2, 1.1]} y={0.9} />
      </group>

      <WorldLabel text="Garden" position={[garden.x, 1.15, garden.z]} />
      <WorldLabel text="Fire" position={[fire.x, 1.35, fire.z]} />
      <WorldLabel text="Bed" position={[bed.x, 1.35, bed.z]} />
      <WorldLabel text="Chest" position={[chest.x, 0.85, chest.z]} />
      <WorldLabel text="Workbench" position={[bench.x, 0.85, bench.z]} />
      <WorldLabel text="Old Bren" position={[bren.x, 1.45, bren.z]} />
      <WorldLabel text="Path" position={[door.x, 1.7, door.z]} />
    </group>
  );
}

export type ValleyJob =
  | { kind: "door" }
  | { kind: "wolf"; id?: string }
  | { kind: "pelt"; id?: string }
  | { kind: "tracks" }
  | { kind: "scale" }
  | { kind: "carving" }
  | { kind: "walk"; x: number; z: number };

export function ValleyWorld({
  onWalk,
  onJob,
}: {
  onWalk: (x: number, z: number) => void;
  onJob: (job: ValleyJob) => void;
}) {
  const grass = useMemo(() => collectTiles(VALLEY_TILES, ","), []);
  const path = useMemo(() => collectTiles(VALLEY_TILES, "="), []);
  const forest = useMemo(() => collectTiles(VALLEY_TILES, "T"), []);
  const floor = useMemo(() => collectTiles(VALLEY_TILES, "."), []);
  const doors = useMemo(() => collectTiles(VALLEY_TILES, "D"), []);
  const trees = useMemo(() => {
    const spots = new Map<string, { x: number; z: number }>();
    for (const tree of VALLEY_TREES) {
      spots.set(`${tree.col},${tree.row}`, tileToWorld(tree.col, tree.row));
    }
    for (let row = 0; row < VALLEY_TILES.length; row += 1) {
      const line = VALLEY_TILES[row] ?? "";
      for (let col = 0; col < line.length; col += 1) {
        if (line[col] !== "T") continue;
        if ((col + row) % 3 !== 0) continue;
        spots.set(`${col},${row}`, tileToWorld(col, row));
      }
    }
    return [...spots.values()];
  }, []);
  const door = tileToWorld(VALLEY_SPOTS.door.col, VALLEY_SPOTS.door.row);
  const tracks = tileToWorld(VALLEY_SPOTS.tracks.col, VALLEY_SPOTS.tracks.row);
  const scale = tileToWorld(VALLEY_SPOTS.scale.col, VALLEY_SPOTS.scale.row);
  const carving = tileToWorld(VALLEY_SPOTS.carving.col, VALLEY_SPOTS.carving.row);
  const edge = tileToWorld(VALLEY_SPOTS.wolf.col, VALLEY_SPOTS.wolf.row);
  const deep = tileToWorld(VALLEY_ENCOUNTERS.find((item) => item.kind === "dire")?.col ?? 10, VALLEY_ENCOUNTERS.find((item) => item.kind === "dire")?.row ?? 4);

  return (
    <group>
      <GroundPlane tiles={VALLEY_TILES} onWalk={onWalk} />
      <InstancedBoxes cells={grass} color={PALETTE.grass} size={[0.98, 0.08, 0.98]} y={0} />
      <InstancedBoxes cells={forest} color={PALETTE.forest} size={[0.98, 0.1, 0.98]} y={0.01} />
      <InstancedBoxes cells={path} color={PALETTE.path} size={[0.98, 0.1, 0.98]} y={0.02} />
      <InstancedBoxes cells={floor} color={PALETTE.floor} size={[0.98, 0.1, 0.98]} y={0.02} />
      <InstancedBoxes cells={doors} color="#6a4a38" size={[0.98, 0.12, 0.98]} y={0.03} />
      {trees.map((tree, i) => (
        <Pine key={i} position={[tree.x, 0, tree.z]} />
      ))}
      <group
        onPointerUp={(event: ThreeEvent<PointerEvent>) => {
          event.stopPropagation();
          onJob({ kind: "tracks" });
        }}
      >
        <Tracks position={[tracks.x, 0, tracks.z]} />
      </group>
      <group
        onPointerUp={(event: ThreeEvent<PointerEvent>) => {
          event.stopPropagation();
          onJob({ kind: "scale" });
        }}
      >
        <ScaleShard position={[scale.x, 0.08, scale.z]} />
      </group>
      <group
        onPointerUp={(event: ThreeEvent<PointerEvent>) => {
          event.stopPropagation();
          onJob({ kind: "carving" });
        }}
      >
        <CarvingStone position={[carving.x, 0, carving.z]} />
      </group>
      <group
        onPointerUp={(event: ThreeEvent<PointerEvent>) => {
          event.stopPropagation();
          onJob({ kind: "door" });
        }}
      >
        <DoorProp position={[door.x, 0, door.z]} />
      </group>
      <WorldLabel text="Tracks" position={[tracks.x, 0.7, tracks.z]} />
      <WorldLabel text="Scale" position={[scale.x, 0.7, scale.z]} />
      <WorldLabel text="Carving" position={[carving.x, 0.85, carving.z]} />
      <WorldLabel text="Home" position={[door.x, 1.7, door.z]} />
      <WorldLabel text="Forest edge" position={[edge.x, 1.3, edge.z]} />
      <WorldLabel text="Deep woods" position={[deep.x, 1.45, deep.z]} />
    </group>
  );
}

function GroundPlane({
  tiles,
  onWalk,
}: {
  tiles: readonly string[];
  onWalk: (x: number, z: number) => void;
}) {
  const cols = tiles[0]?.length ?? 1;
  const rows = tiles.length;
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[cols / 2, -0.02, rows / 2]}
      receiveShadow
      onPointerUp={(event: ThreeEvent<PointerEvent>) => {
        event.stopPropagation();
        const x = event.point.x;
        const z = event.point.z;
        const col = Math.floor(x);
        const row = Math.floor(z);
        if (!isWalkable(tiles[row]?.[col] ?? "#")) return;
        onWalk(x, z);
      }}
    >
      <planeGeometry args={[cols, rows]} />
      <meshStandardMaterial color={PALETTE.grassDark} roughness={1} />
    </mesh>
  );
}
