import * as Phaser from "phaser";
import { PLAYER_MAX_HP } from "@/lib/combat";
import { BRIDGE_KEY, type WorldBridge } from "../bridge";
import {
  bindClickToMove,
  bindWalkKeys,
  burst,
  createGround,
  floatText,
  followActor,
  label,
  paintHpBar,
  readAxis,
} from "../draw-map";
import {
  TILE,
  VALLEY_SPOTS,
  VALLEY_TILES,
  VALLEY_TREES,
  isDoorTile,
  isWalkable,
  tileAt,
  tileFromWorld,
  worldCenter,
} from "../layout";
import { slide, stepToward } from "../move";
import { consumeInteract, windowAxis } from "../keys";
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
} from "../wolf-ai";

const REACH = 10;
const MARGIN = TILE + 8;

export class ValleyScene extends Phaser.Scene {
  private pilgrim!: Phaser.GameObjects.Image;
  private marker!: Phaser.GameObjects.Image;
  private wolfSprite!: Phaser.GameObjects.Image;
  private peltSprite!: Phaser.GameObjects.Image;
  private playerBar!: Phaser.GameObjects.Graphics;
  private wolfBar!: Phaser.GameObjects.Graphics;
  private dest = { x: 0, y: 0 };
  private moving = false;
  private hunting = false;
  private body = { x: 0, y: 0, hp: PLAYER_MAX_HP };
  private wolf!: Wolf;
  private attackCd = 0;
  private usedDoor = false;
  private reportedDown = false;
  private keys: Record<string, Phaser.Input.Keyboard.Key> | undefined;
  private persistAt = 0;
  private bob = 0;

  constructor() {
    super("valley");
  }

  private bridge(): WorldBridge {
    return this.registry.get(BRIDGE_KEY) as WorldBridge;
  }

  create() {
    createGround(this, VALLEY_TILES);

    for (const tree of VALLEY_TREES) {
      const pos = worldCenter(tree.col, tree.row);
      this.add.image(pos.x, pos.y - 6, "sprite-tree").setDepth(6 + pos.y);
    }

    const tracks = worldCenter(VALLEY_SPOTS.tracks.col, VALLEY_SPOTS.tracks.row);
    this.add.image(tracks.x, tracks.y, "sprite-tracks").setDepth(2);
    label(this, tracks.x, tracks.y - 12, "Tracks");

    const scale = worldCenter(VALLEY_SPOTS.scale.col, VALLEY_SPOTS.scale.row);
    this.add.image(scale.x, scale.y, "sprite-scale").setDepth(3);
    label(this, scale.x, scale.y - 12, "Scale");

    const carving = worldCenter(VALLEY_SPOTS.carving.col, VALLEY_SPOTS.carving.row);
    this.add.image(carving.x, carving.y, "sprite-carving").setDepth(3);
    label(this, carving.x, carving.y - 12, "Carving");

    const doorPos = worldCenter(VALLEY_SPOTS.door.col, VALLEY_SPOTS.door.row);
    this.add.image(doorPos.x, doorPos.y, "sprite-door").setDepth(3);
    label(this, doorPos.x, doorPos.y - 20, "Home");
    label(this, worldCenter(10, 4).x, worldCenter(10, 4).y - 18, "Forest edge");

    const player = this.bridge().getPlayer();
    const spawn = player.position && player.scene === "valley"
      ? player.position
      : worldCenter(VALLEY_SPOTS.spawn.col, VALLEY_SPOTS.spawn.row);
    this.body = { x: spawn.x, y: spawn.y, hp: player.health || PLAYER_MAX_HP };
    this.dest = { ...spawn };
    this.usedDoor = false;
    this.hunting = false;
    this.reportedDown = !player.wolf.alive;
    this.attackCd = 0;

    const wolfPad = worldCenter(VALLEY_SPOTS.wolf.col, VALLEY_SPOTS.wolf.row);
    this.wolf = createWolf(wolfPad.x, wolfPad.y, player.wolf.alive ? player.wolf.hp || 12 : 0);
    if (!player.wolf.alive) {
      this.wolf.hp = 0;
      this.wolf.mode = "dead";
    }

    this.pilgrim = this.add.image(spawn.x, spawn.y, "sprite-pilgrim").setDepth(10);
    this.playerBar = this.add.graphics().setDepth(16);
    this.wolfSprite = this.add.image(this.wolf.x, this.wolf.y, "sprite-wolf").setDepth(10);
    this.wolfBar = this.add.graphics().setDepth(16);
    this.peltSprite = this.add
      .image(wolfPad.x, wolfPad.y + 10, "sprite-pelt")
      .setDepth(8)
      .setVisible(player.wolf.peltDropped && !player.wolf.peltTaken);
    this.marker = this.add.image(spawn.x, spawn.y, "sprite-marker").setDepth(9).setVisible(false);
    followActor(this, this.pilgrim, VALLEY_TILES);

    this.bridge().emit({
      type: "hint",
      text: player.wolf.alive
        ? "The trees close in. A wolf at the forest edge. Click it to fight."
        : player.wolf.peltDropped
          ? "The wolf is still. A pelt in the grass."
          : "The forest keeps its own counsel. What's beyond those pines?",
    });

    this.input.setDefaultCursor("pointer");
    bindClickToMove(this, (x, y) => this.onTap(x, y));
    this.keys = bindWalkKeys(this);
    this.game.canvas.setAttribute("tabindex", "0");
    this.game.canvas.focus();
  }

