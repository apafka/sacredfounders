"use client";

import { useEffect, useRef } from "react";
import {
  COLS,
  HEARTH_PLOTS,
  HEARTH_SPOTS,
  HEARTH_TILES,
  VALLEY_ENCOUNTERS,
  VALLEY_SPOTS,
  VALLEY_TILES,
  tileFromWorld,
} from "@/lib/phaser/layout";
import type { PlayerState } from "@/lib/types";

const CELL = 4;

function tilesFor(scene: PlayerState["scene"]) {
  return scene === "valley" ? VALLEY_TILES : HEARTH_TILES;
}

function colorFor(ch: string): string {
  if (ch === "#") return "#4a3a30";
  if (ch === "=") return "#d4c4a0";
  if (ch === ".") return "#cbb892";
  if (ch === "T") return "#3a452e";
  if (ch === "D") return "#6a4a38";
  if (ch === "~") return "#6a8a8a";
  return "#8a9a6a";
}

export function MiniMap({ player }: { player: PlayerState }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tiles = tilesFor(player.scene);
  const rows = tiles.length;
  const width = COLS * CELL;
  const height = rows * CELL;

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    canvas.width = width;
    canvas.height = height;
    ctx.fillStyle = "#2c241c";
    ctx.fillRect(0, 0, width, height);
    for (let row = 0; row < rows; row += 1) {
      const line = tiles[row] ?? "";
      for (let col = 0; col < COLS; col += 1) {
        ctx.fillStyle = colorFor(line[col] ?? "#");
        ctx.fillRect(col * CELL, row * CELL, CELL, CELL);
      }
    }

    const mark = (col: number, row: number, fill: string, size = 5) => {
      ctx.fillStyle = fill;
      ctx.fillRect(col * CELL - 1, row * CELL - 1, size, size);
    };

    if (player.scene === "hearth") {
      mark(HEARTH_SPOTS.bren.col, HEARTH_SPOTS.bren.row, "#6a3a28", 6);
      mark(HEARTH_PLOTS[1].col, HEARTH_PLOTS[1].row, "#6d7a4e", 6);
      mark(HEARTH_SPOTS.door.col, HEARTH_SPOTS.door.row, "#c4a35a", 6);
    } else {
      mark(VALLEY_SPOTS.door.col, VALLEY_SPOTS.door.row, "#c4a35a", 6);
      for (const foe of VALLEY_ENCOUNTERS) {
        const live = player.encounters.find((item) => item.id === foe.id);
        mark(foe.col, foe.row, live?.alive === false ? "#5a4630" : "#8a4a32", 4);
      }
    }

    const spawn = player.scene === "valley" ? VALLEY_SPOTS.spawn : HEARTH_SPOTS.spawn;
    const pos = player.position ?? null;
    const tile = pos ? tileFromWorld(pos.x, pos.y) : spawn;
    ctx.fillStyle = "#f3efe4";
    ctx.strokeStyle = "#2c241c";
    ctx.lineWidth = 1;
    const px = tile.col * CELL + CELL / 2;
    const py = tile.row * CELL + CELL / 2;
    ctx.beginPath();
    ctx.arc(px, py, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }, [player.encounters, player.position, player.scene, height, rows, tiles, width]);

  return (
    <div className="hud-minimap" aria-label="Minimap">
      <p>Map</p>
      <canvas ref={canvasRef} width={width} height={height} />
      <ul>
        <li>
          <i className="dot you" /> You
        </li>
        {player.scene === "hearth" ? (
          <>
            <li>
              <i className="dot bren" /> Bren
            </li>
            <li>
              <i className="dot garden" /> Garden
            </li>
          </>
        ) : (
          <li>
            <i className="dot foe" /> Beasts
          </li>
        )}
        <li>
          <i className="dot door" /> Door
        </li>
      </ul>
    </div>
  );
}
