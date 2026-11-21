// Draws the current view to the canvas. Visual effects (popups, particles, shake) live here, driven by game events.
import { CONFIG, W, H, BOX_TYPES } from './config.js';
import { clamp, rndRange } from './util.js';
import { SPRITES, BOX_STYLE } from './sprites.js';
import { itemRadius, sushiRadius, heldPairs } from './game.js';
import { introVersusAnime } from './anime.js';
import { FONT, PLAYER_COLORS, easeInOut, easeBack, span, hash01, rrect, comic, starShape } from './draw.js';


export function createRenderer(canvas) {
  canvas.width = W * 1.5; canvas.height = H * 1.5;
  return { canvas, ctx: canvas.getContext('2d'), clock: 0, pops: [], parts: [], shake: 0, flash: 0, low: false, boxFx: {}, decor: { items: [], dist: 0, spawnT: 0 } };
}

/* ---------- effects from game events ---------- */
function popText(r, text, x, y, color = '#ffe14d', size = 64) {
  r.pops.push({ text, x: clamp(x, 200, W - 200), y, age: 0, life: 1.1, color, size, rot: rndRange(-.15, .15) });
}
function burst(r, x, y, n, cols, spd = 380) {
  if (r.low) n = Math.ceil(n / 2);
  for (let i = 0; i < n; i++) {
    const a = rndRange(0, Math.PI * 2), s = rndRange(.3, 1) * spd;
    r.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 160, life: rndRange(.6, 1.1), age: 0, c: cols[i % cols.length], rad: rndRange(5, 11), star: Math.random() < .5, rot: rndRange(0, 6) });
  }
}
export function renderEvents(r, events, game, t) {
  const L = CONFIG.layout;
  for (const e of events) {
    const fxKey = `${e.lane}-${e.box}`;
    if (e.type === 'correct') {
      r.boxFx[fxKey] = { flash: 1, shake: 0 };
      if (e.mega) { popText(r, t('mega'), e.x, L.boxTop - 30, '#ffe14d', 72); r.shake = Math.max(r.shake, 16); burst(r, e.x, e.y, 50, ['#ffe14d', '#ff5fb0', '#2de2e6', '#fff'], 620); }
      else if (e.milestone) { popText(r, t('cm')[e.combo], e.x, L.boxTop - 30, '#ffe14d', 80); r.shake = Math.max(r.shake, 8 + e.combo * .3); burst(r, e.x, e.y, 26, ['#ffe14d', '#ff5fb0', '#2de2e6']); }
      else { const y = t('yum'); popText(r, y[Math.floor(Math.random() * y.length)], e.x, L.boxTop - 30, '#fff', 54); burst(r, e.x, e.y, 12, [BOX_STYLE[BOX_TYPES[e.box]].color, '#fff'], 340); }
      popText(r, '+' + e.points, e.x + rndRange(-40, 40), L.boxTop - 85, '#7dff9b', 36);
    } else if (e.type === 'wrong') {
      r.boxFx[fxKey] = { flash: 0, shake: 1 };
      popText(r, t('oops'), e.x, L.boxTop - 30, '#ff6b6b', 64); r.shake = Math.max(r.shake, 12); burst(r, e.x, e.y, 12, ['#888', '#ff5f5f'], 300);
    } else if (e.type === 'merge') {
      popText(r, t('mega'), e.x, e.y - 110, '#ffe14d', 76); r.shake = Math.max(r.shake, 12); burst(r, e.x, e.y, 40, ['#ffe14d', '#fff', '#ff5fb0', '#2de2e6'], 560);
    } else if (e.type === 'tip') {
      popText(r, t('tipMega'), W / 2, 340, '#fff', 30); r.pops[r.pops.length - 1].life = 3.2; r.pops[r.pops.length - 1].x = W / 2;
    } else if (e.type === 'grab') {
      burst(r, e.x, e.y, 6, ['#fff', '#ffe14d'], 220);
    } else if (e.type === 'miss') {
      if (game && game.lanes[e.lane] && game.lanes[e.lane].combo === 0) popText(r, t('miss'), e.x, e.y, '#ff9f9f', 36);
    } else if (e.type === 'faster') {
      popText(r, t('faster'), W / 2, 330, '#2de2e6', 60);
    } else if (e.type === 'go') {
      popText(r, t('go'), W / 2, 330, '#7dff9b', 130);
    } else if (e.type === 'over') {
      r.shake = 20; r.flash = 1;
    }
  }
}
export function renderTick(r, dt) {
  r.clock += dt;
  for (let i = r.parts.length - 1; i >= 0; i--) { const q = r.parts[i]; q.age += dt; q.vy += 900 * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.rot += dt * 6; if (q.age > q.life) r.parts.splice(i, 1); }
  for (let i = r.pops.length - 1; i >= 0; i--) { const q = r.pops[i]; q.age += dt; q.y -= 40 * dt; if (q.age > q.life) r.pops.splice(i, 1); }
  for (const k in r.boxFx) { const b = r.boxFx[k]; b.flash = Math.max(0, b.flash - dt * 3); b.shake = Math.max(0, b.shake - dt * 2.5); }
  r.shake *= Math.pow(.02, dt); if (r.shake < .3) r.shake = 0;
  r.flash = Math.max(0, r.flash - dt * 2);
  // decorative belt for the menu
  const d = r.decor; d.dist += 90 * dt; d.spawnT -= dt;
  if (d.spawnT <= 0) { d.items.push({ type: BOX_TYPES[Math.floor(Math.random() * 3)], x: W + 80, ph: Math.random() * 6 }); d.spawnT = 2.6; }
  for (let i = d.items.length - 1; i >= 0; i--) { const it = d.items[i]; it.x -= 90 * dt; it.ph += dt * 6; if (it.x < -100) d.items.splice(i, 1); }
}

