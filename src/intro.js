// Intro cinematics after pressing 1P / 2P: timeline, characters and sound cues. Pure (drawing lives in render.js).
//   1P: a kawaii sushi chef transformation (magical-girl style).
//   2P: a lightning split screen, two random characters face off, VS, go.
import { W, H, ROSTER } from './config.js';

const INTRO_CUES = {
  '1p': [[0.05, 'transform'], [0.7, 'whoosh'], [1.8, 'chime'], [2.3, 'chime'], [2.8, 'chime'], [3.3, 'fanfare'], [4.4, 'ready']],
  '2p': [[0.1, 'thunder'], [0.3, 'whoosh'], [0.6, 'whoosh'], [1.1, 'whoosh'], [1.6, 'vs'], [3.6, 'fanfare']]
};
export const INTRO_DUR = { '1p': 5.2, '2p': 4.8 };

export function createIntro(kind, random = Math.random) {
  const pick = n => { const keys = ROSTER.map(c => c.key), out = []; while (out.length < n) { const k = keys[Math.floor(random() * keys.length)]; if (!out.includes(k)) out.push(k); } return out; };
  const chars = pick(kind === '2p' ? 2 : 1).map(k => ROSTER.find(c => c.key === k));
  // jagged lightning seam from top to bottom, slightly diagonal
  const seam = [];
  for (let i = 0; i <= 8; i++) { const k = i / 8; seam.push([W * (.56 - .12 * k) + (i && i < 8 ? (random() - .5) * 70 : 0), -10 + (H + 20) * k]); }
  const streaks = Array.from({ length: 36 }, () => ({ y: random() * H, off: random(), len: 160 + random() * 320, w: 2 + random() * 5 }));
  return { kind, t: 0, dur: INTRO_DUR[kind], chars, seam, streaks, cues: INTRO_CUES[kind], next: 0, done: false };
}

// advances the intro; returns the sound cues that are due
export function tickIntro(it, dt) {
  it.t = Math.min(it.dur, it.t + dt);
  const due = [];
  while (it.next < it.cues.length && it.cues[it.next][0] <= it.t) due.push(it.cues[it.next++][1]);
  if (it.t >= it.dur) it.done = true;
  return due;
}

// jump to the very end (skips the remaining sound cues)
export function skipIntro(it) {
  if (it.t < .4) return false;            // ignore the click that started it
  it.next = it.cues.length;
  it.t = Math.max(it.t, it.dur - .3);
  return true;
}
