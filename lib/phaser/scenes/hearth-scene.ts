import * as Phaser from "phaser";
import { plotReady } from "@/lib/crops";
import { CROP_META } from "@/lib/types";
import { BRIDGE_KEY, type WorldBridge } from "../bridge";
import { bindClickToMove, createGround, label } from "../draw-map";
import {
  HEARTH_PLOTS,
  HEARTH_SPOTS,
  HEARTH_TILES,
  TILE,
  cropTexture,
  isDoorTile,
  isWalkable,
  tileAt,
  tileFromWorld,
  worldCenter,
} from "../layout";
import { clampToRect, slide, stepToward } from "../move";

const WALK_SPEED = 120;
const REACH = 22;

type Job =
  | { kind: "plot"; plotId: number }
  | { kind: "creek" }
  | { kind: "kitchen" }
  | { kind: "bren" }
  | { kind: "door" };

export class HearthScene extends Phaser.Scene {
  private pilgrim!: Phaser.GameObjects.Image;
  private marker!: Phaser.GameObjects.Image;
  private dest = { x: 0, y: 0 };
  private job: Job | null = null;
  private moving = false;
  private usedDoor = false;
  private plotSprites = new Map<number, Phaser.GameObjects.Image>();
  private cropSprites = new Map<number, Phaser.GameObjects.Image>();

  constructor() {
    super("hearth");
  }

  private bridge(): WorldBridge {
    return this.registry.get(BRIDGE_KEY) as WorldBridge;
  }

  create() {
    createGround(this, HEARTH_TILES);

    for (const plot of HEARTH_PLOTS) {
      const { x, y } = worldCenter(plot.col, plot.row);
      const soil = this.add.image(x, y, "tile-soil").setDepth(1);
      const crop = this.add.image(x, y, "crop-grain-grow").setDepth(2).setVisible(false);
      this.plotSprites.set(plot.id, soil);
      this.cropSprites.set(plot.id, crop);
    }

    const creek = worldCenter(HEARTH_SPOTS.creek.col, HEARTH_SPOTS.creek.row);
    label(this, creek.x + TILE * 2, creek.y + 18, "Creek");

    const kitchenPos = worldCenter(HEARTH_SPOTS.kitchen.col, HEARTH_SPOTS.kitchen.row);
    this.add.image(kitchenPos.x, kitchenPos.y, "sprite-kitchen").setDepth(3);
    label(this, kitchenPos.x, kitchenPos.y - 16, "Kitchen");

    const brenPos = worldCenter(HEARTH_SPOTS.bren.col, HEARTH_SPOTS.bren.row);
    this.add.image(brenPos.x, brenPos.y, "sprite-stall").setDepth(3);
    label(this, brenPos.x, brenPos.y - 18, "Old Bren");

    const doorPos = worldCenter(HEARTH_SPOTS.door.col, HEARTH_SPOTS.door.row);
    this.add.image(doorPos.x, doorPos.y, "sprite-door").setDepth(3);
    label(this, doorPos.x, doorPos.y - 20, "Door");

    const spawn = worldCenter(HEARTH_SPOTS.spawn.col, HEARTH_SPOTS.spawn.row);
    this.dest = { ...spawn };
    this.pilgrim = this.add.image(spawn.x, spawn.y, "sprite-pilgrim").setDepth(10);
    this.marker = this.add.image(spawn.x, spawn.y, "sprite-marker").setDepth(9).setVisible(false);

    this.bridge().emit({
      type: "hint",
      text: "Tap the ground to walk. Garden beds, creek, kitchen, Old Bren, and the valley door all answer a tap.",
    });

    this.input.setDefaultCursor("pointer");
    bindClickToMove(this, (x, y) => this.onTap(x, y));
    this.syncCrops();
  }

