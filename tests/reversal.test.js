// Belt reversal rules (SPEC §12.2)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, stepGame, itemRadius } from '../src/game.js';
import { CONFIG, dropLineY, boxCenter, BOX_TYPES } from '../src/config.js';

const STEP = 1 / 60;
function run(g, seconds, hands = () => []) {
  const ev = [];
  for (let i = 0; i < Math.round(seconds / STEP); i++) ev.push(...stepGame(g, STEP, hands(g)));
  return ev;
}
const playing = (opts = {}) => { const g = createGame({ seed: 9, ...opts }); run(g, CONFIG.countdown + .05); return g; };
const hand = (x, y) => ({ id: 'P1-L', kind: 'body', player: 0, x, y, lost: false });

test('the belt warns, then reverses at the planned time, and keeps reversing', () => {
  const g = playing({ difficulty: 'easy' }), RV = CONFIG.reversal;
  const first = RV.easy.first;
  const ev = run(g, first + .2);
  const warn = ev.findIndex(e => e.type === 'reverse-warn'), flip = ev.findIndex(e => e.type === 'reverse');
  assert.ok(warn >= 0 && flip > warn, 'warning comes before the flip');
  assert.equal(g.dir, -1);
  const more = run(g, RV.easy.every[1] + .5);
  assert.ok(more.some(e => e.type === 'reverse'), 'reverses again within the "every" window');
});

test('harder difficulties reverse sooner', () => {
  assert.ok(CONFIG.reversal.hard.first < CONFIG.reversal.normal.first);
  assert.ok(CONFIG.reversal.normal.first < CONFIG.reversal.easy.first);
});

test('after a flip, sushi move the other way and new ones come from the other side', () => {
  const g = playing({ difficulty: 'hard' });
  run(g, CONFIG.reversal.hard.first + 2.5);                 // flipped, and the belt has eased round
  assert.equal(g.dir, -1);
  assert.ok(g.dirV < -.9, 'belt runs to the right now');
  const lane = g.lanes[0], fresh = g.items.filter(i => i.st === 'belt' && i.x < lane.x0 + 200);
  const before = new Map(g.items.map(i => [i.id, i.x]));
  run(g, .5);
  const moved = g.items.filter(i => i.st === 'belt' && before.has(i.id));
  assert.ok(moved.length > 0 && moved.every(i => i.x > before.get(i.id)), 'all belt sushi move right');
  assert.ok(fresh.length > 0 || g.items.some(i => i.x < lane.x0 + lane.w / 2), 'sushi enter from the left');
});

test('a sushi leaving at the "wrong" end after a flip still counts as a miss', () => {
  const g = playing({ difficulty: 'hard' });
  run(g, CONFIG.reversal.hard.first + 2);
  const ev = run(g, 6);
  assert.ok(ev.some(e => e.type === 'miss'));
  assert.ok(g.items.every(i => i.x > g.lanes[0].x0 - itemRadius(g) * 3 && i.x < g.lanes[0].x0 + g.lanes[0].w + itemRadius(g) * 3), 'nothing lingers off-screen');
});

test('a sushi being carried is not affected by a flip and can still be sorted', () => {
  const g = playing({ difficulty: 'hard' });
  run(g, CONFIG.reversal.hard.first - .6);
  let it = null;
  for (let i = 0; i < 600 && !it; i++) { stepGame(g, STEP, []); it = g.items.find(x => x.st === 'belt' && x.x > 300 && x.x < 1000); }
  stepGame(g, STEP, [hand(it.x, it.y)]);
  assert.equal(it.st, 'held');
  const ev = run(g, 1.5, () => [hand(640, 200)]);           // the flip happens while it is held
  assert.ok(ev.some(e => e.type === 'reverse'));
  assert.equal(it.st, 'held');
  const target = boxCenter(g.lanes[0], BOX_TYPES.indexOf(it.type));
  const ev2 = run(g, .8, () => [hand(target.x, dropLineY() + 40)]);
  assert.ok(ev2.some(e => e.type === 'correct'));
});

test('no flips when switched off, and none in the last seconds', () => {
  const off = playing({ reverse: false });
  assert.ok(!run(off, 60).some(e => e.type === 'reverse' || e.type === 'reverse-warn'));
  const g = playing({ difficulty: 'hard', duration: 30 });
  let lastFlip = -1;
  for (let i = 0; i < 30 / STEP; i++) if (stepGame(g, STEP, []).some(e => e.type === 'reverse')) lastFlip = g.time;
  assert.ok(lastFlip > 0 && lastFlip < 30 - CONFIG.reversal.quietEnd);
});

test('reversals are deterministic for the same seed', () => {
  const flips = seed => { const g = playing({ seed, difficulty: 'normal' }); const out = []; for (let i = 0; i < 60 / STEP; i++) if (stepGame(g, STEP, []).some(e => e.type === 'reverse')) out.push(+g.time.toFixed(3)); return out; };
  assert.deepEqual(flips(5), flips(5));
  assert.ok(flips(5).length >= 3);
});
