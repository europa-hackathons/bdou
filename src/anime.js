// "Anime" animation style: cel-shaded characters with detailed anime eyes, and a cinematic 2P face-off.
// The kawaii style stays in render.js; this module is only used when Settings → Animation style = Anime.
import { W, H } from './config.js';
import { SPRITES_BARE, FACE_POS, ANIME_LOOK } from './sprites.js';
import { FONT, PLAYER_COLORS, easeInOut, easeBack, span, hash01, comic } from './draw.js';

const INK = '#1a0f2e';

function shadeHex(hex, f) { // f < 0 darker, f > 0 lighter
  const n = parseInt(hex.slice(1), 16), ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
    .map(v => Math.round(f < 0 ? v * (1 + f) : v + (255 - v) * f));
  return `rgb(${ch.join(',')})`;
}
function makeCanvas(w, h = w) { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; return [cv, cv.getContext('2d')]; }

// One detailed anime eye centred on (x, y). open: 0 = shut, 1 = wide open.
export function animeEye(c, x, y, w, h, iris, open = 1) {
  c.save(); c.translate(x, y); c.scale(1, Math.max(.06, open));
  c.beginPath(); c.ellipse(0, 0, w * .5, h * .5, 0, 0, 7); c.fillStyle = '#fff'; c.fill();
  c.save(); c.clip();
  const ig = c.createLinearGradient(0, -h * .45, 0, h * .5);
  ig.addColorStop(0, shadeHex(iris, -.55)); ig.addColorStop(.55, iris); ig.addColorStop(1, shadeHex(iris, .45));
  c.fillStyle = ig; c.beginPath(); c.ellipse(0, h * .06, w * .4, h * .45, 0, 0, 7); c.fill();
  c.strokeStyle = shadeHex(iris, -.6); c.lineWidth = w * .04; c.stroke();
  c.fillStyle = INK; c.beginPath(); c.ellipse(0, h * .1, w * .17, h * .22, 0, 0, 7); c.fill();
  c.fillStyle = 'rgba(26,15,46,.35)'; c.fillRect(-w, -h * .5, w * 2, h * .2);          // shadow under the upper lid
  c.restore();
  // lashes: thick upper line with a flick, thin lower line
  c.strokeStyle = INK; c.lineCap = 'round';
  c.lineWidth = w * .15; c.beginPath(); c.ellipse(0, 0, w * .53, h * .53, 0, Math.PI * 1.05, Math.PI * 1.95); c.stroke();
  c.lineWidth = w * .1; c.beginPath(); c.moveTo(w * .48, -h * .2); c.lineTo(w * .68, -h * .36); c.stroke();
  c.lineWidth = w * .05; c.beginPath(); c.ellipse(0, 0, w * .5, h * .5, 0, Math.PI * .2, Math.PI * .8); c.stroke();
  // highlights
  c.fillStyle = '#fff';
  c.beginPath(); c.ellipse(-w * .14, -h * .14, w * .13, h * .12, -.4, 0, 7); c.fill();
  c.beginPath(); c.arc(w * .13, h * .2, w * .06, 0, 7); c.fill();
  c.restore();
}

function animeFace(c, cx, cy, u, iris, mood) {
  const ex = 11.5 * u, ew = 10 * u, eh = 13 * u;
  animeEye(c, cx - ex, cy - u, ew, eh, iris); animeEye(c, cx + ex, cy - u, ew, eh, iris);
  c.strokeStyle = INK; c.lineCap = 'round';
  if (mood === 'fierce') { // determined brows, angled towards the middle
    c.lineWidth = 2.8 * u;
    c.beginPath(); c.moveTo(cx - 19 * u, cy - 13 * u); c.lineTo(cx - 6 * u, cy - 9 * u); c.stroke();
    c.beginPath(); c.moveTo(cx + 19 * u, cy - 13 * u); c.lineTo(cx + 6 * u, cy - 9 * u); c.stroke();
    c.lineWidth = 2 * u; c.beginPath(); c.moveTo(cx - 5 * u, cy + 9 * u); c.quadraticCurveTo(cx, cy + 6 * u, cx + 5 * u, cy + 9 * u); c.stroke();
  } else {
    c.lineWidth = 2 * u; c.beginPath(); c.moveTo(cx - 4 * u, cy + 7 * u); c.quadraticCurveTo(cx, cy + 11 * u, cx + 4 * u, cy + 7 * u); c.stroke();
  }
  // anime blush: short diagonal hatch lines
  c.strokeStyle = 'rgba(255,80,130,.8)'; c.lineWidth = 1.3 * u;
  for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) {
    const bx = cx + sx * (19 * u) + (i - 1) * 2.6 * u, by = cy + 6 * u;
    c.beginPath(); c.moveTo(bx - 1.2 * u, by + 1.6 * u); c.lineTo(bx + 1.2 * u, by - 1.6 * u); c.stroke();
  }
}

