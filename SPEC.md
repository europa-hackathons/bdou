# BDOU — Rebuild Spec (v1)

Status: **v1 built** (branch `rebuild-v1`) · Prototype for reference: git tag `v0-prototype`

---

## 1. Why we are rebuilding

The prototype proved the idea is fun, but it was grown feature-by-feature in one file. Camera tracking, grabbing, hazards, boba, mega sushi and belt reversal all share the same pointer code, so every fix creates new glitches. It was also only ever tested with simulated hands.

This rebuild has three rules:

1. **Small core first.** Ship a reliable, fun v1. Extras come back one at a time, only after the core feels solid with real kids.
2. **Input is a separate, tested contract.** The game never touches raw camera data. It only sees clean, stable "hand points".
3. **Test with real footage.** Recorded webcam clips are replayed through the real tracker, so tracking bugs can be reproduced and fixed without guessing.

---

## 2. Audience and setting

- Kids aged roughly 4–10, one or two players at a time.
- Played on a laptop or TV with a webcam. Players stand **about 2 m** from the camera.
- Parents set it up. Kids should never need the mouse during play.

---

## 3. Platform and delivery

| Requirement | Decision |
|---|---|
| Hosting | GitHub Pages (static). Also opens locally in Chrome. |
| Deliverable | One self-contained `index.html`, built from small source modules (see §9). |
| Browser | Current desktop Chrome / Edge. Safari and Firefox: best effort. |
| Camera | `getUserMedia` (needs HTTPS or `localhost`). |
| Tracking library | MediaPipe Tasks Vision, **pinned version**, loaded from CDN. |
| No camera | Mouse / touch fallback, same game rules. |
| Storage | `localStorage` only: settings and top-5 high scores. Nothing leaves the device. |

---

## 4. Scope

### In v1

- One conveyor belt per player, carrying three kawaii sushi: **Maki, Sashimi, Avocado roll**.
- Three **takeout boxes** per player, one per sushi type.
- **Touch to grab**, carry, move below the belt to drop into the box under your hand.
- **1P and 2P.** In 2P each player has their own framed half of the screen.
- **60 s default** game time (settings: 30 / 45 / 60 / 90 s).
- Gentle **speed ramp** over the game. Difficulty: Easy (default) / Normal / Hard.
- Scoring with **combos**, comic popups ("YUM!", "COMBO!", "SUPER!"), particles, light screen shake.
- Sound: oscillator effects and a simple disco beat (Web Audio). Mute and volume controls.
- **Calibration screen** ("Can I see you?") before the first game of a session.
- **Game over:** stats, 3-letter initials (on-screen buttons, keyboard, touch), **top-5 leaderboard**.
- **English / Swedish** toggle.
- Fullscreen button, keeps the screen awake while playing.
- **Anime intros** after pressing 1P / 2P (§6.1).
- **Debug overlay** and **clip recorder / replayer** (§10).

### Not in v1 (backlog, §12)

Boba bin, wasabi, rice piles, mega sushi, belt reversal, escalating red glow, calm mode.

---

## 5. Game rules

### 5.1 Core loop

1. Sushi enter the belt from the right and move left.
2. A player touches a sushi with a hand: it is **grabbed** and follows that hand.
3. The player moves the hand **below the drop line** (just under the belt). The sushi goes into the box whose column the hand is in.
   - **Right box:** points, combo +1.
   - **Wrong box:** small penalty, combo reset, "OOPS!".
4. A sushi that leaves the belt unclaimed is a **miss**. The combo resets but no points are lost.

### 5.2 Scoring

| Event | Points |
|---|---|
| Correct box | 10 + 2 × min(combo − 1, 15) |
| Wrong box | −5 (score never below 0) |
| Miss | 0, combo resets |

Combo popups appear at 3, 5, 8, 12, 16 and 20.

### 5.3 Pace

