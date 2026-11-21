import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createInput, inputFromPose, inputFromHands, pointerMove, pointerEnd, handPoints } from '../src/input.js';
import { CONFIG, W } from '../src/config.js';

// A synthetic body: camera-normalised coordinates (the screen is mirrored, so camera x .7 ends up on the left).
function body(cx, { left = { x: cx + .1, y: .42 }, right = { x: cx - .1, y: .42 }, shoulderVis = .99, wristVis = .9 } = {}) {
  const l = Array.from({ length: 33 }, () => ({ x: cx, y: .95, visibility: .1 }));
  l[11] = { x: cx + .06, y: .45, visibility: shoulderVis }; l[12] = { x: cx - .06, y: .45, visibility: shoulderVis };
  l[23] = { x: cx + .05, y: .8, visibility: .8 }; l[24] = { x: cx - .05, y: .8, visibility: .8 };
  for (const [w, a, b, p] of [[15, 17, 19, left], [16, 18, 20, right]]) {
    l[w] = { x: p.x, y: p.y, visibility: wristVis }; l[a] = { x: p.x, y: p.y - .04, visibility: .9 }; l[b] = { x: p.x, y: p.y - .04, visibility: .9 };
  }
  return l;
}
const ctx = (now, mode = 2) => ({ now, mode, vw: 1280, vh: 720, zoom: 1.5 });
// feed `frames` frames 33 ms apart; `make(i)` returns the pose list for frame i
function feed(inp, frames, make, mode = 2, t0 = 0) {
  for (let i = 0; i < frames; i++) inputFromPose(inp, make(i), ctx(t0 + i * 33, mode));
  return t0 + (frames - 1) * 33;
}

test('two people become P1 (left on screen) and P2 (right), whatever order the tracker returns them in', () => {
  const inp = createInput();
  const now = feed(inp, 10, i => (i % 2 ? [body(.68), body(.32)] : [body(.32), body(.68)]));
  const hands = handPoints(inp, now);
  const ids = hands.map(h => h.id).sort();
  assert.deepEqual(ids, ['P1-L', 'P1-R', 'P2-L', 'P2-R']);
  for (const h of hands) assert.equal(h.player, h.id.startsWith('P1') ? 0 : 1);
  for (const h of hands) assert.ok(h.player === 0 ? h.x < W / 2 : h.x > W / 2, `${h.id} on its own side`);
});

test('a hand needs 3 frames in a row before it appears', () => {
  const inp = createInput();
  feed(inp, 2, () => [body(.5)], 1);
  assert.equal(handPoints(inp, 33).length, 0);
  inputFromPose(inp, [body(.5)], ctx(66, 1));
  assert.equal(handPoints(inp, 66).length, 2);
});

test('resting arms, off-picture wrists and low-confidence wrists are rejected', () => {
  const inp = createInput();
  const now = feed(inp, 6, () => [body(.5, { left: { x: .6, y: .86 }, right: { x: -.2, y: .4 } })], 1);
  assert.equal(handPoints(inp, now).length, 0);
  const why = inp.debug.rejects.map(r => r.why).sort();
  assert.deepEqual(why, ['outside picture', 'resting']);
  const inp2 = createInput();
  const now2 = feed(inp2, 6, () => [body(.5, { wristVis: .2 })], 1);
  assert.equal(handPoints(inp2, now2).length, 0);
});

test('weak "people" (low shoulder confidence) are ignored', () => {
  const inp = createInput();
  const now = feed(inp, 6, () => [body(.5, { shoulderVis: .3 })], 1);
  assert.equal(handPoints(inp, now).length, 0);
  assert.ok(inp.debug.rejects.some(r => r.why === 'weak person'));
});

test('1P: only the person nearest the middle plays', () => {
  const inp = createInput();
  const now = feed(inp, 6, () => [body(.9), body(.52)], 1);
  const hands = handPoints(inp, now);
  assert.equal(hands.length, 2);
  for (const h of hands) assert.ok(Math.abs(h.x - W / 2) < 300, 'hands belong to the central person');
});

