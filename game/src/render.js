// Drawing only: the heist's state and the current screen in, pixels out. The 1280x720
// playfield is scaled to fit the window and centred, the margin filled with the
// backdrop colour. Neon-noir: a dark marble floor, gold trim, cyan guard cones, red
// camera cones, and the Gilded Mask glowing in its vault.
import { FIELD, FONT, PALETTE } from './config.js';
import { EXIT_ZONE, OBSTACLES, PAINTINGS, VAULT_DOOR, WALL } from './museum.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_CAUGHT = 'caught';
export const SCREEN_WIN = 'win';

const PANEL = { width: 640, top: 150, line: 32, bottom: 64 };

function cachedLabel(prefix) {
  let value = null;
  let text = '';
  return function label(next) {
    if (next !== value) {
      value = next;
      text = prefix + next;
    }
    return text;
  };
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const lootLabel = cachedLabel('LOOT $');
  const timeLabel = cachedLabel('');
  const alarmLabel = cachedLabel('ALARM ');
  const scoreLabel = cachedLabel('Score $');
  const bestLabel = cachedLabel('Best $');

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  const fonts = new Map();
  function text(value, x, y, size, color, align, baseline = 'alphabetic') {
    if (!fonts.has(size)) fonts.set(size, `bold ${size}px ${FONT}`);
    context.font = fonts.get(size);
    context.fillStyle = color;
    context.textAlign = align;
    context.textBaseline = baseline;
    context.fillText(value, x, y);
  }

  function drawCone(x, y, facing, range, halfAngle, fill, edge) {
    const gradient = context.createRadialGradient(x, y, 8, x, y, range);
    gradient.addColorStop(0, fill);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    context.fillStyle = gradient;
    context.beginPath();
    context.moveTo(x, y);
    context.arc(x, y, range, facing - halfAngle, facing + halfAngle);
    context.closePath();
    context.fill();
    context.strokeStyle = edge;
    context.lineWidth = 1.5;
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x + Math.cos(facing - halfAngle) * range, y + Math.sin(facing - halfAngle) * range);
    context.moveTo(x, y);
    context.lineTo(x + Math.cos(facing + halfAngle) * range, y + Math.sin(facing + halfAngle) * range);
    context.stroke();
  }

  function drawFloor(state) {
    // Marble checker.
    const tile = 80;
    for (let ty = 0; ty < FIELD.height / tile; ty += 1) {
      for (let tx = 0; tx < FIELD.width / tile; tx += 1) {
        context.fillStyle = (tx + ty) % 2 === 0 ? PALETTE.floorA : PALETTE.floorB;
        context.fillRect(tx * tile, ty * tile, tile, tile);
      }
    }
    context.strokeStyle = PALETTE.floorLine;
    context.lineWidth = 1;
    for (let x = 0; x <= FIELD.width; x += tile) {
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, FIELD.height);
      context.stroke();
    }
    for (let y = 0; y <= FIELD.height; y += tile) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(FIELD.width, y);
      context.stroke();
    }
    // Veins.
    context.strokeStyle = 'rgba(120, 140, 200, 0.10)';
    context.lineWidth = 1.5;
    for (const vein of state.museum.veins) {
      context.beginPath();
      context.moveTo(vein[0].x, vein[0].y);
      for (let i = 1; i < vein.length; i += 1) context.lineTo(vein[i].x, vein[i].y);
      context.stroke();
    }
    // Dust motes.
    for (const mote of state.museum.motes) {
      context.fillStyle = `rgba(200, 210, 240, ${mote.a})`;
      context.beginPath();
      context.arc(mote.x, mote.y, mote.r, 0, Math.PI * 2);
      context.fill();
    }
  }

  function drawWalls() {
    context.fillStyle = PALETTE.wallFace;
    context.fillRect(0, 0, FIELD.width, WALL);
    context.fillRect(0, FIELD.height - WALL, FIELD.width, WALL);
    context.fillRect(0, 0, WALL, FIELD.height);
    context.fillRect(FIELD.width - WALL, 0, WALL, FIELD.height);
    context.strokeStyle = PALETTE.wallTrim;
    context.lineWidth = 2;
    context.strokeRect(WALL - 1, WALL - 1, FIELD.width - WALL * 2 + 2, FIELD.height - WALL * 2 + 2);
    for (const painting of PAINTINGS) {
      context.fillStyle = painting.hue;
      context.fillRect(painting.x, painting.y, painting.w, painting.h);
      context.strokeStyle = PALETTE.goldDim;
      context.lineWidth = 2;
      context.strokeRect(painting.x, painting.y, painting.w, painting.h);
    }
  }

  function drawObstacles(state) {
    for (const rect of OBSTACLES) {
      if (rect.kind === 'vault') {
        context.fillStyle = '#3d3420';
        context.fillRect(rect.x, rect.y, rect.w, rect.h);
        context.strokeStyle = PALETTE.goldDim;
        context.lineWidth = 2;
        context.strokeRect(rect.x, rect.y, rect.w, rect.h);
        continue;
      }
      if (rect.kind === 'wall') {
        context.fillStyle = PALETTE.wall;
        context.fillRect(rect.x, rect.y, rect.w, rect.h);
        context.strokeStyle = PALETTE.wallTrim;
        context.lineWidth = 1.5;
        context.strokeRect(rect.x, rect.y, rect.w, rect.h);
        continue;
      }
      if (rect.kind === 'pedestal') {
        context.fillStyle = PALETTE.pedestal;
        context.fillRect(rect.x, rect.y, rect.w, rect.h);
        context.fillStyle = PALETTE.pedestalTop;
        context.fillRect(rect.x + 4, rect.y + 4, rect.w - 8, rect.h - 8);
        context.strokeStyle = PALETTE.goldDim;
        context.lineWidth = 2;
        context.strokeRect(rect.x, rect.y, rect.w, rect.h);
        continue;
      }
      if (rect.kind === 'case') {
        context.fillStyle = '#1e2c4a';
        context.fillRect(rect.x, rect.y, rect.w, rect.h);
        context.fillStyle = 'rgba(120, 180, 255, 0.18)';
        context.fillRect(rect.x + 6, rect.y + 6, rect.w - 12, rect.h - 12);
        context.strokeStyle = PALETTE.goldDim;
        context.lineWidth = 2;
        context.strokeRect(rect.x, rect.y, rect.w, rect.h);
        continue;
      }
      // column
      context.fillStyle = PALETTE.pedestal;
      context.beginPath();
      context.arc(rect.x + rect.w / 2, rect.y + rect.h / 2, rect.w / 2, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = PALETTE.goldDim;
      context.lineWidth = 2;
      context.stroke();
    }
    // The vent grate: slats across the gap in the partition wall.
    context.fillStyle = '#0a0d18';
    context.fillRect(240, 330, 24, 60);
    context.strokeStyle = '#5a6480';
    context.lineWidth = 2;
    for (let y = 336; y <= 384; y += 8) {
      context.beginPath();
      context.moveTo(242, y);
      context.lineTo(262, y);
      context.stroke();
    }
    text('VENT', 252, 318, 11, PALETTE.muted, 'center');
  }

  function drawVault(state) {
    const vault = state.vault;
    // The vault door in its gap.
    if (!vault.open) {
      const gradient = context.createLinearGradient(980, 150, 1004, 210);
      gradient.addColorStop(0, '#8a6d1f');
      gradient.addColorStop(0.5, PALETTE.gold);
      gradient.addColorStop(1, '#8a6d1f');
      context.fillStyle = gradient;
      context.fillRect(980, 150, 24, 60);
      context.strokeStyle = '#6b5518';
      context.lineWidth = 2;
      context.strokeRect(980, 150, 24, 60);
      // Sunburst spokes on the door.
      context.strokeStyle = 'rgba(107, 85, 24, 0.8)';
      context.lineWidth = 1.5;
      for (let i = -2; i <= 2; i += 1) {
        context.beginPath();
        context.moveTo(992, 180);
        context.lineTo(992 + Math.cos(i * 0.5) * 26, 180 + Math.sin(i * 0.5) * 26);
        context.stroke();
      }
      context.fillStyle = '#3d2f0a';
      context.beginPath();
      context.arc(992, 180, 7, 0, Math.PI * 2);
      context.fill();
      // Lockpick progress ring.
      if (vault.lockpickProgress > 0) {
        context.strokeStyle = PALETTE.exitGreen;
        context.lineWidth = 4;
        context.beginPath();
        context.arc(992, 180, 16, -Math.PI / 2, -Math.PI / 2 + (vault.lockpickProgress / 3) * Math.PI * 2);
        context.stroke();
      }
    } else {
      // Swung open: the dark passage behind it.
      context.fillStyle = '#05060c';
      context.fillRect(980, 150, 24, 60);
      context.fillStyle = PALETTE.goldDim;
      context.fillRect(976, 148, 6, 64);
    }
    // The Gilded Mask, glowing on its plinth inside the chamber.
    if (!state.mask.taken) {
      const pulse = 0.55 + Math.sin(state.time * 2.4) * 0.15;
      const glow = context.createRadialGradient(state.mask.x, state.mask.y, 4, state.mask.x, state.mask.y, 90);
      glow.addColorStop(0, `rgba(255, 217, 77, ${pulse})`);
      glow.addColorStop(1, 'rgba(255, 217, 77, 0)');
      context.fillStyle = glow;
      context.beginPath();
      context.arc(state.mask.x, state.mask.y, 90, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = PALETTE.maskGlow;
      context.beginPath();
      context.ellipse(state.mask.x, state.mask.y, 20, 14, 0, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#1a1405';
      context.beginPath();
      context.ellipse(state.mask.x - 7, state.mask.y - 2, 4, 2.5, -0.2, 0, Math.PI * 2);
      context.ellipse(state.mask.x + 7, state.mask.y - 2, 4, 2.5, 0.2, 0, Math.PI * 2);
      context.fill();
      text('THE GILDED MASK', state.mask.x, state.mask.y + 34, 13, PALETTE.gold, 'center');
    }
  }

  function drawExit(state) {
    const pulse = 0.6 + Math.sin(state.time * 3) * 0.25;
    const glow = context.createRadialGradient(
      EXIT_ZONE.x + EXIT_ZONE.width / 2, EXIT_ZONE.y + 10, 4,
      EXIT_ZONE.x + EXIT_ZONE.width / 2, EXIT_ZONE.y + 10, 90,
    );
    glow.addColorStop(0, `rgba(61, 220, 132, ${pulse * 0.5})`);
    glow.addColorStop(1, 'rgba(61, 220, 132, 0)');
    context.fillStyle = glow;
    context.beginPath();
    context.arc(EXIT_ZONE.x + EXIT_ZONE.width / 2, EXIT_ZONE.y + 10, 90, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#0d3a22';
    context.fillRect(EXIT_ZONE.x, EXIT_ZONE.y, EXIT_ZONE.width, EXIT_ZONE.height);
    context.strokeStyle = PALETTE.exitGreen;
    context.lineWidth = 2;
    context.strokeRect(EXIT_ZONE.x, EXIT_ZONE.y, EXIT_ZONE.width, EXIT_ZONE.height);
    text('EXIT', EXIT_ZONE.x + EXIT_ZONE.width / 2, EXIT_ZONE.y - 10, 16, PALETTE.exitGreen, 'center');
    text('▼ GETAWAY WINDOW', EXIT_ZONE.x + EXIT_ZONE.width / 2, EXIT_ZONE.y - 28, 11, PALETTE.exitGreen, 'center');
  }

  function drawTrinkets(state) {
    for (const trinket of state.trinkets) {
      if (trinket.taken) continue;
      const sparkle = 0.7 + Math.sin(state.time * 3 + trinket.x) * 0.3;
      context.fillStyle = `rgba(242, 201, 76, ${sparkle})`;
      context.save();
      context.translate(trinket.x, trinket.y);
      context.rotate(Math.PI / 4);
      context.fillRect(-7, -7, 14, 14);
      context.restore();
      context.strokeStyle = PALETTE.goldDim;
      context.lineWidth = 1.5;
      context.beginPath();
      context.moveTo(trinket.x - 12, trinket.y);
      context.lineTo(trinket.x + 12, trinket.y);
      context.moveTo(trinket.x, trinket.y - 12);
      context.lineTo(trinket.x, trinket.y + 12);
      context.stroke();
    }
  }

  function drawSmoke(state) {
    if (state.tools.smokeTimer <= 0) return;
    const gradient = context.createRadialGradient(
      state.tools.smokeX, state.tools.smokeY, 8,
      state.tools.smokeX, state.tools.smokeY, 95,
    );
    gradient.addColorStop(0, 'rgba(200, 205, 220, 0.6)');
    gradient.addColorStop(1, 'rgba(200, 205, 220, 0)');
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(state.tools.smokeX, state.tools.smokeY, 95, 0, Math.PI * 2);
    context.fill();
  }

  function drawGuards(state) {
    for (const guard of state.guards) {
      drawCone(guard.x, guard.y, guard.facing, 215, 0.49, PALETTE.guardCone, PALETTE.guardConeEdge);
    }
    for (const guard of state.guards) {
      context.fillStyle = PALETTE.guardBody;
      context.beginPath();
      context.arc(guard.x, guard.y, 15, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = '#5a6a94';
      context.lineWidth = 2;
      context.stroke();
      // Visor: where the guard is looking.
      context.strokeStyle = '#9fd8ff';
      context.lineWidth = 3;
      context.beginPath();
      context.moveTo(guard.x, guard.y);
      context.lineTo(guard.x + Math.cos(guard.facing) * 15, guard.y + Math.sin(guard.facing) * 15);
      context.stroke();
      if (guard.alerted) text('!', guard.x, guard.y - 22, 20, PALETTE.danger, 'center');
      text(guard.name.toUpperCase(), guard.x, guard.y + 28, 10, PALETTE.muted, 'center');
    }
  }

  function drawCameras(state) {
    for (const camera of state.cameras) {
      if (camera.disabled <= 0) {
        drawCone(camera.x, camera.y, camera.angle, 265, 0.42, PALETTE.cameraCone, PALETTE.cameraConeEdge);
      }
    }
    for (const camera of state.cameras) {
      context.fillStyle = camera.disabled > 0 ? '#3a3f52' : '#5c1a1a';
      context.beginPath();
      context.arc(camera.x, camera.y, 10, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = camera.disabled > 0 ? '#5a6480' : PALETTE.danger;
      context.lineWidth = 2;
      context.stroke();
      context.fillStyle = camera.disabled > 0 ? '#8b93a3' : '#ff7070';
      context.beginPath();
      context.arc(camera.x, camera.y, 3.5, 0, Math.PI * 2);
      context.fill();
      text(camera.name.toUpperCase(), camera.x, camera.y + 24, 10, PALETTE.muted, 'center');
    }
  }

  function drawThief(state) {
    const thief = state.thief;
    const flap = Math.sin(state.time * (thief.moving ? 10 : 3)) * 0.15;
    // The moth cape: two pale wings behind the body.
    context.fillStyle = PALETTE.thiefCape;
    context.save();
    context.translate(thief.x, thief.y);
    context.rotate(thief.facing);
    context.beginPath();
    context.ellipse(-6, -11, 13, 8, -0.5 - flap, 0, Math.PI * 2);
    context.ellipse(-6, 11, 13, 8, 0.5 + flap, 0, Math.PI * 2);
    context.fill();
    context.restore();
    context.fillStyle = PALETTE.thiefBody;
    context.beginPath();
    context.arc(thief.x, thief.y, 12, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = PALETTE.thiefCape;
    context.lineWidth = 2;
    context.stroke();
    context.fillStyle = PALETTE.gold;
    context.beginPath();
    context.arc(thief.x + Math.cos(thief.facing) * 6, thief.y + Math.sin(thief.facing) * 6, 3, 0, Math.PI * 2);
    context.fill();
    text('MOTH', thief.x, thief.y + 28, 10, PALETTE.text, 'center');
    if (thief.lockpicking) text('PICKING…', thief.x, thief.y - 26, 12, PALETTE.exitGreen, 'center');
  }

  function drawVignette() {
    const gradient = context.createRadialGradient(
      FIELD.width / 2, FIELD.height / 2, FIELD.height * 0.35,
      FIELD.width / 2, FIELD.height / 2, FIELD.height * 0.85,
    );
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.5)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
  }

  function drawHud(state) {
    context.fillStyle = 'rgba(8, 10, 22, 0.85)';
    context.fillRect(0, 0, FIELD.width, 58);
    context.strokeStyle = 'rgba(201, 162, 39, 0.5)';
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(0, 58);
    context.lineTo(FIELD.width, 58);
    context.stroke();
    text('MOTH', 18, 24, 22, PALETTE.gold, 'left');
    text(state.objective, 18, 46, 13, PALETTE.muted, 'left');
    // Alarm meter, centre.
    const alarm = state.alarm;
    const barX = 470;
    const barWidth = 300;
    const alarmColor = alarm.value < 40 ? '#3ddc84' : alarm.value < 75 ? PALETTE.gold : PALETTE.danger;
    text('ALARM', barX - 8, 24, 15, alarm.lockdown ? PALETTE.danger : PALETTE.text, 'right');
    context.fillStyle = '#1a1f33';
    context.fillRect(barX, 12, barWidth, 16);
    context.fillStyle = alarmColor;
    context.fillRect(barX, 12, barWidth * (alarm.value / 100), 16);
    context.strokeStyle = alarmColor;
    context.lineWidth = 1.5;
    context.strokeRect(barX, 12, barWidth, 16);
    text(alarmLabel(Math.round(alarm.value)) + '%', barX + barWidth + 10, 26, 16, alarmColor, 'left');
    if (alarm.lockdown) {
      const blink = Math.floor(state.time * 4) % 2 === 0;
      text('LOCKDOWN', barX + barWidth / 2, 48, 14, blink ? PALETTE.danger : '#ff9a9a', 'center');
    } else if (alarm.spotted > 0) {
      text(`SPOTTED by ${alarm.spottedBy}! ${alarm.spotted.toFixed(1)}s`, barX + barWidth / 2, 48, 14, PALETTE.danger, 'center');
    } else {
      text('stay out of the cones', barX + barWidth / 2, 48, 12, PALETTE.muted, 'center');
    }
    // Right: loot, tools, time.
    const minutes = Math.floor(state.elapsed / 60);
    const seconds = Math.floor(state.elapsed % 60);
    text(lootLabel(state.loot), 1262, 24, 18, PALETTE.gold, 'right');
    const toolsText = `EMP ⚡×${state.tools.emp}   SMOKE ✦×${state.tools.smoke}   ${minutes}:${String(seconds).padStart(2, '0')}`;
    text(toolsText, 1262, 46, 13, PALETTE.muted, 'right');
    // The E prompt, bottom centre.
    if (state.prompt) {
      text(state.prompt, FIELD.width / 2, FIELD.height - 34, 16, PALETTE.exitGreen, 'center');
    }
  }

  function drawPanel(title, lines, prompt, titleColor) {
    const height = PANEL.top + lines.length * PANEL.line + PANEL.bottom;
    const x = (FIELD.width - PANEL.width) / 2;
    const y = (FIELD.height - height) / 2;
    context.fillStyle = PALETTE.panel;
    context.fillRect(x, y, PANEL.width, height);
    context.strokeStyle = PALETTE.goldDim;
    context.lineWidth = 2;
    context.strokeRect(x, y, PANEL.width, height);
    context.textBaseline = 'alphabetic';
    text(title, FIELD.width / 2, y + 78, 46, titleColor, 'center');
    for (let index = 0; index < lines.length; index += 1) {
      text(lines[index], FIELD.width / 2, y + PANEL.top + index * PANEL.line, 20, PALETTE.muted, 'center');
    }
    text(prompt, FIELD.width / 2, y + height - 38, 22, PALETTE.gold, 'center');
  }

  const TITLE_LINES = [
    'Steal the Gilded Mask. Slip the guards, blind the cameras,',
    'and slip out the green EXIT window with the prize.',
    '',
    'WASD / arrows — move · Click — walk there · Shift — sneak',
    'E — pick locks & take the Mask · Q — EMP · F — smoke',
    'P — pause · M — mute · R — restart',
  ];
  const PAUSED_LINES = ['The guards are still on their beat.', 'Take a breath. Then slip back in.'];

  /** Paint one frame: the museum, then the HUD or a panel for the screen the game is on. */
  function draw(state, screen, best) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = '#05060c';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    drawFloor(state);
    drawWalls();
    drawObstacles(state);
    drawVault(state);
    drawExit(state);
    drawTrinkets(state);
    drawSmoke(state);
    drawCameras(state);
    drawGuards(state);
    drawThief(state);
    drawVignette();
    drawHud(state);
    if (screen === SCREEN_TITLE) {
      drawPanel('MOTH', TITLE_LINES, 'Press Space or click to begin', PALETTE.gold);
      return;
    }
    if (screen === SCREEN_PAUSED) {
      drawPanel('Paused', PAUSED_LINES, 'Press P to resume', PALETTE.text);
      return;
    }
    if (screen === SCREEN_CAUGHT) {
      const lines = [state.caught || 'Caught in the gallery.', '', 'The Mask is still waiting.'];
      drawPanel('CAUGHT', lines, 'Press R to try again', PALETTE.danger);
      return;
    }
    if (screen === SCREEN_WIN) {
      const lines = [
        `Loot  $${state.loot}`,
        `Getaway bonus  +$500`,
        `Alarm penalty  −$${Math.floor(state.alarm.value) * 2}`,
        `Time penalty  −$${Math.floor(state.elapsed) * 2}`,
        '',
        scoreLabel(state.score),
        bestLabel(best),
      ];
      drawPanel('CLEAN GETAWAY', lines, 'Press R to run it again', PALETTE.gold);
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw };
}
