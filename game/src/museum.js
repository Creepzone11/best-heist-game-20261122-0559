// The museum: one gallery room, a vault chamber holding the Gilded Mask, and a vent
// lane down the left side. Everything the rules need to know about the room lives
// here: the solid rectangles, the vault door, the exit, the decoration, and the two
// geometry questions the game keeps asking (can this see that? can this move there?).
import { FIELD } from './config.js';

/** The thickness of the outer walls, in pixels. */
export const WALL = 24;

export const ENTRANCE = { x: 640, y: 640 };
export const EXIT_ZONE = { x: 60, y: 656, width: 90, height: 40 };
export const VAULT_DOOR = { x: 992, y: 180 };
export const MASK_SPOT = { x: 1140, y: 130 };

/** Solid rectangles. kind tells the renderer what to paint; every one blocks sight and movement. */
export const OBSTACLES = [
  // The partition wall down the left side, with a vent gap (y 330..390) to crawl through.
  { x: 240, y: 120, w: 24, h: 210, kind: 'wall' },
  { x: 240, y: 390, w: 24, h: 210, kind: 'wall' },
  // The vault chamber's left wall, with its locked door gap (y 150..210).
  { x: 980, y: 24, w: 24, h: 126, kind: 'vault' },
  { x: 980, y: 210, w: 24, h: 50, kind: 'vault' },
  // The vault chamber's bottom wall.
  { x: 980, y: 236, w: 276, h: 24, kind: 'vault' },
  // Display pedestals down the middle of the gallery.
  { x: 420, y: 300, w: 64, h: 64, kind: 'pedestal' },
  { x: 620, y: 300, w: 64, h: 64, kind: 'pedestal' },
  { x: 820, y: 300, w: 64, h: 64, kind: 'pedestal' },
  // The long display case near the top.
  { x: 560, y: 140, w: 160, h: 56, kind: 'case' },
  // Columns of the right colonnade.
  { x: 1020, y: 380, w: 36, h: 36, kind: 'column' },
  { x: 1020, y: 520, w: 36, h: 36, kind: 'column' },
];

/** Paintings hung on the walls: pure decoration, drawn by the renderer. */
export const PAINTINGS = [
  { x: 300, y: 24, w: 90, h: 16, hue: '#7a5c2e' },
  { x: 480, y: 24, w: 60, h: 16, hue: '#2e5c7a' },
  { x: 820, y: 24, w: 90, h: 16, hue: '#5c2e7a' },
  { x: 24, y: 180, w: 16, h: 90, hue: '#7a2e3a' },
  { x: 24, y: 470, w: 16, h: 90, hue: '#2e7a4a' },
  { x: 1240, y: 180, w: 16, h: 90, hue: '#7a6a2e' },
  { x: 1240, y: 470, w: 16, h: 90, hue: '#3a2e7a' },
];

function circleHitsRect(cx, cy, radius, rect) {
  const nearestX = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
  const nearestY = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
  const dx = cx - nearestX;
  const dy = cy - nearestY;
  return dx * dx + dy * dy < radius * radius;
}

function pointInRect(x, y, rect) {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

export function createMuseum(random) {
  // Marble veins on the floor and a scatter of dust motes: drawn once from the seed,
  // so the room looks the same every visit.
  const veins = [];
  for (let i = 0; i < 14; i += 1) {
    const points = [];
    let x = WALL + random() * (FIELD.width - WALL * 2);
    let y = WALL + random() * (FIELD.height - WALL * 2);
    points.push({ x, y });
    for (let j = 0; j < 4; j += 1) {
      x += (random() - 0.5) * 260;
      y += (random() - 0.5) * 160;
      points.push({ x, y });
    }
    veins.push(points);
  }
  const motes = [];
  for (let i = 0; i < 220; i += 1) {
    motes.push({
      x: WALL + random() * (FIELD.width - WALL * 2),
      y: WALL + random() * (FIELD.height - WALL * 2),
      r: 0.6 + random() * 1.4,
      a: 0.04 + random() * 0.08,
    });
  }

  /** True when any solid rectangle stands between the two points. */
  function lineBlocked(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const distance = Math.hypot(dx, dy);
    const steps = Math.max(1, Math.ceil(distance / 7));
    for (let i = 1; i < steps; i += 1) {
      const t = i / steps;
      const x = x1 + dx * t;
      const y = y1 + dy * t;
      for (const rect of OBSTACLES) {
        if (pointInRect(x, y, rect)) return true;
      }
    }
    return false;
  }

  /** True when a circle at (x, y) would overlap a solid rectangle or the outer walls. */
  function circleBlocked(x, y, radius) {
    if (x - radius < WALL || x + radius > FIELD.width - WALL) return true;
    if (y - radius < WALL || y + radius > FIELD.height - WALL) return true;
    for (const rect of OBSTACLES) {
      if (circleHitsRect(x, y, radius, rect)) return true;
    }
    return false;
  }

  /**
   * Move a circle by (dx, dy), one axis at a time, so it slides along walls instead of
   * sticking on corners. Returns how far it actually moved on each axis.
   */
  function moveCircle(entity, dx, dy, radius) {
    let movedX = 0;
    let movedY = 0;
    if (dx !== 0 && !circleBlocked(entity.x + dx, entity.y, radius)) {
      entity.x += dx;
      movedX = dx;
    }
    if (dy !== 0 && !circleBlocked(entity.x, entity.y + dy, radius)) {
      entity.y += dy;
      movedY = dy;
    }
    return { x: movedX, y: movedY };
  }

  return { veins, motes, lineBlocked, circleBlocked, moveCircle };
}
