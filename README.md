[![make.fun · best-heist-game-20261122-0559](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/Creepzone11/best-heist-game-20261122-0559/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/Creepzone11/best-heist-game-20261122-0559/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)

# MOTH — The Gilded Mask Heist

An entry for the make.fun bounty [Make the best heist game](https://make.fun/bounty/best-heist-game-20261122-0559).

You are Moth, a cat-burglar in a neon-noir museum after the Gilded Mask. Three
guards walk the gallery with sweeping vision cones, two cameras sweep the vault
approach in red, and every second you are seen the alarm meter climbs. Pick the
vault lock, take the Mask, grab what loose loot you can — and slip out the green
EXIT window before the lockdown finds you.

## The heist

- **Three routes**: the open gallery floor, the colonnade behind the pedestals,
  or the vent lane down the left wall.
- **Tools, at a cost**: EMP (Q) kills the cameras for 6 seconds but jumps the
  alarm; smoke (F) hides you for 4 seconds. Two charges each.
- **A fair caught moment**: being seen starts a "SPOTTED!" grace — break line of
  sight before it runs out, or you are caught. At full alarm the museum locks
  down and the guards hunt you for 12 seconds.
- **Score**: loot + $500 getaway bonus − $2 per alarm point − $2 per second.

## Controls

| Key | Action |
| --- | --- |
| WASD / arrows | Move |
| Click | Walk to that spot |
| Shift | Sneak (slower, quieter) |
| E (hold) | Pick the vault lock |
| E | Take the Gilded Mask |
| Q | EMP pulse (cameras off 6s, +8 alarm) |
| F | Smoke pellet (hidden 4s) |
| P / Esc | Pause |
| M | Mute |
| R | Restart |

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no dependencies, no network requests — every file the game loads
lives under `game/`, and all sound is synthesized in the browser with WebAudio.

## Layout

- `game/` — the game: `index.html` and `src/` (one clear job per file:
  `heist.js` rules, `museum.js` the room, `thief.js`, `guards.js`,
  `cameras.js`, `loot.js`, `alarm.js`, `render.js`, `audio.js`, `input.js`,
  `shots.js` the screenshot scenes).
- `main.ts` — hands the game in: copies `game/` and `screenshots/` to `/output`
  and writes `/output/dossier.json`.
- `screenshots/` — 3 screenshots taken from the game itself in headless Chrome.
- `serve.ts` — a tiny local static server for development.