/* ---------- drawing helpers ---------- */
function discoBall(r, x, y, rad) {
  const c = r.ctx;
  c.strokeStyle = '#fff'; c.lineWidth = 2; c.beginPath(); c.moveTo(x, 0); c.lineTo(x, y - rad); c.stroke();
  const g = c.createRadialGradient(x - rad * .3, y - rad * .3, rad * .1, x, y, rad);
  g.addColorStop(0, '#fff'); g.addColorStop(1, '#8a8fb8');
  c.fillStyle = g; c.beginPath(); c.arc(x, y, rad, 0, 7); c.fill();
  if (r.low) return;
  c.save(); c.beginPath(); c.arc(x, y, rad, 0, 7); c.clip();
  for (let a = -4; a < 5; a++) for (let b = -4; b < 5; b++) {
    c.fillStyle = `hsla(${(a * 40 + b * 25 + r.clock * 220) % 360},100%,70%,${.35 + .35 * Math.sin(r.clock * 6 + a * 2 + b)})`;
    c.fillRect(x + a * rad / 4 + (b % 2) * 4 - rad / 9, y + b * rad / 4 - rad / 9, rad / 4.5, rad / 4.5);
  }
  c.restore();
}

function drawBackground(r, view, forceVideo) {
  const c = r.ctx, h = (r.clock * 14) % 360;
  const g = c.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, `hsl(${(h + 270) % 360},75%,32%)`); g.addColorStop(.5, `hsl(${(h + 310) % 360},80%,42%)`); g.addColorStop(1, `hsl(${(h + 200) % 360},75%,30%)`);
  const v = view.video;
  const showVideo = v && v.readyState >= 2 && v.videoWidth && (forceVideo || (view.backdrop && !r.low));
  if (showVideo) {
    const vw = v.videoWidth, vh = v.videoHeight, s = Math.max(W / vw, H / vh) * view.zoom;
    c.save(); c.translate(W, 0); c.scale(-1, 1);
    c.drawImage(v, (W - vw * s) / 2, (H - vh * s) / 2, vw * s, vh * s); c.restore();
    c.globalAlpha = forceVideo ? .25 : .45; c.fillStyle = g; c.fillRect(0, 0, W, H); c.globalAlpha = 1;
  } else { c.fillStyle = g; c.fillRect(0, 0, W, H); }
  if (forceVideo) return;
  if (!r.low) {
    c.globalAlpha = .14;
    for (let y = 0; y < 5; y++) for (let x = 0; x < 17; x++) {
      if ((x + y + Math.floor(r.clock * 2)) % 2) { c.fillStyle = `hsl(${(x * 22 + y * 50 + r.clock * 120) % 360},100%,65%)`; c.fillRect(x * 80 - 40, 380 + y * 70, 78, 68); }
    }
    c.globalAlpha = 1;
    c.save(); c.globalCompositeOperation = 'lighter';
    [[300, 48, 1], [980, 48, -1]].forEach(([bx, by, dir]) => {
      for (let i = 0; i < 6; i++) {
        const a = r.clock * .5 * dir + i * Math.PI / 3, Lb = 900;
        c.fillStyle = `hsla(${(i * 60 + r.clock * 60) % 360},100%,60%,.09)`;
        c.beginPath(); c.moveTo(bx, by);
        c.lineTo(bx + Math.cos(a - .09) * Lb, by + Math.abs(Math.sin(a - .09)) * Lb * .9 + 40);
        c.lineTo(bx + Math.cos(a + .09) * Lb, by + Math.abs(Math.sin(a + .09)) * Lb * .9 + 40); c.fill();
      }
    });
    c.restore();
  }
  discoBall(r, 300, 48, 34); discoBall(r, 980, 48, 34);
}

function drawBelt(r, dist) {
  const c = r.ctx, L = CONFIG.layout;
  c.fillStyle = '#2b1b4a'; c.fillRect(-20, L.beltTop, W + 40, L.beltH);
  c.save(); c.beginPath(); c.rect(-20, L.beltTop + 6, W + 40, L.beltH - 12); c.clip();
  const off = ((dist % 48) + 48) % 48;
  for (let x = -96 - off; x < W + 96; x += 48) {
    c.fillStyle = Math.round((x + off + 96) / 48) % 2 ? '#4a2f86' : '#5d3ca8';
    c.beginPath(); c.moveTo(x, L.beltTop + L.beltH); c.lineTo(x + 24, L.beltTop); c.lineTo(x + 48, L.beltTop); c.lineTo(x + 24, L.beltTop + L.beltH); c.fill();
  }
  c.restore();
  c.lineWidth = 6; c.strokeStyle = `hsl(${(r.clock * 120) % 360},100%,65%)`;
  if (!r.low) { c.shadowColor = c.strokeStyle; c.shadowBlur = 16; }
  c.beginPath(); c.moveTo(0, L.beltTop); c.lineTo(W, L.beltTop); c.moveTo(0, L.beltTop + L.beltH); c.lineTo(W, L.beltTop + L.beltH); c.stroke(); c.shadowBlur = 0;
  for (let x = 20; x < W; x += 60) { c.fillStyle = `hsl(${(x + r.clock * 200) % 360},100%,70%)`; c.beginPath(); c.arc(x, L.beltTop + L.beltH + 14, 5, 0, 7); c.fill(); }
}