// Cel-shaded character (ink outline, hard shadow, rim light, anime face), cached per size and mood.
const CHAR_CACHE = new Map();
export function animeCharacter(key, size, mood = 'fierce') {
  const id = `${key}|${Math.round(size / 8) * 8}|${mood}`;
  if (CHAR_CACHE.has(id)) return CHAR_CACHE.get(id);
  const img = SPRITES_BARE[key];
  if (!img || !img.complete) return null;
  size = Math.round(size / 8) * 8;
  const pad = Math.ceil(size * .06), S = size + pad * 2;
  const [body, b] = makeCanvas(S);
  b.drawImage(img, pad, pad, size, size);
  b.globalCompositeOperation = 'source-atop';                       // shading only where the body is
  const g = b.createLinearGradient(pad, pad, pad + size, pad + size);
  g.addColorStop(0, 'rgba(255,255,255,.55)'); g.addColorStop(.15, 'rgba(255,255,255,.55)'); g.addColorStop(.16, 'rgba(255,255,255,0)');
  g.addColorStop(.58, 'rgba(70,20,110,0)'); g.addColorStop(.59, 'rgba(70,20,110,.28)'); g.addColorStop(1, 'rgba(70,20,110,.38)');
  b.fillStyle = g; b.fillRect(0, 0, S, S);
  const [sil, s] = makeCanvas(S);                                   // solid silhouette, used for the outline and impact frames
  s.drawImage(img, pad, pad, size, size); s.globalCompositeOperation = 'source-in'; s.fillStyle = INK; s.fillRect(0, 0, S, S);
  const [out, o] = makeCanvas(S);
  const ow = Math.max(3, size * .024);
  for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8; o.drawImage(sil, Math.cos(a) * ow, Math.sin(a) * ow); }
  o.drawImage(body, 0, 0);
  const [fx, fy] = FACE_POS[key], u = size / 120;
  animeFace(o, pad + fx * u, pad + fy * u, u, ANIME_LOOK[key].iris, mood);
  const res = { canvas: out, silhouette: sil, size: S };
  CHAR_CACHE.set(id, res);
  return res;
}
function drawChar(c, key, x, y, size, { flip = false, mood = 'fierce', silhouette = false, alpha = 1 } = {}) {
  const ch = animeCharacter(key, size, mood);
  if (!ch) return;
  c.save(); c.globalAlpha = alpha; c.translate(x, y); if (flip) c.scale(-1, 1);
  c.drawImage(silhouette ? ch.silhouette : ch.canvas, -ch.size / 2, -ch.size / 2); c.restore();
}

