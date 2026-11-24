// Wires everything together: camera -> tracker -> input -> game -> render / audio / UI (SPEC §9).
import { CONFIG, W, H } from './config.js';
import { nowMs } from './util.js';
import { translator } from './i18n.js';
import { loadSettings, saveSettings } from './storage.js';
import { audio } from './audio.js';
import { createGame, stepGame, gameStats } from './game.js';
import { createInput, inputFromPose, inputFromHands, pointerMove, pointerEnd, clearCamera, handPoints } from './input.js';
import { loadTracker, closeTracker, detectFrame } from './tracker.js';
import { openWebcam, openClip, closeSource, recordClip, downloadBlob, listCameras, pickCamera } from './camera.js';
import { createRenderer, renderEvents, renderTick, renderFrame } from './render.js';
import { createIntro, tickIntro, skipIntro } from './intro.js';
import { createDebug, drawDebugOverlay } from './debug.js';
import { createUI } from './ui.js';

/* ---------------- state ---------------- */
const S = loadSettings({ ...CONFIG.defaults, lang: (navigator.language || '').toLowerCase().startsWith('sv') ? 'sv' : 'en' });
let t = translator(S.lang);
const stage = document.getElementById('stage');
const R = createRenderer(document.getElementById('c'));
const inp = createInput();
const cam = { source: null, tracker: null, failed: false, loopToken: 0, busy: false, frames: 0, last: null, devices: [] };
const run = { screen: 'menu', game: null, intro: null, introEnd: null, flow: 0, pendingMode: 1, calibratedMode: 0, calibT: 0, acc: 0, fpsAcc: 0, fpsN: 0, statsT: 0, renderFps: 0, detectFps: 0 };
let SCALE = 1;

/* ---------------- app API used by the UI ---------------- */
const app = {
  settings: S,
  t: k => t(k),
  click: () => audio.play('click'),
  cheer: () => audio.play('combo'),
  play: mode => startGame(mode),
  calibDone: () => startCountdown(),
  toMenu: () => goMenu(),
  toggleMute: () => { S.mute = !S.mute; saveSettings(S); audio.unlock(); audio.setMute(S.mute); ui.setMuteIcon(S.mute); },
  setSetting(key, value) {
    S[key] = value; saveSettings(S);
    if (key === 'lang') { t = translator(S.lang); ui.applyLang(); refreshCamUI(); }
    if (key === 'music') { audio.setMusicOn(!!value); musicHint(); }
    if (key === 'vol') { S.mute = false; audio.setVolume(S.vol); audio.setMute(false); ui.setMuteIcon(false); }
    if (key === 'cam' && !value && cam.source && cam.source.kind === 'webcam') { closeSource(cam.source); cam.source = null; clearCamera(inp); }
    if (key === 'camId' && cam.source && cam.source.kind === 'webcam') maybeSwitchCamera(true);
    if (key === 'cam') checkCamera();

  }
};
const ui = createUI(app);
const debug = createDebug({ onRecord: recordTestClip, onLoadClip: useClip, onWebcam: useWebcam, onExport: exportLandmarks });
ui.applyLang(); ui.setMuteIcon(S.mute); audio.setVolume(S.vol); audio.setMute(S.mute);
// disco music starts on the start page; browsers only allow sound after the first tap / click / key
audio.setMusicOn(S.music !== false); audio.music('menu');
let soundUnlocked = false;
function musicHint() { document.getElementById('musicHint').classList.toggle('hidden', soundUnlocked || S.music === false); }
function unlockSound() { audio.unlock(); if (!soundUnlocked) { soundUnlocked = true; musicHint(); } }
musicHint();
document.getElementById('musicHint').onclick = unlockSound;

/* ---------------- layout ---------------- */
function fit() {
  const availH = innerHeight - 60;
  SCALE = Math.min(innerWidth / W, availH / H);
  stage.style.transform = `scale(${SCALE})`;
  stage.style.left = `${(innerWidth - W * SCALE) / 2}px`;
  stage.style.top = `${52 + (availH - H * SCALE) / 2 + 4}px`;
}
addEventListener('resize', fit); fit();
const toLogical = e => { const b = stage.getBoundingClientRect(); return [(e.clientX - b.left) / SCALE, (e.clientY - b.top) / SCALE]; };

