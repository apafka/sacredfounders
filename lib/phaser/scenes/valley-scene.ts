import * as Phaser from "phaser";
import { ELITE_HP, PACK_HP, PLAYER_MAX_HP, RESPAWN_MS } from "@/lib/combat";
import { BRIDGE_KEY, pullValleyStrike, type WorldBridge } from "../bridge";
import { bindClickToMove, createGround, label, paintHpBar } from "../draw-map";
import {
  TILE,
  VALLEY_ELITE,
  VALLEY_SPOTS,
  VALLEY_TILES,
  VALLEY_WOLF_PADS,
  isDoorTile,
  isWalkable,
  tileAt,
  tileFromWorld,
  worldCenter,
} from "../layout";
import { clampToRect, slide, stepToward } from "../move";
import {
  PLAYER_SPEED,
  nearestLiving,
  tickPack,
  tryStrike,
  type Actor,
  type PackWolf,
} from "../wolf-ai";

const REACH = 10;
const MARGIN = TILE + 8;

export class ValleyScene extends Phaser.Scene {
  private pilgrim!: Phaser.GameObjects.Image;
  private marker!: Phaser.GameObjects.Image;
  private hpText!: Phaser.GameObjects.Text;
  private playerBar!: Phaser.GameObjects.Graphics;
  private dest = { x: 0, y: 0 };
  private moving = false;
  private body: Actor = { x: 0, y: 0, hp: PLAYER_MAX_HP };
  private beasts: PackWolf[] = [];
  private sprites: Phaser.GameObjects.Image[] = [];
  private bars: Phaser.GameObjects.Graphics[] = [];
  private pendingStrike = false;
  private pendingId: number | null = null;
  private lastHud = "";
  private usedDoor = false;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;

  constructor() {
    super("valley");
  }

  private bridge(): WorldBridge {
    return this.registry.get(BRIDGE_KEY) as WorldBridge;
  }

  create() {
    createGround(this, VALLEY_TILES);
    const doorPos = worldCenter(VALLEY_SPOTS.door.col, VALLEY_SPOTS.door.row);
    this.add.image(doorPos.x, doorPos.y, "sprite-door").setDepth(3);
    label(this, doorPos.x, doorPos.y - 20, "Door");

    const spawn = worldCenter(VALLEY_SPOTS.spawn.col, VALLEY_SPOTS.spawn.row);
    this.body = { x: spawn.x, y: spawn.y, hp: PLAYER_MAX_HP };
    this.dest = { ...spawn };
    this.pendingStrike = false;
    this.pendingId = null;
    this.usedDoor = false;

    this.beasts = [
      ...VALLEY_WOLF_PADS.map((pad, i) => {
        const pos = worldCenter(pad.col, pad.row);
        return {
          id: i,
          kind: "pack" as const,
          x: pos.x,
          y: pos.y,
          hp: PACK_HP,
          maxHp: PACK_HP,
          telegraph: 0,
          lunging: 0,
          spawnX: pos.x,
          spawnY: pos.y,
          respawnIn: 0,
        };
      }),
      (() => {
        const pos = worldCenter(VALLEY_ELITE.col, VALLEY_ELITE.row);
        return {
          id: VALLEY_WOLF_PADS.length,
          kind: "elite" as const,
          x: pos.x,
          y: pos.y,
          hp: ELITE_HP,
          maxHp: ELITE_HP,
          telegraph: 0,
          lunging: 0,
          spawnX: pos.x,
          spawnY: pos.y,
          respawnIn: 0,
        };
      })(),
    ];

    const elitePos = worldCenter(VALLEY_ELITE.col, VALLEY_ELITE.row);
    label(this, elitePos.x, elitePos.y - 22, "Dire wolf");

    this.pilgrim = this.add.image(spawn.x, spawn.y, "sprite-pilgrim").setDepth(10);
    this.playerBar = this.add.graphics().setDepth(16);
    this.sprites = this.beasts.map((beast) => {
      const sprite = this.add.image(beast.x, beast.y, "sprite-wolf").setDepth(10);
      if (beast.kind === "elite") sprite.setScale(1.45).setTint(0x3a1c12);
      return sprite;
    });
    this.bars = this.beasts.map(() => this.add.graphics().setDepth(16));
    this.marker = this.add.image(spawn.x, spawn.y, "sprite-marker").setDepth(9).setVisible(false);
    this.hpText = this.add
      .text(TILE, TILE / 2, "", {
        fontFamily: "Georgia, serif",
        fontSize: "11px",
        color: "#2c241c",
        backgroundColor: "#f3efe4",
        padding: { x: 6, y: 3 },
      })
      .setDepth(20)
      .setResolution(2);

    this.bridge().emit({
      type: "hint",
      text: "Three wolves and a dire wolf. Tap to walk, Strike to hit. HP bars sit over each. They return after a breath.",
    });
    this.publishHud();

    this.input.setDefaultCursor("pointer");
    bindClickToMove(this, (x, y) => this.onTap(x, y));
    this.game.events.on("valley-strike", this.strike, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off("valley-strike", this.strike, this);
    });