  private onTap(x: number, y: number) {
    const door = worldCenter(VALLEY_SPOTS.door.col, VALLEY_SPOTS.door.row);
    if (Math.hypot(x - door.x, y - door.y) < TILE) {
      this.hunting = false;
      this.walkTo(door);
      return;
    }

    if (this.peltSprite.visible && Math.hypot(x - this.peltSprite.x, y - this.peltSprite.y) < TILE) {
      if (Math.hypot(this.body.x - this.peltSprite.x, this.body.y - this.peltSprite.y) < TILE * 1.2) {
        this.takePelt();
      } else {
        this.walkTo({ x: this.peltSprite.x, y: this.peltSprite.y });
      }
      return;
    }

    const tracks = worldCenter(VALLEY_SPOTS.tracks.col, VALLEY_SPOTS.tracks.row);
    if (Math.hypot(x - tracks.x, y - tracks.y) < TILE * 1.2) {
      this.bridge().emit({
        type: "hint",
        text: "Prints larger than any wolf. Whatever walked here did not hurry.",
      });
    }
    const scale = worldCenter(VALLEY_SPOTS.scale.col, VALLEY_SPOTS.scale.row);
    if (Math.hypot(x - scale.x, y - scale.y) < TILE) {
      this.bridge().emit({
        type: "hint",
        text: "A scale in the soil, too broad for a bird. You leave it where it caught the light.",
      });
    }
    const carving = worldCenter(VALLEY_SPOTS.carving.col, VALLEY_SPOTS.carving.row);
    if (Math.hypot(x - carving.x, y - carving.y) < TILE) {
      this.bridge().emit({
        type: "hint",
        text: "An old spiral cut into stone. Villagers tell two stories. Neither agrees.",
      });
    }

    if (this.wolf.hp > 0 && Math.hypot(x - this.wolf.x, y - this.wolf.y) < TILE * 1.5) {
      this.hunting = true;
      this.bridge().emit({ type: "hint", text: "You set on the wolf." });
      this.tryAttack();
      return;
    }

    const { col, row } = tileFromWorld(x, y);
    if (!isWalkable(tileAt(VALLEY_TILES, col, row))) return;
    this.hunting = false;
    this.walkTo({ x, y });
  }

  private takePelt() {
    if (!this.peltSprite.visible || this.bridge().isBusy()) return;
    this.peltSprite.setVisible(false);
    burst(this, this.peltSprite.x, this.peltSprite.y, 0x8a6a4a);
    this.bridge().emit({ type: "pickup-pelt" });
    this.bridge().emit({ type: "toast", text: "Wolf Pelt acquired." });
  }

  private walkTo(pos: { x: number; y: number }) {
    this.dest = pos;
    this.moving = true;
    this.marker.setPosition(pos.x, pos.y).setVisible(true);
    this.pilgrim.setFlipX(pos.x < this.body.x);
  }

