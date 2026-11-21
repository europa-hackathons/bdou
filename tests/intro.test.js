import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createIntro, tickIntro, skipIntro, INTRO_DUR } from '../src/intro.js';

const seq = vals => { let i = 0; return () => vals[i++ % vals.length]; };

test('2P intro picks two different characters', () => {
  for (let n = 0; n < 50; n++) {
    const it = createIntro('2p');
    assert.equal(it.chars.length, 2);
    assert.notEqual(it.chars[0].key, it.chars[1].key);
  }
  const fixed = createIntro('2p', seq([0, 0, 0, .99]));
  assert.notEqual(fixed.chars[0].key, fixed.chars[1].key);
});

test('1P intro has one character, cues fire once and in order, then it ends', () => {
  const it = createIntro('1p');
  assert.equal(it.chars.length, 1);
  const heard = [];
  while (!it.done) heard.push(...tickIntro(it, 1 / 60));
  assert.deepEqual(heard, it.cues.map(c => c[1]));
  assert.ok(Math.abs(it.t - INTRO_DUR['1p']) < 1e-9);
});

test('skipping jumps to the end without replaying sounds, but not on the starting click', () => {
  const it = createIntro('2p');
  assert.equal(skipIntro(it), false, 'too early: the click that started the intro');
  tickIntro(it, .5);
  assert.equal(skipIntro(it), true);
  assert.deepEqual(tickIntro(it, 1), []);
  assert.ok(it.done);
});

test('anime style gives the cinematic 2P face-off; 1P keeps the transformation', () => {
  const a = createIntro('2p', Math.random, 'anime');
  assert.equal(a.kind, '2p-anime');
  assert.equal(a.chars.length, 2);
  assert.notEqual(a.chars[0].key, a.chars[1].key);
  const heard = [];
  while (!a.done) heard.push(...tickIntro(a, 1 / 60));
  assert.deepEqual(heard, a.cues.map(c => c[1]));
  assert.equal(createIntro('1p', Math.random, 'anime').kind, '1p');
  assert.equal(createIntro('2p').kind, '2p', 'kawaii stays the default');
});
