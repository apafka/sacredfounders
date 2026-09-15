"use client";

import { useMemo } from "react";
import * as THREE from "three";

export function makeLabelTexture(text: string): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#f3efe4ee";
    ctx.fillRect(8, 8, 240, 48);
    ctx.fillStyle = "#2c241c";
    ctx.font = "600 26px Georgia, serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 128, 32);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

export function WorldLabel({
  text,
  position,
}: {
  text: string;
  position: [number, number, number];
}) {
  const texture = useMemo(() => makeLabelTexture(text), [text]);
  return (
    <sprite position={position} scale={[1.7, 0.42, 1]} renderOrder={20}>
      <spriteMaterial map={texture} transparent depthWrite={false} />
    </sprite>
  );
}
