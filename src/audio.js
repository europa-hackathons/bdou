// Web Audio oscillator sound effects and a disco music loop. No audio files.
let AC = null, master = null, noiseBuf = null;
const audioState = { vol: .6, mute: false };

function ctxA() {
  if (!AC) {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    master = AC.createGain(); master.connect(AC.destination);
    noiseBuf = AC.createBuffer(1, AC.sampleRate * .5, AC.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    applyVolume();
  }
  if (AC.state === 'suspended') AC.resume();
  return AC;
}
function applyVolume() { if (master) master.gain.value = audioState.mute ? 0 : audioState.vol; }

function tone(f, d = .15, type = 'square', v = .2, at = 0, to = null) {
  const a = ctxA(), t0 = a.currentTime + Math.max(0, at), o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t0);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t0 + d);
  g.gain.setValueAtTime(v, t0); g.gain.exponentialRampToValueAtTime(.001, t0 + d);
  o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + d + .03);
}
function noise(d, v, at, hp) {
  const a = ctxA(), t0 = a.currentTime + Math.max(0, at), s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
  s.buffer = noiseBuf; f.type = 'highpass'; f.frequency.value = hp;
  g.gain.setValueAtTime(v, t0); g.gain.exponentialRampToValueAtTime(.001, t0 + d);
  s.connect(f); f.connect(g); g.connect(master); s.start(t0); s.stop(t0 + d + .02);
}

// filtered noise with an optional frequency sweep (thunder, whooshes)
function noiseSweep(d, v, at, type, f0, f1 = f0) {
  const a = ctxA(), t0 = a.currentTime + Math.max(0, at), s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
  s.buffer = noiseBuf; s.loop = true; f.type = type; f.Q.value = type === 'bandpass' ? 1.2 : .7;
  f.frequency.setValueAtTime(f0, t0); f.frequency.exponentialRampToValueAtTime(f1, t0 + d);
  g.gain.setValueAtTime(.001, t0); g.gain.exponentialRampToValueAtTime(v, t0 + Math.min(.05, d / 4)); g.gain.exponentialRampToValueAtTime(.001, t0 + d);
  s.connect(f); f.connect(g); g.connect(master); s.start(t0); s.stop(t0 + d + .05);
}

const SFX = {
  // intro cues
  transform() { [523, 587, 659, 784, 880, 1047, 1175, 1319, 1568, 1760, 2093].forEach((f, i) => tone(f, .35, 'sine', .14, i * .08)); noiseSweep(1.2, .08, 0, 'highpass', 3000, 9000); },
  whoosh() { noiseSweep(.45, .3, 0, 'bandpass', 300, 3500); },
  chime() { [1568, 2093, 2637, 3136].forEach((f, i) => tone(f, .35, 'sine', .13, i * .045)); },
  fanfare() { [[523, 0], [659, 0], [784, 0], [1047, .18], [1319, .32]].forEach(([f, at]) => { tone(f, .5, 'square', .1, at); tone(f / 2, .5, 'triangle', .12, at); }); },
  thunder() { noiseSweep(1.4, .6, 0, 'lowpass', 1800, 120); tone(70, 1.1, 'sawtooth', .22, 0, 32); },
  vs() { tone(110, .5, 'square', .3, 0, 55); tone(220, .4, 'sawtooth', .16); noiseSweep(.35, .45, 0, 'lowpass', 3000, 200); },

  click() { tone(700, .06, 'triangle', .16, 0, 1000); },
  grab() { tone(520, .09, 'triangle', .22, 0, 900); },
  good(combo) { const m = 1 + Math.min(combo, 14) * .035; [523, 659, 784].forEach((f, i) => tone(f * m, .13, 'square', .14, i * .06)); },
  combo() { [784, 988, 1175, 1568].forEach((f, i) => tone(f, .14, 'triangle', .22, i * .06)); },
  wrong() { tone(220, .32, 'sawtooth', .22, 0, 80); tone(160, .32, 'square', .12, .02, 60); },
  miss() { tone(300, .12, 'triangle', .14, 0, 160); },
  tick() { tone(880, .07, 'square', .14); },
  go() { tone(1320, .35, 'square', .2); tone(1760, .35, 'triangle', .15, .05); },
  faster() { tone(400, .25, 'sawtooth', .13, 0, 1200); },
  over() { [784, 659, 523, 392].forEach((f, i) => tone(f, .28, 'square', .2, i * .18)); tone(196, .8, 'sawtooth', .18, .75, 90); },
  mega() { [392, 523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, .2, 'sawtooth', .13, i * .05)); tone(98, .6, 'square', .2, 0, 196); },
  ready() { [523, 784].forEach((f, i) => tone(f, .18, 'triangle', .2, i * .12)); }
};

/* ---------- disco music: a 4-bar loop on a 16th-note step sequencer ---------- */
// Am7 – Dm7 – G7 – Cmaj7: octave-bouncing bass, offbeat chord stabs, four-on-the-floor, open hats, claps.
const DISCO = {
  bass: [45, 38, 43, 36],                                   // A, D, G, C (midi)
  chords: [[57, 60, 64, 67], [57, 60, 62, 65], [55, 59, 62, 65], [55, 59, 60, 64]]
};
const music = { mode: 'off', next: 0, step: 0, bpm: 120, on: true, bus: null };
const midiHz = m => 440 * Math.pow(2, (m - 69) / 12);

