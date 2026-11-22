// The three guards: Vega on the long horizontal beat, Orin on the vertical beat, and
// Sable circling the vault approach. Each walks its waypoints, pauses at each one to
// look around, and — when the alarm is at lockdown — abandons the beat to hunt Moth.
import { GUARD } from './config.js';

function angleLerp(from, to, amount) {
  let diff = to - from;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return from + diff * amount;
}

function makeGuard(name, waypoints) {
  return {
    name,
    waypoints,
    x: waypoints[0][0],
    y: waypoints[0][1],
    waypointIndex: 1,
    waypointDir: 1,
    facing: 0,
    pauseTimer: 0,
    lookPhase: 0,
    alerted: false,
  };
}

export function createGuards() {
  const guards = [
    makeGuard('Vega', [[300, 480], [900, 480]]),
    makeGuard('Orin', [[920, 140], [920, 560]]),
    makeGuard('Sable', [[1000, 320], [1180, 320], [1180, 600], [1000, 600]]),
  ];
  for (const guard of guards) {
    guard.facing = Math.atan2(
      guard.waypoints[1][1] - guard.y,
      guard.waypoints[1][0] - guard.x,
    );
  }

  function reset() {
    for (const guard of guards) {
      guard.x = guard.waypoints[0][0];
      guard.y = guard.waypoints[0][1];
      guard.waypointIndex = 1;
      guard.waypointDir = 1;
      guard.pauseTimer = 0;
      guard.lookPhase = 0;
      guard.alerted = false;
      guard.facing = Math.atan2(
        guard.waypoints[1][1] - guard.y,
        guard.waypoints[1][0] - guard.x,
      );
    }
  }

  /**
   * Advance every guard one step. In lockdown they chase (targetX, targetY); otherwise
   * they walk their beat. An alerted guard keeps its gaze on Moth while it stands still.
   */
  function update(dt, lockdown, targetX, targetY) {
    for (const guard of guards) {
      if (lockdown) {
        const dx = targetX - guard.x;
        const dy = targetY - guard.y;
        const distance = Math.hypot(dx, dy);
        if (distance > 4) {
          const speed = GUARD.chaseSpeed * dt;
          guard.x += (dx / distance) * speed;
          guard.y += (dy / distance) * speed;
          guard.facing = angleLerp(guard.facing, Math.atan2(dy, dx), 0.2);
        }
        continue;
      }
      if (guard.pauseTimer > 0) {
        guard.pauseTimer -= dt;
        guard.lookPhase += dt;
        // Sweep the gaze while paused, unless something has the guard's attention.
        if (!guard.alerted) {
          const base = Math.atan2(
            guard.waypoints[guard.waypointIndex][1] - guard.y,
            guard.waypoints[guard.waypointIndex][0] - guard.x,
          );
          guard.facing = base + Math.sin(guard.lookPhase * 2.2) * GUARD.lookSwing;
        }
        continue;
      }
      const waypoint = guard.waypoints[guard.waypointIndex];
      const dx = waypoint[0] - guard.x;
      const dy = waypoint[1] - guard.y;
      const distance = Math.hypot(dx, dy);
      const step = GUARD.patrolSpeed * dt;
      if (distance <= step) {
        guard.x = waypoint[0];
        guard.y = waypoint[1];
        guard.pauseTimer = GUARD.pauseSeconds;
        guard.lookPhase = 0;
        guard.waypointIndex += guard.waypointDir;
        if (guard.waypointIndex >= guard.waypoints.length || guard.waypointIndex < 0) {
          guard.waypointDir *= -1;
          guard.waypointIndex += guard.waypointDir * 2;
        }
      } else {
        guard.x += (dx / distance) * step;
        guard.y += (dy / distance) * step;
        const wanted = Math.atan2(dy, dx);
        guard.facing = angleLerp(guard.facing, wanted, 0.25);
      }
      if (guard.alerted) {
        guard.facing = angleLerp(guard.facing, Math.atan2(targetY - guard.y, targetX - guard.x), 0.3);
      }
    }
  }

  return { guards, reset, update };
}
