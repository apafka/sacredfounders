/** Port of the original valley RAF loop into seconds so Phaser and tests share the lunge feel. */

export const STRIKE_RANGE = 46;
export const HIT_RANGE = 28;
export const PLAYER_SPEED = 144;
export const WOLF_WALK = 54;
export const WOLF_LUNGE = 420;
export const TELEGRAPH_MS = 800;
export const LUNGE_MS = 230;
export const RECOVER_MS = 1500;
/** Chance per second to start a telegraph, matching ~0.012 per 60fps frame. */
export const LUNGE_CHANCE_PER_SEC = 0.72;

export type Actor = { x: number; y: number; hp: number };
export type Wolf = Actor & { telegraph: number; lunging: number };

export function tickWolf(
  player: Actor,
  wolf: Wolf,
  dtSec: number,
  rng: () => number = Math.random,
): { player: Actor; wolf: Wolf } {
  if (wolf.hp <= 0 || player.hp <= 0) return { player, wolf };

  const p = { ...player };
  const w = { ...wolf };
  const dtMs = dtSec * 1000;

  if (w.lunging > 0) {
    const dx = p.x - w.x;
    const dy = p.y - w.y;
    const dist = Math.hypot(dx, dy) || 1;
    w.x += (dx / dist) * WOLF_LUNGE * dtSec;
    w.y += (dy / dist) * WOLF_LUNGE * dtSec;
    w.lunging -= dtMs;
    if (Math.hypot(p.x - w.x, p.y - w.y) < HIT_RANGE) {
      p.hp -= 1;
      w.lunging = 0;
      w.telegraph = RECOVER_MS;
    }
  } else if (w.telegraph > 0) {
    w.telegraph -= dtMs;
    if (w.telegraph <= 0) {
      w.telegraph = 0;
      w.lunging = LUNGE_MS;
    }
  } else if (rng() < LUNGE_CHANCE_PER_SEC * dtSec) {
    w.telegraph = TELEGRAPH_MS;
  } else {
    const dx = p.x - w.x;
    const dy = p.y - w.y;
    const dist = Math.hypot(dx, dy) || 1;
    w.x += (dx / dist) * WOLF_WALK * dtSec;
    w.y += (dy / dist) * WOLF_WALK * dtSec;
  }

  return { player: p, wolf: w };
}

export function tryStrike(player: Actor, wolf: Wolf): Wolf | null {
  if (wolf.hp <= 0 || player.hp <= 0) return null;
  if (Math.hypot(player.x - wolf.x, player.y - wolf.y) >= STRIKE_RANGE) return null;
  return { ...wolf, hp: wolf.hp - 1, lunging: 0 };
}
