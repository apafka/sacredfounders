"use client";

import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import type { Scene } from "@/lib/types";
import type { WorldBridge } from "@/lib/phaser/bridge";
import { PALETTE } from "./palette";
import { IsoSim, WorldLights } from "./sim";

export function DragonWorldCanvas({
  bridge,
  scene,
}: {
  bridge: WorldBridge;
  scene: Scene;
}) {
  return (
    <Canvas
      orthographic
      shadows
      dpr={[1, 1.75]}
      camera={{ position: [22, 26, 22], zoom: 32, near: 0.1, far: 220, up: [0, 1, 0] }}
      gl={{ antialias: true, alpha: false }}
      style={{ width: "100%", height: "100%", display: "block", touchAction: "none" }}
      onCreated={({ gl }) => {
        gl.shadowMap.enabled = true;
        gl.shadowMap.type = THREE.PCFSoftShadowMap;
        gl.setClearColor(PALETTE.sky, 1);
      }}
    >
      <WorldLights scene={scene} />
      <IsoSim key={scene} bridge={bridge} scene={scene} />
    </Canvas>
  );
}
