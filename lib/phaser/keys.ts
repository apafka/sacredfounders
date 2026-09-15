const pressed = new Set<string>();
let eLatched = false;
let installed = false;

function isTypingTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
}

function axisFromPressed(): { x: number; y: number } {
  let x = 0;
  let y = 0;
  if (pressed.has("KeyA") || pressed.has("ArrowLeft")) x -= 1;
  if (pressed.has("KeyD") || pressed.has("ArrowRight")) x += 1;
  if (pressed.has("KeyW") || pressed.has("ArrowUp")) y -= 1;
  if (pressed.has("KeyS") || pressed.has("ArrowDown")) y += 1;
  if (x === 0 && y === 0) return { x: 0, y: 0 };
  const len = Math.hypot(x, y) || 1;
  return { x: x / len, y: y / len };
}

export function installWindowKeys() {
  if (installed || typeof window === "undefined") return () => undefined;
  installed = true;

  const onDown = (event: KeyboardEvent) => {
    if (isTypingTarget(event.target)) return;
    if (event.code === "KeyE" && !event.repeat) eLatched = true;
    pressed.add(event.code);
  };
  const onUp = (event: KeyboardEvent) => {
    pressed.delete(event.code);
  };
  const reset = () => {
    pressed.clear();
    eLatched = false;
  };

  window.addEventListener("keydown", onDown);
  window.addEventListener("keyup", onUp);
  window.addEventListener("blur", reset);
  return () => {
    window.removeEventListener("keydown", onDown);
    window.removeEventListener("keyup", onUp);
    window.removeEventListener("blur", reset);
    installed = false;
    reset();
  };
}

export function windowAxis(): { x: number; y: number } {
  return axisFromPressed();
}

export function consumeInteract(): boolean {
  if (!eLatched) return false;
  eLatched = false;
  return true;
}
