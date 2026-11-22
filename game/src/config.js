// Every tuning number, colour and layout constant for MOTH: The Gilded Mask Heist.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to the window,
// so no rule below depends on the screen size.
export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

export const THIEF = {
  radius: 14,
  walkSpeed: 175,
  sneakSpeed: 95,
  grabRadius: 46,
};

export const GUARD = {
  radius: 15,
  patrolSpeed: 52,
  chaseSpeed: 96,
  coneRange: 215,
  coneHalfAngle: 0.49, // ~28 degrees
  touchRadius: 30,
  pauseSeconds: 0.9, // how long a guard stops and looks around at each waypoint
  lookSwing: 0.7, // radians the guard's gaze sweeps while paused
};

export const CAMERA = {
  coneRange: 265,
  coneHalfAngle: 0.42, // ~24 degrees
  sweepHalfAngle: 0.85, // how far each side of its base aim the lens swings
  sweepPeriod: 5.2, // seconds for a full sweep cycle
};

export const ALARM = {
  guardSeeRate: 26, // per second while a guard's cone holds the thief
  cameraSeeRate: 15, // per second while a camera's cone holds the thief
  closeBonus: 14, // extra per second when the spotter is very close
  closeDistance: 70,
  decayRate: 9, // per second while nobody sees the thief
  empCost: 8, // alarm added the moment an EMP fires
  lockdownAt: 100,
  lockdownSeconds: 12, // how long lockdown lasts before the alarm falls back
  lockdownFallTo: 60,
  spottedGrace: 1.2, // seconds of warning before being caught while still seen
};

export const TOOLS = {
  empCharges: 2,
  empDisableSeconds: 6,
  smokeCharges: 2,
  smokeSeconds: 4,
  smokeRadius: 95,
  lockpickSeconds: 3,
};

export const LOOT = {
  maskValue: 2500,
  getawayBonus: 500,
  alarmPenaltyPerPoint: 2,
  timePenaltyPerSecond: 2,
};

export const PALETTE = {
  floorA: '#0d1020',
  floorB: '#10142a',
  floorLine: '#1a2040',
  wall: '#232a45',
  wallTrim: '#c9a227',
  wallFace: '#1b2138',
  pedestal: '#2c3352',
  pedestalTop: '#3a4370',
  gold: '#f2c94c',
  goldDim: '#c9a227',
  maskGlow: '#ffd94d',
  guardBody: '#2e3a5c',
  guardCone: 'rgba(64, 224, 255, 0.30)',
  guardConeEdge: 'rgba(64, 224, 255, 0.55)',
  cameraCone: 'rgba(255, 70, 70, 0.28)',
  cameraConeEdge: 'rgba(255, 70, 70, 0.55)',
  thiefCape: '#e8e4d8',
  thiefBody: '#171a26',
  exitGreen: '#3ddc84',
  smoke: 'rgba(200, 205, 220, 0.55)',
  text: '#eef1f5',
  muted: '#9aa3b8',
  danger: '#ff5a5a',
  panel: 'rgba(10, 13, 26, 0.88)',
};

/** The font stack for every canvas label. */
export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'moth-heist.best';
