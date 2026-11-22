// The heist itself: the rules and state, with no drawing and no browser in it. step()
// advances one fixed step and returns what happened as bit flags, so the caller can
// react (sounds, screens, announcements) without the world knowing about them.
import { ALARM, CAMERA, GUARD, LOOT, THIEF, TOOLS } from './config.js';
import { createAlarm } from './alarm.js';
import { createCameras } from './cameras.js';
import { createGuards } from './guards.js';
import { createLoot } from './loot.js';
import { createMuseum, EXIT_ZONE, VAULT_DOOR } from './museum.js';
import { createRandom } from './random.js';
import { createThief } from './thief.js';

export const EVENT_PICKUP = 1;
export const EVENT_MASK = 2;
export const EVENT_VAULT_OPEN = 4;
export const EVENT_CAUGHT = 8;
export const EVENT_WIN = 16;
export const EVENT_SPOTTED = 32;
export const EVENT_EMP = 64;
export const EVENT_SMOKE = 128;
export const EVENT_LOCKDOWN = 256;

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/** Would a watcher at (x, y) facing `facing` see a point (tx, ty)? */
function sees(x, y, facing, range, halfAngle, tx, ty, museum) {
  const dx = tx - x;
  const dy = ty - y;
  const distance = Math.hypot(dx, dy);
  if (distance > range) return { seen: false, distance };
  if (Math.abs(angleDiff(Math.atan2(dy, dx), facing)) > halfAngle) return { seen: false, distance };
  if (museum.lineBlocked(x, y, tx, ty)) return { seen: false, distance };
  return { seen: true, distance };
}

/** Would any guard or camera see the point (x, y) right now? The screenshot pilot asks this. */
export function wouldBeSeenAt(state, x, y) {
  for (const guard of state.guards) {
    if (sees(guard.x, guard.y, guard.facing, GUARD.coneRange, GUARD.coneHalfAngle, x, y, state.museum).seen) return true;
  }
  for (const camera of state.cameras) {
    if (camera.disabled > 0) continue;
    if (sees(camera.x, camera.y, camera.angle, CAMERA.coneRange, CAMERA.coneHalfAngle, x, y, state.museum).seen) return true;
  }
  return false;
}

/**
 * The nearest guard or camera that can see the point (x, y) right now, or null.
 * The screenshot pilot flees away from it. The facing is the cone's axis.
 */
export function spotterAt(state, x, y) {
  let nearest = null;
  let nearestDistance = Infinity;
  for (const guard of state.guards) {
    const result = sees(guard.x, guard.y, guard.facing, GUARD.coneRange, GUARD.coneHalfAngle, x, y, state.museum);
    if (result.seen && result.distance < nearestDistance) {
      nearestDistance = result.distance;
      nearest = { x: guard.x, y: guard.y, facing: guard.facing };
    }
  }
  for (const camera of state.cameras) {
    if (camera.disabled > 0) continue;
    const result = sees(camera.x, camera.y, camera.angle, CAMERA.coneRange, CAMERA.coneHalfAngle, x, y, state.museum);
    if (result.seen && result.distance < nearestDistance) {
      nearestDistance = result.distance;
      nearest = { x: camera.x, y: camera.y, facing: camera.angle };
    }
  }
  return nearest;
}

