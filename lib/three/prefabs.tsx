"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";
import type { Group, PointLight } from "three";
import { PALETTE } from "./palette";
import type { CropId } from "@/lib/data/crops";
import type { EncounterKind } from "@/lib/data/enemies";

const mat = { roughness: 0.88, metalness: 0.02 } as const;

export function Billboard({
  children,
  position,
}: {
  children: ReactNode;
  position: [number, number, number];
}) {
  const ref = useRef<Group>(null);
  useFrame(({ camera }) => {
    ref.current?.quaternion.copy(camera.quaternion);
  });
  return (
    <group ref={ref} position={position}>
      {children}
    </group>
  );
}

export function HpBar({ ratio, width = 0.85 }: { ratio: number; width?: number }) {
  const r = Math.max(0, Math.min(1, ratio));
  return (
    <Billboard position={[0, 1.42, 0]}>
      <mesh position={[0, 0, 0]}>
        <planeGeometry args={[width + 0.06, 0.12]} />
        <meshBasicMaterial color="#2c241c" depthTest={false} />
      </mesh>
      <mesh position={[-(width * (1 - r)) / 2, 0, 0.01]} scale={[Math.max(r, 0.001), 1, 1]}>
        <planeGeometry args={[width, 0.07]} />
        <meshBasicMaterial color={r > 0.34 ? "#6d7a4e" : "#b33a2b"} depthTest={false} />
      </mesh>
    </Billboard>
  );
}

export function PilgrimMesh() {
  return (
    <group>
      <mesh position={[0, 0.42, 0]} castShadow>
        <boxGeometry args={[0.42, 0.72, 0.28]} />
        <meshStandardMaterial color={PALETTE.pilgrim} {...mat} />
      </mesh>
      <mesh position={[0, 0.92, 0]} castShadow>
        <boxGeometry args={[0.3, 0.3, 0.26]} />
        <meshStandardMaterial color={PALETTE.pilgrimHead} roughness={0.7} metalness={0} />
      </mesh>
      <mesh position={[0, 0.22, 0.16]} castShadow>
        <boxGeometry args={[0.36, 0.28, 0.08]} />
        <meshStandardMaterial color="#4a3a30" {...mat} />
      </mesh>
    </group>
  );
}

export function BrenMesh() {
  return (
    <group>
      <mesh position={[0, 0.4, 0]} castShadow>
        <boxGeometry args={[0.46, 0.7, 0.3]} />
        <meshStandardMaterial color={PALETTE.bren} {...mat} />
      </mesh>
      <mesh position={[0, 0.38, 0.14]} castShadow>
        <boxGeometry args={[0.4, 0.36, 0.08]} />
        <meshStandardMaterial color={PALETTE.apron} {...mat} />
      </mesh>
      <mesh position={[0, 0.9, 0]} castShadow>
        <boxGeometry args={[0.3, 0.28, 0.26]} />
        <meshStandardMaterial color={PALETTE.pilgrimHead} roughness={0.7} metalness={0} />
      </mesh>
    </group>
  );
}

