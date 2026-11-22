// Boot and the one loop: input is read every frame, the heist advances in fixed 1/60 s
// steps (several in a slow frame, none in a fast one), and the renderer paints what is
// there. The game moves between five screens: title, play, paused, caught and win.
//
// ?seed=N fixes the museum's decoration. ?shot=start|play|end (with &seed=N) stages
// that scene instead of running the loop, paints it twice and sets window.__shotReady
// for a screenshot.
import { BEST_KEY, STEP } from './config.js';
import { createAudio } from './audio.js';
import {
  createHeist,
  EVENT_CAUGHT,
  EVENT_EMP,
  EVENT_LOCKDOWN,
  EVENT_MASK,
  EVENT_PICKUP,
  EVENT_SMOKE,
  EVENT_SPOTTED,
  EVENT_VAULT_OPEN,
  EVENT_WIN,
} from './heist.js';
import {
  ACTION_CONFIRM,
  ACTION_EMP,
  ACTION_MUTE,
  ACTION_PAUSE,
  ACTION_RESTART,
  ACTION_SMOKE,
  createInput,
} from './input.js';
import {
  createRenderer,
  SCREEN_CAUGHT,
  SCREEN_PAUSED,
  SCREEN_PLAY,
  SCREEN_TITLE,
  SCREEN_WIN,
} from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const heist = createHeist(seed);
const renderer = createRenderer(canvas);

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, heist);
  let painted = 0;
  function paint() {
    renderer.draw(heist.state, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  const audio = createAudio();
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();

  // Screen readers (and anyone watching the page's text) hear the screen changes and each event.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    heist.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce('Playing. Steal the Gilded Mask and reach the green EXIT.');
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) audio.setMuted(!audio.isMuted());
    if (actions & ACTION_RESTART && screen !== SCREEN_TITLE) startGame();
    else if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_CAUGHT || screen === SCREEN_WIN)) startGame();
    else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
    return actions;
  }

  function step(actions) {
    const thief = heist.state.thief;
    if (screen === SCREEN_TITLE) {
      heist.step(STEP, { vector: null, sneak: false, interact: false, emp: false, smoke: false }, true);
      return;
    }
    const click = input.takeClickTarget();
    if (click) thief.target = click;
    const controls = {
      vector: input.keyVector(),
      sneak: input.sneaking(),
      interact: input.interactHeld(),
      emp: Boolean(actions & ACTION_EMP),
      smoke: Boolean(actions & ACTION_SMOKE),
    };
    const events = heist.step(STEP, controls, false);
    if (thief.moving && thief.stepTimer <= 0) {
      audio.step();
      thief.stepTimer = controls.sneak ? 0.55 : 0.38;
    }
    if (events & EVENT_PICKUP) audio.pickup();
    if (events & EVENT_MASK) audio.mask();
    if (events & EVENT_VAULT_OPEN) audio.vaultOpen();
    if (events & EVENT_EMP) audio.emp();
    if (events & EVENT_SMOKE) audio.smoke();
    if (events & EVENT_SPOTTED) {
      audio.spotted();
      announce(`Spotted by ${heist.state.alarm.spottedBy}! Break line of sight!`);
    }
    if (events & EVENT_LOCKDOWN) announce('Lockdown! The guards are hunting you!');
    if (events & EVENT_CAUGHT) {
      audio.caught();
      screen = SCREEN_CAUGHT;
      announce(`Caught. ${heist.state.caught}.`);
    }
    if (events & EVENT_WIN) {
      audio.win();
      screen = SCREEN_WIN;
      if (heist.state.score > best) {
        best = heist.state.score;
        saveBest(best);
      }
      announce(`Clean getaway! Score $${heist.state.score}.`);
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    let actions = handleActions();
    audio.alarmTick(now / 1000, heist.state.alarm.value);
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step(actions);
        accumulator -= STEP;
        actions = 0; // one-shot presses apply to the first substep only
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(heist.state, screen, best);
  }

  // Leaving the tab pauses a running game rather than letting the guards hunt unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });
  canvas.addEventListener('pointerdown', () => audio.unlock());
  window.addEventListener('keydown', () => audio.unlock());

  announce('MOTH: The Gilded Mask Heist. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