function speedLines(c, cx, cy, n, r0, col, width, seed, alpha = 1) {
  c.save(); c.strokeStyle = col; c.globalAlpha = alpha;
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2 + hash01(i + seed) * .08, rr = r0 + hash01(i * 3 + seed) * r0 * .6;
    c.lineWidth = width * (.4 + hash01(i * 7 + seed)); c.beginPath(); c.moveTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); c.lineTo(cx + Math.cos(a) * 1600, cy + Math.sin(a) * 1600); c.stroke();
  }
  c.restore();
}
function screentone(c, x0, y0, w, h, col, fromLeft) { // manga dot tone that fades across
  c.save(); c.fillStyle = col;
  for (let y = y0 + 8; y < y0 + h; y += 16) for (let x = x0 + 8; x < x0 + w; x += 16) {
    const k = fromLeft ? 1 - (x - x0) / w : (x - x0) / w, rad = 5.5 * k * k;
    if (rad > .4) { c.beginPath(); c.arc(x + ((y / 16) % 2) * 8, y, rad, 0, 7); c.fill(); }
  }
  c.restore();
}
function flameAura(c, x, y, size, col, t, seed) {
  c.save(); c.globalCompositeOperation = 'lighter';
  for (const [scale, alpha] of [[1, .32], [.78, .45]]) {
    c.fillStyle = col; c.globalAlpha = alpha; c.beginPath();
    for (let i = 0; i <= 28; i++) {
      const a = i / 28 * Math.PI * 2, flick = Math.sin(t * 14 + i * 2.3 + seed) * .08 + (i % 2 ? .18 : 0);
      const rr = size * .62 * scale * (1 + flick) * (a > Math.PI ? 1.25 : 1);      // taller flames upwards
      c.lineTo(x + Math.cos(a) * rr * .85, y + Math.sin(a) * rr);
    }
    c.closePath(); c.fill();
  }
  c.restore();
}
function sakura(c, it, t) {
  c.save();
  for (const p of it.petals) {
    const x = ((p.x * W + t * p.vx * 60) % (W + 80)) - 40, y = ((p.y * H + t * p.vy * 60) % (H + 80)) - 40;
    c.save(); c.translate(x, y); c.rotate(t * p.spin + p.x * 9); c.scale(1, .55 + .35 * Math.sin(t * 3 + p.y * 7));
    c.fillStyle = 'rgba(255,183,213,.9)'; c.beginPath(); c.ellipse(0, 0, p.s, p.s * .6, 0, 0, 7); c.fill();
    c.fillStyle = 'rgba(255,240,246,.9)'; c.beginPath(); c.ellipse(-p.s * .3, 0, p.s * .35, p.s * .2, 0, 0, 7); c.fill();
    c.restore();
  }
  c.restore();
}
function brushPlate(c, x, y, w, col, name, jp, right) {
  c.save();
  c.fillStyle = INK; c.beginPath(); c.moveTo(x + 40, y); c.lineTo(x + w, y - 6); c.lineTo(x + w - 40, y + 78); c.lineTo(x - 6, y + 84); c.closePath(); c.fill();
  c.fillStyle = col; c.beginPath(); c.moveTo(x + 46, y + 8); c.lineTo(x + w - 10, y + 3); c.lineTo(x + w - 22, y + 20); c.lineTo(x + 40, y + 24); c.closePath(); c.fill();
  c.font = `700 22px ${FONT}`; c.textAlign = right ? 'right' : 'left'; c.textBaseline = 'middle'; c.fillStyle = INK;
  c.fillText(jp, right ? x + w - 34 : x + 56, y + 14);
  c.font = `700 36px ${FONT}`; c.fillStyle = '#fff'; c.fillText(name, right ? x + w - 50 : x + 40, y + 52);
  c.restore();
}