export function MonsterMesh({ tinted, kind }: { tinted?: "hit" | "agro" | "dead" | null; kind?: EncounterKind }) {
  const color =
    tinted === "hit"
      ? PALETTE.cream
      : tinted === "agro"
        ? "#8a4a32"
        : tinted === "dead"
          ? "#2c241c"
          : kind === "dire"
            ? "#241810"
            : kind === "boar"
              ? "#6a4a32"
              : kind === "spider"
                ? "#3a3228"
                : PALETTE.wolfDark;
  if (kind === "spider") {
    return (
      <group>
        <mesh position={[0, 0.18, 0]} castShadow>
          <sphereGeometry args={[0.28, 8, 6]} />
          <meshStandardMaterial color={color} {...mat} />
        </mesh>
        <mesh position={[0.22, 0.2, 0]} castShadow>
          <sphereGeometry args={[0.16, 6, 5]} />
          <meshStandardMaterial color={color} {...mat} />
        </mesh>
        {[-0.22, 0.22].map((z) =>
          [-0.18, 0.18].map((x) => (
            <mesh key={`${x}-${z}`} position={[x, 0.08, z]} rotation={[0, 0, z > 0 ? 0.5 : -0.5]} castShadow>
              <boxGeometry args={[0.42, 0.05, 0.05]} />
              <meshStandardMaterial color={color} {...mat} />
            </mesh>
          )),
        )}
      </group>
    );
  }
  if (kind === "boar") {
    return (
      <group>
        <mesh position={[0, 0.32, 0]} castShadow>
          <boxGeometry args={[0.95, 0.5, 0.55]} />
          <meshStandardMaterial color={color} {...mat} />
        </mesh>
        <mesh position={[0.48, 0.34, 0]} castShadow>
          <boxGeometry args={[0.32, 0.32, 0.36]} />
          <meshStandardMaterial color={color} {...mat} />
        </mesh>
        <mesh position={[0.58, 0.4, -0.12]} castShadow>
          <boxGeometry args={[0.18, 0.06, 0.06]} />
          <meshStandardMaterial color="#e8d9b0" {...mat} />
        </mesh>
        <mesh position={[0.58, 0.4, 0.12]} castShadow>
          <boxGeometry args={[0.18, 0.06, 0.06]} />
          <meshStandardMaterial color="#e8d9b0" {...mat} />
        </mesh>
      </group>
    );
  }
  const scale = kind === "dire" ? 1.45 : 1;
  return (
    <group scale={scale}>
      <mesh position={[0, 0.28, 0]} castShadow>
        <boxGeometry args={[0.92, 0.38, 0.44]} />
        <meshStandardMaterial color={color} {...mat} />
      </mesh>
      <mesh position={[0.5, 0.34, 0]} castShadow>
        <boxGeometry args={[0.34, 0.28, 0.3]} />
        <meshStandardMaterial color={color} {...mat} />
      </mesh>
      <mesh position={[-0.48, 0.42, 0]} castShadow>
        <boxGeometry args={[0.16, 0.12, 0.12]} />
        <meshStandardMaterial color={color} {...mat} />
      </mesh>
      <mesh position={[0.42, 0.52, -0.1]} castShadow>
        <boxGeometry args={[0.08, 0.16, 0.08]} />
        <meshStandardMaterial color={color} {...mat} />
      </mesh>
      <mesh position={[0.42, 0.52, 0.1]} castShadow>
        <boxGeometry args={[0.08, 0.16, 0.08]} />
        <meshStandardMaterial color={color} {...mat} />
      </mesh>
    </group>
  );
}

export function WolfMesh({ tinted, kind }: { tinted?: "hit" | "agro" | "dead" | null; kind?: "wolf" | "dire" }) {
  return <MonsterMesh tinted={tinted} kind={kind} />;
}

export function Pine({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.28, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.1, 0.55, 5]} />
        <meshStandardMaterial color={PALETTE.timber} {...mat} />
      </mesh>
      <mesh position={[0, 0.95, 0]} castShadow>
        <coneGeometry args={[0.52, 1.28, 6]} />
        <meshStandardMaterial color={PALETTE.forest} {...mat} />
      </mesh>
      <mesh position={[0, 1.45, 0]} castShadow>
        <coneGeometry args={[0.32, 0.7, 6]} />
        <meshStandardMaterial color={PALETTE.grassDark} {...mat} />
      </mesh>
    </group>
  );
}

export function HearthFire({ position }: { position: [number, number, number] }) {
  const light = useRef<PointLight>(null);
  useFrame(({ clock }) => {
    const lamp = light.current;
    if (!lamp) return;
    const t = clock.elapsedTime;
    lamp.intensity = 1.35 + Math.sin(t * 8.5) * 0.28 + Math.sin(t * 13) * 0.1;
  });
  return (
    <group position={position}>
      <mesh position={[0, 0.18, 0]} castShadow>
        <boxGeometry args={[0.62, 0.28, 0.42]} />
        <meshStandardMaterial color={PALETTE.ink} {...mat} />
      </mesh>
      <mesh position={[0, 0.48, 0]}>
        <boxGeometry args={[0.2, 0.5, 0.16]} />
        <meshStandardMaterial color={PALETTE.fire} emissive={PALETTE.fire} emissiveIntensity={1.6} />
      </mesh>
      <mesh position={[0.05, 0.62, 0]}>
        <boxGeometry args={[0.1, 0.28, 0.1]} />
        <meshStandardMaterial color={PALETTE.fireHot} emissive={PALETTE.fireHot} emissiveIntensity={2} />
      </mesh>
      <pointLight ref={light} position={[0, 0.85, 0]} color={PALETTE.fireHot} intensity={1.5} distance={8} />
    </group>
  );
}