| Difficulty | Start speed | Ramp | Max speed | Spawn spacing |
|---|---|---|---|---|
| Easy (default) | 110 px/s | +6 % every 4 s | 260 px/s | wide |
| Normal | 150 px/s | +7 % every 4 s | 340 px/s | medium |
| Hard | 180 px/s | +8 % every 4 s | 420 px/s | tight |

All numbers live in one `CONFIG` object (§9) so they are easy to tune.

### 5.4 End of game

When the timer reaches 0:00: arcade "GAME OVER", per-player stats (sorted, best combo, accuracy), then initials entry if the score makes the top 5, then the leaderboard. In 2P a winner (or tie) banner is shown.

---

## 6. Screens and flow

```
Menu ──► (first time) Calibration ──► Countdown 3-2-1 ──► Play ──► Game Over ──► Initials? ──► Leaderboard
  ▲                                                                                             │
  └──────────────────────────────── Menu / Play again ◄─────────────────────────────────────────┘
```

| Screen | Controlled by | Notes |
|---|---|---|
| Menu | Mouse / touch / keyboard | Title, a big clear tagline, compact 1P and 2P buttons, a three-step hint, High Scores, Settings. Clean, no clutter behind it. |
| Camera permission | Start page | Browsers always need the player to allow the camera once (Chrome then remembers it per site). If it is already allowed, the camera and body tracking start in the background on the start page, so play starts instantly. If not, a pulsing "📷 Allow the camera…" button asks up front; if blocked, "Camera blocked – tap for help" explains how to unblock it. Unblocking in Chrome is picked up automatically. |
| Settings | Mouse / touch / keyboard | Game time, difficulty, volume, camera on/off, camera zoom, show camera behind game. |
| Calibration | Camera | Live mirrored video plus tracked body points. One chip per player turns green when seen. Auto-continues once every player has been seen for 1 s, or press Start. |
| Countdown | — | 3-2-1-GO with a short animated "touch, carry, drop" demo. |
| Play | Camera (or mouse / touch) | Score, timer, combo, per-player "seen" dot. |
| Game over, initials, leaderboard | Mouse / touch / keyboard | **Camera input is ignored on all menus.** |

Language toggle (EN / SV) is in the top bar and changes all text immediately.

### 6.1 Intros (added v1.1)

