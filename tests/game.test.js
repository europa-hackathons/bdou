import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, stepGame, beltSpeedAt, itemRadius, gameStats } from '../src/game.js';
import { CONFIG, BOX_TYPES, lanesFor, boxCenter, dropLineY } from '../src/config.js';

const STEP = 1 / 60;
function run(g, seconds, hands = () => []) {
  const events = [];
  for (let i = 0; i < Math.round(seconds / STEP); i++) events.push(...stepGame(g, STEP, hands(g)));
  return events;
}
const playing = (opts = {}) => { const g = createGame({ seed: 7, ...opts }); run(g, CONFIG.countdown + .05); return g; };
const hand = (x, y, extra = {}) => ({ id: 'P1-R', kind: 'body', player: 0, x, y, lost: false, ...extra });

// grab the first sushi of `type` with a hand, then move the hand to a box column below the drop line
function sortOne(g, type, boxIndex) {
  let it = null;
  for (let i = 0; i < 2000 && !it; i++) { stepGame(g, STEP, []); it = g.items.find(x => x.type === type && x.st === 'belt' && x.x < 1100 && x.x > 300); }
  assert.ok(it, `a ${type} should spawn`);
  const ev = [];
  for (let i = 0; i < 3; i++) ev.push(...stepGame(g, STEP, [hand(it.x, it.y)]));
  assert.equal(it.st, 'held');
  const target = boxCenter(g.lanes[0], boxIndex);
  for (let i = 0; i < 30; i++) ev.push(...stepGame(g, STEP, [hand(target.x, dropLineY() + 40)]));
  return ev;
}

test('countdown then play, with a go event', () => {
  const g = createGame();
  const ev = run(g, CONFIG.countdown + .05);
  assert.equal(g.phase, 'play');
  assert.ok(ev.some(e => e.type === 'go'));
  assert.equal(ev.filter(e => e.type === 'tick').length, 2); // 3 -> 2 -> 1
});

test('timer ends the game exactly once', () => {
  const g = playing({ duration: 5 });
  const ev = run(g, 6);
  assert.equal(g.phase, 'over');
  assert.equal(ev.filter(e => e.type === 'over').length, 1);
  assert.equal(g.left, 0);
});

test('belt speed ramps in steps and is capped', () => {
  const d = CONFIG.difficulty.easy;
  assert.equal(beltSpeedAt('easy', 0), d.start);
  assert.equal(beltSpeedAt('easy', 3.9), d.start);
  assert.ok(beltSpeedAt('easy', 4) > d.start);
  assert.equal(beltSpeedAt('easy', 1000), d.max);
  assert.ok(beltSpeedAt('hard', 0) > beltSpeedAt('easy', 0));
});

test('same seed gives the same game (deterministic)', () => {
  const a = playing({ seed: 42 }), b = playing({ seed: 42 });
  run(a, 20); run(b, 20);
  assert.deepEqual(a.items.map(i => [i.type, Math.round(i.x)]), b.items.map(i => [i.type, Math.round(i.x)]));
});

test('correct box scores and builds a combo', () => {
  const g = playing();
  const t0 = BOX_TYPES[0];
  const ev1 = sortOne(g, t0, 0);
  const c1 = ev1.find(e => e.type === 'correct');
  assert.ok(c1); assert.equal(c1.points, CONFIG.scoring.base); assert.equal(g.lanes[0].combo, 1);
  const ev2 = sortOne(g, 'avo', 2);
  const c2 = ev2.find(e => e.type === 'correct');
  assert.equal(c2.points, CONFIG.scoring.base + CONFIG.scoring.comboStep);
  assert.equal(g.lanes[0].score, 2 * CONFIG.scoring.base + CONFIG.scoring.comboStep);
});

test('wrong box costs points (never below 0) and resets combo', () => {
  const g = playing();
  sortOne(g, 'maki', 0);
  const ev = sortOne(g, 'maki', 1);
  assert.ok(ev.some(e => e.type === 'wrong'));
  assert.equal(g.lanes[0].combo, 0);
  assert.equal(g.lanes[0].score, CONFIG.scoring.base - CONFIG.scoring.wrong);
  sortOne(g, 'maki', 2); sortOne(g, 'maki', 2);
  assert.equal(g.lanes[0].score, 0);
});