export function createHeist(seed) {
  const museum = createMuseum(createRandom(seed));
  const thiefApi = createThief();
  const guardsApi = createGuards();
  const camerasApi = createCameras();
  const lootApi = createLoot();
  const alarmApi = createAlarm();

  const state = {
    museum,
    thief: thiefApi.thief,
    guards: guardsApi.guards,
    cameras: camerasApi.cameras,
    trinkets: lootApi.trinkets,
    mask: lootApi.mask,
    vault: lootApi.vault,
    alarm: alarmApi.alarm,
    tools: { emp: TOOLS.empCharges, smoke: TOOLS.smokeCharges, empTimer: 0, smokeTimer: 0, smokeX: 0, smokeY: 0 },
    time: 0,
    elapsed: 0,
    loot: 0,
    caught: null,
    won: false,
    score: 0,
    objective: 'Steal the Gilded Mask',
    prompt: '',
  };

  function reset() {
    thiefApi.reset();
    guardsApi.reset();
    camerasApi.reset();
    lootApi.reset();
    alarmApi.reset();
    state.tools.emp = TOOLS.empCharges;
    state.tools.smoke = TOOLS.smokeCharges;
    state.tools.empTimer = 0;
    state.tools.smokeTimer = 0;
    state.time = 0;
    state.elapsed = 0;
    state.loot = 0;
    state.caught = null;
    state.won = false;
    state.score = 0;
    state.objective = 'Steal the Gilded Mask';
    state.prompt = '';
  }

  function computeScore() {
    const score =
      state.loot +
      (state.won ? LOOT.getawayBonus : 0) -
      Math.floor(state.alarm.value) * LOOT.alarmPenaltyPerPoint -
      Math.floor(state.elapsed) * LOOT.timePenaltyPerSecond;
    return Math.max(0, score);
  }

  function inExitZone(x, y) {
    return (
      x >= EXIT_ZONE.x && x <= EXIT_ZONE.x + EXIT_ZONE.width &&
      y >= EXIT_ZONE.y && y <= EXIT_ZONE.y + EXIT_ZONE.height
    );
  }

  /**
   * One fixed step. `controls` is { vector, sneak, interact, emp, smoke } — vector is a
   * normalized steering vector or null, emp/smoke are one-shot presses for this step.
   * With `harmless` set (the title screen's backdrop) the guards patrol and the cameras
   * sweep, but nothing is seen, taken or scored.
   */
  function step(dt, controls, harmless) {
    let events = 0;
    state.time += dt;
    if (harmless) {
      guardsApi.update(dt, false, state.thief.x, state.thief.y);
      camerasApi.update(dt, state.time);
      return 0;
    }
    if (state.caught || state.won) return 0;
    state.elapsed += dt;
    const thief = state.thief;

    // Tools: one-shot presses, spent only when they actually fire.
    if (controls.emp && state.tools.emp > 0 && state.tools.empTimer <= 0) {
      state.tools.emp -= 1;
      state.tools.empTimer = TOOLS.empDisableSeconds;
      camerasApi.disableAll(TOOLS.empDisableSeconds);
      alarmApi.add(ALARM.empCost);
      events |= EVENT_EMP;
    }
    if (controls.smoke && state.tools.smoke > 0 && state.tools.smokeTimer <= 0) {
      state.tools.smoke -= 1;
      state.tools.smokeTimer = TOOLS.smokeSeconds;
      state.tools.smokeX = thief.x;
      state.tools.smokeY = thief.y;
      events |= EVENT_SMOKE;
    }
    if (state.tools.empTimer > 0) state.tools.empTimer -= dt;
    if (state.tools.smokeTimer > 0) state.tools.smokeTimer -= dt;

    // The vault lockpick: hold E at the door, standing still, and it opens in 3 seconds.
    const nearDoor = lootApi.nearVaultDoor(thief.x, thief.y);
    thief.lockpicking = Boolean(controls.interact && nearDoor);
    if (lootApi.pickLock(dt, controls.interact, nearDoor)) {
      events |= EVENT_VAULT_OPEN;
    }

    // Movement: keyboard vector wins over a click target; no moving while lockpicking.
    if (!thief.lockpicking) {
      const speed = controls.sneak ? THIEF.sneakSpeed : THIEF.walkSpeed;
      if (controls.vector) {
        thief.target = null;
        thiefApi.moveVector(dt, controls.vector, speed, museum);
      } else if (thief.target) {
        thiefApi.moveToTarget(dt, speed, museum);
      } else {
        thief.moving = false;
      }
    } else {
      thief.moving = false;
    }

    // The Mask is taken with E, once the vault stands open.
    if (controls.interact && lootApi.canTakeMask(thief.x, thief.y)) {
      lootApi.takeMask();
      state.loot += LOOT.maskValue;
      state.objective = 'Mask secured — reach the green EXIT';
      events |= EVENT_MASK;
    }

    // Loose loot is pocketed on touch.
    const picked = lootApi.collectTrinkets(thief.x, thief.y);
    if (picked > 0) {
      state.loot += picked;
      events |= EVENT_PICKUP;
    }

    guardsApi.update(dt, state.alarm.lockdown, thief.x, thief.y);
    camerasApi.update(dt, state.time);

    // Detection: smoke hides Moth; otherwise every cone that holds Moth fills the alarm.
    const hidden =
      state.tools.smokeTimer > 0 &&
      Math.hypot(thief.x - state.tools.smokeX, thief.y - state.tools.smokeY) < TOOLS.smokeRadius;
    let seen = false;
    let rate = 0;
    let seenBy = null;
    if (!hidden) {
      for (const guard of state.guards) {
        const result = sees(guard.x, guard.y, guard.facing, GUARD.coneRange, GUARD.coneHalfAngle, thief.x, thief.y, museum);
        guard.alerted = result.seen;
        if (result.seen) {
          seen = true;
          rate += ALARM.guardSeeRate + (result.distance < ALARM.closeDistance ? ALARM.closeBonus : 0);
          seenBy = guard.name;
        }
      }
      for (const camera of state.cameras) {
        if (camera.disabled > 0) continue;
        const result = sees(camera.x, camera.y, camera.angle, CAMERA.coneRange, CAMERA.coneHalfAngle, thief.x, thief.y, museum);
        if (result.seen) {
          seen = true;
          rate += ALARM.cameraSeeRate + (result.distance < ALARM.closeDistance ? ALARM.closeBonus : 0);
          seenBy = camera.name;
        }
      }
    } else {
      for (const guard of state.guards) guard.alerted = false;
    }

    const alarmEvents = alarmApi.update(dt, seen, rate, seenBy);
    if (alarmEvents.spottedStarted) events |= EVENT_SPOTTED;
    if (alarmEvents.lockdownStarted) events |= EVENT_LOCKDOWN;
    if (alarmEvents.spottedExpired) {
      state.caught = `Spotted by ${seenBy || 'a guard'} — the grace ran out`;
      events |= EVENT_CAUGHT;
    }

    // A guard that reaches Moth catches Moth, grace or not.
    if (!state.caught) {
      for (const guard of state.guards) {
        if (Math.hypot(guard.x - thief.x, guard.y - thief.y) < GUARD.touchRadius) {
          state.caught = `Caught by ${guard.name} in the gallery`;
          events |= EVENT_CAUGHT;
          break;
        }
      }
    }

    // The getaway: Mask in hand, Moth in the green EXIT zone.
    if (!state.caught && state.mask.taken && inExitZone(thief.x, thief.y)) {
      state.won = true;
      state.score = computeScore();
      state.objective = 'Clean getaway';
      events |= EVENT_WIN;
    }

    // The prompt line: what E does right here, right now.
    if (thief.lockpicking) {
      state.prompt = `Picking the vault lock… ${Math.ceil(TOOLS.lockpickSeconds - state.vault.lockpickProgress)}s`;
    } else if (nearDoor) {
      state.prompt = 'Hold E — pick the vault lock';
    } else if (lootApi.canTakeMask(thief.x, thief.y)) {
      state.prompt = 'Press E — take the Gilded Mask';
    } else {
      state.prompt = '';
    }
    return events;
  }

  /**
   * Stage a perfect heist for the getaway screenshot: every trinket pocketed, the Mask
   * taken, Moth at the exit, the score worked out the same way a real win works it out.
   */
  function forceWin() {
    for (const trinket of state.trinkets) trinket.taken = true;
    state.vault.open = true;
    state.mask.taken = true;
    state.loot = lootApi.lootValue();
    state.thief.x = EXIT_ZONE.x + EXIT_ZONE.width / 2;
    state.thief.y = EXIT_ZONE.y + EXIT_ZONE.height / 2;
    state.won = true;
    state.score = computeScore();
    state.objective = 'Clean getaway';
  }

  reset();
  return { state, reset, step, forceWin };
}