  private tryAttack() {
    if (this.wolf.hp <= 0 || this.body.hp <= 0) {
      this.hunting = false;
      return;
    }
    const next = tryStrike(this.body, this.wolf, PLAYER_DAMAGE);
    if (next) {
      this.wolf = { ...this.wolf, hp: next.hp, hitFlash: 180, mode: this.wolf.hp <= 0 ? "dead" : this.wolf.mode };
      this.attackCd = PLAYER_ATTACK_MS;
      this.wolfSprite.setTint(0xf3efe4);
      floatText(this, this.wolf.x, this.wolf.y - 18, `-${PLAYER_DAMAGE}`, "#f3efe4");
      burst(this, this.wolf.x, this.wolf.y, 0xb33a2b);
      this.pilgrim.setFlipX(this.wolf.x < this.body.x);
      if (this.wolf.hp <= 0) this.onWolfDown();
      return true;
    }
    this.hunting = true;
    this.walkTo({ x: this.wolf.x, y: this.wolf.y });
    return false;
  }

  private onWolfDown() {
    if (this.reportedDown) return;
    this.reportedDown = true;
    this.hunting = false;
    this.wolf.mode = "dead";
    this.wolfSprite.setTint(0x2c241c);
    this.tweens.add({
      targets: this.wolfSprite,
      alpha: 0,
      scale: 0.6,
      duration: 420,
      onComplete: () => this.wolfSprite.setVisible(false),
    });
    this.peltSprite.setPosition(this.wolf.x, this.wolf.y + 8).setVisible(true);
    floatText(this, this.wolf.x, this.wolf.y - 10, "The wolf falls", "#c4a35a");
    this.bridge().emit({ type: "wolf-down" });
    this.bridge().emit({ type: "hint", text: "A pelt in the grass. Click it." });
  }

  private playerStep(x: number, y: number) {
    const maxX = TILE * ((VALLEY_TILES[0]?.length ?? 1) - 1) - 8;
    const maxY = TILE * (VALLEY_TILES.length - 1) - 8;
    const cx = Math.max(MARGIN, Math.min(maxX, x));
    const cy = Math.max(MARGIN, Math.min(maxY, y));
    return slide(VALLEY_TILES, this.body.x, this.body.y, cx, cy);
  }

  private openHearthDoor() {
    if (this.usedDoor || this.bridge().isBusy()) return;
    const { col, row } = tileFromWorld(this.body.x, this.body.y);
    if (!isDoorTile(tileAt(VALLEY_TILES, col, row))) return;
    this.usedDoor = true;
    this.bridge().emit({ type: "health", health: this.body.hp });
    this.bridge().emit({ type: "door", scene: "hearth" });
  }