/* ---------------- mouse / touch (play only) ---------------- */
const currentMode = () => (run.game ? run.game.mode : run.pendingMode);
const pointerActive = e => run.screen === 'game' && !(e.target.closest && e.target.closest('#bar, #debugPanel'));
addEventListener('pointerdown', e => {
  unlockSound();
  if (run.screen === 'intro' && !(e.target.closest && e.target.closest('#bar, #debugPanel'))) { skipIntro(run.intro); return; }
  if (!pointerActive(e) || e.pointerType === 'mouse') return;
  const [x, y] = toLogical(e); pointerMove(inp, 't' + e.pointerId, 'touch', x, y, nowMs(), currentMode());
});
addEventListener('pointermove', e => {
  if (!pointerActive(e)) return;
  const [x, y] = toLogical(e);
  if (e.pointerType === 'mouse') pointerMove(inp, 'mouse', 'mouse', x, y, nowMs(), currentMode());
  else if (inp.ptrs.has('t' + e.pointerId)) pointerMove(inp, 't' + e.pointerId, 'touch', x, y, nowMs(), currentMode());
});
const endTouch = e => { if (e.pointerType !== 'mouse') pointerEnd(inp, 't' + e.pointerId); };
addEventListener('pointerup', endTouch); addEventListener('pointercancel', endTouch);
addEventListener('keydown', e => {
  unlockSound();
  if ((e.key === 'd' || e.key === 'D') && !ui.entry) { debug.toggle(); return; }
  if (run.screen === 'intro' && e.key !== 'Escape') skipIntro(run.intro);
});

/* ---------------- camera + tracking ---------------- */
// Single-flight: a background warm-up and pressing play share one camera / model start-up.
function ensureTracking(quiet = false) {
  if (!cam.pending) cam.pending = startTracking(quiet).finally(() => { cam.pending = null; refreshCamUI(); });
  refreshCamUI();
  return cam.pending;
}
async function startTracking(quiet) {
  try {
    if (!cam.source) { if (!quiet) ui.loading(t('loadCam')); setSource(await openPreferredWebcam()); announceCamera(); }
    if (!cam.tracker || cam.tracker.kind !== S.track) {
      if (!quiet) ui.loading(t('loadModel'));
      const tr = await loadTracker(S.track);
      cam.busy = true; closeTracker(cam.tracker); cam.tracker = tr; cam.busy = false;
      clearCamera(inp); run.calibratedMode = 0;
    }
  } catch (err) {
    console.warn('Camera / tracking unavailable', err);
    cam.failed = true; cam.lastError = err && err.name;
    ui.toast(t(err && err.name === 'NotAllowedError' ? 'camDenied' : err && err.name === 'NotFoundError' ? 'camNone' : 'camErr'), 7000);
  }
}
function setSource(src) {
  if (cam.source) closeSource(cam.source);
  cam.source = src; clearCamera(inp);
  const token = ++cam.loopToken;
  const loop = () => {
    if (token !== cam.loopToken || !cam.source) return;
    detectOnce();
    const v = cam.source.video;
    if (v.requestVideoFrameCallback) v.requestVideoFrameCallback(loop); else setTimeout(loop, 33);
  };
  loop();
}
function detectOnce() {
  if (!cam.tracker || cam.busy || (run.screen !== 'game' && run.screen !== 'calib')) return;
  let res;
  try { res = detectFrame(cam.tracker, cam.source.video, { mode: currentMode(), zoom: S.zoom }); } catch (e) { console.warn(e); return; }
  if (!res) return;
  cam.frames++;
  const ctx = { now: nowMs(), mode: currentMode(), vw: res.vw, vh: res.vh, zoom: S.zoom };
  if (res.kind === 'pose') inputFromPose(inp, res.landmarks, ctx); else inputFromHands(inp, res.landmarks, ctx);
  if (debug.visible && debug.timeline.length < 4000) {
    const r4 = v => Math.round(v * 1e4) / 1e4;
    debug.timeline.push({ t: Math.round(ctx.now), vw: res.vw, vh: res.vh, lm: res.landmarks.map(l => l.map(q => [r4(q.x), r4(q.y), r4(q.visibility ?? 1)])) });
    debug.setFrames(debug.timeline.length);
  }
}
const trackingReady = () => !!(cam.tracker && cam.source);

