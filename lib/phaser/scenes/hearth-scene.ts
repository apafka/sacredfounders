import * as Phaser from "phaser";
import { plotStage } from "@/lib/crops";
import { CROPS } from "@/lib/data/crops";
import { countItem } from "@/lib/game/inventory";
import { CROP_META } from "@/lib/types";
import { BRIDGE_KEY, type WorldBridge } from "../bridge";
import { bindClickToMove, bindWalkKeys, burst, createGround, floatText, followActor, label, readAxis } from "../draw-map";
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
import { hearthRoute, slide, stepToward } from "../move";
import { consumeInteract, windowAxis } from "../keys";
import { PLAYER_SPEED } from "../wolf-ai";

const REACH = 28;
const INTERACT = 36;

type Job =
  | { kind: "plot"; plotId: number }
  | { kind: "fire" }
  | { kind: "bed" }
  | { kind: "chest" }
  | { kind: "workbench" }
  | { kind: "bren" }
  | { kind: "door" };

export class HearthScene extends Phaser.Scene {
  private pilgrim!: Phaser.GameObjects.Image;
  private marker!: Phaser.GameObjects.Image;
  private fireGlow!: Phaser.GameObjects.Image;
  private dest = { x: 0, y: 0 };
  private path: { x: number; y: number }[] = [];
  private job: Job | null = null;
  private moving = false;
  private usedDoor = false;
  private cropSprites = new Map<number, Phaser.GameObjects.Image>();
  private keys: Record<string, Phaser.Input.Keyboard.Key> | undefined;
  private persistAt = 0;

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
      this.add.image(x, y, "tile-soil").setDepth(1);
      const crop = this.add.image(x, y, "crop-grain-planted").setDepth(2).setVisible(false);
      this.cropSprites.set(plot.id, crop);
    }
    label(this, worldCenter(6, 3).x, worldCenter(6, 3).y - 18, "Garden");

    const fire = worldCenter(HEARTH_SPOTS.fire.col, HEARTH_SPOTS.fire.row);
    this.add.image(fire.x, fire.y, "sprite-fire").setDepth(3);
    this.fireGlow = this.add.image(fire.x, fire.y - 4, "sprite-fire").setDepth(2).setAlpha(0.35).setTint(0xffaa55);
    label(this, fire.x, fire.y - 22, "Fire");

    const bed = worldCenter(HEARTH_SPOTS.bed.col, HEARTH_SPOTS.bed.row);
    this.add.image(bed.x, bed.y, "sprite-bed").setDepth(3);
    label(this, bed.x, bed.y - 14, "Bed");

    const chest = worldCenter(HEARTH_SPOTS.chest.col, HEARTH_SPOTS.chest.row);
    this.add.image(chest.x, chest.y, "sprite-chest").setDepth(3);
    label(this, chest.x, chest.y - 14, "Chest");

    const bench = worldCenter(HEARTH_SPOTS.workbench.col, HEARTH_SPOTS.workbench.row);
    this.add.image(bench.x, bench.y, "sprite-bench").setDepth(3);
    label(this, bench.x, bench.y - 14, "Oven");

    const brenPos = worldCenter(HEARTH_SPOTS.bren.col, HEARTH_SPOTS.bren.row);
    this.add.image(brenPos.x, brenPos.y, "sprite-bren").setDepth(8);
    label(this, brenPos.x, brenPos.y - 18, "Old Bren");

    const doorPos = worldCenter(HEARTH_SPOTS.door.col, HEARTH_SPOTS.door.row);
    this.add.image(doorPos.x, doorPos.y, "sprite-door").setDepth(3);
    label(this, doorPos.x, doorPos.y - 20, "Path");

    const saved = this.bridge().getPlayer().position;
    const spawn = saved
      ? { x: saved.x, y: saved.y }
      : worldCenter(HEARTH_SPOTS.spawn.col, HEARTH_SPOTS.spawn.row);
    this.dest = { ...spawn };
    this.pilgrim = this.add.image(spawn.x, spawn.y, "sprite-pilgrim").setDepth(10);
    this.marker = this.add.image(spawn.x, spawn.y, "sprite-marker").setDepth(9).setVisible(false);
    followActor(this, this.pilgrim, HEARTH_TILES);

    this.bridge().emit({
      type: "hint",
      text: "This is your hearth. Three beds, three seeds. WASD or click to walk. Oven inside. Old Bren waits on the path.",
    });

    this.input.setDefaultCursor("pointer");
    bindClickToMove(this, (x, y) => this.onTap(x, y));
    this.keys = bindWalkKeys(this);
    this.game.canvas.setAttribute("tabindex", "0");
    this.game.canvas.focus();
    this.syncCrops();
  }

  private jobPos(job: Job): { x: number; y: number } {
    if (job.kind === "plot") {
      const plot = HEARTH_PLOTS.find((item) => item.id === job.plotId) ?? HEARTH_PLOTS[0];
      return worldCenter(plot.col, plot.row);
    }
    const spot = HEARTH_SPOTS[job.kind];
    return worldCenter(spot.col, spot.row);
  }

  private inRange(job: Job): boolean {
    const pos = this.jobPos(job);
    return Math.hypot(this.pilgrim.x - pos.x, this.pilgrim.y - pos.y) < INTERACT;
  }

  private furniture(): { spot: { col: number; row: number }; job: Job; radius: number }[] {
    return [
      { spot: HEARTH_SPOTS.fire, job: { kind: "fire" }, radius: TILE },
      { spot: HEARTH_SPOTS.bed, job: { kind: "bed" }, radius: TILE },
      { spot: HEARTH_SPOTS.chest, job: { kind: "chest" }, radius: TILE },
      { spot: HEARTH_SPOTS.workbench, job: { kind: "workbench" }, radius: TILE },
      { spot: HEARTH_SPOTS.bren, job: { kind: "bren" }, radius: TILE * 1.15 },
      { spot: HEARTH_SPOTS.door, job: { kind: "door" }, radius: TILE * 1.1 },
    ];
  }

  private onTap(x: number, y: number) {
    const { col, row } = tileFromWorld(x, y);
    if (!isWalkable(tileAt(HEARTH_TILES, col, row))) return;

    if (isDoorTile(tileAt(HEARTH_TILES, col, row))) {
      this.walkTo(worldCenter(HEARTH_SPOTS.door.col, HEARTH_SPOTS.door.row), { kind: "door" });
      return;
    }

    const plot = HEARTH_PLOTS.find((p) => p.col === col && p.row === row);
    if (plot) {
      this.walkTo(worldCenter(plot.col, plot.row), { kind: "plot", plotId: plot.id });
      return;
    }

    for (const item of this.furniture()) {
      const pos = worldCenter(item.spot.col, item.spot.row);
      if (Math.hypot(x - pos.x, y - pos.y) < item.radius) {
        this.walkTo(pos, item.job);
        return;
      }
    }

    this.walkTo({ x, y }, null);
  }

  private nearestJob(): Job | null {
    const x = this.pilgrim.x;
    const y = this.pilgrim.y;
    for (const plot of HEARTH_PLOTS) {
      const pos = worldCenter(plot.col, plot.row);
      if (Math.hypot(x - pos.x, y - pos.y) < TILE) return { kind: "plot", plotId: plot.id };
    }
    for (const item of this.furniture()) {
      const pos = worldCenter(item.spot.col, item.spot.row);
      if (Math.hypot(x - pos.x, y - pos.y) < TILE * 1.1) return item.job;
    }
    return null;
  }

  private walkTo(pos: { x: number; y: number }, job: Job | null) {
    const route = hearthRoute(this.pilgrim.x, this.pilgrim.y, pos.x, pos.y);
    this.path = route.slice(1);
    this.dest = route[0] ?? pos;
    this.job = job;
    this.moving = true;
    this.marker.setPosition(pos.x, pos.y).setVisible(true);
    this.pilgrim.setFlipX(pos.x < this.pilgrim.x);
    if (Math.hypot(this.pilgrim.x - pos.x, this.pilgrim.y - pos.y) < REACH) {
      this.moving = false;
      this.path = [];
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
        const seed = bridge.getSeed();
        const def = CROPS[seed];
        if (countItem(player.inventory, def.seedItem) < 1) {
          bridge.emit({
            type: "hint",
            text: `No ${def.name.toLowerCase()} seed. Pick another crop (1–3), or harvest.`,
          });
          return;
        }
        burst(this, this.pilgrim.x, this.pilgrim.y, 0x6b5344);
        bridge.emit({ type: "plant", plotId: job.plotId });
        return;
      }
      const stage =
        plot.plantedAt != null ? plotStage(plot.plantedAt, plot.crop, Date.now()) : "empty";
      if (stage === "ready") {
        burst(this, this.pilgrim.x, this.pilgrim.y - 8, 0xc4a35a);
        bridge.emit({ type: "harvest", plotId: job.plotId });
      } else {
        bridge.emit({
          type: "hint",
          text: `${CROP_META[plot.crop].name} is still growing.`,
        });
      }
      return;
    }
    if (job.kind === "fire") {
      bridge.emit({ type: "hint", text: "The fire kept. Warmth enough to stay a week — or leave in a minute." });
      return;
    }
    if (job.kind === "bed") {
      const pilgrim = bridge.getPlayer();
      const missing = pilgrim.maxHealth - pilgrim.health;
      if (missing > 0) {
        floatText(this, this.pilgrim.x, this.pilgrim.y - 18, `+${missing} HP`, "#6d7a4e");
        burst(this, this.pilgrim.x, this.pilgrim.y, 0x6d7a4e);
      } else {
        floatText(this, this.pilgrim.x, this.pilgrim.y - 18, "Already rested", "#c4a35a");
        bridge.emit({ type: "hint", text: "You lie down. You are already rested." });
      }
      bridge.emit({ type: "rest-bed" });
      return;
    }
    if (job.kind === "chest") {
      bridge.emit({ type: "inventory" });
      bridge.emit({ type: "hint", text: "A chest for later. For now, what you carry is on you. Press I." });
      return;
    }
    if (job.kind === "workbench") {
      if (countItem(player.inventory, "wheat") < 1) {
        bridge.emit({ type: "hint", text: "The oven wants a sheaf of wheat. Harvest the garden, then come back." });
        return;
      }
      burst(this, this.pilgrim.x, this.pilgrim.y, 0xc4a35a);
      floatText(this, this.pilgrim.x, this.pilgrim.y - 18, "Baked", "#c4a35a");
      bridge.emit({ type: "bake-bread" });
      return;
    }
    if (job.kind === "bren") {
      bridge.emit({ type: "talk-bren" });
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
      const stage = plotStage(plot.plantedAt, plot.crop, now);
      sprite.setTexture(cropTexture(plot.crop, stage)).setVisible(true);
    }
  }

  update(_time: number, delta: number) {
    this.syncCrops();
    this.fireGlow.setAlpha(0.25 + Math.sin(_time / 180) * 0.12);
    this.fireGlow.setScale(1 + Math.sin(_time / 140) * 0.08);

    const dt = delta / 1000;
    if (this.job && this.inRange(this.job)) {
      this.moving = false;
      this.marker.setVisible(false);
      this.doJob();
    }

    const axisPhaser = readAxis(this.keys);
    const axisWin = windowAxis();
    const axis =
      axisWin.x !== 0 || axisWin.y !== 0 ? axisWin : axisPhaser;
    if (axis.x !== 0 || axis.y !== 0) {
      this.moving = false;
      this.job = null;
      this.path = [];
      this.marker.setVisible(false);
      const len = Math.hypot(axis.x, axis.y) || 1;
      const next = slide(
        HEARTH_TILES,
        this.pilgrim.x,
        this.pilgrim.y,
        this.pilgrim.x + (axis.x / len) * PLAYER_SPEED * dt,
        this.pilgrim.y + (axis.y / len) * PLAYER_SPEED * dt,
      );
      this.pilgrim.setPosition(next.x, next.y).setFlipX(axis.x < 0);
    } else if (this.moving) {
      const prevX = this.pilgrim.x;
      const prevY = this.pilgrim.y;
      const next = stepToward(prevX, prevY, this.dest.x, this.dest.y, PLAYER_SPEED, dt, REACH);
      const slid = slide(HEARTH_TILES, prevX, prevY, next.x, next.y);
      this.pilgrim.setPosition(slid.x, slid.y).setFlipX(this.dest.x < prevX);
      if (next.arrived) {
        const stop = this.path.shift();
        if (stop) {
          this.dest = stop;
          this.moving = true;
        } else {
          this.moving = false;
          this.marker.setVisible(false);
          this.doJob();
        }
      } else if (slid.x === prevX && slid.y === prevY) {
        const stop = this.path.shift();
        if (stop) {
          this.dest = stop;
          this.moving = true;
        } else {
          this.moving = false;
          this.marker.setVisible(false);
        }
      }
    }

    this.pilgrim.setDepth(10 + this.pilgrim.y);

    if ((this.keys?.E && Phaser.Input.Keyboard.JustDown(this.keys.E)) || consumeInteract()) {
      const job = this.nearestJob();
      if (job) {
        this.job = job;
        this.doJob();
      }
    }

    const tile = tileFromWorld(this.pilgrim.x, this.pilgrim.y);
    if (isDoorTile(tileAt(HEARTH_TILES, tile.col, tile.row))) {
      this.openValleyDoor();
    }

    this.persistAt += delta;
    if (this.persistAt > 1200) {
      this.persistAt = 0;
      this.bridge().emit({ type: "position", x: this.pilgrim.x, y: this.pilgrim.y });
    }
  }
}
