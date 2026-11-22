// The alarm meter: it fills while anyone sees Moth, drains while nobody does, and at
// full it locks the museum down — the guards hunt and the siren sounds. Being seen
// also starts a short "SPOTTED!" grace: break line of sight before it runs out, or
// Moth is caught. The grace is what makes getting caught feel fair.
import { ALARM } from './config.js';

export function createAlarm() {
  const alarm = {
    value: 0,
    lockdown: false,
    lockdownTimer: 0,
    spotted: 0, // seconds of grace left, 0 when nobody has Moth in sight
    spottedBy: null,
    wasSeen: false,
  };

  function reset() {
    alarm.value = 0;
    alarm.lockdown = false;
    alarm.lockdownTimer = 0;
    alarm.spotted = 0;
    alarm.spottedBy = null;
    alarm.wasSeen = false;
  }

  /**
   * One step of the meter. `seen` says whether any guard or camera holds Moth right
   * now, `rate` is how fast the meter fills while seen, `seenBy` names the spotter.
   * Returns what changed, as flags the caller can react to.
   */
  function update(dt, seen, rate, seenBy) {
    const events = { lockdownStarted: false, lockdownEnded: false, spottedStarted: false, spottedExpired: false };
    if (seen) {
      if (!alarm.wasSeen) {
        alarm.spotted = ALARM.spottedGrace;
        alarm.spottedBy = seenBy;
        events.spottedStarted = true;
      }
      alarm.value = Math.min(ALARM.lockdownAt, alarm.value + rate * dt);
      if (alarm.spotted > 0) {
        alarm.spotted -= dt;
        if (alarm.spotted <= 0) events.spottedExpired = true;
      }
    } else {
      alarm.spotted = 0;
      alarm.spottedBy = null;
      if (!alarm.lockdown) alarm.value = Math.max(0, alarm.value - ALARM.decayRate * dt);
    }
    alarm.wasSeen = seen;
    if (!alarm.lockdown && alarm.value >= ALARM.lockdownAt) {
      alarm.lockdown = true;
      alarm.lockdownTimer = ALARM.lockdownSeconds;
      events.lockdownStarted = true;
    }
    if (alarm.lockdown) {
      alarm.value = ALARM.lockdownAt;
      alarm.lockdownTimer -= dt;
      if (alarm.lockdownTimer <= 0) {
        alarm.lockdown = false;
        alarm.value = ALARM.lockdownFallTo;
        events.lockdownEnded = true;
      }
    }
    return events;
  }

  /** The EMP's price: a jump on the meter right now. */
  function add(amount) {
    alarm.value = Math.min(ALARM.lockdownAt, alarm.value + amount);
  }

  return { alarm, reset, update, add };
}