test('a hand reaching across the middle stays in its own half', () => {
  const inp = createInput();
  const now = feed(inp, 6, () => [body(.68, { right: { x: .2, y: .42 } }), body(.2)]);
  const p1 = handPoints(inp, now).filter(h => h.player === 0);
  for (const h of p1) assert.ok(h.x <= 14 + 606, `${h.id} x=${h.x}`);
});

test('a one-frame glitch is ignored; a real move is accepted after 3 frames', () => {
  const inp = createInput();
  let now = feed(inp, 10, () => [body(.5)], 1);
  const before = handPoints(inp, now).find(h => h.id === 'P1-L').x;
  inputFromPose(inp, [body(.5, { left: { x: .3, y: .42 } })], ctx(now += 33, 1));
  assert.equal(Math.round(handPoints(inp, now).find(h => h.id === 'P1-L').x), Math.round(before), 'spike ignored');
  now = feed(inp, 4, () => [body(.5, { left: { x: .3, y: .42 } })], 1, now + 33);
  assert.ok(Math.abs(handPoints(inp, now).find(h => h.id === 'P1-L').x - before) > 200, 'real move accepted');
});

test('jitter of a still hand is smoothed well below the raw noise', () => {
  const inp = createInput();
  let seed = 1; const noise = () => { seed = (seed * 16807) % 2147483647; return (seed / 2147483647 - .5) * .02; };
  const xs = [];
  for (let i = 0; i < 90; i++) {
    inputFromPose(inp, [body(.5, { left: { x: .6 + noise(), y: .42 + noise() } })], ctx(i * 33, 1));
    const h = handPoints(inp, i * 33).find(q => q.id === 'P1-L');
    if (h && i > 20) xs.push(h.x);
  }
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  const sd = Math.sqrt(xs.reduce((a, b) => a + (b - mean) ** 2, 0) / xs.length);
  assert.ok(sd < 10, `still-hand jitter ${sd.toFixed(1)} px should be under 10 px (SPEC A4)`);
});

test('lost hands fade, then disappear after the grace period (longer while holding)', () => {
  const inp = createInput(), c = CONFIG.input;
  const now = feed(inp, 6, () => [body(.5)], 1);
  assert.ok(handPoints(inp, now + c.lostAfterMs + 10).every(h => h.lost));
  assert.equal(handPoints(inp, now + c.lossGraceMs + 50, new Set(['P1-L'])).length, 1, 'held hand survives longer');
  assert.equal(handPoints(inp, now + c.lossGraceHoldingMs + 50, new Set(['P1-L'])).length, 0);
});

test('mouse only counts while it moves; touch lasts until lifted', () => {
  const inp = createInput();
  pointerMove(inp, 'mouse', 'mouse', 300, 300, 0, 1);
  pointerMove(inp, 't1', 'touch', 900, 300, 0, 1);
  assert.equal(handPoints(inp, 10).length, 2);
  assert.deepEqual(handPoints(inp, CONFIG.input.mouseIdleMs + 10).map(h => h.id), ['t1']);
  pointerEnd(inp, 't1');
  assert.equal(handPoints(inp, CONFIG.input.mouseIdleMs + 20).length, 0);
});

test('hand-tracking mode keeps identities and lanes', () => {
  const inp = createInput();
  const handAt = (x, y) => Array.from({ length: 21 }, () => ({ x, y }));
  for (let i = 0; i < 6; i++) inputFromHands(inp, i % 2 ? [handAt(.2, .4), handAt(.8, .4)] : [handAt(.8, .4), handAt(.2, .4)], { now: i * 33, mode: 2 });
  const hs = handPoints(inp, 165);
  assert.equal(hs.length, 2);
  assert.deepEqual(hs.map(h => h.player).sort(), [0, 1]);
});
