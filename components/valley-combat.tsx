"use client";

import { useEffect, useRef, useState } from "react";

type Wolf = { x: number; y: number; hp: number; telegraph: number; lunging: number };

export function ValleyCombat({
  busy,
  onLoot,
  onHome,
}: {
  busy: boolean;
  onLoot: () => void;
  onHome: () => void;
}) {
  const [player, setPlayer] = useState({ x: 80, y: 140, hp: 3 });
  const [wolf, setWolf] = useState<Wolf>({ x: 380, y: 140, hp: 3, telegraph: 0, lunging: 0 });
  const [won, setWon] = useState(false);
  const keys = useRef<Record<string, boolean>>({});
  const playerRef = useRef(player);
  const wolfRef = useRef(wolf);
  playerRef.current = player;
  wolfRef.current = wolf;

  useEffect(() => {
    function down(e: KeyboardEvent) {
      keys.current[e.key.toLowerCase()] = true;
      if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        strike();
      }
    }
    function up(e: KeyboardEvent) {
      keys.current[e.key.toLowerCase()] = false;
    }
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    let frame = 0;
    const tick = () => {
      const p = { ...playerRef.current };
      const w = { ...wolfRef.current };
      const speed = 2.4;
      if (keys.current.arrowup || keys.current.w) p.y -= speed;
      if (keys.current.arrowdown || keys.current.s) p.y += speed;
      if (keys.current.arrowleft || keys.current.a) p.x -= speed;
      if (keys.current.arrowright || keys.current.d) p.x += speed;
      p.x = Math.max(16, Math.min(464, p.x));
      p.y = Math.max(16, Math.min(264, p.y));

      if (w.hp > 0 && p.hp > 0) {
        if (w.lunging > 0) {
          const dx = p.x - w.x;
          const dy = p.y - w.y;
          const dist = Math.hypot(dx, dy) || 1;
          w.x += (dx / dist) * 7;
          w.y += (dy / dist) * 7;
          w.lunging -= 1;
          if (Math.hypot(p.x - w.x, p.y - w.y) < 28) {
            p.hp -= 1;
            w.lunging = 0;
            w.telegraph = 90;
          }
        } else if (w.telegraph > 0) {
          w.telegraph -= 1;
          if (w.telegraph === 0) w.lunging = 14;
        } else if (Math.random() < 0.012) {
          w.telegraph = 48;
        } else {
          const dx = p.x - w.x;
          const dy = p.y - w.y;
          const dist = Math.hypot(dx, dy) || 1;
          w.x += (dx / dist) * 0.9;
          w.y += (dy / dist) * 0.9;
        }
      }

      setPlayer(p);
      setWolf(w);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
    // strike is recreated each render; keys/refs hold live positions
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function strike() {
    const p = playerRef.current;
    const w = wolfRef.current;
    if (w.hp <= 0 || p.hp <= 0) return;
    if (Math.hypot(p.x - w.x, p.y - w.y) < 46) {
      const next = { ...w, hp: w.hp - 1, lunging: 0 };
      setWolf(next);
      if (next.hp <= 0 && !won) {
        setWon(true);
        onLoot();
      }
    }
  }

  const dead = player.hp <= 0;

  return (
    <section className="panel mt-4">
      <div className="flex items-center justify-between gap-2">
        <h2>Wolf on the hill</h2>
        <button className="btn-quiet" type="button" onClick={onHome}>
          Back through the door
        </button>
      </div>
      <p className="mt-1 text-sm text-[var(--muted)]">Move WASD. Strike when close. Dodge the red lunge.</p>
      <div className="relative mt-3 h-[280px] overflow-hidden rounded-sm border border-[var(--line)] bg-[#e8dfc8]">
        <div
          className="absolute h-8 w-8 rounded-full bg-[#2c241c]"
          style={{ left: player.x - 16, top: player.y - 16 }}
        />
        {wolf.hp > 0 ? (
          <div
            className={`absolute h-9 w-9 rounded-full ${wolf.telegraph > 0 ? "bg-[#b33a2b]" : "bg-[#5a4630]"}`}
            style={{ left: wolf.x - 18, top: wolf.y - 18 }}
          />
        ) : null}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
        <span>You {player.hp} · Wolf {Math.max(0, wolf.hp)}</span>
        <button className="btn-primary" type="button" disabled={busy || dead || won} onClick={strike}>
          Strike
        </button>
        {won ? <span>The wolf is down. Coins are yours.</span> : null}
        {dead ? <span>You fall. Use the door. The hearth still stands.</span> : null}
      </div>
    </section>
  );
}
