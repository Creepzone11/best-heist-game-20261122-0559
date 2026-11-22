// Moth, the thief: a circle that walks, sneaks and channels the vault lockpick.
// This file knows nothing about guards or alarms — only how Moth moves.
import { ENTRANCE } from './museum.js';
import { THIEF } from './config.js';

export function createThief() {
  const thief = {
    x: ENTRANCE.x,
    y: ENTRANCE.y,
    facing: -Math.PI / 2,
    target: null, // click-to-move destination in field coordinates, or null
    lockpicking: false,
    moving: false,
    stepTimer: 0, // counts down to the next footstep sound
  };

  function reset() {
    thief.x = ENTRANCE.x;
    thief.y = ENTRANCE.y;
    thief.facing = -Math.PI / 2;
    thief.target = null;
    thief.lockpicking = false;
    thief.moving = false;
    thief.stepTimer = 0;
  }

  /**
   * Walk along a steering vector (already normalized) for one step. Returns true when
   * the thief actually moved, which is what drives the footstep sounds.
   */
  function moveVector(dt, vector, speed, museum) {
    if (!vector) {
      thief.moving = false;
      return false;
    }
    const moved = museum.moveCircle(thief, vector.x * speed * dt, vector.y * speed * dt, THIEF.radius);
    const didMove = moved.x !== 0 || moved.y !== 0;
    thief.moving = didMove;
    if (didMove) {
      thief.facing = Math.atan2(vector.y, vector.x);
      thief.stepTimer -= dt;
    }
    return didMove;
  }

  /** Walk toward the click target; clears it when close enough to stop. */
  function moveToTarget(dt, speed, museum) {
    if (!thief.target) return false;
    const dx = thief.target.x - thief.x;
    const dy = thief.target.y - thief.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 8) {
      thief.target = null;
      thief.moving = false;
      return false;
    }
    return moveVector(dt, { x: dx / distance, y: dy / distance }, speed, museum);
  }

  return { thief, reset, moveVector, moveToTarget };
}
