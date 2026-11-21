// Web Audio oscillator sound effects and a simple disco beat. No audio files.
let AC = null, master = null, noiseBuf = null;
const audioState = { vol: .6, mute: false, beatOn: false, next: 0, step: 0, bpm: 118 };

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

const BASS = [0, -1, 0, -1, 12, -1, 0, -1, 7, -1, 7, -1, 10, -1, 5, -1];
const ARP = [0, 3, 7, 10, 12, 10, 7, 3];
function beatStep(s, at) {
  const rel = at - AC.currentTime;
  if (s % 4 === 0) tone(150, .16, 'sine', .45, rel, 40);
  if (s % 2 === 1) noise(.05, .12, rel, 7000);
  if (s % 8 === 4) noise(.12, .18, rel, 1800);
  if (BASS[s] >= 0) tone(55 * Math.pow(2, BASS[s] / 12), .2, 'sawtooth', .13, rel);
  if (s % 2 === 1) tone(220 * Math.pow(2, ARP[(s >> 1) % 8] / 12), .1, 'square', .04, rel);
}
setInterval(() => {
  if (!audioState.beatOn || !AC) return;
  while (audioState.next < AC.currentTime + .15) {
    beatStep(audioState.step, Math.max(audioState.next, AC.currentTime));
    audioState.next += 60 / audioState.bpm / 2;
    audioState.step = (audioState.step + 1) % 16;
  }
}, 40);

export const audio = {
  unlock() { ctxA(); },
  play(name, arg) { try { SFX[name] && SFX[name](arg); } catch { /* audio not available */ } },
  setVolume(v) { audioState.vol = v; applyVolume(); },
  setMute(m) { audioState.mute = m; applyVolume(); },
  beatStart() { try { ctxA(); audioState.beatOn = true; audioState.next = AC.currentTime + .05; audioState.step = 0; audioState.bpm = 118; } catch { /* no audio */ } },
  beatStop() { audioState.beatOn = false; },
  setBpm(b) { audioState.bpm = b; }
};