    const keyboard = this.input.keyboard;
    if (keyboard) {
      this.keys = keyboard.addKeys("W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE") as Record<
        string,
        Phaser.Input.Keyboard.Key
      >;
    }
  }

  private onTap(x: number, y: number) {
    const door = worldCenter(VALLEY_SPOTS.door.col, VALLEY_SPOTS.door.row);
    if (Math.hypot(x - door.x, y - door.y) < TILE) {
      this.walkTo(door);
      return;
    }
    const tapped = this.beasts.find(
      (beast) => beast.hp > 0 && Math.hypot(x - beast.x, y - beast.y) < TILE * (beast.kind === "elite" ? 1.6 : 1.4),
    );
    if (tapped) {
      this.pendingId = tapped.id;
      this.strike();
      return;
    }
    const { col, row } = tileFromWorld(x, y);
    if (!isWalkable(tileAt(VALLEY_TILES, col, row))) return;
    this.walkTo({ x, y });
  }

  private walkTo(pos: { x: number; y: number }) {
    this.dest = pos;
    this.moving = true;
    this.marker.setPosition(pos.x, pos.y).setVisible(true);
    this.pilgrim.setFlipX(pos.x < this.body.x);
  }

  private target(): PackWolf | null {
    if (this.pendingId != null) {
      const picked = this.beasts.find((beast) => beast.id === this.pendingId && beast.hp > 0);
      if (picked) return picked;
    }
    return nearestLiving(this.body, this.beasts);
  }

  private strike = () => {
    const target = this.target();
    const damage = this.bridge().getPlayer().strikeDamage ?? 1;
    if (!target) return false;
    const next = tryStrike(this.body, target, damage);
    if (next) {
      this.pendingStrike = false;
      this.pendingId = null;
      const idx = this.beasts.findIndex((beast) => beast.id === target.id);
      const died = next.hp <= 0 && target.hp > 0;
      this.beasts[idx] = { ...this.beasts[idx], ...next, respawnIn: died ? RESPAWN_MS : 0 };
      if (died) {
        this.sprites[idx].setVisible(false);
        this.bridge().emit({ type: "wolf-loot", kind: target.kind });
        this.bridge().emit({
          type: "hint",
          text:
            target.kind === "elite"
              ? "The dire wolf falls. It will take the pad again."
              : "A wolf falls. Another will take its pad.",
        });
      }
      this.publishHud();
      return true;
    }
    if (this.body.hp > 0 && this.beasts.some((beast) => beast.hp > 0)) {
      this.pendingStrike = true;
      this.pendingId = target.id;
      this.walkTo({ x: target.x, y: target.y });
      this.bridge().emit({ type: "hint", text: "Closing in to strike." });
    }
    return false;
  };

  private publishHud() {
    const you = Math.max(0, this.body.hp);
    const packLive = this.beasts.filter((beast) => beast.kind === "pack" && beast.hp > 0).length;
    const elite = this.beasts.find((beast) => beast.kind === "elite");
    const eliteHp = Math.max(0, elite?.hp ?? 0);
    const player = this.bridge().getPlayer();
    const line =
      you <= 0
        ? "You fall. Use the door. The hearth still stands."
        : `You ${you} · Wolves ${packLive}/3 · Dire ${eliteHp} · Lv ${player.level} (${player.xp} xp)${player.hasSword ? " · Iron Blade" : ""}`;
    this.hpText.setText(line);
    const key = `${you}:${packLive}:${eliteHp}:${player.xp}:${player.level}:${player.hasSword}`;
    if (key !== this.lastHud) {
      this.lastHud = key;
      this.bridge().emit({ type: "combat", you, wolf: packLive, elite: eliteHp, xp: player.xp, level: player.level });
    }
  }

  private playerStep(x: number, y: number) {
    const clamped = clampToRect(x, y, MARGIN, MARGIN, TILE * 19 - 8, TILE * 13 - 8);
    return slide(VALLEY_TILES, this.body.x, this.body.y, clamped.x, clamped.y);
  }

  private openHearthDoor() {
    if (this.usedDoor || this.bridge().isBusy()) return;
    const { col, row } = tileFromWorld(this.body.x, this.body.y);
    if (!isDoorTile(tileAt(VALLEY_TILES, col, row))) return;
    this.usedDoor = true;
    this.bridge().emit({ type: "door", scene: "hearth" });
  }

  update(_time: number, delta: number) {
    const dt = delta / 1000;
    if (pullValleyStrike()) this.strike();
    if (this.keys?.SPACE && Phaser.Input.Keyboard.JustDown(this.keys.SPACE)) {
      this.strike();
    }

    const chase = this.target();
    if (this.pendingStrike && chase && this.body.hp > 0) {
      if (tryStrike(this.body, chase, this.bridge().getPlayer().strikeDamage ?? 1)) this.strike();
      else {
        this.dest = { x: chase.x, y: chase.y };
        this.moving = true;
      }
    }

    let ax = 0;
    let ay = 0;
    if (this.keys) {
      if (this.keys.A.isDown || this.keys.LEFT.isDown) ax -= 1;
      if (this.keys.D.isDown || this.keys.RIGHT.isDown) ax += 1;
      if (this.keys.W.isDown || this.keys.UP.isDown) ay -= 1;
      if (this.keys.S.isDown || this.keys.DOWN.isDown) ay += 1;
    }
    if (ax !== 0 || ay !== 0) {
      this.pendingStrike = false;
      this.pendingId = null;
      this.moving = false;
      this.marker.setVisible(false);
      const len = Math.hypot(ax, ay) || 1;
      const next = this.playerStep(
        this.body.x + (ax / len) * PLAYER_SPEED * dt,
        this.body.y + (ay / len) * PLAYER_SPEED * dt,
      );
      this.body.x = next.x;
      this.body.y = next.y;
      this.pilgrim.setFlipX(ax < 0);
    } else if (this.moving) {
      const stepped = stepToward(this.body.x, this.body.y, this.dest.x, this.dest.y, PLAYER_SPEED, dt, REACH);
      const clamped = this.playerStep(stepped.x, stepped.y);
      this.body.x = clamped.x;
      this.body.y = clamped.y;
      if (stepped.arrived) {
        this.moving = false;
        this.marker.setVisible(false);
        if (this.pendingStrike) this.strike();
      }
    }

    const ticked = tickPack(this.body, this.beasts, dt);
    this.body = { ...ticked.player, ...this.playerStep(ticked.player.x, ticked.player.y) };
    this.beasts = ticked.wolves.map((beast) => ({
      ...beast,
      ...clampToRect(beast.x, beast.y, MARGIN, MARGIN, TILE * 19 - 8, TILE * 13 - 8),
    }));

    this.pilgrim.setPosition(this.body.x, this.body.y).setDepth(10 + this.body.y);
    paintHpBar(this.playerBar, this.body.x, this.body.y - 18, this.body.hp / PLAYER_MAX_HP, 26);

    this.beasts.forEach((beast, i) => {
      const sprite = this.sprites[i];
      const alive = beast.hp > 0;
      sprite.setVisible(alive);
      if (!alive) {
        this.bars[i].clear();
        return;
      }
      sprite.setPosition(beast.x, beast.y).setDepth(10 + beast.y);
      if (beast.telegraph > 0 || beast.lunging > 0) sprite.setTint(0xb33a2b);
      else if (beast.kind === "elite") sprite.setTint(0x3a1c12);
      else sprite.clearTint();
      paintHpBar(this.bars[i], beast.x, beast.y - (beast.kind === "elite" ? 22 : 16), beast.hp / beast.maxHp, beast.kind === "elite" ? 36 : 26);
    });

    this.openHearthDoor();
    this.publishHud();
  }
}
