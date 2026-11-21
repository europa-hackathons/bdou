# BDOU – Disco Sushi Train

*Sushi disco conveyor belts of destiny.*

A kawaii disco webcam game for kids: sort the sushi pals from the conveyor belt into their takeout boxes. 1 or 2 players, English / Swedish. See [SPEC.md](SPEC.md) for the full design.

## Play

Open `index.html` in Chrome, or host the folder on GitHub Pages. The camera needs `https://` or `localhost`. Without a camera the game falls back to mouse / touch.

Stand about 2 m from the camera. Raise a hand to touch a sushi, then move your hand down over its matching box.

## Develop

```bash
npm test          # unit tests (game rules, input contract, leaderboard)
npm run build     # src/ -> index.html (single file) + dev.html
python3 -m http.server 8765   # then open http://localhost:8765/dev.html (no build needed) or /index.html
```

- `src/config.js` holds every tunable number.
- `index.html` is generated, so edit `src/` and rebuild.

## Debugging tracking

Press **D** during the game to open the debug overlay. It shows:

- the tracked body points and each accepted hand with its id;
- why a wrist was rejected (resting, low confidence, outside the picture, weak person);
- the grab reach and the drop line;
- detection and render frame rates.

The panel can **record a 20 s webcam clip** (saved to your Downloads folder), **load a clip** to replay it through the real tracker, and **export the landmark timeline as JSON** for the input tests.