// The anime-style 2P face-off: five quick "cuts" like a TV opening.
export function introVersusAnime(c, it, tr) {
  const t = it.t, [p1, p2] = it.chars, cols = PLAYER_COLORS;
  c.fillStyle = '#07020f'; c.fillRect(0, 0, W, H);

  if (t < .9) {
    // CUT A: extreme close-ups of both fighters' eyes, one above the other, with lightning between
    [[p1, 0, cols[0]], [p2, 1, cols[1]]].forEach(([ch, i, col]) => {
      const y0 = i * H / 2, slide = (1 - easeBack(span(t, .05 + i * .12, .35 + i * .12))) * (i ? 1 : -1) * W;
      c.save(); c.beginPath(); c.rect(0, y0, W, H / 2); c.clip(); c.translate(slide, 0);
      const g = c.createLinearGradient(0, y0, W, y0 + H / 2); g.addColorStop(0, shadeHex(ANIME_LOOK[ch.key].iris, .75)); g.addColorStop(1, shadeHex(ANIME_LOOK[ch.key].iris, .35));
      c.fillStyle = g; c.fillRect(0, y0, W, H / 2);
      speedLines(c, W / 2, y0 + H / 4, 60, 260, col, 5, i * 50 + Math.floor(t * 12), .55);
      const open = easeBack(span(t, .3 + i * .15, .45 + i * .15));
      const ex = i ? W * .62 : W * .38;
      animeEye(c, ex, y0 + H / 4 + 12, 230, 300, ANIME_LOOK[ch.key].iris, open);
      c.strokeStyle = INK; c.lineWidth = 26; c.lineCap = 'round';                  // a fierce brow
      c.beginPath(); c.moveTo(ex - 150 * (i ? -1 : 1), y0 + 32); c.lineTo(ex + 120 * (i ? -1 : 1), y0 + 70); c.stroke();
      c.restore();
    });
    // horizontal lightning seam between the two close-ups
    c.save(); c.lineJoin = 'round';
    for (const [w, col] of [[16, 'rgba(255,225,77,.4)'], [6, '#fffbe0'], [2, '#fff']]) {
      c.strokeStyle = col; c.lineWidth = w; c.beginPath();
      for (let i = 0; i <= 12; i++) c.lineTo(i / 12 * W, H / 2 + (i % 2 ? -1 : 1) * (12 + Math.random() * 16));
      c.stroke();
    }
    c.restore();
    if (t < .2) { c.fillStyle = `rgba(255,255,255,${1 - t / .2})`; c.fillRect(0, 0, W, H); }
    return;
  }

  if (t < 1.2) {
    // CUT B: impact frame. Colours flip: black silhouettes on white with manga speed lines.
    c.fillStyle = '#fff'; c.fillRect(0, 0, W, H);
    speedLines(c, W / 2, H / 2, 90, 150, '#000', 9, Math.floor(t * 30));
    drawChar(c, p1.key, W * .3, H * .52, 420, { silhouette: true });
    drawChar(c, p2.key, W * .7, H * .52, 420, { silhouette: true, flip: true });
    comic(c, 'ドン!', W * .5, H * .16, 120, '#fff', -.12);
    return;
  }

  // CUTS C–E: the face-off, with a slow camera push-in
  const push = 1 + .07 * easeInOut(span(t, 1.2, 4.6));
  c.save(); c.translate(W / 2, H / 2); c.scale(push, push); c.translate(-W / 2, -H / 2);
  [[p1, 0], [p2, 1]].forEach(([ch, i]) => {
    const col = cols[i], left = i === 0;
    c.save(); c.beginPath();
    if (left) { c.moveTo(-40, -40); c.lineTo(W * .58, -40); c.lineTo(W * .42, H + 40); c.lineTo(-40, H + 40); }
    else { c.moveTo(W + 40, -40); c.lineTo(W * .58, -40); c.lineTo(W * .42, H + 40); c.lineTo(W + 40, H + 40); }
    c.closePath(); c.clip();
    const g = c.createRadialGradient(left ? W * .25 : W * .75, H * .45, 40, left ? W * .25 : W * .75, H * .45, W * .6);
    g.addColorStop(0, shadeHex(col, .55)); g.addColorStop(.5, col); g.addColorStop(1, shadeHex(col, -.65));
    c.fillStyle = g; c.fillRect(-40, -40, W + 80, H + 80);
    // rotating light burst behind each fighter
    c.save(); c.translate(left ? W * .25 : W * .75, H * .45); c.rotate(t * (left ? .4 : -.4)); c.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 14; k++) { c.rotate(Math.PI / 7); c.fillStyle = 'rgba(255,255,255,.09)'; c.beginPath(); c.moveTo(0, 0); c.lineTo(1000, -60); c.lineTo(1000, 60); c.fill(); }
    c.restore();
    screentone(c, left ? -40 : W * .55, -40, W * .5, H + 80, 'rgba(20,8,40,.35)', left);
    // the fighter slides in with motion trails, then holds a battle pose inside a flame aura
    const enter = easeBack(span(t, 1.25 + i * .08, 1.6 + i * .08)), fx = (left ? W * .25 : W * .75) + (left ? -1 : 1) * (1 - enter) * 640;
    const fy = H * .46 + Math.sin(t * 5 + i) * 6, size = 380;
    if (enter > .02) flameAura(c, fx, fy, size, col, t, i * 3);
    if (enter < .98) for (let k = 3; k >= 1; k--) drawChar(c, ch.key, fx + (left ? -1 : 1) * k * 70 * (1 - enter), fy, size, { flip: !left, alpha: .18 * (4 - k) });
    drawChar(c, ch.key, fx, fy, size, { flip: !left });
    c.restore();
  });
  // lightning seam
  c.save(); c.lineJoin = 'round';
  for (const [w, col] of [[22, 'rgba(255,225,77,.35)'], [9, '#fffbe0'], [3, '#fff']]) {
    c.strokeStyle = col; c.lineWidth = w; c.beginPath();
    for (let i = 0; i <= 10; i++) { const k = i / 10; c.lineTo(W * (.58 - .16 * k) + (i && i < 10 ? (Math.random() - .5) * 26 : 0), -40 + (H + 80) * k); }
    c.stroke();
  }
  c.restore();
  sakura(c, it, t);
  c.restore();

  // name plates (Japanese name + roman name), brush-stroke style
  const np = easeBack(span(t, 1.7, 2.0));
  if (np > 0) {
    brushPlate(c, 34 - (1 - np) * 700, 590, 500, cols[0], `${tr('p')}1 · ${p1.name}`, ANIME_LOOK[p1.key].jp, false);
    brushPlate(c, W - 534 + (1 - np) * 700, 590, 500, cols[1], `${tr('p')}2 · ${p2.name}`, ANIME_LOOK[p2.key].jp, true);
  }
  // CUT D: VS slam over a giant 対 ("versus")
  if (t >= 3.2) {
    const k = span(t, 3.2, 3.4);
    c.save(); c.globalAlpha = .28 * Math.min(1, k * 3); c.font = `900 340px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillStyle = '#fff'; c.fillText('対', W / 2, H * .43); c.restore();                    // faint "versus" kanji behind the VS
    comic(c, 'VS', W / 2, H * .42, 220 * (2.3 - 1.3 * easeBack(k)), '#ffe14d', -.1, Math.min(1, k * 3));
    if (t < 3.9) comic(c, 'ドン!', W * .2, H * .14, 90 * easeBack(span(t, 3.25, 3.4)), '#ff5fb0', -.2);
    if (t > 3.2 && t < 3.32) { c.fillStyle = 'rgba(255,255,255,.7)'; c.fillRect(0, 0, W, H); }
  }
  // CUT E: menacing ゴゴゴ rising up the sides, then GET READY / LET'S SORT
  if (t >= 4.0) {
    const k = span(t, 4.0, 5.4);
    for (let i = 0; i < 4; i++) {
      const a = Math.min(1, span(t, 4.0 + i * .12, 4.2 + i * .12) * 2);
      comic(c, 'ゴ', 70 + (i % 2) * 40, H - 120 - i * 120 - k * 60, 70 + i * 8, '#b48cff', -.15, a);
      comic(c, 'ゴ', W - 70 - (i % 2) * 40, H - 120 - i * 120 - k * 60, 70 + i * 8, '#b48cff', .15, a);
    }
  }
  const gr = span(t, 4.0, 4.2) * (1 - span(t, 4.55, 4.65));
  if (gr > 0) comic(c, tr('introGet'), W / 2, H * .66, 44, '#fff', 0, gr);
  if (t >= 4.6) { const k = span(t, 4.6, 4.8); comic(c, tr('introSort'), W / 2, H * .66, 90 * (2 - easeBack(k)), '#7dff9b', -.03, Math.min(1, k * 3)); }
  if (t > 5.45) { c.fillStyle = `rgba(255,255,255,${span(t, 5.45, 5.8)})`; c.fillRect(0, 0, W, H); }
}