Pressing 1P or 2P plays a short anime-style intro before calibration / countdown. The camera and body tracking load in the background meanwhile; if they are not ready when the intro ends, the loading screen shows until they are. Any key or tap skips the intro (ignored for the first 0.4 s so the button press itself doesn't skip it). Esc returns to the menu.

| Mode | Length | What happens |
|---|---|---|
| 1P | 5.2 s | Kawaii sushi chef **transformation** (magical-girl style): a random character floats up, spins inside a magic circle with orbiting ribbons, then gets a chef hat, a polka-dot bandana and chopsticks, each with a sparkle burst; anime speed lines, "SUSHI CHEF, TRANSFORM!", "READY!". |
| 2P | 4.8 s | **Lightning split screen**: a thunder flash splits the screen along a jagged seam, both halves slide in with fast streaks in each player's colour, two different random characters slide in and face each other, name plates, a "VS" slam, "GET READY…", "LET'S SORT!". |

Characters: Maki-chan, Sashimi-kun, Avo-san, Tamago-chan, Onigiri-kun (`ROSTER` in `config.js`). Timelines and sound cues are in `intro.js`, drawing in `render.js`.

**Animation style (Settings, v1.2, beta):** *Kawaii* (default) is the style above. *Anime* swaps in a more detailed, cinematic look with cute, sparkly shōjo-style eyes (big bright irises, star highlights, soft brows, open smiles, pink blush; never angry or scary). It has its own **1P transformation** (5.8 s): a sparkling eye opens, a glowing silhouette spins in a column of light with ribbons, the chef outfit lands piece by piece, then the character bursts into colour for a hero pose with 変身, "SUSHI CHEF, TRANSFORM!" and "READY!". It also has its own **2P face-off** (5.8 s):

1. Extreme close-ups of both fighters' sparkly eyes opening, one above the other, with lightning between.
2. A black-and-white impact frame with silhouettes, manga speed lines and ドン!.
3. A split-screen face-off with a slow camera push-in: cel-shaded characters (ink outline, hard shadow, rim light, sparkly anime eyes, happy faces), flame auras, screentone, sakura petals, and brush name plates with the Japanese names (巻きちゃん, 刺身くん, アボさん, たまごちゃん, おにぎりくん).
4. A VS slam over a faint 対.
5. ゴゴゴ rising up the sides, then "LET'S SORT!".

In-game moments (combo cut-ins, manga sound effects) are possible next steps if the style is kept. Code: `anime.js`; shared drawing helpers: `draw.js`.

---

## 7. Input model (the contract)

This is the heart of the rebuild. The game receives, every frame, a list of **hand points**:

```
HandPoint { id, player (0|1), x, y (play-area px), active (bool) }
```

Only `active` hand points can grab. Everything below is the input layer's job, not the game's.

### 7.1 Sources

| Source | When |
|---|---|
| Body tracking (MediaPipe **Pose**, default) | Camera on. Each player gives at most two hand points (left and right). |
| Hand tracking (MediaPipe **Hands**) | Optional setting, for close-up play. |
| Mouse | Camera off, or for testing. Counts only while it is moving. |
| Touch | Each finger is a hand point while it touches the screen. |

### 7.2 Who is a player

- A detected body counts as a person only if **both shoulders** are clearly visible and the shoulders are a realistic distance apart.
- **2P:** people are ordered by shoulder centre. The left person on screen is P1, the right is P2. A single person counts for the half they stand in.
- **1P:** only the person nearest the centre plays. Bystanders are ignored.
- Each player's hands are **locked to that player's half**. A hand reaching across the middle stops at the edge of its own half.

### 7.3 When a hand counts

A wrist becomes a hand point only if **all** of these hold:

- it is detected with enough confidence;
- it is inside the camera picture and inside the zoomed play area (never pinned to the screen edge);
- it is **raised**: above the player's hip (a resting arm by the side does not count);
- it has been seen for **3 frames in a row** (one-frame blips never appear).

The hand point sits a little past the wrist, towards the fingers.

### 7.4 Stability

- **Identity:** each hand point has a fixed id per player and side (`P1-left`, `P1-right`, …). Hands never swap between players.
- **Smoothing:** a One Euro filter. Heavy smoothing when the hand is still, little lag when it moves fast.
- **Glitch rejection:** a jump larger than a threshold is ignored unless it repeats for 3 frames.
- **Loss:** if a hand disappears, its point stays (shown faded) for a short grace period, then is removed.

### 7.5 Tunables (all in `CONFIG.input`)

| Name | Default | Meaning |
|---|---|---|
| `minWristVisibility` | 0.5 | Wrist confidence needed |
| `minShoulderVisibility` | 0.6 | Shoulder confidence for a "real" person |
| `minShoulderWidth` | 0.035 | Shoulder distance (fraction of frame) for a "real" person |
| `confirmFrames` | 3 | Frames in a row before a hand appears |
| `jumpRejectPx` | 260 | Bigger jumps are treated as glitches… |
| `jumpConfirmFrames` | 3 | …unless they repeat this many frames |
| `oneEuro` | minCutoff 1.2, beta 0.004, dCutoff 1.0 | Smoothing |
| `lossGraceMs` | 600 (1000 while holding) | How long a lost hand lingers |
| `zoom` | 1.5 | How much the camera view is zoomed (setting) |
| `detectWidth` | 640 (1P) / 960 (2P) | Image width given to the tracker |

---

## 8. Interaction rules

| Rule | Default |
|---|---|
| **Grab:** a hand point within reach of a sushi on its own player's belt grabs it. One sushi per hand. | Reach = 1.9 × sushi radius (camera), 1.35 × (mouse / touch) |
| **Lag compensation:** also test where the sushi was a moment ago. | 180 ms (camera only) |
| **Carry:** the sushi follows the hand smoothly. | — |
| **Drop:** hand below the drop line and kept over the **same box** for a short moment (that box glows and a ring fills). A diagonal move therefore drops into the box the hand ends over, not the first one it passes. | Drop line = belt bottom + 90 px; dwell 220 ms; min hold 250 ms |
| **Lost hand while carrying:** the sushi floats in place with a countdown ring and can be grabbed again, then returns to the belt. | 1.5 s |
| **Menus:** camera input is ignored. | — |

All in `CONFIG.interaction`.

---

## 9. Architecture

### 9.1 Source layout

```
src/
  config.js      all tunables (§5, §7, §8) in one place
  i18n.js        EN / SV strings
  camera.js      getUserMedia, video element, clip replay source
  tracker.js     MediaPipe setup, runs once per video frame, emits raw landmarks
  input.js       raw landmarks -> HandPoints (§7): players, validity, filters, mouse / touch
  game.js        pure game state + step(dt, handPoints, rng) -> events  (no DOM, no canvas)
  render.js      draws a game state to the canvas
  audio.js       Web Audio effects and beat
  ui.js          menus, settings, calibration, game over, leaderboard (DOM)
  storage.js     settings and high scores in localStorage
  debug.js       overlay, clip recorder / replayer
  main.js        wires everything together, main loop
build.mjs        inlines src/ + styles into one index.html (no dependencies)
tests/           node --test unit tests for game.js and input.js
```

### 9.2 Principles

- **One-way data flow:** camera → tracker → input → game → render / audio / UI.
- `game.js` and `input.js` are **pure and deterministic.** Same inputs and random seed give the same result, so they can be unit tested in Node.
- **Fixed-timestep simulation** (60 Hz). Slow rendering never changes game speed.
- Tracking runs on its own loop, one run per camera frame, never blocked by rendering.
- Rendering adapts: if the frame rate drops, effects are reduced automatically.

---

## 10. Debugging and testing

### 10.1 Debug overlay (key `D`)

Shows tracker FPS and render FPS, body skeletons, raw and filtered hand points, ids and players, why a wrist was rejected (low confidence, off-screen, resting, unconfirmed), grab reach circles and the drop line.

### 10.2 Clip recorder and replayer

- **Record:** in debug mode, a "Record clip" button saves 20 s of webcam video as a `.webm` file on your computer.
- **Replay:** "Load clip" plays a recorded file through the exact same tracker → input → game pipeline, with the overlay. It can also export the hand-point timeline as JSON.
- Clips stay on your computer unless you choose to share them.

### 10.3 Test clips to record (about 20 s each)

1. 1P, good lighting, normal play.
2. 2P, normal play, players well apart.
3. 2P, players close together and reaching towards the middle.
4. 1P with someone walking behind.
5. Backlit room (window behind the players).
6. Kid resting arms down, then raising them.

### 10.4 Automated tests

- `game.js`: scoring, combos, misses, drop box choice, timer, speed ramp, leaderboard ranking.
- `input.js`: fed recorded landmark timelines (JSON exported from clips). Checks player assignment, no identity swaps, confirmation, glitch rejection, resting-arm filter.

---

## 11. Acceptance criteria for v1

Measured on the recorded clips (§10.3) and in a live test with kids:

| # | Criterion | Target |
|---|---|---|
| A1 | A raised hand appears after being raised | within 0.3 s |
| A2 | Hand points never swap between players | 0 swaps in all clips |
| A3 | Phantom hand points (no real raised hand there) | 0 lasting longer than 0.2 s |
| A4 | Jitter of a still, raised hand | under 10 px |
| A5 | A kid grabs a sushi on the first try (Easy, start speed) | at least 9 out of 10 |
| A6 | A carried sushi is lost because tracking dropped | at most 1 in 20 |
| A7 | Game speed with slow rendering | identical (fixed timestep) |
| A8 | Leaderboard survives reload; initials work with buttons, keyboard and touch | yes |
| A9 | All text switches between EN and SV | yes |
| A10 | Runs from GitHub Pages and from a local file in Chrome | yes |

---

## 12. Backlog (after v1, in suggested order)

Each item comes back only if the core meets §11, and each gets its own small spec before it is built.

1. **Boba tea bonus:** coloured teas delivered to a bin that appears just before the tea.
2. **Wasabi hazard:** touching it costs points; a kawaii cat shakes its head in pain.
3. **Escalation:** gentle red glow and faster music as time runs out.
4. ~~**Belt reversal**~~ → added in v1.3, see §12.2.
5. **Rice piles** (sticky hand).
6. ~~**Mega sushi**~~ → added in v1.1, see §12.1.
7. Calm mode, colour-blind shapes on the boxes, offline (self-hosted) tracking files.

### 12.1 Mega sushi (v1.1)

Pulled forward on request, ahead of the backlog order. It is on by default and can be switched off in Settings ("Mega sushi").

**Why it is feasible now:** with body tracking, a player's two hand points are that person's own left and right wrists. They keep separate, fixed ids even when the hands touch. The prototype matched hands by distance, which is where merging used to break.

**Rules**

| Rule | Detail |
|---|---|
| Merge | One player holds two sushi of the **same type**, one in each hand, and brings them together. When the two sushi are closer than the merge distance, they become one **mega sushi**: bigger, glowing, with a crown. |
| Who holds it | The hand that held the first of the two sushi. The other hand is free again straight away. |
| Hint | While one player holds two matching sushi, a glowing dashed line joins them. "MERGE!" appears when they are close. |
| Scoring | Correct box: 100 + 4 × min(combo − 1, 15), counts as 2 sorted, combo +1. Wrong box: −15, combo resets. |
| Dropping | Same drop rules as a normal sushi (drop line, dwell over one box). |
| Never lost | If the holding hand disappears, the mega sushi floats for 4 s and can be grabbed by any hand of that player. If nobody takes it, it delivers itself into its own box and scores. A merged mega sushi is never lost to the belt. |
| Limits | No merging across players, no merging different types, no merging a mega sushi again. Mouse play cannot merge (one pointer); two-finger touch can. |
| Tip | Once per game, about 6 s in: "TIP: two hands + two of the same sushi = MEGA SUSHI!" |

**Tunables (`CONFIG.mega`):** `mergeDist` 2.2 × sushi radius, `scale` 1.7, `base` 100, `comboStep` 4, `wrong` 15, `floatMs` 4000, `tipAt` 6 s.

**Acceptance:** A11 – a player holding two matching sushi who brings their hands together gets a mega sushi every time in the recorded clips, and never merges with the other player's sushi.

### 12.2 Belt reversal (v1.3)

The belt sometimes changes direction, to keep rounds exciting. It is on by default and can be switched off in Settings ("Belt reversals").

| Rule | Detail |
|---|---|
| Warning | 1.6 s before a flip: "⇄ REVERSE!", three beeps, and the belt edges flash red. |
| The flip | The belt eases through a stop and runs the other way, with a swoosh, a small shake and big ▶▶▶ / ◀◀◀ arrows showing the new direction. New sushi enter from the new side. |
| Timing | Easy: first at 30 s, then every 11–14 s. Normal: 22 s, then every 9–12 s. Hard: 14 s, then every 7–10 s. No new flip in the last 4 s. |
| Fairness | A sushi being carried is not affected. A sushi that leaves at either end is a miss (only if it was on screen). |

**Tunables (`CONFIG.reversal`):** per-difficulty `first` and `every`, `warnSec` 1.6, `ease` 2.2, `quietEnd` 4.

---

## 13. Open questions

1. Is "touch to grab, move below the belt to drop" the right feel, or should a sushi drop as soon as it is over its box?
2. Is a 60 s round right for 4–6-year-olds, or should Easy default to 45 s?
3. In 2P, should a player whose hands are not seen pause their own lane?
4. Who will record the test clips (§10.3), and on which laptop and camera will the game mainly run?