/* ---------------- flow ---------------- */
async function startGame(mode) {
  audio.unlock(); audio.play('click');
  ui.clearResults(); ui.show(null); ui.setQuit(true); wakeLock();
  audio.music('intro');
  const token = ++run.flow;
  run.pendingMode = mode; run.game = null;
  // the intro plays while the camera and body tracking load in the background
  run.intro = createIntro(mode === 2 ? '2p' : '1p', Math.random, S.anim); run.screen = 'intro';
  let trackingDone = !(S.cam && !cam.failed);
  const tracking = trackingDone ? Promise.resolve() : ensureTracking(true).then(() => { trackingDone = true; });
  await new Promise(res => { run.introEnd = res; });
  if (token !== run.flow) return;                         // player went back to the menu
  if (!trackingDone) { ui.loading(t(cam.source ? 'loadModel' : 'loadCam')); await tracking; if (token !== run.flow) return; }
  if (!trackingReady()) ui.toast(t('mouseMode'), 5000);
  clearCamera(inp);
  if (trackingReady() && run.calibratedMode !== mode) { run.screen = 'calib'; run.calibT = 0; ui.show('calib'); ui.calibChips(mode, []); }
  else startCountdown();
}
function startCountdown() {
  const mode = run.pendingMode;
  run.calibratedMode = trackingReady() ? mode : run.calibratedMode;
  run.game = createGame({ mode, difficulty: S.diff, duration: S.dur, mega: S.mega, reverse: S.reverse !== false, seed: (Date.now() & 0x7fffffff) });
  run.acc = 0; run.screen = 'game'; ui.show(null);
}
function endGame() {
  if (cam.pendingSwitch) setTimeout(() => maybeSwitchCamera(), 0);   // a better camera was plugged in during the round
  const g = run.game;
  audio.music('menu'); audio.play('over');
  run.screen = 'over'; ui.setQuit(false);
  ui.gameOver(g.lanes.map((l, i) => ({ player: i, ...gameStats(l) })), g.mode);
}
function goMenu() {
  if (cam.pendingSwitch) setTimeout(() => maybeSwitchCamera(), 0);   // a better camera was plugged in during the round
  run.flow++; if (run.introEnd) { run.introEnd(); run.introEnd = null; }
  audio.music('menu'); run.game = null; run.screen = 'menu';
  ui.clearResults(); ui.setQuit(false); ui.show('menu');
}
let wl = null;
async function wakeLock() { try { if (navigator.wakeLock && !wl) { wl = await navigator.wakeLock.request('screen'); wl.addEventListener('release', () => { wl = null; }); } } catch { /* not allowed */ } }
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && run.screen === 'game') wakeLock(); });

function handleEvents(events) {
  for (const e of events) {
    if (e.type === 'grab') audio.play('grab');
    else if (e.type === 'correct') audio.play(e.mega ? 'mega' : e.milestone ? 'combo' : 'good', e.combo);
    else if (e.type === 'merge') audio.play('mega');
    else if (e.type === 'reverse-warn') audio.play('warn');
    else if (e.type === 'reverse') audio.play('reverse');
    else if (e.type === 'wrong') audio.play('wrong');
    else if (e.type === 'miss') audio.play('miss');
    else if (e.type === 'tick') audio.play('tick');
    else if (e.type === 'faster') audio.play('faster');
    else if (e.type === 'go') { audio.play('go'); audio.music('game'); }
  }
  renderEvents(R, events, run.game, t);
  if (events.some(e => e.type === 'over')) endGame();
}

/* ---------------- debug tools ---------------- */
async function useClip(file) {
  try { setSource(await openClip(file)); ui.toast(`▶ ${file.name}`); if (!cam.tracker) await ensureTracking(); ui.show(run.screen === 'menu' ? 'menu' : null); }
  catch (e) { ui.toast(`Could not play clip: ${e.message}`); }
}
async function useWebcam() {
  try { setSource(await openPreferredWebcam()); announceCamera(true); } catch (e) { ui.toast(`Webcam: ${e.message}`); }
}
async function recordTestClip() {
  try {
    if (!cam.source || cam.source.kind !== 'webcam') setSource(await openPreferredWebcam());
    recordClip(cam.source.stream, 20, left => debug.setRecording(left > 0 ? `⏺ Recording… ${left}s` : '⏺ Record clip (20 s)'), err => { debug.setRecording('⏺ Record clip (20 s)'); ui.toast(err ? err.message : 'Clip saved to your Downloads folder'); });
  } catch (e) { ui.toast(`Recording failed: ${e.message}`); }
}
function exportLandmarks() {
  if (!debug.timeline.length) { ui.toast('Nothing captured yet: keep the debug panel open while playing'); return; }
  const data = { version: 1, kind: cam.tracker ? cam.tracker.kind : null, mode: currentMode(), zoom: S.zoom, source: cam.source ? cam.source.kind : null, frames: debug.timeline };
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  downloadBlob(new Blob([JSON.stringify(data)], { type: 'application/json' }), `bdou-landmarks-${stamp}.json`);
  debug.timeline = []; debug.setFrames(0);
}