// Takeout pails: open paper flaps, wire handle, coloured bands and a clean label.
function drawBoxes(r, lane, li, mode, t, hover) {
  const c = r.ctx, bw = lane.w / 3, sc = mode === 2 ? .85 : 1;
  BOX_TYPES.forEach((type, i) => {
    const st = BOX_STYLE[type], fx = r.boxFx[`${li}-${i}`] || { flash: 0, shake: 0 };
    const x = lane.x0 + bw * i + 18, w = bw - 36, y = CONFIG.layout.boxTop, cx = x + w / 2, top = y + 44, bot = y + CONFIG.layout.boxH, inset = w * .14;
    c.save(); c.translate(fx.shake * Math.sin(r.clock * 50) * 10, -fx.flash * 10);
    c.fillStyle = 'rgba(0,0,0,.22)'; c.beginPath(); c.ellipse(cx, bot + 10, w * .46, 11, 0, 0, 7); c.fill();
    c.strokeStyle = '#b4bacb'; c.lineWidth = 4; c.lineCap = 'round';
    c.beginPath(); c.moveTo(x + w * .08, top + 6); c.quadraticCurveTo(cx, y - 64, x + w * .92, top + 6); c.stroke();
    c.fillStyle = '#fffdf7'; c.strokeStyle = '#e3dccb'; c.lineWidth = 3; c.lineJoin = 'round';
    for (const [fx0, d] of [[x, 1], [x + w, -1]]) {
      c.beginPath(); c.moveTo(fx0, top + 2); c.lineTo(fx0 + d * w * .1, y + 10); c.lineTo(fx0 + d * w * .4, y + 12); c.lineTo(fx0 + d * w * .45, top); c.closePath(); c.fill(); c.stroke();
    }
    c.fillStyle = '#2a1745'; c.beginPath(); c.ellipse(cx, top, w / 2 - 2, 24, 0, 0, 7); c.fill();
    const body = new Path2D();
    body.moveTo(x, top); body.lineTo(x + w, top); body.lineTo(x + w - inset, bot - 12); body.quadraticCurveTo(x + w - inset, bot, x + w - inset - 14, bot);
    body.lineTo(x + inset + 14, bot); body.quadraticCurveTo(x + inset, bot, x + inset, bot - 12); body.closePath();
    const g = c.createLinearGradient(x, 0, x + w, 0);
    g.addColorStop(0, '#f0e7d6'); g.addColorStop(.25, '#fffdf7'); g.addColorStop(.75, '#fffdf7'); g.addColorStop(1, '#eadfca');
    c.fillStyle = g; c.fill(body); c.strokeStyle = '#e3dccb'; c.lineWidth = 3; c.stroke(body);
    c.save(); c.clip(body);
    c.fillStyle = st.color; c.fillRect(x, top, w, 30); c.fillRect(x, bot - 24, w, 30);
    c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(x, top + 26, w, 4);
    c.restore();
    c.strokeStyle = '#fffdf7'; c.lineWidth = 6; c.beginPath(); c.ellipse(cx, top, w / 2 - 2, 24, 0, 0, Math.PI); c.stroke();
    const tw = w * .72, th = 110, ty0 = top + 42;
    rrect(c, cx - tw / 2, ty0, tw, th, 18); c.fillStyle = '#fff'; c.fill(); c.lineWidth = 4; c.strokeStyle = st.color; c.stroke();
    const isz = 76 * sc, img = SPRITES[type];
    if (img.complete) c.drawImage(img, cx - isz / 2, ty0 + 6, isz, isz);
    c.fillStyle = st.dark; c.font = `700 ${21 * sc}px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(st.badge + ' ' + t(type).toUpperCase(), cx, ty0 + th - 17 * sc);
    const hv = hover && hover[i];
    if (hv) { // a carried sushi is about to drop here: glow + filling ring
      c.strokeStyle = '#ffe14d'; c.lineWidth = 8; if (!r.low) { c.shadowColor = '#ffe14d'; c.shadowBlur = 22; }
      c.beginPath(); c.ellipse(cx, top, w / 2 + 4, 28, 0, 0, 7); c.stroke(); c.shadowBlur = 0;
      c.lineWidth = 10; c.beginPath(); c.ellipse(cx, top, w / 2 + 4, 28, 0, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, hv)); c.strokeStyle = '#fff'; c.stroke();
    }
    if (fx.flash > 0) { c.globalAlpha = fx.flash * .6; c.fillStyle = '#fff'; c.beginPath(); c.ellipse(cx, top, w / 2 - 2, 24, 0, 0, 7); c.fill(); c.globalAlpha = 1; }
    c.restore();
  });
}

function drawSushi(r, it, rad) {
  const c = r.ctx, img = SPRITES[it.type];
  if (!img.complete) return;
  let scale = 1 + Math.sin(it.ph * 1.3) * .03, alpha = 1, rot = Math.sin(it.ph * .7) * .06;
  if (it.st === 'held') { scale = 1.18; rot = Math.sin(it.ph * 2) * .05; }
  if (it.st === 'sink') { const k = Math.min(1, it.t); scale = 1.1 - k * .8; alpha = 1 - k * k; rot = k * 5; }
  const s = rad * 2 * scale;
  c.save(); c.translate(it.x, it.y); c.rotate(rot); c.globalAlpha = alpha;
  if (it.mega) { c.shadowColor = '#ffe14d'; c.shadowBlur = r.low ? 0 : 45; }
  else if (it.st === 'held') { c.shadowColor = '#fff'; c.shadowBlur = 30; }
  else if (it.st === 'belt') { c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(0, s * .46, s * .36, s * .08, 0, 0, 7); c.fill(); }
  c.drawImage(img, -s / 2, -s / 2, s, s);
  c.shadowBlur = 0;
  if (it.mega) {
    c.globalCompositeOperation = 'lighter'; c.globalAlpha = alpha * (.25 + .2 * Math.sin(r.clock * 10)); c.drawImage(img, -s / 2, -s / 2, s, s);
    c.globalCompositeOperation = 'source-over'; c.globalAlpha = alpha;
    c.rotate(-rot); c.font = `${s * .36}px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('👑', 0, -s * .52); c.rotate(rot);
  }
  if (it.st === 'float') {
    c.rotate(-rot); c.strokeStyle = '#ffe14d'; c.lineWidth = 7;
    c.beginPath(); c.arc(0, 0, s * .58, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0, it.ft) / (it.ft0 || CONFIG.interaction.floatMs / 1000)); c.stroke();
  }
  c.restore();
}

