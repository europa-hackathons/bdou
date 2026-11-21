# 🍣 BDOU – Disco Sushi Train

*Sushi disco conveyor belts of destiny.*

🏫 **Made for the Europaskolan PYP4 Hackathon.**

**Catch the disco sushi before it rolls away!** BDOU is a kawaii, arcade-style webcam game for kids. Kawaii sushi characters dance past on a disco conveyor belt. Players stand in front of the camera, reach up to grab a sushi with their hand, and drop it into the matching takeout box before it rolls away. For one or two players, in English or Swedish, right in the browser.

▶️ **Play it now: https://europa-hackathons.github.io/bdou/**

---

## Contents

- [How to play](#how-to-play)
- [Setting up the room](#setting-up-the-room)
- [Features](#features)
- [Settings](#settings)
- [Camera and privacy](#camera-and-privacy)
- [Troubleshooting](#troubleshooting)
- [Development](#development)
- [Debugging tracking with recorded clips](#debugging-tracking-with-recorded-clips)
- [Deployment](#deployment)
- [Credits](#credits)

---

## How to play

1. Open the game in **Chrome** (or Edge) on a laptop or computer with a webcam.
2. The first time, tap **📷 Allow the camera so the sushi can see you!** and click **Allow**. Chrome remembers this for next time.
3. Press **1 PLAYER** or **2 PLAYERS**. An anime-style intro plays: a sushi chef transformation for one player, a lightning face-off for two.
4. Stand **about 2 m** from the camera and **raise your hands** until the game says *"I can see you!"*.
5. After the 3-2-1 countdown:
   - **👋 Touch** a sushi on the belt with your hand to grab it.
   - **🍣 Carry** it down below the belt.
   - **📦 Hold** your hand over the box with the **same picture** for a moment. The box glows, then the sushi drops in.
6. Sort as many as you can before the timer runs out (60 seconds by default), then enter your initials for the **top-5 leaderboard**.

### Scoring

| What happens | Points |
|---|---|
| Sushi in the right box | 10, plus a combo bonus for each correct one in a row |
| Sushi in the wrong box | −5, and the combo resets |
| Sushi rolls off the belt | No points, and the combo resets |
| 👑 **Mega sushi** in the right box | 100 or more |

**👑 Mega sushi:** grab two of the **same** sushi, one in each hand, and bring your hands together. They merge into one giant crowned mega sushi worth about ten times as much.

**Two players:** each player gets their own half of the screen, with their own belt, boxes and score. Stand on your own side, an arm's length or more apart.

**No camera?** The game also works with a mouse or a touchscreen: touch a sushi, then drag it down into its box.

---

## Setting up the room

The camera tracking works best when:

- players stand **about 2 m** from the camera, with their upper body and raised hands in view;
- the room is **lit from the front**, not by a bright window behind the players;
- the camera is at about **chest height**;
- in 2P, each child stands clearly on **their own side**.

Use the **calibration screen** (shown before the first game) to check: green dots show what the tracker sees. If hands don't reach the edges, or the picture is too wide, adjust **Camera zoom** in Settings.

---

## Features

- **Webcam body tracking** built for kids at a distance, with no controllers. Hands keep stable identities, stay on their player's side, and are filtered against jitter and "phantom" detections.
- **1 or 2 players**, each with their own lane, boxes and score, plus a winner banner.
- **Anime intros:** a magical-girl style *sushi chef transformation* for 1P, and a *lightning split-screen face-off* with two random characters (Maki-chan, Sashimi-kun, Avo-san, Tamago-chan, Onigiri-kun) for 2P.
- **Mega sushi:** two hands, two matching sushi, one giant crowned bonus.
- **Disco music** made live in the browser with the Web Audio API, with no audio files. It starts on the start page, dips under the intros and speeds up with the belt.
- **Arcade feel:** combos, comic popups ("YUM!", "SUPER!"), particles, screen shake and sound effects.
- **Gentle difficulty:** Easy (default), Normal or Hard, with the belt speeding up during each round.
- **Top-5 leaderboard** with 3-letter initials, saved in the browser.
- **English / Swedish**, switchable at any time from the top bar.
- **One self-contained `index.html`.** It works on GitHub Pages or opened locally in Chrome.

---

## Settings

Open ⚙️ **Settings** from the top bar or the start page.

| Setting | What it does | Default |
|---|---|---|
| Game time | Round length: 30 / 45 / 60 / 90 s | 60 s |
| Difficulty | Belt speed and how many sushi arrive | Easy |
| Mega sushi | Allow merging two matching sushi | On |
| Volume | Sound effects and music | 60 % |
| Music | Disco music on or off (effects stay on) | On |
| Use camera | Off = mouse / touch only | On |
| Tracking | *Body*, best at 2 m; *Hands*, for close-up play | Body |
| Camera zoom | How much of the room the play area covers | 1.5× |
| Show camera behind game | Players can see themselves behind the belt | On |

Settings and high scores are saved in the browser (`localStorage`) on that computer only.

---

## Camera and privacy

- **The video never leaves the computer.** All tracking runs inside the browser, and nothing is recorded or uploaded.
- When the game first starts, it downloads the tracking library and model from public CDNs (jsDelivr and Google), and the font from Google Fonts. These downloads contain no camera data.
- Browsers always ask for camera permission once per site, and the game cannot skip this. After you click **Allow**, Chrome remembers it. On later visits the camera and tracking warm up on the start page, so play starts instantly.
- The only thing saved is your settings and the top-5 initials and scores, in this browser's local storage.

---

## Troubleshooting

| Problem | Try this |
|---|---|
| "Camera blocked – tap for help" | Click the camera or 🔒 icon at the left of the address bar, set **Camera → Allow**, then reload. |
| "No camera found" | Plug in or enable a webcam, or play with mouse / touch. |
| The camera doesn't work when opening `index.html` as a file | Use the live link, or a local server (see [Development](#development)). Cameras need `https://` or `localhost`. |
| Hands aren't detected | Step back to about 2 m, raise your hands, add light from the front, and check the calibration screen. |
| Hands jump around or appear where nobody is | Avoid busy backgrounds and people walking behind the players. Press **D** to see what the tracker rejects and why. |
| Hard to reach the edges | Lower **Camera zoom** in Settings. |
| No music | Browsers only allow sound after a tap, click or key press. Tap **🎵 Tap for disco music!**, and check the **Music** setting and the 🔊 button. |
| Slow on an older laptop | The game switches heavy effects off by itself. You can also turn off **Show camera behind game**. |

---

## Development

You need **Node.js 18+** (for the build script and tests; there are no npm dependencies) and any static web server, for example Python's.

```bash
git clone git@github.com:europa-hackathons/bdou.git
cd bdou
npm test          # run the unit tests
npm run build     # build src/ into index.html (single file) and dev.html
python3 -m http.server 8765
```

Then open:
- **http://localhost:8765/dev.html** for development. It loads the `src/` modules directly, so you just refresh after an edit, with no build step.
- **http://localhost:8765/index.html** for the built single-file game, exactly as published.

> `index.html` and `dev.html` are **generated**. Edit `src/`, then run `npm run build` before committing.

### Project layout

```
src/
  config.js          every tunable number: layout, speeds, scoring, tracking filters, grab/drop rules
  game.js            pure, deterministic game rules: step(dt, hands) -> events (no DOM)
  input.js           tracking / mouse / touch -> stable "hand points" (players, filtering, glitch rejection)
  tracker.js         MediaPipe body / hand tracking, one detection per camera frame
  camera.js          webcam, clip playback and clip recording
  render.js          canvas drawing: belt, takeout boxes, sushi, HUD, effects, intros
  intro.js           1P / 2P intro timelines and sound cues
  audio.js           Web Audio sound effects and the disco music sequencer
  ui.js              menus, settings, calibration panel, game over, initials, leaderboard
  debug.js           debug overlay and clip tools
  i18n.js            English / Swedish text
  storage.js         settings and high scores (localStorage)
  sprites.js         kawaii characters as inline SVG
  main.js            wires everything together; fixed-timestep main loop
  index.template.html  page markup and styles
tests/               unit tests (node --test), no browser needed
build.mjs            inlines src/ into one index.html (and makes dev.html)
SPEC.md              design spec: rules, input contract, acceptance criteria, backlog
```

### How it fits together

```
camera ─► tracker ─► input ─► game ─► render / audio / ui
 (webcam    (MediaPipe   (stable hand   (rules,      (canvas, sound,
  or clip)   landmarks)   points)        events)      DOM screens)
```

- `game.js` and `input.js` are **pure**: given the same inputs (and random seed) they always give the same result, which is why they can be unit tested in Node.
- The game runs on a **fixed 60 Hz timestep**, so a slow computer never changes the pace.
- Tracking runs on its own loop, once per camera frame, independent of drawing.
- **Tuning:** gameplay and tracking numbers (reach, drop line, smoothing, speeds, scoring) all live in `src/config.js`.

### Tests

`npm test` runs the unit tests for game rules, the input contract, mega sushi, the intros and the leaderboard. They cover scoring and combos, determinism, the drop rules (including diagonal moves), player assignment, phantom-hand filtering, glitch rejection, jitter and leaderboard ranking.

See [SPEC.md](SPEC.md) for the full design, the acceptance criteria and the feature backlog.

---

## Debugging tracking with recorded clips

Press **D** during the game to open the debug overlay and panel. It shows:

- every body point the tracker returned, and each accepted hand with its id (`P1-L`, `P2-R`, …);
- each rejected wrist and the reason: *resting*, *low confidence*, *outside picture*, *weak person*;
- the grab reach around each sushi and the drop line;
- the source, tracker type, and detection and render frame rates.

The panel can also:

- **⏺ Record clip (20 s):** save a webcam clip to your Downloads folder;
- **📂 Load clip:** replay a recorded clip through the real tracker, instead of the live camera;
- **⬇ Export landmarks (JSON):** save the tracker's raw output, to turn real sessions into test cases.

Recording a few short clips of real kids playing (1P, 2P, bad lighting, someone walking past) is the best way to find and fix tracking problems.

---

## Deployment

The game is published with **GitHub Pages** from the `main` branch at https://europa-hackathons.github.io/bdou/. Anything merged into `main` goes live within a minute or two.

Workflow:

1. Create a branch, make changes in `src/`, and run `npm test` and `npm run build`.
2. Commit, including the rebuilt `index.html`, and push the branch.
3. Open a pull request into `main`, then merge it to publish.

---

## Credits

- Created for the **Europaskolan PYP4 Hackathon**.
- Body and hand tracking: [MediaPipe Tasks Vision](https://developers.google.com/mediapipe) by Google.
- Font: [Fredoka](https://fonts.google.com/specimen/Fredoka) via Google Fonts.
- All characters, graphics, music and sound effects are made in code (SVG, Canvas and the Web Audio API).

## License

**© 2026 the BDOU creators. All rights reserved.** See [LICENSE](LICENSE).

- ✅ Anyone may **play** the game for personal, family, classroom and other non-commercial use.
- 🚫 Without written permission from the creators, you may not copy, modify, redistribute, sell or build on the game, its code, characters, music, artwork or the name "BDOU".

The source code is visible on GitHub so people can see how it works, but that gives no right to reuse it. To ask for permission, open an issue on this repository. Third-party parts keep their own licenses: MediaPipe (Apache 2.0) and the Fredoka font (SIL OFL 1.1).