/* ---------------- main loop (fixed-timestep game) ---------------- */
const STEP = 1 / 60;
let last = performance.now();
function frame(now) {
  const dt = Math.min(.25, (now - last) / 1000); last = now;
  const holding = new Set(run.game ? run.game.items.filter(i => i.st === 'held').map(i => i.holder) : []);
  const hands = handPoints(inp, nowMs(), holding);
  const players = run.screen === 'calib' ? run.pendingMode : run.game ? run.game.mode : 1;
  const seen = [false, false];
  for (const h of hands) if ((h.kind === 'body' || h.kind === 'hand') && !h.lost) seen[h.player] = true;

  if (run.screen === 'intro' && run.intro) {
    for (const cue of tickIntro(run.intro, dt)) { audio.play(cue); if (cue === 'vs' || cue === 'thunder') R.shake = Math.max(R.shake, cue === 'vs' ? 16 : 10); }
    if (run.intro.done) { run.screen = 'intro-wait'; const end = run.introEnd; run.introEnd = null; if (end) end(); }
  } else if (run.screen === 'calib') {
    ui.calibChips(players, seen);
    const all = seen.slice(0, players).every(Boolean);
    run.calibT = all ? run.calibT + dt : 0;
    if (run.calibT > 1) { audio.play('ready'); startCountdown(); }
  } else if (run.screen === 'game' && run.game) {
    run.acc += dt;
    while (run.acc >= STEP && run.screen === 'game') {
      run.acc -= STEP;
      handleEvents(stepGame(run.game, STEP, hands));
    }
    if (run.game && run.game.phase === 'play') audio.setBpm(120 + Math.min(24, run.game.step * 1.2));
  }

  renderTick(R, dt);
  const video = cam.source && (S.cam || cam.source.kind === 'clip') ? cam.source.video : null;
  renderFrame(R, {
    screen: run.screen.startsWith('intro') ? 'intro' : run.screen === 'calib' ? 'calib' : run.screen === 'game' ? 'game' : 'menu',
    intro: run.intro, game: run.game, mode: players, hands, video, zoom: S.zoom, backdrop: S.backdrop, t,
    seen, cameraOn: trackingReady(), people: inp.debug.people
  });
  if (debug.visible) drawDebugOverlay(R.ctx, { inputDebug: inp.debug, hands, game: run.screen === 'game' ? run.game : null });

  // stats + automatic low-effects mode on slow machines
  run.fpsAcc += dt; run.fpsN++; run.statsT += dt;
  if (run.statsT >= 1) {
    run.renderFps = run.fpsN / run.fpsAcc; run.detectFps = cam.frames / run.statsT;
    if (run.screen === 'game' && run.renderFps < 28) R.low = true;
    if (debug.visible) {
      const v = cam.source && cam.source.video;
      debug.setStats([
        `source   ${cam.source ? `${cam.source.kind}${cam.source.name ? ' ' + cam.source.name : ''}${cam.source.label ? ' "' + cam.source.label + '"' : ''} ${v.videoWidth}×${v.videoHeight}` : 'none'}   (${cam.devices.length} camera${cam.devices.length === 1 ? '' : 's'})`,
        `tracker  ${cam.tracker ? cam.tracker.kind : 'none'}   detect ${run.detectFps.toFixed(0)} fps   render ${run.renderFps.toFixed(0)} fps${R.low ? ' (low fx)' : ''}`,
        `hands    ${hands.map(h => h.id + (h.lost ? '?' : '')).join(' ') || '–'}`,
        `rejects  ${inp.debug.rejects.map(r => r.why).join(', ') || '–'}`
      ].join('\n'));
    }
    run.fpsAcc = run.fpsN = run.statsT = 0; cam.frames = 0;
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(n => { last = n; requestAnimationFrame(frame); });

// handy for testing in the browser console
/* ---------------- camera permission on the start page ---------------- */
// Browsers always need the player to allow the camera once. If it is already allowed we switch the camera and
// tracking on in the background right away; otherwise a friendly button asks before anyone presses play.
const camBtn = document.getElementById('camBtn');
let camPerm = 'unknown', camReadyFlash = false;
function refreshCamUI() {
  let state = 'ask';
  if (!S.cam || cam.lastError === 'NotFoundError') state = 'hidden';
  else if (trackingReady()) state = camReadyFlash ? 'ready' : 'hidden';
  else if (cam.pending) state = 'waking';
  else if (camPerm === 'denied' || cam.lastError === 'NotAllowedError') state = 'blocked';
  camBtn.dataset.state = state;
  camBtn.classList.toggle('hidden', state === 'hidden');
  camBtn.textContent = t({ ask: 'camAsk', waking: 'camWaking', ready: 'camReady', blocked: 'camBlocked' }[state] || 'camAsk');
}
function warmCamera() {
  cam.failed = false; cam.lastError = null;
  ensureTracking(true).then(() => {
    if (!trackingReady()) return;
    camReadyFlash = true; refreshCamUI();
    setTimeout(() => { camReadyFlash = false; refreshCamUI(); }, 2500);
  });
}
camBtn.onclick = () => {
  unlockSound(); audio.play('click');
  if (camBtn.dataset.state === 'blocked') ui.toast(t('camHelp'), 10000);
  else if (camBtn.dataset.state === 'ask') warmCamera();
};
async function checkCamera() {
  if (!S.cam) { refreshCamUI(); return; }
  try {
    const st = await navigator.permissions.query({ name: 'camera' });
    camPerm = st.state;
    st.onchange = () => { camPerm = st.state; if (st.state === 'granted' && !trackingReady()) warmCamera(); refreshCamUI(); };
  } catch { camPerm = 'unknown'; }       // older browsers: just show the button
  if (camPerm === 'granted' && !trackingReady()) warmCamera();
  refreshCamUI();
}
checkCamera();

/* ---------------- which camera: prefer an external webcam ---------------- */
// Open the camera chosen in Settings, or (auto) the best one: an external webcam beats the laptop's built-in camera.
async function openPreferredWebcam() {
  const want = S.camId && S.camId !== 'auto' ? S.camId : null;
  let src;
  try { src = await openWebcam(want); }
  catch (e) { if (!want || e.name === 'NotAllowedError') throw e; src = await openWebcam(); }   // chosen camera unplugged: use another
  await refreshCameraList();                                    // names are only visible after permission
  const best = pickCamera(cam.devices, S.camId || 'auto');
  if (best && best.deviceId && best.deviceId !== src.deviceId) {
    try { const better = await openWebcam(best.deviceId); closeSource(src); src = better; } catch { /* keep the one that works */ }
  }
  return src;
}
async function refreshCameraList() {
  cam.devices = await listCameras();
  ui.setCameras(cam.devices, S.camId || 'auto');
}
function announceCamera(always = false) {
  if (cam.source && cam.source.kind === 'webcam' && cam.source.label && (always || cam.devices.length > 1)) ui.toast(t('camUsing').replace('{name}', cam.source.label), 3500);
}
const busyScreen = () => ['game', 'calib', 'intro', 'intro-wait'].includes(run.screen);
// Switch to the best camera now, unless a round is running (then wait), or the current camera has gone.
async function maybeSwitchCamera(force = false) {
  if (!cam.source || cam.source.kind !== 'webcam' || cam.switching) return;
  const best = pickCamera(cam.devices, S.camId || 'auto');
  if (!best || !best.deviceId || best.deviceId === cam.source.deviceId) return;
  const gone = !cam.devices.some(d => d.deviceId === cam.source.deviceId);
  if (busyScreen() && !gone && !force) { cam.pendingSwitch = true; return; }
  cam.switching = true; cam.pendingSwitch = false;
  try { setSource(await openWebcam(best.deviceId)); announceCamera(true); }
  catch (e) { console.warn('Camera switch failed', e); }
  cam.switching = false;
}
if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
  navigator.mediaDevices.addEventListener('devicechange', async () => { await refreshCameraList(); maybeSwitchCamera(); });
}
refreshCameraList();

window.__bdou = { run, S, inp, cam, R, startGame, ui, setSource, detectOnce, checkCamera, refreshCamUI };