// glowing dashed line between two matching sushi held by one player; "MERGE!" when close
function drawMergeHint(r, a, b, R, t) {
  const c = r.ctx, close = Math.hypot(a.x - b.x, a.y - b.y) < R * CONFIG.mega.mergeDist * 2;
  c.save(); c.setLineDash([14, 12]); c.lineDashOffset = -r.clock * 60; c.strokeStyle = '#ffe14d'; c.lineWidth = 6;
  if (!r.low) { c.shadowColor = '#ffe14d'; c.shadowBlur = 18; }
  c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke(); c.restore();
  if (close) comic(c, '✨ ' + t('merge'), (a.x + b.x) / 2, (a.y + b.y) / 2 - 80, 34, '#ffe14d', 0, .8 + .2 * Math.sin(r.clock * 12));
}

function drawHandCursors(r, hands, mode, players) {
  const c = r.ctx;
  for (const h of hands) {
    const col = mode === 2 ? PLAYER_COLORS[h.player] || '#fff' : '#fff', holding = players && players.has(h.id);
    c.save(); c.globalAlpha = h.lost ? .35 : 1;
    if (h.kind === 'mouse' || h.kind === 'touch') {
      c.strokeStyle = holding ? '#ffe14d' : '#fff'; c.lineWidth = 5; c.beginPath(); c.arc(h.x, h.y, 40, 0, 7); c.stroke();
    } else {
      c.fillStyle = holding ? 'rgba(255,225,77,.55)' : 'rgba(255,255,255,.2)';
      c.strokeStyle = holding ? '#ffe14d' : col; c.lineWidth = 7;
      if (!r.low) { c.shadowColor = col; c.shadowBlur = 20; }
      c.beginPath(); c.arc(h.x, h.y, 46, 0, 7); c.fill(); c.stroke(); c.shadowBlur = 0;
      c.font = `48px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('✋', h.x, h.y + 3);
    }
    c.restore();
  }
}

function pill(c, x, y, w, h, col) {
  rrect(c, x, y, w, h, h / 2); c.fillStyle = 'rgba(43,27,74,.82)'; c.fill(); c.lineWidth = 4; c.strokeStyle = col; c.stroke();
}
function drawHud(r, game, view) {
  const c = r.ctx, multi = game.mode === 2, t = view.t;
  game.lanes.forEach((l, i) => {
    const col = multi ? PLAYER_COLORS[i] : '#ffe14d', right = i === 1, x = right ? l.x0 + l.w - 270 : l.x0 + 20;
    pill(c, x, 12, 250, 56, col);
    c.textBaseline = 'middle'; c.fillStyle = col; c.font = `700 18px ${FONT}`; c.textAlign = 'left';
    c.fillText(multi ? t('p') + (i + 1) : t('score'), x + 20, 40);
    c.fillStyle = '#fff'; c.font = `700 34px ${FONT}`; c.textAlign = 'right'; c.fillText(l.score, x + 232, 42);
    if (view.cameraOn) {
      const dx = right ? x - 16 : x + 266;
      c.fillStyle = view.seen[i] ? '#3ecf6a' : '#ff4d4d'; c.strokeStyle = '#fff'; c.lineWidth = 3;
      c.beginPath(); c.arc(dx, 40, 10, 0, 7); c.fill(); c.stroke();
    }
    if (l.combo >= 2) comic(c, `${t('combo')} x${l.combo}`, x + 125, 96 + Math.sin(r.clock * 12) * 2, 30 + Math.min(l.combo, 20), '#ffe14d');
  });
  const low = game.phase === 'play' && game.left <= 10, tt = Math.ceil(game.left);
  const sc = low ? 1 + .08 * Math.sin(r.clock * 14) : 1;
  c.save(); c.translate(W / 2, 40); c.scale(sc, sc);
  pill(c, -90, -28, 180, 56, low ? '#ff4d4d' : '#fff');
  c.fillStyle = low ? '#ff6b6b' : '#fff'; c.font = `700 38px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(`${Math.floor(tt / 60)}:${String(tt % 60).padStart(2, '0')}`, 0, 3);
  c.restore();
}

function drawCountdown(r, game, lanes, t) {
  const c = r.ctx, L = CONFIG.layout, total = CONFIG.countdown;
  // a hand demonstrates touch -> carry -> drop in each lane
  const k = clamp((total - game.cd) / total, 0, 1), e = k < .2 ? 0 : Math.min(1, (k - .2) / .65), ee = e * e * (3 - 2 * e);
  lanes.forEach(l => {
    const sx = l.x0 + l.w * .62, sy = L.itemY, ex = l.x0 + l.w / 6, ey = L.boxTop + 70;
    const x = sx + (ex - sx) * ee, y = sy + (ey - sy) * ee, s = itemRadius(game) * 2;
    if (SPRITES.maki.complete) { c.globalAlpha = .9; c.drawImage(SPRITES.maki, x - s / 2, y - s / 2, s, s); c.globalAlpha = 1; }
    c.font = `90px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('✋', x + 18, y + 34);
    comic(c, t('tut'), l.x0 + l.w / 2, 395, game.mode === 2 ? 26 : 34, '#fff');
  });
}

/* ---------- frame ---------- */
export function renderFrame(r, view) {
  const c = r.ctx;
  c.setTransform(1.5, 0, 0, 1.5, 0, 0);
  c.save();
  if (r.shake > 0) c.translate(rndRange(-r.shake, r.shake), rndRange(-r.shake, r.shake));

  if (view.screen === 'intro' && view.intro) {
    drawIntro(r, view.intro, view.t);
  } else if (view.screen === 'calib') {
    drawBackground(r, view, true);
    if (view.mode === 2) {
      c.setLineDash([18, 14]); c.strokeStyle = '#fff'; c.lineWidth = 6; c.beginPath(); c.moveTo(W / 2, 0); c.lineTo(W / 2, H); c.stroke(); c.setLineDash([]);
      comic(c, view.t('p') + '1', W / 4, 90, 80, PLAYER_COLORS[0]); comic(c, view.t('p') + '2', W * .75, 90, 80, PLAYER_COLORS[1]);
    }
    c.fillStyle = '#7dff9b'; c.strokeStyle = '#fff'; c.lineWidth = 2;
    for (const person of view.people || []) for (const [x, y] of person) { c.beginPath(); c.arc(x, y, 5, 0, 7); c.fill(); c.stroke(); }
    drawHandCursors(r, view.hands, view.mode, null);
  } else if (view.screen === 'game' && view.game) {
    const g = view.game, R = itemRadius(g), two = g.mode === 2, holders = new Set(g.items.filter(i => i.st === 'held').map(i => i.holder));
    drawBackground(r, view, false);
    g.lanes.forEach((l, li) => {
      const fx = two ? l.x0 - 8 : 0, fw = two ? l.w + 16 : W;
      c.save();
      if (two) { rrect(c, fx, 4, fw, H - 8, 26); c.clip(); c.fillStyle = 'rgba(20,8,50,.35)'; c.fillRect(fx, 0, fw, H); }
      drawBelt(r, g.beltDist);
      const hover = [0, 0, 0];
      for (const it of g.items) if (it.lane === li && it.st === 'held' && it.dropCol >= 0) hover[it.dropCol] = Math.max(hover[it.dropCol], .05 + it.dropT / (CONFIG.interaction.dropDwellMs / 1000));
      drawBoxes(r, l, li, g.mode, view.t, hover);
      for (const it of g.items) if (it.lane === li && it.st !== 'held') drawSushi(r, it, sushiRadius(g, it));
      for (const [a, b] of heldPairs(g)) if (a.lane === li) drawMergeHint(r, a, b, R, view.t);
      for (const it of g.items) if (it.lane === li && it.st === 'held') drawSushi(r, it, sushiRadius(g, it));
      if (g.phase === 'countdown') drawCountdown(r, g, [l], view.t);
      c.restore();
      if (two) { rrect(c, fx, 4, fw, H - 8, 26); c.lineWidth = 8; c.strokeStyle = PLAYER_COLORS[li]; if (!r.low) { c.shadowColor = PLAYER_COLORS[li]; c.shadowBlur = 24; } c.stroke(); c.shadowBlur = 0; }
    });
    if (g.phase === 'countdown') {
      const n = Math.ceil(g.cd), f = 1 - (g.cd % 1);
      if (n >= 1 && n <= 3) comic(c, String(n), W / 2, 330, 200 * (1.3 - f * .3), ['#ff5fb0', '#ffe14d', '#2de2e6'][n - 1], f * .2 - .1, 1 - f * .4);
    }
    drawHandCursors(r, view.hands, g.mode, holders);
    drawHud(r, g, view);
  } else {
    // menu, settings, high scores, game over: calm decorative belt
    drawBackground(r, view, false);
    drawBelt(r, r.decor.dist);
    for (const it of r.decor.items) drawSushi(r, { ...it, y: CONFIG.layout.itemY, st: 'belt' }, CONFIG.itemRadius * 1.3);
  }

  for (const q of r.parts) {
    c.globalAlpha = Math.max(0, 1 - q.age / q.life); c.fillStyle = q.c;
    if (q.star) starShape(c, q.x, q.y, q.rad * 1.5, q.rot); else { c.beginPath(); c.arc(q.x, q.y, q.rad * .6, 0, 7); c.fill(); }
  }
  c.globalAlpha = 1;
  for (const q of r.pops) {
    const k = q.age / q.life, sc = k < .18 ? .4 + k / .18 * .9 : 1.3 - Math.min(.3, (k - .18) * .5);
    comic(c, q.text, q.x, q.y, q.size * sc, q.color, q.rot, k > .75 ? 1 - (k - .75) * 4 : 1);
  }
  c.restore();
  if (r.flash > 0) { c.globalAlpha = r.flash * .5; c.fillStyle = '#fff'; c.fillRect(0, 0, W, H); c.globalAlpha = 1; }
}


/* ---------- intro cinematics (timelines in intro.js) ---------- */

export function drawIntro(r, it, t) {
  if (it.kind === '2p-anime') introVersusAnime(r.ctx, it, t);
  else if (it.kind === '2p') introVersus(r, it, t); else introTransform(r, it, t);
  const c = r.ctx;
  c.save(); c.globalAlpha = .8; c.font = `600 18px ${FONT}`; c.textAlign = 'right'; c.textBaseline = 'bottom'; c.lineJoin = 'round';
  c.lineWidth = 5; c.strokeStyle = '#2b1b4a'; c.strokeText(t('skip'), W - 18, H - 14);
  c.fillStyle = '#fff'; c.fillText(t('skip'), W - 18, H - 14); c.restore();
}

function chefHat(c, x, y, s) {
  c.save(); c.fillStyle = '#fff'; c.strokeStyle = '#d9d2e6'; c.lineWidth = s * .02;
  for (const [dx, dy, rad] of [[-.2, -.25, .17], [.2, -.25, .17], [0, -.34, .21]]) { c.beginPath(); c.arc(x + dx * s, y + dy * s, rad * s, 0, 7); c.fill(); c.stroke(); }
  rrect(c, x - s * .29, y - s * .13, s * .58, s * .17, s * .05); c.fill(); c.stroke();
  c.strokeStyle = '#e9e3f2'; c.lineWidth = s * .012;
  for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(x + i * s * .09, y - s * .11); c.lineTo(x + i * s * .09, y + s * .02); c.stroke(); }
  c.restore();
}
function bandana(c, x, y, s) {
  c.save(); c.fillStyle = '#ff4d6d'; c.strokeStyle = '#c2185b'; c.lineWidth = s * .02; c.lineJoin = 'round';
  c.beginPath(); c.moveTo(x - s * .32, y - s * .04); c.lineTo(x + s * .32, y - s * .04); c.lineTo(x, y + s * .24); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = '#fff';
  for (const [dx, dy] of [[-.15, .02], [.15, .02], [0, .1], [-.05, -.01], [.06, .17]]) { c.beginPath(); c.arc(x + dx * s, y + dy * s, s * .022, 0, 7); c.fill(); }
  c.fillStyle = '#ff4d6d'; c.beginPath(); c.arc(x + s * .33, y - s * .03, s * .06, 0, 7); c.fill(); c.stroke();
  c.restore();
}
function chopsticks(c, x, y, s) {
  c.save(); c.translate(x, y); c.rotate(-.65); c.lineCap = 'round';
  for (const [dy, rot] of [[0, 0], [s * .05, .07]]) { c.save(); c.rotate(rot); c.strokeStyle = '#8a5a2b'; c.lineWidth = s * .045; c.beginPath(); c.moveTo(0, dy); c.lineTo(s * .75, dy); c.stroke(); c.strokeStyle = '#d9a066'; c.lineWidth = s * .025; c.beginPath(); c.moveTo(s * .05, dy - s * .006); c.lineTo(s * .72, dy - s * .006); c.stroke(); c.restore(); }
  c.restore();
}
function starRing(c, x, y, rad, n, size, alpha, col = '#ffe14d') {
  c.save(); c.globalAlpha = alpha; c.fillStyle = col;
  for (let i = 0; i < n; i++) { const a = i * Math.PI * 2 / n; starShape(c, x + Math.cos(a) * rad, y + Math.sin(a) * rad, size, a); }
  c.restore();
}

// 1P: magical-girl style transformation into a kawaii sushi chef
function introTransform(r, it, tr) {
  const c = r.ctx, t = it.t, img = SPRITES[it.chars[0].key];
  const g = c.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, W * .75);
  g.addColorStop(0, '#ff9ad6'); g.addColorStop(.45, '#b0379a'); g.addColorStop(1, '#2a0838');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  c.save(); c.translate(W / 2, H / 2); c.rotate(t * .6); c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 16; i++) { c.rotate(Math.PI / 8); c.fillStyle = i % 2 ? 'rgba(255,225,77,.10)' : 'rgba(255,255,255,.07)'; c.beginPath(); c.moveTo(0, 0); c.lineTo(900, -70); c.lineTo(900, 70); c.fill(); }
  c.restore();
  // twinkling stars everywhere
  for (let i = 0; i < 34; i++) {
    c.globalAlpha = .35 + .35 * Math.sin(t * 4 + i * 1.7); c.fillStyle = i % 3 ? '#fff' : '#ffe14d';
    starShape(c, hash01(i) * W, hash01(i + 50) * H, 4 + hash01(i + 9) * 8, t + i);
  }
  c.globalAlpha = 1;
  // anime speed lines for the final pose
  const pose = span(t, 3.3, 3.5);
  if (pose > 0) {
    const f = Math.floor(t * 14);
    c.save(); c.translate(W / 2, H / 2); c.strokeStyle = `rgba(255,255,255,${.45 * pose})`;
    for (let i = 0; i < 70; i++) { const a = i / 70 * Math.PI * 2 + hash01(i + f) * .05, r0 = 250 + hash01(i * 3 + f) * 120; c.lineWidth = 2 + hash01(i + f * 7) * 6; c.beginPath(); c.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); c.lineTo(Math.cos(a) * 900, Math.sin(a) * 900); c.stroke(); }
    c.restore();
  }
  const cx = W / 2, s = 230 * (1 + .22 * easeInOut(span(t, 3.3, 3.6))), cy = 380 - 30 * easeInOut(span(t, .2, .8)) + Math.sin(t * 3) * 8;
  // magic circle under the character
  const mc = span(t, .4, .9) * (1 - span(t, 3.2, 3.4));
  if (mc > 0) {
    c.save(); c.translate(cx, cy + s * .55); c.scale(1, .32); c.rotate(t * 1.4); c.strokeStyle = `rgba(255,240,150,${.85 * mc})`; c.lineWidth = 7;
    c.beginPath(); c.arc(0, 0, 240 * mc, 0, 7); c.stroke(); c.beginPath(); c.arc(0, 0, 196 * mc, 0, 7); c.stroke();
    for (const off of [0, Math.PI / 3]) { c.beginPath(); for (let i = 0; i <= 3; i++) { const a = off + i * Math.PI * 2 / 3; c.lineTo(Math.cos(a) * 196 * mc, Math.sin(a) * 196 * mc); } c.stroke(); }
    c.restore();
  }
  // glow + orbiting ribbons while spinning
  const spinA = span(t, .6, 1.6), ribA = span(t, .6, .8) * (1 - span(t, 2.0, 2.3));
  const halo = c.createRadialGradient(cx, cy, 10, cx, cy, s * 1.1);
  halo.addColorStop(0, `rgba(255,255,255,${.55 + .25 * Math.sin(t * 8)})`); halo.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = halo; c.fillRect(cx - s * 1.2, cy - s * 1.2, s * 2.4, s * 2.4);
  if (ribA > 0) for (const [k, col] of [[0, '#ff5fb0'], [1, '#ffe14d']]) {
    c.save(); c.globalAlpha = ribA; c.strokeStyle = col; c.lineWidth = 16; c.lineCap = 'round'; c.beginPath();
    for (let i = 0; i <= 40; i++) { const a = t * 5 + k * Math.PI + i * .06, rad = s * .75 + 22 * Math.sin(a * 3); c.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad * .55 - 20 * Math.sin(a * 2)); }
    c.stroke(); c.restore();
  }
  // the character (spins during the transformation)
  if (img.complete) {
    c.save(); c.translate(cx, cy); c.rotate(easeInOut(spinA) * Math.PI * 4 - .08 * pose);
    c.drawImage(img, -s / 2, -s / 2, s, s); c.restore();
  }
  // chef pieces: hat drops in, bandana pops, chopsticks slide in
  if (t >= 1.5) chefHat(c, cx, -160 + ((cy - s * .38) + 160) * easeBack(span(t, 1.5, 1.8)), s);
  if (t >= 2.2) { const k = easeBack(span(t, 2.2, 2.4)); c.save(); c.translate(cx, cy + s * .36); c.scale(k, k); bandana(c, 0, 0, s); c.restore(); }
  if (t >= 2.7) chopsticks(c, W + 100 + (cx + s * .3 - W - 100) * easeInOut(span(t, 2.7, 2.9)), cy + s * .3, s);
  for (const L of [1.8, 2.3, 2.8]) { const d = t - L; if (d >= 0 && d < .6) starRing(c, cx, cy, 60 + 320 * d, 12, 14, 1 - d / .6, L === 2.3 ? '#ff9ad6' : '#ffe14d'); }
  // words
  const sp = span(t, .8, 1.1) * (1 - span(t, 3.0, 3.3));
  if (sp > 0) comic(c, tr('introSpark'), W / 2, 86, 40, '#fff', 0, sp);
  if (t >= 3.3) { const k = span(t, 3.3, 3.5); comic(c, tr('introChef'), W / 2, 640, 66 * (2.2 - 1.2 * easeBack(k)), '#ffe14d', -.04, Math.min(1, k * 3)); }
  if (t >= 4.4) { const k = span(t, 4.4, 4.6); comic(c, tr('introReady'), W / 2, 72, 96 * (1.5 - .5 * easeBack(k)), '#7dff9b', .05, Math.min(1, k * 3)); }
  if (t < .35) { c.fillStyle = `rgba(0,0,0,${1 - t / .35})`; c.fillRect(0, 0, W, H); }
  if (t > 4.95) { c.fillStyle = `rgba(255,255,255,${span(t, 4.95, 5.2)})`; c.fillRect(0, 0, W, H); }
}

// 2P: lightning split screen, two characters face off, VS
function introVersus(r, it, tr) {
  const c = r.ctx, t = it.t;
  c.fillStyle = '#0b0418'; c.fillRect(0, 0, W, H);
  const slide = 1 - easeBack(span(t, .15, .6));
  const halves = [
    { side: 0, poly: [[-20, -10], ...it.seam, [-20, H + 10]], dx: -W * .7 * slide, cols: ['#ff5fb0', '#5a145a'] },
    { side: 1, poly: [[W + 20, -10], ...it.seam, [W + 20, H + 10]], dx: W * .7 * slide, cols: ['#2de2e6', '#0f3a6b'] }
  ];
  for (const hf of halves) {
    const ch = it.chars[hf.side], img = SPRITES[ch.key], sgn = hf.side ? -1 : 1;
    c.save(); c.translate(hf.dx, 0);
    c.beginPath(); hf.poly.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); c.clip();
    const g = c.createLinearGradient(hf.side ? W : 0, 0, W / 2, 0); g.addColorStop(0, hf.cols[1]); g.addColorStop(1, hf.cols[0]);
    c.fillStyle = g; c.fillRect(-20, -10, W + 40, H + 20);
    // fast streaks rushing towards the middle
    c.strokeStyle = 'rgba(255,255,255,.3)'; c.lineCap = 'round';
    for (const s of it.streaks) {
      const run = ((s.off * (W + 700) + t * 1900) % (W + 700)) - 350, x = hf.side ? W - run : run;
      c.lineWidth = s.w; c.beginPath(); c.moveTo(x, s.y); c.lineTo(x - sgn * s.len, s.y); c.stroke();
    }
    // halftone dots near the outer edge
    c.fillStyle = 'rgba(255,255,255,.12)';
    for (let y = 20; y < H; y += 34) for (let k = 0; k < 6; k++) { const x = hf.side ? W - 20 - k * 34 : 20 + k * 34; c.beginPath(); c.arc(x, y, 9 - k * 1.3, 0, 7); c.fill(); }
    // the fighter: slides in, then bounces, ready to go
    const enter = easeBack(span(t, .5, .9)), size = 300;
    const fx = (hf.side ? W * .74 : W * .26) - sgn * (1 - enter) * 520, fy = 320 + (t > .9 ? Math.abs(Math.sin(t * 7 + hf.side)) * -14 : 0);
    const aura = c.createRadialGradient(fx, fy, 20, fx, fy, size * .85);
    aura.addColorStop(0, `rgba(255,255,255,${.5 + .2 * Math.sin(t * 10 + hf.side)})`); aura.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = aura; c.fillRect(fx - size, fy - size, size * 2, size * 2);
    if (img.complete) { c.save(); c.translate(fx, fy); c.scale(sgn, 1); c.rotate(.08 * Math.sin(t * 6)); c.drawImage(img, -size / 2, -size / 2, size, size); c.restore(); }
    c.restore();
  }
  // crackling lightning seam
  if (t > .08) {
    c.save(); c.lineJoin = 'round'; c.lineCap = 'round';
    for (const [w, col] of [[18, 'rgba(255,225,77,.35)'], [8, '#fffbe0'], [3, '#fff']]) {
      c.strokeStyle = col; c.lineWidth = w; c.beginPath();
      it.seam.forEach(([x, y], i) => { const j = (Math.random() - .5) * 14; return i ? c.lineTo(x + j, y) : c.moveTo(x + j, y); });
      c.stroke();
    }
    c.restore();
  }
  // name plates
  const np = easeBack(span(t, 1.1, 1.4));
  if (np > 0) it.chars.forEach((ch, i) => {
    const col = PLAYER_COLORS[i], w = 470, x = i ? W - 40 - w + (1 - np) * 600 : 40 - (1 - np) * 600, y = 560;
    c.save(); c.fillStyle = col; c.strokeStyle = '#fff'; c.lineWidth = 5;
    c.beginPath(); c.moveTo(x + 30, y); c.lineTo(x + w, y); c.lineTo(x + w - 30, y + 74); c.lineTo(x, y + 74); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#2b1b4a'; c.font = `700 34px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(`${tr('p')}${i + 1} · ${ch.name}`, x + w / 2, y + 38); c.restore();
  });
  // VS slam
  if (t >= 1.6) {
    const k = span(t, 1.6, 1.8);
    starRing(c, W / 2, 320, 120 + 20 * Math.sin(t * 20), 10, 16, .8 * k);
    comic(c, 'VS', W / 2, 320, 210 * (2.3 - 1.3 * easeBack(k)), '#ffe14d', -.08, Math.min(1, k * 3));
  }
  const gr = span(t, 2.8, 3.0) * (1 - span(t, 3.5, 3.6));
  if (gr > 0) comic(c, tr('introGet'), W / 2, 470, 42, '#fff', 0, gr);
  if (t >= 3.6) { const k = span(t, 3.6, 3.8); comic(c, tr('introSort'), W / 2, 470, 84 * (2 - easeBack(k)), '#7dff9b', -.03, Math.min(1, k * 3)); }
  if (t > .1 && t < .45) { c.fillStyle = `rgba(255,255,255,${.9 * (1 - span(t, .1, .45))})`; c.fillRect(0, 0, W, H); }
  if (t > 4.5) { c.fillStyle = `rgba(255,255,255,${span(t, 4.5, 4.8)})`; c.fillRect(0, 0, W, H); }
}