  private onTap(x: number, y: number) {
    const { col, row } = tileFromWorld(x, y);
    if (!isWalkable(tileAt(HEARTH_TILES, col, row))) return;

    const plot = HEARTH_PLOTS.find((p) => p.col === col && p.row === row);
    if (plot) {
      this.walkTo(worldCenter(plot.col, plot.row), { kind: "plot", plotId: plot.id });
      return;
    }

    const jobs: { spot: { col: number; row: number }; job: Job; radius: number }[] = [
      { spot: HEARTH_SPOTS.creek, job: { kind: "creek" }, radius: TILE * 1.2 },
      { spot: HEARTH_SPOTS.kitchen, job: { kind: "kitchen" }, radius: TILE * 1.1 },
      { spot: HEARTH_SPOTS.bren, job: { kind: "bren" }, radius: TILE * 1.1 },
      { spot: HEARTH_SPOTS.door, job: { kind: "door" }, radius: TILE * 1.1 },
    ];
    for (const item of jobs) {
      const pos = worldCenter(item.spot.col, item.spot.row);
      if (Math.hypot(x - pos.x, y - pos.y) < item.radius) {
        this.walkTo(pos, item.job);
        return;
      }
    }

    this.walkTo({ x, y }, null);
  }

  private walkTo(pos: { x: number; y: number }, job: Job | null) {
    this.dest = pos;
    this.job = job;
    this.moving = true;
    this.marker.setPosition(pos.x, pos.y).setVisible(true);
    this.pilgrim.setFlipX(pos.x < this.pilgrim.x);
    if (Math.hypot(this.pilgrim.x - pos.x, this.pilgrim.y - pos.y) < REACH) {
      this.moving = false;
      this.marker.setVisible(false);
      this.doJob();
    }
  }

  private doJob() {
    const job = this.job;
    this.job = null;
    if (!job) return;
    const bridge = this.bridge();
    if (bridge.isBusy()) {
      bridge.emit({ type: "hint", text: "A breath — the hearth is still working." });
      return;
    }
    const player = bridge.getPlayer();
    if (job.kind === "plot") {
      const plot = player.plots[job.plotId];
      if (!plot) return;
      if (!plot.crop) {
        bridge.emit({ type: "plant", plotId: job.plotId });
        return;
      }
      const ready =
        plot.plantedAt != null && plotReady(plot.plantedAt, plot.crop, player.farmSkill, Date.now());
      if (ready) {
        bridge.emit({ type: "harvest", plotId: job.plotId });
      } else {
        bridge.emit({
          type: "hint",
          text: `${CROP_META[plot.crop].name} is still growing in bed ${job.plotId + 1}.`,
        });
      }
      return;
    }
    if (job.kind === "creek") {
      bridge.emit({ type: "fish" });
      return;
    }
    if (job.kind === "kitchen") {
      bridge.emit({ type: "cook" });
      return;
    }
    if (job.kind === "bren") {
      bridge.emit({ type: "open-market" });
      bridge.emit({ type: "hint", text: "Old Bren waits with a quiet scale." });
      return;
    }
    this.openValleyDoor();
  }

  private openValleyDoor() {
    if (this.usedDoor || this.bridge().isBusy()) return;
    this.usedDoor = true;
    this.bridge().emit({ type: "door", scene: "valley" });
  }

  private syncCrops() {
    const player = this.bridge().getPlayer();
    const now = Date.now();
    for (const plot of player.plots) {
      const sprite = this.cropSprites.get(plot.id);
      if (!sprite) continue;
      if (!plot.crop || plot.plantedAt == null) {
        sprite.setVisible(false);
        continue;
      }
      const ready = plotReady(plot.plantedAt, plot.crop, player.farmSkill, now);
      sprite.setTexture(cropTexture(plot.crop, ready)).setVisible(true);
    }
  }

  update(_time: number, delta: number) {
    this.syncCrops();
    if (this.moving) {
      const prevX = this.pilgrim.x;
      const prevY = this.pilgrim.y;
      const next = stepToward(prevX, prevY, this.dest.x, this.dest.y, WALK_SPEED, delta / 1000, REACH);
      const slid = slide(HEARTH_TILES, prevX, prevY, next.x, next.y);
      this.pilgrim.setPosition(slid.x, slid.y).setDepth(10 + slid.y);
      if (next.arrived) {
        this.moving = false;
        this.marker.setVisible(false);
        this.doJob();
      } else if (slid.x === prevX && slid.y === prevY) {
        this.moving = false;
        this.marker.setVisible(false);
      }
    }
    const tile = tileFromWorld(this.pilgrim.x, this.pilgrim.y);
    if (isDoorTile(tileAt(HEARTH_TILES, tile.col, tile.row))) {
      this.openValleyDoor();
    }
  }
}
