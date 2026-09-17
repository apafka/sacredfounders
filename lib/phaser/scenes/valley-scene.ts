import * as Phaser from "phaser";
import { PLAYER_MAX_HP, mitigateDamage, playerStrikeDamage } from "@/lib/combat";
import { dropLabel, enemyDefinition, fallHint, foeSpriteKey, huntHint, lootSpriteKey } from "@/lib/data/enemies";
import { reviveTimedEncounters } from "@/lib/game/wilderness";
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
  PLAYER_SPEED,
  STRIKE_RANGE,
  lootVisible,
  nearestLiving,
  spawnValleyFoes,
  spawnWanderBounds,
  tickWolf,
  tryStrike,
  valleyMapBounds,
  type Foe,
} from "../wolf-ai";

const REACH = 10;
const MARGIN = TILE + 8;

type FoeView = {
  sprite: Phaser.GameObjects.Image;
  bar: Phaser.GameObjects.Graphics;
  loot: Phaser.GameObjects.Image;
};

export class ValleyScene extends Phaser.Scene {
  private pilgrim!: Phaser.GameObjects.Image;
  private marker!: Phaser.GameObjects.Image;
  private playerBar!: Phaser.GameObjects.Graphics;
  private dest = { x: 0, y: 0 };
  private moving = false;
  private huntingId: string | null = null;
  private body = { x: 0, y: 0, hp: PLAYER_MAX_HP };
  private foes: Foe[] = [];
  private views = new Map<string, FoeView>();
  private attackCd = 0;
  private usedDoor = false;
  private reported = new Set<string>();
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
    const edge = worldCenter(VALLEY_SPOTS.wolf.col, VALLEY_SPOTS.wolf.row);
    label(this, edge.x, edge.y - 22, "Forest edge");
    const deep = worldCenter(10, 4);
    label(this, deep.x, deep.y - 22, "Deep woods");
    const wallow = worldCenter(VALLEY_SPOTS.wallow.col, VALLEY_SPOTS.wallow.row);
    label(this, wallow.x, wallow.y - 18, "Boar wallow");
    const glen = worldCenter(VALLEY_SPOTS.glen.col, VALLEY_SPOTS.glen.row);
    label(this, glen.x, glen.y - 18, "Spider glen");

    const player = this.bridge().getPlayer();
    const spawn =
      player.position && player.scene === "valley"
        ? player.position
        : worldCenter(VALLEY_SPOTS.spawn.col, VALLEY_SPOTS.spawn.row);
    this.body = { x: spawn.x, y: spawn.y, hp: player.health || PLAYER_MAX_HP };
    this.dest = { ...spawn };
    this.usedDoor = false;
    this.huntingId = null;
    this.attackCd = 0;
    this.foes = spawnValleyFoes(player);
    this.reported = new Set(this.foes.filter((foe) => foe.hp <= 0).map((foe) => foe.id));

    this.pilgrim = this.add.image(spawn.x, spawn.y, "sprite-pilgrim").setDepth(10);
    this.playerBar = this.add.graphics().setDepth(16);
    this.marker = this.add.image(spawn.x, spawn.y, "sprite-marker").setDepth(9).setVisible(false);
    followActor(this, this.pilgrim, VALLEY_TILES);

    for (const foe of this.foes) {
      const key = foeSpriteKey(foe.kind);
      const sprite = this.add.image(foe.x, foe.y, key).setDepth(10);
      if (foe.hp <= 0) sprite.setVisible(false);
      const bar = this.add.graphics().setDepth(16);
      const loot = this.add
        .image(foe.x, foe.y + 10, lootSpriteKey(foe.kind))
        .setDepth(8)
        .setVisible(lootVisible(player, foe.id));
      this.views.set(foe.id, { sprite, bar, loot });
    }

    const living = this.foes.filter((foe) => foe.hp > 0).length;
    this.bridge().emit({
      type: "hint",
      text:
        living > 0
          ? "The woods run longer now. Pack on the path, a boar west, a spider east, something larger further in. Click to fight."
          : "The forest keeps its own counsel. Stay, and the dead return in thirty seconds.",
    });

