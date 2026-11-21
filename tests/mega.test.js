// Mega sushi rules (SPEC §12.1)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, stepGame, itemRadius } from '../src/game.js';
import { CONFIG, BOX_TYPES, boxCenter, dropLineY } from '../src/config.js';

const STEP = 1 / 60;
const H1 = (id, x, y, player = 0) => ({ id, kind: 'body', player, x, y, lost: false });

function playing(opts = {}) {
  const g = createGame({ seed: 5, ...opts });
  for (let i = 0; i < (CONFIG.countdown + .05) / STEP; i++) stepGame(g, STEP, []);
  return g;
}
// put two belt sushi of `type` into `lane` at known places (deterministic setup for merge tests)
function placeTwo(g, type, lane = 0, xs = [400, 700]) {
  const L = g.lanes[lane];
  g.items = xs.map((x, i) => ({ id: 1000 + i, type, lane, x: L.x0 + (x / 1280) * L.w, y: CONFIG.layout.itemY, st: 'belt', seen: true, holder: null, heldAt: 0, dropCol: -1, dropT: 0, ft: 0, t: 0, ph: 0 }));
  g.lanes.forEach(l => { l.spawnT = 999; });   // no new sushi during the test
  return g.items.slice();
}
// both hands grab, then come together in the middle at belt height
function grabAndMerge(g, a, b, ids = ['P1-L', 'P1-R'], player = 0) {
  const ev = [];
  ev.push(...stepGame(g, STEP, [H1(ids[0], a.x, a.y, player), H1(ids[1], b.x, b.y, player)]));
  assert.equal(a.st, 'held'); assert.equal(b.st, 'held');
  const mx = (a.x + b.x) / 2, my = 180;
  for (let i = 0; i < 40; i++) ev.push(...stepGame(g, STEP, [H1(ids[0], mx - 5, my, player), H1(ids[1], mx + 5, my, player)]));
  return ev;
}

test('two hands of one player holding the same sushi merge into a mega sushi', () => {
  const g = playing();
  const [a, b] = placeTwo(g, 'maki');
  const ev = grabAndMerge(g, a, b);
  assert.ok(ev.some(e => e.type === 'merge'));
  const megas = g.items.filter(i => i.mega);
  assert.equal(megas.length, 1);
  assert.equal(g.items.length, 1, 'the second sushi is used up');
  assert.equal(megas[0].st, 'held');
});

test('different types do not merge', () => {
  const g = playing();
  placeTwo(g, 'maki');
  g.items[1].type = 'avo';
  const ev = grabAndMerge(g, g.items[0], g.items[1]);
  assert.ok(!ev.some(e => e.type === 'merge'));
  assert.equal(g.items.filter(i => i.mega).length, 0);
});

test('no merging when the feature is switched off', () => {
  const g = playing({ mega: false });
  const [a, b] = placeTwo(g, 'sashimi');
  const ev = grabAndMerge(g, a, b);
  assert.ok(!ev.some(e => e.type === 'merge'));
});

test('two different players never merge, even side by side at the middle', () => {
  const g = playing({ mode: 2 });
  const L0 = g.lanes[0], L1 = g.lanes[1];
  g.lanes.forEach(l => { l.spawnT = 999; });
  const mk = (id, lane, x) => ({ id, type: 'maki', lane, x, y: CONFIG.layout.itemY, st: 'belt', seen: true, holder: null, heldAt: 0, dropCol: -1, dropT: 0, ft: 0, t: 0, ph: 0 });
  g.items = [mk(1, 0, L0.x0 + L0.w - 60), mk(2, 1, L1.x0 + 60)];
  const [a, b] = g.items;
  const ev = [];
  ev.push(...stepGame(g, STEP, [H1('P1-R', a.x, a.y, 0), H1('P2-L', b.x, b.y, 1)]));
  assert.equal(a.st, 'held'); assert.equal(b.st, 'held');
  for (let i = 0; i < 40; i++) ev.push(...stepGame(g, STEP, [H1('P1-R', 630, 180, 0), H1('P2-L', 650, 180, 1)]));
  assert.ok(!ev.some(e => e.type === 'merge'));
});

test('mega sushi scores big in the right box and counts as two sorted', () => {
  const g = playing();
  const [a, b] = placeTwo(g, 'avo');
  grabAndMerge(g, a, b);
  const mega = g.items.find(i => i.mega), target = boxCenter(g.lanes[0], BOX_TYPES.indexOf('avo'));
  const ev = [];
  for (let i = 0; i < 40; i++) ev.push(...stepGame(g, STEP, [H1(mega.holder, target.x, dropLineY() + 40)]));
  const hit = ev.find(e => e.type === 'correct');
  assert.ok(hit && hit.mega);
  assert.equal(hit.points, CONFIG.mega.base);
  assert.equal(g.lanes[0].sorted, 2);
  assert.equal(g.lanes[0].score, CONFIG.mega.base);
});

test('mega sushi in the wrong box costs more', () => {
  const g = playing();
  g.lanes[0].score = 50;
  const [a, b] = placeTwo(g, 'avo');
  grabAndMerge(g, a, b);
  const mega = g.items.find(i => i.mega), target = boxCenter(g.lanes[0], BOX_TYPES.indexOf('maki'));
  const ev = [];
  for (let i = 0; i < 40; i++) ev.push(...stepGame(g, STEP, [H1(mega.holder, target.x, dropLineY() + 40)]));
  assert.ok(ev.some(e => e.type === 'wrong' && e.mega));
  assert.equal(g.lanes[0].score, 50 - CONFIG.mega.wrong);
});

test('a mega sushi whose hand vanishes floats, can be taken by the other hand, and is never lost', () => {
  const g = playing();
  const [a, b] = placeTwo(g, 'sashimi');
  grabAndMerge(g, a, b);
  const mega = g.items.find(i => i.mega), holder = mega.holder, other = holder === 'P1-L' ? 'P1-R' : 'P1-L';
  stepGame(g, STEP, [H1(other, 100, 600)]);                      // holding hand gone
  assert.equal(mega.st, 'float');
  stepGame(g, STEP, [H1(other, mega.x, mega.y)]);                 // the other hand takes it
  assert.equal(mega.st, 'held'); assert.equal(mega.holder, other);
  // lose it again and let nobody come back: it delivers itself into its own box
  const ev = [];
  for (let i = 0; i < (CONFIG.mega.floatMs / 1000 + .5) / STEP; i++) ev.push(...stepGame(g, STEP, []));
  const hit = ev.find(e => e.type === 'correct');
  assert.ok(hit && hit.mega && hit.box === BOX_TYPES.indexOf('sashimi'));
  assert.ok(!ev.some(e => e.type === 'miss'));
});

test('the tip appears once, about 6 s in', () => {
  const g = playing();
  g.lanes.forEach(l => { l.spawnT = 999; });
  const ev = [];
  for (let i = 0; i < 10 / STEP; i++) ev.push(...stepGame(g, STEP, []));
  assert.equal(ev.filter(e => e.type === 'tip').length, 1);
  assert.ok(itemRadius(g) > 0);
});