export function BedProp({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.16, 0]} castShadow>
        <boxGeometry args={[0.9, 0.18, 0.55]} />
        <meshStandardMaterial color={PALETTE.timber} {...mat} />
      </mesh>
      <mesh position={[-0.12, 0.28, 0]} castShadow>
        <boxGeometry args={[0.58, 0.1, 0.46]} />
        <meshStandardMaterial color={PALETTE.cream} {...mat} />
      </mesh>
    </group>
  );
}

export function ChestProp({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.22, 0]} castShadow>
        <boxGeometry args={[0.55, 0.38, 0.38]} />
        <meshStandardMaterial color={PALETTE.timber} {...mat} />
      </mesh>
      <mesh position={[0, 0.28, 0.2]}>
        <boxGeometry args={[0.08, 0.08, 0.06]} />
        <meshStandardMaterial color={PALETTE.gold} metalness={0.4} roughness={0.4} />
      </mesh>
    </group>
  );
}

export function BenchProp({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.32, 0]} castShadow>
        <boxGeometry args={[0.85, 0.08, 0.4]} />
        <meshStandardMaterial color={PALETTE.timber} {...mat} />
      </mesh>
      <mesh position={[-0.32, 0.16, 0]} castShadow>
        <boxGeometry args={[0.08, 0.32, 0.36]} />
        <meshStandardMaterial color="#4a3a30" {...mat} />
      </mesh>
      <mesh position={[0.32, 0.16, 0]} castShadow>
        <boxGeometry args={[0.08, 0.32, 0.36]} />
        <meshStandardMaterial color="#4a3a30" {...mat} />
      </mesh>
    </group>
  );
}

export function DoorProp({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.7, 0]} castShadow>
        <boxGeometry args={[0.7, 1.4, 0.12]} />
        <meshStandardMaterial color="#5a4030" {...mat} />
      </mesh>
      <mesh position={[0.18, 0.65, 0.08]}>
        <boxGeometry args={[0.08, 0.08, 0.06]} />
        <meshStandardMaterial color={PALETTE.gold} metalness={0.35} roughness={0.45} />
      </mesh>
    </group>
  );
}

export function SoilBed({ position }: { position: [number, number, number] }) {
  return (
    <mesh position={position} receiveShadow>
      <boxGeometry args={[0.88, 0.14, 0.88]} />
      <meshStandardMaterial color={PALETTE.soil} roughness={0.88} metalness={0.02} />
    </mesh>
  );
}

export function WheatStalk({ stage }: { stage: "planted" | "sprout" | "growing" | "ready" }) {
  const h = stage === "planted" ? 0.14 : stage === "sprout" ? 0.3 : stage === "growing" ? 0.52 : 0.84;
  const color = stage === "ready" ? PALETTE.wheat : stage === "planted" ? "#6b5344" : PALETTE.sprout;
  return (
    <group>
      <mesh position={[0, h / 2, 0]} castShadow>
        <boxGeometry args={[0.1, h, 0.1]} />
        <meshStandardMaterial color={color} {...mat} />
      </mesh>
      {stage === "ready" ? (
        <mesh position={[0, h + 0.07, 0]} castShadow>
          <boxGeometry args={[0.28, 0.14, 0.16]} />
          <meshStandardMaterial color={PALETTE.gold} {...mat} />
        </mesh>
      ) : null}
    </group>
  );
}

function RootPlant({ stage }: { stage: "planted" | "sprout" | "growing" | "ready" }) {
  const h = stage === "planted" ? 0.1 : stage === "sprout" ? 0.18 : stage === "growing" ? 0.28 : 0.38;
  const w = stage === "planted" ? 0.16 : stage === "sprout" ? 0.22 : stage === "growing" ? 0.32 : 0.42;
  const color = stage === "ready" ? PALETTE.rootReady : stage === "planted" ? "#5a3a28" : PALETTE.root;
  return (
    <group>
      <mesh position={[0, h / 2, 0]} castShadow>
        <sphereGeometry args={[w / 2, 6, 5]} />
        <meshStandardMaterial color={color} {...mat} />
      </mesh>
      {stage === "ready" || stage === "growing" ? (
        <mesh position={[0, h + 0.08, 0]} castShadow>
          <boxGeometry args={[0.06, 0.16, 0.06]} />
          <meshStandardMaterial color="#6d7a4e" {...mat} />
        </mesh>
      ) : null}
    </group>
  );
}