    this.input.setDefaultCursor("pointer");
    bindClickToMove(this, (x, y) => this.onTap(x, y));
    this.keys = bindWalkKeys(this);
    this.game.canvas.setAttribute("tabindex", "0");
    this.game.canvas.focus();
  }

  private foeAt(x: number, y: number): Foe | null {
    let best: Foe | null = null;
    let bestDist = TILE * 1.8;
    for (const foe of this.foes) {
      if (foe.hp <= 0) continue;
      const reach = foe.kind === "dire" ? TILE * 2.1 : foe.kind === "boar" ? TILE * 1.8 : TILE * 1.5;
      const dist = Math.hypot(x - foe.x, y - foe.y);
      if (dist < reach && dist < bestDist) {
        best = foe;
        bestDist = dist;
      }
    }
    return best;
  }

  private lootAt(x: number, y: number): Foe | null {
    for (const foe of this.foes) {
      const view = this.views.get(foe.id);
      if (!view?.loot.visible) continue;
      if (Math.hypot(x - view.loot.x, y - view.loot.y) < TILE) return foe;
    }
    return null;
  }

  private onTap(x: number, y: number) {
    const door = worldCenter(VALLEY_SPOTS.door.col, VALLEY_SPOTS.door.row);
    if (Math.hypot(x - door.x, y - door.y) < TILE) {
      this.huntingId = null;
      this.walkTo(door);
      return;
    }

    const loot = this.lootAt(x, y);
    if (loot) {
      const view = this.views.get(loot.id);
      if (view && Math.hypot(this.body.x - view.loot.x, this.body.y - view.loot.y) < TILE * 1.2) {
        this.takeLoot(loot.id);
      } else if (view) {
        this.walkTo({ x: view.loot.x, y: view.loot.y });
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

    const target = this.foeAt(x, y);
    if (target) {
      this.huntingId = target.id;
      this.bridge().emit({
        type: "hint",
        text: huntHint(target.kind),
      });
      this.tryAttack(target.id);
      return;
    }

    const { col, row } = tileFromWorld(x, y);
    if (!isWalkable(tileAt(VALLEY_TILES, col, row))) return;
    this.huntingId = null;
    this.walkTo({ x, y });
  }

  private takeLoot(id: string) {
    const view = this.views.get(id);
    if (!view?.loot.visible || this.bridge().isBusy()) return;
    view.loot.setVisible(false);
    burst(this, view.loot.x, view.loot.y, 0x8a6a4a);
    const foe = this.foes.find((item) => item.id === id);
    const labelText = `${dropLabel(foe?.kind ?? "wolf")} acquired.`;
    this.bridge().emit({ type: "pickup-pelt", id });
    this.bridge().emit({ type: "toast", text: labelText });
  }

  private walkTo(pos: { x: number; y: number }) {
    this.dest = pos;
    this.moving = true;
    this.marker.setPosition(pos.x, pos.y).setVisible(true);
    this.pilgrim.setFlipX(pos.x < this.body.x);
  }

  private tryAttack(id: string) {
    const foe = this.foes.find((item) => item.id === id);
    if (!foe || foe.hp <= 0 || this.body.hp <= 0) {
      this.huntingId = null;
      return false;
    }
    const damage = playerStrikeDamage(this.bridge().getPlayer().hasSword, this.bridge().getPlayer().skills.attack.level);
    const next = tryStrike(this.body, foe, damage);
    if (next) {
      foe.hp = next.hp;
      foe.hitFlash = 180;
      if (foe.hp <= 0) foe.mode = "dead";
      this.attackCd = PLAYER_ATTACK_MS;
      const view = this.views.get(foe.id);
      view?.sprite.setTint(0xf3efe4);
      floatText(this, foe.x, foe.y - 18, `-${damage}`, "#f3efe4");
      burst(this, foe.x, foe.y, 0xb33a2b);
      this.pilgrim.setFlipX(foe.x < this.body.x);
      this.bridge().emit({ type: "strike" });
      if (foe.hp <= 0) this.onFoeDown(foe);
      return true;
    }
    this.huntingId = foe.id;
    this.walkTo({ x: foe.x, y: foe.y });
    return false;
  }

  private onFoeDown(foe: Foe) {
    if (this.reported.has(foe.id)) return;
    this.reported.add(foe.id);
    if (this.huntingId === foe.id) this.huntingId = null;
    foe.mode = "dead";
    const view = this.views.get(foe.id);
    if (view) {
      view.sprite.setTint(0x2c241c);
      this.tweens.add({
        targets: view.sprite,
        alpha: 0,
        scale: 0.6,
        duration: 420,
        onComplete: () => view.sprite.setVisible(false),
      });
      view.loot.setPosition(foe.x, foe.y + 8).setVisible(true);
    }
    const fallen = `${enemyDefinition(foe.kind).name} falls`;
    floatText(this, foe.x, foe.y - 10, fallen, "#c4a35a");
    this.bridge().emit({ type: "wolf-down", id: foe.id });
    this.bridge().emit({ type: "hint", text: fallHint(foe.kind) });
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

  private maybeTimerRespawn() {
    const player = this.bridge().getPlayer();
    const { revived, encounters } = reviveTimedEncounters(player.encounters, Date.now());
    if (!revived.length) return;
    this.bridge().emit({ type: "respawn-wilderness" });
    const fresh = spawnValleyFoes({ ...player, encounters });
    for (const id of revived) {
      const next = fresh.find((item) => item.id === id);
      const index = this.foes.findIndex((item) => item.id === id);
      if (!next || index < 0) continue;
      this.foes[index] = next;
      this.reported.delete(id);
      const view = this.views.get(id);
      if (!view) continue;
      view.sprite.setVisible(true).setAlpha(1).setScale(1).clearTint().setPosition(next.x, next.y);
      view.loot.setVisible(false);
    }
    this.bridge().emit({
      type: "hint",
      text: revived.length === 1 ? "A shape answers again from the trees." : "The pack answers again from the trees.",
    });
  }

  private resetLocalFromHeal() {
    const stored = this.bridge().getPlayer().health;
    if (stored > this.body.hp) this.body.hp = stored;
  }

  update(_time: number, delta: number) {
    const dt = delta / 1000;
    this.attackCd = Math.max(0, this.attackCd - delta);
    this.bob += dt;
    this.resetLocalFromHeal();
    this.maybeTimerRespawn();

    for (const foe of this.foes) {
      const view = this.views.get(foe.id);
      if (!view?.loot.visible) continue;
      if (Math.hypot(this.body.x - view.loot.x, this.body.y - view.loot.y) < REACH + 8) {
        if (this.moving && Math.hypot(this.dest.x - view.loot.x, this.dest.y - view.loot.y) < 12) {
          this.moving = false;
          this.marker.setVisible(false);
          this.takeLoot(foe.id);
        }
      }
    }

    if ((this.keys?.E && Phaser.Input.Keyboard.JustDown(this.keys.E)) || consumeInteract()) {
      const loot = this.lootAt(this.body.x, this.body.y);
      if (loot) {
        this.takeLoot(loot.id);
      } else {
        const near = nearestLiving(this.foes, this.body.x, this.body.y, STRIKE_RANGE);
        if (near) {
          this.huntingId = near.id;
          this.tryAttack(near.id);
        }
      }
    }

    const axisWin = windowAxis();
    const axisKeys = readAxis(this.keys);
    const axis = axisWin.x !== 0 || axisWin.y !== 0 ? axisWin : axisKeys;
    const hunted = this.huntingId ? this.foes.find((item) => item.id === this.huntingId) : null;
    if (axis.x !== 0 || axis.y !== 0) {
      this.huntingId = null;
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
    } else if (hunted && hunted.hp > 0 && this.body.hp > 0) {
      const dist = Math.hypot(this.body.x - hunted.x, this.body.y - hunted.y);
      if (dist <= ATTACK_RANGE && this.attackCd <= 0) this.tryAttack(hunted.id);
      else if (dist > ATTACK_RANGE) {
        const stepped = stepToward(this.body.x, this.body.y, hunted.x, hunted.y, PLAYER_SPEED, dt, REACH);
        const clamped = this.playerStep(stepped.x, stepped.y);
        this.body.x = clamped.x;
        this.body.y = clamped.y;
        this.pilgrim.setFlipX(hunted.x < this.body.x);
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

    const player = this.bridge().getPlayer();
    const mapBounds = valleyMapBounds();
    let hp = this.body.hp;
    for (let i = 0; i < this.foes.length; i += 1) {
      const foe = this.foes[i];
      if (foe.hp <= 0) continue;
      const bite = mitigateDamage(enemyDefinition(foe.kind).damage, player.hasArmor, player.skills.defense.level);
      const ticked = tickWolf({ ...this.body, hp }, foe, dt, Math.random, spawnWanderBounds(foe.spawnX, foe.spawnY, TILE * 2.5, mapBounds), bite);
      this.foes[i] = { ...foe, ...ticked.wolf };
      if (ticked.wolfHit && ticked.player.hp < hp) {
        floatText(this, this.body.x, this.body.y - 18, `-${ticked.wolfHit}`, "#b33a2b");
        this.cameras.main.shake(80, 0.004);
        this.bridge().emit({ type: "wound" });
      }
      hp = ticked.player.hp;
    }
    this.body.hp = hp;

    if (this.body.hp <= 0) {
      this.body.hp = PLAYER_MAX_HP;
      const spawn = worldCenter(VALLEY_SPOTS.spawn.col, VALLEY_SPOTS.spawn.row);
      this.body.x = spawn.x;
      this.body.y = spawn.y;
      this.huntingId = null;
      this.bridge().emit({ type: "health", health: this.body.hp });
      this.bridge().emit({ type: "hint", text: "You wake with the fire still in you. The hearth would take you back." });
    }

    this.pilgrim.setPosition(this.body.x, this.body.y + Math.sin(this.bob * 8) * (this.moving || this.huntingId ? 1 : 0));
    this.pilgrim.setDepth(10 + this.body.y);
    const maxHp = player.maxHealth || PLAYER_MAX_HP;
    paintHpBar(this.playerBar, this.body.x, this.body.y - 18, this.body.hp / maxHp, 28);

    for (const foe of this.foes) {
      const view = this.views.get(foe.id);
      if (!view) continue;
      const alive = foe.hp > 0;
      view.sprite.setVisible(alive);
      if (alive) {
        view.sprite.setPosition(foe.x, foe.y).setDepth(10 + foe.y);
        if (foe.hitFlash <= 0) {
          if (foe.mode === "attack" || foe.mode === "chase") view.sprite.setTint(0x8a4a32);
          else view.sprite.clearTint();
        }
        paintHpBar(view.bar, foe.x, foe.y - (foe.kind === "dire" ? 22 : 16), foe.hp / foe.maxHp, foe.kind === "dire" || foe.kind === "boar" ? 40 : 32);
      } else {
        view.bar.clear();
      }
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