function musicBus() {
  if (!music.bus) { music.bus = AC.createGain(); music.bus.gain.value = 0; music.bus.connect(master); }
  return music.bus;
}
function setMusicLevel() {
  if (!AC) return;
  const lvl = !music.on || music.mode === 'off' ? 0 : music.mode === 'intro' ? .12 : music.mode === 'menu' ? .5 : .55;
  musicBus().gain.setTargetAtTime(lvl, AC.currentTime, .25);
}
function voice(type, f, t0, d, v, { lp = 0, f2 = 0, detune = 0 } = {}) {
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t0); o.detune.value = detune;
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + d);
  g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(v, t0 + .006); g.gain.exponentialRampToValueAtTime(.0001, t0 + d);
  let node = o;
  if (lp) { const fl = AC.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.setValueAtTime(lp, t0); fl.frequency.exponentialRampToValueAtTime(Math.max(200, lp / 4), t0 + d); fl.Q.value = 6; o.connect(fl); node = fl; }
  node.connect(g); g.connect(musicBus()); o.start(t0); o.stop(t0 + d + .02);
}
function hiss(t0, d, v, type, freq, q = .7) {
  const sN = AC.createBufferSource(), fl = AC.createBiquadFilter(), g = AC.createGain();
  sN.buffer = noiseBuf; fl.type = type; fl.frequency.value = freq; fl.Q.value = q;
  g.gain.setValueAtTime(v, t0); g.gain.exponentialRampToValueAtTime(.0001, t0 + d);
  sN.connect(fl); fl.connect(g); g.connect(musicBus()); sN.start(t0, Math.random() * .3); sN.stop(t0 + d + .02);
}
function discoStep(s, t0) {
  const bar = (s >> 4) & 3, st = s & 15, game = music.mode === 'game', root = DISCO.bass[bar], chord = DISCO.chords[bar];
  const fill = bar === 3 && st >= 12;                                       // clap roll into the next loop
  // drums
  if (st % 4 === 0) { voice('sine', 160, t0, .22, .9, { f2: 42 }); voice('triangle', 90, t0, .05, .25); }
  if (st % 4 === 2) hiss(t0, .16, .16, 'highpass', 7500);                  // open hat on the offbeat
  else if (game || st % 2 === 1) hiss(t0, .03, .06, 'highpass', 9000);     // closed hats
  if (st === 4 || st === 12 || fill) { const v = fill ? .1 + (st - 12) * .05 : .28; hiss(t0, .14, v, 'bandpass', 1400, 1.2); hiss(t0 + .012, .12, v * .7, 'bandpass', 1100, 1.2); }
  // octave-bouncing bass (8ths) with a 16th pickup
  if (st % 2 === 0) voice('sawtooth', midiHz(root + (st % 4 === 2 ? 12 : 0)), t0, .17, .32, { lp: 1100 });
  if (st === 15) voice('sawtooth', midiHz(root + 10), t0, .1, .22, { lp: 900 });
  // funky chord stabs on the "and"s
  if (st === 6 || st === 14 || (game && st === 3)) for (const m of chord) { voice('square', midiHz(m), t0, .16, .05, { lp: 3200, detune: -7 }); voice('sawtooth', midiHz(m), t0, .16, .04, { lp: 3200, detune: 7 }); }
  // sparkly arpeggio: always in game, in the second half of the loop on the menu
  if ((game || bar >= 2) && st % 2 === 1) voice('triangle', midiHz(chord[(st >> 1) % 4] + 24), t0, .12, .06);
  // string-ish swell at the top of each loop
  if (st === 0 && bar === 0) for (const m of chord) voice('sawtooth', midiHz(m + 12), t0, 1.6, .025, { lp: 2400 });
}
setInterval(() => {
  if (!AC || AC.state !== 'running' || music.mode === 'off') return;
  if (music.next < AC.currentTime) music.next = AC.currentTime + .05;
  while (music.next < AC.currentTime + .12) {
    discoStep(music.step, music.next);
    music.next += 60 / music.bpm / 4;
    music.step = (music.step + 1) % 64;
  }
}, 25);

export const audio = {
  unlock() { try { ctxA(); setMusicLevel(); } catch { /* no audio */ } },
  play(name, arg) { try { SFX[name] && SFX[name](arg); } catch { /* audio not available */ } },
  setVolume(v) { audioState.vol = v; applyVolume(); },
  setMute(m) { audioState.mute = m; applyVolume(); },
  // 'menu' (start page, game over), 'intro' (quiet under the intro), 'game' (full, speeds up), 'off'
  music(mode) {
    if (mode === music.mode) return;
    music.mode = mode;
    if (mode === 'game' || mode === 'menu') music.bpm = mode === 'game' ? 120 : 118;
    if (mode === 'game') music.step = 0;            // start the loop on a clean downbeat at GO
    setMusicLevel();
  },
  setMusicOn(on) { music.on = on; setMusicLevel(); },
  setBpm(b) { music.bpm = b; }
};
