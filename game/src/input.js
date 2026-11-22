// Keyboard and pointer input. Held keys give a steering vector; one-shot presses
// (confirm, pause, restart, mute, tools) are queued as bit flags and taken once by the
// loop, so a press between two frames is never lost and never counted twice. A mouse
// click sets a walk target on the floor (keyboard steers while any key is held).
import { FIELD } from './config.js';

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_RESTART = 4;
export const ACTION_MUTE = 8;
export const ACTION_EMP = 16;
export const ACTION_SMOKE = 32;

const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const RESTART = new Set(['KeyR']);
const MUTE = new Set(['KeyM']);
const EMP = new Set(['KeyQ']);
const SMOKE = new Set(['KeyF']);
const INTERACT = new Set(['KeyE']);
const SNEAK = new Set(['ShiftLeft', 'ShiftRight']);

export function createInput(canvas) {
  const keys = { up: false, down: false, left: false, right: false, sneak: false, interact: false };
  let actions = 0;
  let clickTarget = null;

  function fieldFromClient(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const scale = Math.min(rect.width / FIELD.width, rect.height / FIELD.height);
    const offsetX = (rect.width - FIELD.width * scale) / 2;
    const offsetY = (rect.height - FIELD.height * scale) / 2;
    return {
      x: (clientX - rect.left - offsetX) / scale,
      y: (clientY - rect.top - offsetY) / scale,
    };
  }

  window.addEventListener('keydown', (event) => {
    if (UP.has(event.code)) keys.up = true;
    else if (DOWN.has(event.code)) keys.down = true;
    else if (LEFT.has(event.code)) keys.left = true;
    else if (RIGHT.has(event.code)) keys.right = true;
    else if (SNEAK.has(event.code)) keys.sneak = true;
    else if (INTERACT.has(event.code)) keys.interact = true;
    else if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (RESTART.has(event.code)) {
      if (!event.repeat) actions |= ACTION_RESTART;
    } else if (MUTE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_MUTE;
    } else if (EMP.has(event.code)) {
      if (!event.repeat) actions |= ACTION_EMP;
    } else if (SMOKE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_SMOKE;
    } else return;
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    if (UP.has(event.code)) keys.up = false;
    else if (DOWN.has(event.code)) keys.down = false;
    else if (LEFT.has(event.code)) keys.left = false;
    else if (RIGHT.has(event.code)) keys.right = false;
    else if (SNEAK.has(event.code)) keys.sneak = false;
    else if (INTERACT.has(event.code)) keys.interact = false;
  });
  // A key released while the tab is hidden never sends keyup: let go of everything on blur.
  window.addEventListener('blur', () => {
    keys.up = false;
    keys.down = false;
    keys.left = false;
    keys.right = false;
    keys.sneak = false;
    keys.interact = false;
    clickTarget = null;
  });
  canvas.addEventListener('pointerdown', (event) => {
    clickTarget = fieldFromClient(event.clientX, event.clientY);
    actions |= ACTION_CONFIRM;
  });

  return {
    /** Normalized steering vector from held keys, or null when no key is held. */
    keyVector() {
      const x = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
      const y = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
      if (x === 0 && y === 0) return null;
      const length = Math.hypot(x, y);
      return { x: x / length, y: y / length };
    },
    sneaking() {
      return keys.sneak;
    },
    interactHeld() {
      return keys.interact;
    },
    /** The click-to-move target in field coordinates, or null. */
    takeClickTarget() {
      const target = clickTarget;
      clickTarget = null;
      return target;
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
