import * as Phaser from "phaser";
import { BRIDGE_KEY, pullValleyStrike, type WorldBridge } from "../bridge";
import { bindClickToMove, label, paintTiles } from "../draw-map";
import { TILE, VALLEY_SPOTS, VALLEY_TILES, isWalkable, tileAt, tileFromWorld, worldCenter } from "../layout";
import { clampToRect, stepToward } from "../move";
import { PLAYER_SPEED, tickWolf, tryStrike, type Actor, type Wolf } from "../wolf-ai";

const REACH = 10;
const MARGIN = TILE + 8;

export class ValleyScene extends Phaser.Scene {
  private pilgrim!: Phaser.GameObjects.Image;
  private wolfSprite!: Phaser.GameObjects.Image;
  private marker!: Phaser.GameObjects.Image;
  private hpText!: Phaser.GameObjects.Text;
  private dest = { x: 0, y: 0 };
  private moving = false;
  private body: Actor = { x: 0, y: 0, hp: 3 };
  private wolf: Wolf = { x: 0, y: 0, hp: 3, telegraph: 0, lunging: 0 };
  private won = false;
  private pendingStrike = false;
  private lastHud = "";
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;

  constructor() {
    super("valley");
  }

  private bridge(): WorldBridge {
    return this.registry.get(BRIDGE_KEY) as WorldBridge;
  }

  create() {
    paintTiles(this, VALLEY_TILES);
    const doorPos = worldCenter(VALLEY_SPOTS.door.col, VALLEY_SPOTS.door.row);
    this.add.image(doorPos.x, doorPos.y, "sprite-door").setDepth(3);
    label(this, doorPos.x, doorPos.y - 20, "Door");

    const spawn = worldCenter(VALLEY_SPOTS.spawn.col, VALLEY_SPOTS.spawn.row);
    const wolfPos = worldCenter(VALLEY_SPOTS.wolf.col, VALLEY_SPOTS.wolf.row);
    this.body = { x: spawn.x, y: spawn.y, hp: 3 };
    this.wolf = { x: wolfPos.x, y: wolfPos.y, hp: 3, telegraph: 0, lunging: 0 };
    this.dest = { ...spawn };
    this.won = false;

    this.pilgrim = this.add.image(spawn.x, spawn.y, "sprite-pilgrim").setDepth(10);
    this.wolfSprite = this.add.image(wolfPos.x, wolfPos.y, "sprite-wolf").setDepth(10);
    this.marker = this.add.image(spawn.x, spawn.y, "sprite-marker").setDepth(9).setVisible(false);
    this.hpText = this.add
      .text(TILE, TILE / 2, "You 3 · Wolf 3", {
        fontFamily: "Georgia, serif",
        fontSize: "12px",
        color: "#2c241c",
        backgroundColor: "#f3efe4",
        padding: { x: 6, y: 3 },
      })
      .setDepth(20)
      .setResolution(2);

    this.bridge().emit({
      type: "hint",
      text: "Tap to walk. Tap the wolf or Strike — you will close in. Dodge the red lunge.",
    });
    this.bridge().emit({ type: "combat", you: 3, wolf: 3 });

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
      if (Math.hypot(this.body.x - door.x, this.body.y - door.y) < TILE * 1.2) {
        this.bridge().emit({ type: "door", scene: "hearth" });
        return;
      }
      this.walkTo(door);
      return;
    }
    if (this.wolf.hp > 0 && Math.hypot(x - this.wolf.x, y - this.wolf.y) < TILE * 1.4) {
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

  private strike = () => {
    const next = tryStrike(this.body, this.wolf);
    if (next) {
      this.pendingStrike = false;
      this.wolf = next;
      if (this.wolf.hp <= 0 && !this.won) {
        this.won = true;
        this.wolfSprite.setVisible(false);
        this.bridge().emit({ type: "wolf-loot" });
        this.bridge().emit({ type: "hint", text: "The wolf is down. Coins are yours. The door still opens." });
      }
      this.publishHud();
      return true;
    }
    if (this.wolf.hp > 0 && this.body.hp > 0) {
      this.pendingStrike = true;
      this.walkTo({ x: this.wolf.x, y: this.wolf.y });
      this.bridge().emit({ type: "hint", text: "Closing in to strike." });
    }
    return false;
  };

  private publishHud() {
    const you = Math.max(0, this.body.hp);
    const wolfHp = Math.max(0, this.wolf.hp);
    const line =
      you <= 0
        ? "You fall. Use the door. The hearth still stands."
        : this.won
          ? `You ${you} · Wolf down`
          : `You ${you} · Wolf ${wolfHp}${this.wolf.telegraph > 0 ? " · lunge coming" : ""}`;
    this.hpText.setText(line);
    const key = `${you}:${wolfHp}:${this.won}:${you <= 0}`;
    if (key !== this.lastHud) {
      this.lastHud = key;
      this.bridge().emit({ type: "combat", you, wolf: wolfHp });
    }
  }

  private bounds(x: number, y: number) {
    return clampToRect(x, y, MARGIN, MARGIN, TILE * 19 - 8, TILE * 13 - 8);
  }

  update(_time: number, delta: number) {
    const dt = delta / 1000;
    if (pullValleyStrike()) this.strike();
    if (this.keys?.SPACE && Phaser.Input.Keyboard.JustDown(this.keys.SPACE)) {
      this.strike();
    }

    if (this.pendingStrike && this.wolf.hp > 0 && this.body.hp > 0) {
      if (tryStrike(this.body, this.wolf)) this.strike();
      else {
        this.dest = { x: this.wolf.x, y: this.wolf.y };
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
      this.moving = false;
      this.marker.setVisible(false);
      const len = Math.hypot(ax, ay) || 1;
      const next = this.bounds(this.body.x + (ax / len) * PLAYER_SPEED * dt, this.body.y + (ay / len) * PLAYER_SPEED * dt);
      this.body.x = next.x;
      this.body.y = next.y;
      this.pilgrim.setFlipX(ax < 0);
    } else if (this.moving) {
      const stepped = stepToward(this.body.x, this.body.y, this.dest.x, this.dest.y, PLAYER_SPEED, dt, REACH);
      const clamped = this.bounds(stepped.x, stepped.y);
      this.body.x = clamped.x;
      this.body.y = clamped.y;
      if (stepped.arrived) {
        this.moving = false;
        this.marker.setVisible(false);
        if (this.pendingStrike) {
          this.strike();
        } else {
          const door = worldCenter(VALLEY_SPOTS.door.col, VALLEY_SPOTS.door.row);
          if (Math.hypot(this.body.x - door.x, this.body.y - door.y) < TILE) {
            this.bridge().emit({ type: "door", scene: "hearth" });
          }
        }
      }
    }

    const ticked = tickWolf(this.body, this.wolf, dt);
    this.body = { ...ticked.player, ...this.bounds(ticked.player.x, ticked.player.y) };
    this.wolf = { ...ticked.wolf, ...this.bounds(ticked.wolf.x, ticked.wolf.y) };

    this.pilgrim.setPosition(this.body.x, this.body.y).setDepth(10 + this.body.y);
    if (this.wolf.hp > 0) {
      this.wolfSprite.setPosition(this.wolf.x, this.wolf.y).setDepth(10 + this.wolf.y);
      if (this.wolf.telegraph > 0 || this.wolf.lunging > 0) this.wolfSprite.setTint(0xb33a2b);
      else this.wolfSprite.clearTint();
    }

    this.publishHud();
  }
}