  update(_time: number, delta: number) {
    const dt = delta / 1000;
    this.attackCd = Math.max(0, this.attackCd - delta);
    this.bob += dt;

    if (this.peltSprite.visible && Math.hypot(this.body.x - this.peltSprite.x, this.body.y - this.peltSprite.y) < REACH + 8) {
      if (this.moving && Math.hypot(this.dest.x - this.peltSprite.x, this.dest.y - this.peltSprite.y) < 12) {
        this.moving = false;
        this.marker.setVisible(false);
        this.takePelt();
      }
    }

    if ((this.keys?.E && Phaser.Input.Keyboard.JustDown(this.keys.E)) || consumeInteract()) {
      if (this.peltSprite.visible && Math.hypot(this.body.x - this.peltSprite.x, this.body.y - this.peltSprite.y) < TILE * 1.4) {
        this.takePelt();
      } else if (this.wolf.hp > 0 && Math.hypot(this.body.x - this.wolf.x, this.body.y - this.wolf.y) < STRIKE_RANGE) {
        this.hunting = true;
        this.tryAttack();
      }
    }

    const axisWin = windowAxis();
    const axisKeys = readAxis(this.keys);
    const axis = axisWin.x !== 0 || axisWin.y !== 0 ? axisWin : axisKeys;
    if (axis.x !== 0 || axis.y !== 0) {
      this.hunting = false;
      this.moving = false;
      this.marker.setVisible(false);
      const len = Math.hypot(axis.x, axis.y) || 1;
      const next = this.playerStep(
        this.body.x + (axis.x / len) * PLAYER_SPEED * dt,
        this.body.y + (axis.y / len) * PLAYER_SPEED * dt,
      );
      this.body.x = next.x;
      this.body.y = next.y;
      this.pilgrim.setFlipX(axis.x < 0);
    } else if (this.hunting && this.wolf.hp > 0 && this.body.hp > 0) {
      const dist = Math.hypot(this.body.x - this.wolf.x, this.body.y - this.wolf.y);
      if (dist <= ATTACK_RANGE && this.attackCd <= 0) this.tryAttack();
      else if (dist > ATTACK_RANGE) {
        const stepped = stepToward(this.body.x, this.body.y, this.wolf.x, this.wolf.y, PLAYER_SPEED, dt, REACH);
        const clamped = this.playerStep(stepped.x, stepped.y);
        this.body.x = clamped.x;
        this.body.y = clamped.y;
        this.pilgrim.setFlipX(this.wolf.x < this.body.x);
      }
    } else if (this.moving) {
      const stepped = stepToward(this.body.x, this.body.y, this.dest.x, this.dest.y, PLAYER_SPEED, dt, REACH);
      const clamped = this.playerStep(stepped.x, stepped.y);
      this.body.x = clamped.x;
      this.body.y = clamped.y;
      if (stepped.arrived) {
        this.moving = false;
        this.marker.setVisible(false);
      }
    }

    if (this.wolf.hp > 0) {
      const ticked = tickWolf(this.body, this.wolf, dt, Math.random, {
        minX: MARGIN,
        minY: MARGIN,
        maxX: TILE * ((VALLEY_TILES[0]?.length ?? 2) - 2),
        maxY: TILE * 10,
      });
      this.wolf = ticked.wolf;
      if (ticked.wolfHit && ticked.player.hp < this.body.hp) {
        floatText(this, this.body.x, this.body.y - 18, `-${ticked.wolfHit}`, "#b33a2b");
        this.cameras.main.shake(80, 0.004);
      }
      this.body = ticked.player;
    }

    if (this.body.hp <= 0) {
      this.body.hp = PLAYER_MAX_HP;
      const spawn = worldCenter(VALLEY_SPOTS.spawn.col, VALLEY_SPOTS.spawn.row);
      this.body.x = spawn.x;
      this.body.y = spawn.y;
      this.hunting = false;
      this.bridge().emit({ type: "health", health: this.body.hp });
      this.bridge().emit({ type: "hint", text: "You wake with the fire still in you. The hearth would take you back." });
    }

    this.pilgrim.setPosition(this.body.x, this.body.y + Math.sin(this.bob * 8) * (this.moving || this.hunting ? 1 : 0));
    this.pilgrim.setDepth(10 + this.body.y);
    paintHpBar(this.playerBar, this.body.x, this.body.y - 18, this.body.hp / PLAYER_MAX_HP, 28);

    const alive = this.wolf.hp > 0;
    this.wolfSprite.setVisible(alive);
    if (alive) {
      this.wolfSprite.setPosition(this.wolf.x, this.wolf.y).setDepth(10 + this.wolf.y);
      if (this.wolf.hitFlash <= 0) {
        if (this.wolf.mode === "attack" || this.wolf.mode === "chase") this.wolfSprite.setTint(0x8a4a32);
        else this.wolfSprite.clearTint();
      }
      paintHpBar(this.wolfBar, this.wolf.x, this.wolf.y - 16, this.wolf.hp / this.wolf.maxHp, 32);
    } else {
      this.wolfBar.clear();
    }

    this.openHearthDoor();

    this.persistAt += delta;
    if (this.persistAt > 900) {
      this.persistAt = 0;
      this.bridge().emit({ type: "health", health: this.body.hp });
      this.bridge().emit({ type: "combat", you: this.body.hp });
      this.bridge().emit({ type: "position", x: this.body.x, y: this.body.y });
    }
  }
}