test('a sushi that leaves the belt is a miss and resets the combo', () => {
  const g = playing();
  sortOne(g, 'sashimi', 1);
  const ev = run(g, 15);
  assert.ok(ev.some(e => e.type === 'miss'));
  assert.equal(g.lanes[0].combo, 0);
  assert.ok(gameStats(g.lanes[0]).accuracy < 100);
});

test('no drop before the minimum hold time', () => {
  const g = playing();
  let it = null;
  for (let i = 0; i < 2000 && !it; i++) { stepGame(g, STEP, []); it = g.items.find(x => x.st === 'belt' && x.x < 1100 && x.x > 300); }
  stepGame(g, STEP, [hand(it.x, it.y)]);
  assert.equal(it.st, 'held');
  stepGame(g, STEP, [hand(it.x, dropLineY() + 50)]);        // dives straight down
  assert.equal(it.st, 'held', 'jitter right after grabbing must not drop it');
});

test('camera grab has a bigger reach and lag compensation', () => {
  const g = playing();
  let it = null;
  for (let i = 0; i < 2000 && !it; i++) { stepGame(g, STEP, []); it = g.items.find(x => x.st === 'belt' && x.x < 1000 && x.x > 400); }
  const R = itemRadius(g);
  const behind = it.x + g.speed * CONFIG.interaction.lagCompMs / 1000; // where it was a moment ago
  const mouse = { id: 'mouse', kind: 'mouse', player: 0, x: behind + R * 1.2, y: it.y, lost: false };
  stepGame(g, STEP, [mouse]);
  assert.equal(it.st, 'belt', 'mouse needs to be closer');
  stepGame(g, STEP, [hand(it.x + g.speed * CONFIG.interaction.lagCompMs / 1000 + R * 1.2, it.y)]);
  assert.equal(it.st, 'held', 'camera hand at the lag-compensated spot grabs');
});

test('lost hands cannot grab; a vanished hand leaves the sushi floating, then back on the belt', () => {
  const g = playing();
  let it = null;
  for (let i = 0; i < 2000 && !it; i++) { stepGame(g, STEP, []); it = g.items.find(x => x.st === 'belt' && x.x < 1000 && x.x > 400); }
  stepGame(g, STEP, [hand(it.x, it.y, { lost: true })]);
  assert.equal(it.st, 'belt');
  stepGame(g, STEP, [hand(it.x, it.y)]);
  assert.equal(it.st, 'held');
  stepGame(g, STEP, []);
  assert.equal(it.st, 'float');
  run(g, CONFIG.interaction.floatMs / 1000 + .1);
  assert.notEqual(it.st, 'float');
});

test('2P: a hand only grabs from its own player lane', () => {
  const g = createGame({ mode: 2, seed: 3 });
  run(g, CONFIG.countdown + .05);
  let it = null;
  for (let i = 0; i < 3000 && !it; i++) { stepGame(g, STEP, []); it = g.items.find(x => x.lane === 1 && x.st === 'belt' && x.x < 1150 && x.x > 700); }
  const intruder = { id: 'P1-L', kind: 'body', player: 0, x: it.x, y: it.y, lost: false };
  stepGame(g, STEP, [intruder]);
  assert.equal(it.st, 'belt');
  stepGame(g, STEP, [{ ...intruder, id: 'P2-L', player: 1 }]);
  assert.equal(it.st, 'held');
  assert.equal(lanesFor(2).length, 2);
});

test('a diagonal move down to the far box drops into the box the hand ends over, not the first one it crosses', () => {
  const g = playing({ seed: 11 });
  let it = null;
  for (let i = 0; i < 4000 && !it; i++) { stepGame(g, STEP, []); it = g.items.find(x => x.type === 'maki' && x.st === 'belt' && x.x < 1000 && x.x > 850); }
  assert.ok(it, 'a maki near the right');
  stepGame(g, STEP, [hand(it.x, it.y)]);
  assert.equal(it.st, 'held');
  const from = { x: it.x, y: it.y }, to = boxCenter(g.lanes[0], 0), ev = [];
  for (let i = 1; i <= 40; i++) { const k = i / 40; ev.push(...stepGame(g, STEP, [hand(from.x + (to.x - from.x) * k, from.y + (to.y + 30 - from.y) * k)])); }
  for (let i = 0; i < 20; i++) ev.push(...stepGame(g, STEP, [hand(to.x, to.y + 30)]));
  assert.ok(ev.some(e => e.type === 'correct' && e.box === 0), JSON.stringify(ev.filter(e => e.type !== 'tick')));
  assert.ok(!ev.some(e => e.type === 'wrong'));
});
