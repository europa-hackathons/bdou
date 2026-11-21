// DOM screens: menu, settings, high scores, loading, calibration panel, game over, initials and leaderboard.
// Camera input never drives these screens (SPEC §6): mouse, touch and keyboard only.
import { CONFIG } from './config.js';
import { loadScores, qualifies, addScore } from './storage.js';

const byId = id => document.getElementById(id);
const SCREENS = ['menu', 'hsScreen', 'loading', 'calib', 'over'];

export function createUI(app) {
  const ui = { entry: null, queue: [], letters: '', highlight: null, results: null, mode: 1 };

  /* ---- static options ---- */
  CONFIG.durations.forEach(n => { const o = document.createElement('option'); o.value = n; o.textContent = `${n} s`; byId('durSel').appendChild(o); });
  ['easy', 'normal', 'hard'].forEach(k => { const o = document.createElement('option'); o.value = k; byId('diffSel').appendChild(o); });
  ['kawaii', 'anime'].forEach(k => { const o = document.createElement('option'); o.value = k; byId('animSel').appendChild(o); });
  ['pose', 'hand'].forEach(k => { const o = document.createElement('option'); o.value = k; byId('trkSel').appendChild(o); });
  const kbd = byId('kbd');
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach(ch => { const b = document.createElement('button'); b.textContent = ch; b.onclick = () => addLetter(ch); kbd.appendChild(b); });
  const del = document.createElement('button'); del.id = 'kDel'; del.className = 'wide'; del.onclick = delLetter; kbd.appendChild(del);
  const ok = document.createElement('button'); ok.id = 'kOk'; ok.className = 'wide'; ok.onclick = confirmEntry; kbd.appendChild(ok);

  /* ---- settings form ---- */
  const S = app.settings;
  byId('durSel').value = S.dur; byId('diffSel').value = S.diff; byId('volRange').value = S.vol;
  byId('musicChk').checked = S.music !== false; byId('musicChk').onchange = e => app.setSetting('music', e.target.checked);
  byId('animSel').value = S.anim || 'kawaii'; byId('animSel').onchange = e => app.setSetting('anim', e.target.value);
  byId('megaChk').checked = S.mega; byId('megaChk').onchange = e => app.setSetting('mega', e.target.checked);
  byId('camChk').checked = S.cam; byId('trkSel').value = S.track; byId('zoomRange').value = S.zoom; byId('zoomRange2').value = S.zoom; byId('bdChk').checked = S.backdrop;
  byId('durSel').onchange = e => app.setSetting('dur', +e.target.value);
  byId('diffSel').onchange = e => app.setSetting('diff', e.target.value);
  byId('volRange').oninput = e => app.setSetting('vol', +e.target.value);
  byId('camChk').onchange = e => app.setSetting('cam', e.target.checked);
  byId('trkSel').onchange = e => app.setSetting('track', e.target.value);
  byId('bdChk').onchange = e => app.setSetting('backdrop', e.target.checked);
  const zoom = e => { byId('zoomRange').value = byId('zoomRange2').value = e.target.value; app.setSetting('zoom', +e.target.value); };
  byId('zoomRange').oninput = zoom; byId('zoomRange2').oninput = zoom;

  /* ---- buttons ---- */
  const click = fn => () => { app.click(); fn(); };
  byId('play1').onclick = () => app.play(1);
  byId('play2').onclick = () => app.play(2);
  byId('hsBtn').onclick = click(() => { renderBoard(byId('board2'), null); ui.show('hsScreen'); });
  byId('hsBack').onclick = click(() => ui.show('menu'));
  byId('menuSet').onclick = byId('setBtn').onclick = click(() => byId('settings').classList.remove('hidden'));
  byId('setClose').onclick = click(() => byId('settings').classList.add('hidden'));
  byId('calibGo').onclick = click(() => app.calibDone());
  byId('again').onclick = click(() => app.play(ui.mode));
  byId('toMenu').onclick = click(() => app.toMenu());
  byId('quitBtn').onclick = click(() => app.toMenu());
  byId('muteBtn').onclick = () => app.toggleMute();
  byId('fsBtn').onclick = () => { try { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen(); } catch { /* not allowed */ } };
  document.querySelectorAll('[data-lang]').forEach(b => { b.onclick = click(() => app.setSetting('lang', b.dataset.lang)); });

  addEventListener('keydown', e => {
    if (ui.entry) {
      if (/^[a-z]$/i.test(e.key)) { addLetter(e.key.toUpperCase()); e.preventDefault(); }
      else if (e.key === 'Backspace') { delLetter(); e.preventDefault(); }
      else if (e.key === 'Enter') { confirmEntry(); e.preventDefault(); }
      return;
    }
    if (e.key === 'Escape') app.toMenu();
  });

  /* ---- screens ---- */
  ui.show = name => { SCREENS.forEach(s => byId(s).classList.toggle('hidden', s !== name)); };
  ui.setQuit = on => byId('quitBtn').classList.toggle('hidden', !on);
  ui.setMuteIcon = m => { byId('muteBtn').textContent = m ? '🔇' : '🔊'; };
  ui.loading = msg => { ui.show('loading'); byId('loadMsg').textContent = msg; };
  ui.toast = (msg, ms = 4500) => {
    const e = byId('toast'); e.textContent = msg; e.classList.remove('hidden');
    clearTimeout(ui.toastT); ui.toastT = setTimeout(() => e.classList.add('hidden'), ms);
  };
  ui.calibChips = (players, seen) => {
    const t = app.t, box = byId('calibChips');
    if (box.children.length !== players) box.innerHTML = Array.from({ length: players }, (_, i) => `<span class="chip" style="${players === 2 ? 'border-color:' + (i ? 'var(--cyan)' : 'var(--pink)') : ''}"></span>`).join('');
    [...box.children].forEach((c, i) => {
      const txt = (players === 2 ? `${t('p')}${i + 1}: ` : '') + (seen[i] ? t('calibOk') : t('calibWait'));
      if (c.textContent !== txt) c.textContent = txt;
      c.classList.toggle('ok', !!seen[i]);
    });
  };

  ui.applyLang = () => {
    const t = app.t;
    document.documentElement.lang = app.settings.lang;
    document.querySelectorAll('[data-i18n]').forEach(e => { e.textContent = t(e.dataset.i18n); });
    document.querySelectorAll('[data-i18n-title]').forEach(e => { e.title = t(e.dataset.i18nTitle); });
    document.querySelectorAll('[data-lang]').forEach(e => e.classList.toggle('on', e.dataset.lang === app.settings.lang));
    [...byId('diffSel').options].forEach(o => { o.textContent = t(o.value); });
    [...byId('trkSel').options].forEach(o => { o.textContent = t('trk_' + o.value); });
    [...byId('animSel').options].forEach(o => { o.textContent = t('anim_' + o.value); });
    byId('kDel').textContent = t('del'); byId('kOk').textContent = t('ok');
    byId('goTitle').textContent = t('gameover');
    if (ui.results) renderScores();
    if (ui.entry) renderEntry();
    if (!byId('boardWrap').classList.contains('hidden')) showBoard();
    if (!byId('hsScreen').classList.contains('hidden')) renderBoard(byId('board2'), null);
  };

  /* ---- game over flow ---- */
  ui.gameOver = (results, mode) => {
    ui.results = results; ui.mode = mode; ui.highlight = null;
    ui.show('over'); byId('entry').classList.add('hidden'); byId('boardWrap').classList.add('hidden');
    byId('goTitle').textContent = app.t('gameover');
    renderScores();
    ui.queue = results.map(r => r);
    setTimeout(nextEntry, 900); // short pause so a waving hand or stray click can't type letters
  };
  function renderScores() {
    const t = app.t, multi = ui.results.length === 2;
    byId('goScores').innerHTML = ui.results.map((r, i) =>
      `<span style="${multi ? 'color:' + (i ? 'var(--cyan)' : 'var(--pink)') : ''}">${multi ? `${t('p')}${i + 1}: ` : ''}${r.score}` +
      `<small>🍣 ${r.sorted} ${t('sorted')} · 🔥 ${r.best} ${t('best')} · 🎯 ${r.accuracy}% ${t('acc')}</small></span>`).join('');
  }
  function nextEntry() {
    while (ui.queue.length) { const r = ui.queue.shift(); if (qualifies(r.score)) { ui.entry = r; ui.letters = ''; renderEntry(); return; } }
    ui.entry = null; showBoard();
  }
  function renderEntry() {
    const t = app.t;
    byId('entry').classList.remove('hidden'); byId('boardWrap').classList.add('hidden');
    byId('entryMsg').textContent = (ui.results.length === 2 ? `${t('p')}${ui.entry.player + 1} – ` : '') + t('enter');
    [...byId('slots').children].forEach((s, i) => { s.textContent = ui.letters[i] || ''; s.classList.toggle('cur', i === ui.letters.length); });
    byId('kOk').disabled = ui.letters.length < 3;
  }
  function addLetter(ch) { if (ui.entry && ui.letters.length < 3) { ui.letters += ch; app.click(); renderEntry(); } }
  function delLetter() { if (ui.entry && ui.letters.length) { ui.letters = ui.letters.slice(0, -1); app.click(); renderEntry(); } }
  function confirmEntry() {
    if (!ui.entry || ui.letters.length < 3) return;
    ui.highlight = addScore(ui.letters, ui.entry.score, ui.mode);
    ui.entry = null; byId('entry').classList.add('hidden'); app.cheer(); nextEntry();
  }
  function showBoard() {
    renderBoard(byId('board'), ui.highlight);
    let w = '';
    if (ui.results && ui.results.length === 2) { const [a, b] = ui.results; w = a.score === b.score ? app.t('tie') : app.t('winner').replace('{n}', a.score > b.score ? 1 : 2); }
    byId('winner').textContent = w; byId('winner').style.display = w ? '' : 'none';
    byId('boardWrap').classList.remove('hidden');
  }
  function renderBoard(tbl, hl) {
    const t = app.t, h = loadScores();
    let html = `<tr><th>${t('rank')}</th><th>${t('name')}</th><th style="text-align:right">${t('pts')}</th></tr>`;
    for (let i = 0; i < 5; i++) { const e = h[i]; html += `<tr class="${e && e.id === hl ? 'me' : ''}"><td>${i + 1}</td><td>${e ? e.name : '---'}</td><td>${e ? e.score : '-'}</td></tr>`; }
    tbl.innerHTML = html;
  }
  ui.clearResults = () => { ui.results = null; ui.entry = null; };
  return ui;
}