function HerbPlant({ stage }: { stage: "planted" | "sprout" | "growing" | "ready" }) {
  const h = stage === "planted" ? 0.12 : stage === "sprout" ? 0.24 : stage === "growing" ? 0.4 : 0.55;
  const color = stage === "ready" ? PALETTE.herbReady : stage === "planted" ? "#3d5a32" : PALETTE.herb;
  return (
    <group>
      <mesh position={[-0.1, h / 2, 0]} rotation={[0, 0, 0.35]} castShadow>
        <boxGeometry args={[0.08, h, 0.18]} />
        <meshStandardMaterial color={color} {...mat} />
      </mesh>
      <mesh position={[0.12, h / 2 + 0.04, 0.04]} rotation={[0, 0, -0.4]} castShadow>
        <boxGeometry args={[0.08, h * 0.85, 0.16]} />
        <meshStandardMaterial color={color} {...mat} />
      </mesh>
      {stage === "ready" ? (
        <mesh position={[0, h + 0.06, 0]} castShadow>
          <boxGeometry args={[0.12, 0.1, 0.12]} />
          <meshStandardMaterial color="#e8d9b0" {...mat} />
        </mesh>
      ) : null}
    </group>
  );
}

export function CropPlant({
  crop,
  stage,
}: {
  crop: CropId;
  stage: "planted" | "sprout" | "growing" | "ready";
}) {
  if (crop === "root") return <RootPlant stage={stage} />;
  if (crop === "herb") return <HerbPlant stage={stage} />;
  return <WheatStalk stage={stage} />;
}

export function PeltDrop({
  position,
  dire = false,
  kind,
}: {
  position: [number, number, number];
  dire?: boolean;
  kind?: EncounterKind;
}) {
  const resolved = kind ?? (dire ? "dire" : "wolf");
  const color =
    resolved === "dire" ? "#3d2a1c" : resolved === "boar" ? "#c4b08a" : resolved === "spider" ? "#d7cfc0" : "#5a3a28";
  const size: [number, number, number] =
    resolved === "dire" ? [0.7, 0.1, 0.5] : resolved === "boar" ? [0.22, 0.18, 0.12] : [0.55, 0.08, 0.4];
  return (
    <mesh position={position} castShadow rotation={[-0.4, 0.4, 0.1]}>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} {...mat} />
    </mesh>
  );
}

export function Tracks({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[-0.35, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0.2]} receiveShadow>
        <circleGeometry args={[0.28, 8]} />
        <meshStandardMaterial color="#3d2a1c" transparent opacity={0.55} />
      </mesh>
      <mesh position={[0.4, 0.03, 0.08]} rotation={[-Math.PI / 2, 0, -0.15]} receiveShadow>
        <circleGeometry args={[0.34, 8]} />
        <meshStandardMaterial color="#3d2a1c" transparent opacity={0.5} />
      </mesh>
    </group>
  );
}

export function ScaleShard({ position }: { position: [number, number, number] }) {
  return (
    <mesh position={position} rotation={[0.4, 0.6, 0.2]} castShadow>
      <boxGeometry args={[0.28, 0.04, 0.22]} />
      <meshStandardMaterial color="#b8c4c0" metalness={0.55} roughness={0.25} />
    </mesh>
  );
}

export function CarvingStone({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.22, 0]} castShadow>
        <boxGeometry args={[0.48, 0.44, 0.22]} />
        <meshStandardMaterial color="#6b5344" {...mat} />
      </mesh>
      <mesh position={[0, 0.28, 0.12]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.1, 0.02, 6, 12]} />
        <meshStandardMaterial color="#cbb892" {...mat} />
      </mesh>
    </group>
  );
}

export function MarkerRing({ position, visible }: { position: [number, number, number]; visible: boolean }) {
  if (!visible) return null;
  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.16, 0.24, 16]} />
      <meshBasicMaterial color={PALETTE.gold} transparent opacity={0.85} />
    </mesh>
  );
}

export function FloatText({ text, color }: { text: string; color: string }) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.font = "700 30px Georgia, serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.strokeStyle = "#2c241c";
      ctx.lineWidth = 6;
      ctx.strokeText(text, 128, 32);
      ctx.fillStyle = color;
      ctx.fillText(text, 128, 32);
    }
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    return map;
  }, [text, color]);
  return (
    <sprite scale={[1.4, 0.4, 1]} renderOrder={30}>
      <spriteMaterial map={texture} transparent depthWrite={false} depthTest={false} />
    </sprite>
  );
}
