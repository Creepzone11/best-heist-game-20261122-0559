// The screenshot scenes behind ?shot=start|play|end. Each one plays the real rules
// forward from a fresh heist, steered by a small pilot that walks waypoints and refuses
// to step into a vision cone, so the frame is what a real game looks like and the same
// seed always gives the same frame.
import { STEP } from './config.js';
import { EVENT_CAUGHT, EVENT_WIN, spotterAt, wouldBeSeenAt } from './heist.js';
import { SCREEN_CAUGHT, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

const START_SECONDS = 6;
const PLAY_SECONDS = 16;
const END_LIMIT_SECONDS = 240;

function rotate(vector, angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return { x: vector.x * cos - vector.y * sin, y: vector.x * sin + vector.y * cos };
}

/** A position the pilot refuses to step into: inside a vision cone, or too close to a guard's body. */
function positionBlocked(heist, x, y) {
  if (wouldBeSeenAt(heist.state, x, y)) return true;
  for (const guard of heist.state.guards) {
    if (Math.hypot(guard.x - x, guard.y - y) < 48) return true;
  }
  return false;
}

/**
 * One pilot step toward `target`: walk straight there unless the next step would be
 * seen, in which case sidestep (or wait the cone out). When Moth is already seen, it
 * flees straight away from the spotter instead — waiting in a cone is how a heist ends.
 * Returns the controls for one fixed step, or null when the target is reached.
 */
function pilotMove(heist, target) {
  const thief = heist.state.thief;
  const spotter = spotterAt(heist.state, thief.x, thief.y);
  if (spotter) {
    // Flee sideways out of the cone, not away from the spotter: running straight
    // away stays inside the wedge, while a step perpendicular to the cone's axis
    // leaves it. Pick the side that gets furthest from the axis (and out of sight).
    const axis = { x: Math.cos(spotter.facing), y: Math.sin(spotter.facing) };
    const candidates = [rotate(axis, Math.PI / 2), rotate(axis, -Math.PI / 2)];
    let bestDir = candidates[0];
    let bestScore = -Infinity;
    for (const candidate of candidates) {
      const px = thief.x + candidate.x * 40;
      const py = thief.y + candidate.y * 40;
      let diff = Math.atan2(py - spotter.y, px - spotter.x) - spotter.facing;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      const score = Math.abs(diff) + (positionBlocked(heist, px, py) ? 0 : 10);
      if (score > bestScore) {
        bestScore = score;
        bestDir = candidate;
      }
    }
    return { vector: bestDir, sneak: false, interact: false, emp: false, smoke: false };
  }
  const dx = target.x - thief.x;
  const dy = target.y - thief.y;
  const distance = Math.hypot(dx, dy);
  if (distance < 10) return null;
  let dir = { x: dx / distance, y: dy / distance };
  const probe = 26;
  if (positionBlocked(heist, thief.x + dir.x * probe, thief.y + dir.y * probe)) {
    const options = [0.6, -0.6, 1.2, -1.2, Math.PI];
    let picked = null;
    for (const angle of options) {
      const candidate = rotate(dir, angle);
      if (!positionBlocked(heist, thief.x + candidate.x * probe, thief.y + candidate.y * probe)) {
        picked = candidate;
        break;
      }
    }
    if (picked) dir = picked;
    else return { vector: null, sneak: true, interact: false, emp: false, smoke: false };
  }
  let sneak = false;
  for (const guard of heist.state.guards) {
    if (Math.hypot(guard.x - thief.x, guard.y - thief.y) < 160) sneak = true;
  }
  return { vector: dir, sneak, interact: false, emp: false, smoke: false };
}

const IDLE = { vector: null, sneak: false, interact: false, emp: false, smoke: false };

function runPlan(heist, plan, limitSeconds) {
  let planIndex = 0;
  let waitTimer = 0;
  for (let index = 0; index < limitSeconds / STEP; index += 1) {
    if (heist.state.caught || heist.state.won) break;
    const item = plan[planIndex];
    if (!item) break;
    let controls = IDLE;
    if (item.kind === 'goto') {
      const move = pilotMove(heist, item);
      if (move === null) {
        planIndex += 1;
        waitTimer = 0;
      } else controls = move;
    } else if (item.kind === 'wait-clear') {
      // Wait at the staging point until the door itself is out of every cone.
      if (!wouldBeSeenAt(heist.state, item.x, item.y)) {
        planIndex += 1;
      } else {
        const move = pilotMove(heist, item.stage);
        if (move !== null) controls = move;
      }
    } else if (item.kind === 'pick') {
      // A cone sweeping onto Moth mid-pick aborts the pick: step back to the door
      // approach and try again once the coast is clear.
      if (spotterAt(heist.state, heist.state.thief.x, heist.state.thief.y)) {
        if (planIndex > 0 && plan[planIndex - 1].kind === 'goto') planIndex -= 1;
        controls = pilotMove(heist, { x: 820, y: 260 }) || IDLE;
      } else {
        controls = { vector: null, sneak: false, interact: true, emp: false, smoke: false };
      }
      if (heist.state.vault.open) planIndex += 1;
    } else if (item.kind === 'take') {
      if (spotterAt(heist.state, heist.state.thief.x, heist.state.thief.y)) {
        if (planIndex > 0 && plan[planIndex - 1].kind === 'goto') planIndex -= 1;
        controls = pilotMove(heist, { x: 1050, y: 200 }) || IDLE;
      } else {
        controls = { vector: null, sneak: false, interact: true, emp: false, smoke: false };
      }
      if (heist.state.mask.taken) planIndex += 1;
    }
    const events = heist.step(STEP, controls, false);
    if (events & EVENT_CAUGHT) break;
    if (events & EVENT_WIN) break;
    // A stuck pilot (waiting out a cone) still counts down: cones sweep, so it clears.
    waitTimer += STEP;
    if (waitTimer > 30 && item.kind === 'goto') {
      // The waypoint is unreachable as walked: skip it rather than stall the scene.
      planIndex += 1;
      waitTimer = 0;
    } else if (item.kind !== 'goto') {
      waitTimer = 0;
    }
  }
}

/**
 * Set `heist` to the named scene (start, play or end; any other name is start) and
 * return the screen to draw over it and the best score to show.
 */
export function stageShot(name, heist) {
  heist.reset();
  if (name !== 'play' && name !== 'end') {
    for (let index = 0; index < START_SECONDS / STEP; index += 1) {
      heist.step(STEP, IDLE, true);
    }
    return { screen: SCREEN_TITLE, best: 0 };
  }
  if (name === 'play') {
    const plan = [
      { kind: 'goto', x: 640, y: 500 },
      { kind: 'goto', x: 452, y: 400 },
      { kind: 'goto', x: 652, y: 400 },
      { kind: 'goto', x: 852, y: 400 },
      { kind: 'goto', x: 860, y: 430 },
    ];
    runPlan(heist, plan, PLAY_SECONDS);
    if (heist.state.caught) return { screen: SCREEN_CAUGHT, best: heist.state.loot };
    return { screen: SCREEN_PLAY, best: heist.state.loot };
  }
  // end: the whole heist, played through — and if the pilot fails, stage the getaway
  // itself, so the frame still shows the real win screen.
  const plan = [
    { kind: 'goto', x: 640, y: 500 },
    { kind: 'goto', x: 452, y: 400 },
    { kind: 'goto', x: 652, y: 400 },
    { kind: 'goto', x: 852, y: 400 },
    { kind: 'wait-clear', x: 950, y: 180, stage: { x: 820, y: 260 } },
    { kind: 'goto', x: 950, y: 180 },
    { kind: 'pick' },
    { kind: 'goto', x: 1140, y: 130 },
    { kind: 'take' },
    { kind: 'goto', x: 105, y: 676 },
  ];
  runPlan(heist, plan, END_LIMIT_SECONDS);
  if (!heist.state.won) heist.forceWin();
  return { screen: SCREEN_WIN, best: heist.state.score };
}
