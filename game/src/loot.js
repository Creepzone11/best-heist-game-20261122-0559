// The loot: five small trinkets that Moth pockets on touch, and the Gilded Mask in the
// vault chamber, which only opens after the vault door is picked — and only then can
// the Mask be taken with E.
import { MASK_SPOT, VAULT_DOOR } from './museum.js';
import { THIEF, TOOLS } from './config.js';

export function createLoot() {
  const trinkets = [
    { x: 452, y: 400, value: 150, taken: false },
    { x: 652, y: 400, value: 200, taken: false },
    { x: 852, y: 400, value: 150, taken: false },
    { x: 130, y: 140, value: 250, taken: false },
    { x: 1150, y: 620, value: 200, taken: false },
  ];
  const mask = { x: MASK_SPOT.x, y: MASK_SPOT.y, taken: false };
  const vault = { open: false, lockpickProgress: 0 };

  function reset() {
    for (const trinket of trinkets) trinket.taken = false;
    mask.taken = false;
    vault.open = false;
    vault.lockpickProgress = 0;
  }

  /** Pocket every trinket within reach; returns the value collected this step. */
  function collectTrinkets(x, y) {
    let value = 0;
    for (const trinket of trinkets) {
      if (trinket.taken) continue;
      if (Math.hypot(trinket.x - x, trinket.y - y) < THIEF.radius + 16) {
        trinket.taken = true;
        value += trinket.value;
      }
    }
    return value;
  }

  /** True when Moth stands close enough to the vault door to pick its lock. */
  function nearVaultDoor(x, y) {
    return !vault.open && Math.hypot(VAULT_DOOR.x - x, VAULT_DOOR.y - y) < 80;
  }

  /**
   * Advance the lockpick while E is held at the door; it slips back when Moth walks
   * away. Returns true on the step the door swings open.
   */
  function pickLock(dt, holding, nearDoor) {
    if (!vault.open && holding && nearDoor) {
      vault.lockpickProgress += dt;
      if (vault.lockpickProgress >= TOOLS.lockpickSeconds) {
        vault.open = true;
        return true;
      }
    } else {
      vault.lockpickProgress = Math.max(0, vault.lockpickProgress - dt * 2);
    }
    return false;
  }

  /** True when Moth stands close enough to take the Mask (vault open, E pressed). */
  function canTakeMask(x, y) {
    return vault.open && !mask.taken && Math.hypot(mask.x - x, mask.y - y) < THIEF.grabRadius;
  }

  function takeMask() {
    mask.taken = true;
  }

  function lootValue() {
    let value = 0;
    for (const trinket of trinkets) if (trinket.taken) value += trinket.value;
    if (mask.taken) value += 2500;
    return value;
  }

  return { trinkets, mask, vault, reset, collectTrinkets, nearVaultDoor, pickLock, canTakeMask, takeMask, lootValue };
}
