import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadScores, qualifies, addScore, loadSettings, saveSettings } from '../src/storage.js';

function memStore() { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) }; }

test('leaderboard keeps the top 5, ranked, ties broken by who scored first', () => {
  const st = memStore();
  [['AAA', 50, 1], ['BBB', 80, 2], ['CCC', 50, 3], ['DDD', 10, 4], ['EEE', 70, 5], ['FFF', 90, 6]].forEach(([n, s, d]) => addScore(n, s, 1, st, d));
  const h = loadScores(st);
  assert.deepEqual(h.map(e => e.name), ['FFF', 'BBB', 'EEE', 'AAA', 'CCC']);
  assert.equal(qualifies(50, st), false);
  assert.equal(qualifies(51, st), true);
  assert.equal(qualifies(0, memStore()), false, 'a zero score never enters the board');
});

test('initials are stored as 3 upper-case letters', () => {
  const st = memStore();
  addScore('abcd', 20, 1, st, 1);
  assert.equal(loadScores(st)[0].name, 'ABC');
});

test('broken storage falls back safely', () => {
  const broken = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
  assert.deepEqual(loadScores(broken), []);
  assert.doesNotThrow(() => addScore('ABC', 10, 1, broken));
  const st = memStore(); st.setItem('bdou.v1.highscores', 'not json');
  assert.deepEqual(loadScores(st), []);
});

test('settings merge saved values over defaults', () => {
  const st = memStore();
  saveSettings({ lang: 'sv', dur: 45 }, st);
  const s = loadSettings({ lang: 'en', dur: 60, diff: 'easy' }, st);
  assert.deepEqual(s, { lang: 'sv', dur: 45, diff: 'easy' });
});
