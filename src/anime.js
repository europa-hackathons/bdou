// "Anime" animation style: cel-shaded characters with detailed anime eyes, and a cinematic 2P face-off.
// The kawaii style stays in render.js; this module is only used when Settings → Animation style = Anime.
import { W, H } from './config.js';
import { SPRITES_BARE, FACE_POS, ANIME_LOOK } from './sprites.js';
import { FONT, PLAYER_COLORS, easeInOut, easeBack, span, hash01, comic, chefHat, bandana, chopsticks, starRing } from './draw.js';

const INK = '#1a0f2e';

function shadeHex(hex, f) { // f < 0 darker, f > 0 lighter
  const n = parseInt(hex.slice(1), 16), ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
    .map(v => Math.round(f < 0 ? v * (1 + f) : v + (255 - v) * f));
  return `rgb(${ch.join(',')})`;
}
function makeCanvas(w, h = w) { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; return [cv, cv.getContext('2d')]; }

// A cute, sparkly anime eye (shōjo style) centred on (x, y). open: 0 = shut, 1 = wide open.
function sparkle4(c, x, y, r) {
  c.beginPath(); c.moveTo(x, y - r); c.quadraticCurveTo(x, y, x + r, y); c.quadraticCurveTo(x, y, x, y + r);
  c.quadraticCurveTo(x, y, x - r, y); c.quadraticCurveTo(x, y, x, y - r); c.fill();
}
export function animeEye(c, x, y, w, h, iris, open = 1) {
  c.save(); c.translate(x, y); c.scale(1, Math.max(.06, open));
  c.beginPath(); c.ellipse(0, 0, w * .5, h * .5, 0, 0, 7); c.fillStyle = '#fff'; c.fill();
  c.save(); c.clip();
  const ig = c.createLinearGradient(0, -h * .5, 0, h * .5);                     // big, bright iris
  ig.addColorStop(0, shadeHex(iris, -.3)); ig.addColorStop(.5, iris); ig.addColorStop(1, shadeHex(iris, .6));
  c.fillStyle = ig; c.beginPath(); c.ellipse(0, h * .05, w * .46, h * .48, 0, 0, 7); c.fill();
  c.fillStyle = shadeHex(iris, -.55); c.beginPath(); c.ellipse(0, h * .07, w * .19, h * .23, 0, 0, 7); c.fill();
  c.fillStyle = 'rgba(255,255,255,.4)'; c.beginPath(); c.ellipse(0, h * .33, w * .3, h * .11, 0, 0, 7); c.fill();
  c.restore();
  // soft lash line with two little flicks
  c.strokeStyle = INK; c.lineCap = 'round';
  c.lineWidth = w * .09; c.beginPath(); c.ellipse(0, 0, w * .52, h * .52, 0, Math.PI * 1.12, Math.PI * 1.88); c.stroke();
  c.lineWidth = w * .06;
  c.beginPath(); c.moveTo(w * .42, -h * .3); c.lineTo(w * .58, -h * .42); c.stroke();
  c.beginPath(); c.moveTo(w * .5, -h * .14); c.lineTo(w * .66, -h * .2); c.stroke();
  // sparkly highlights: big oval, small dot and a star
  c.fillStyle = '#fff';
  c.beginPath(); c.ellipse(-w * .15, -h * .16, w * .17, h * .15, -.3, 0, 7); c.fill();
  c.beginPath(); c.arc(w * .17, h * .17, w * .075, 0, 7); c.fill();
  sparkle4(c, w * .14, -h * .2, w * .12);
  c.restore();
}

// Happy anime face: sparkly eyes, soft raised brows, open smile, pink blush.
function animeFace(c, cx, cy, u, iris) {
  const ex = 11.5 * u;
  animeEye(c, cx - ex, cy - u, 11 * u, 13.5 * u, iris); animeEye(c, cx + ex, cy - u, 11 * u, 13.5 * u, iris);
  c.strokeStyle = INK; c.lineCap = 'round'; c.lineWidth = 1.5 * u;
  for (const sx of [-1, 1]) { c.beginPath(); c.arc(cx + sx * ex, cy - 6 * u, 5 * u, Math.PI * 1.25, Math.PI * 1.75); c.stroke(); }
  c.fillStyle = '#8a2a4a';
  c.beginPath(); c.moveTo(cx - 5 * u, cy + 6.5 * u); c.quadraticCurveTo(cx, cy + 14 * u, cx + 5 * u, cy + 6.5 * u); c.closePath(); c.fill();
  c.fillStyle = '#ff8fb0'; c.beginPath(); c.ellipse(cx, cy + 10.3 * u, 2.4 * u, 1.4 * u, 0, 0, 7); c.fill();
  c.fillStyle = 'rgba(255,120,160,.55)';
  for (const sx of [-1, 1]) { c.beginPath(); c.ellipse(cx + sx * 19 * u, cy + 6 * u, 4.6 * u, 2.8 * u, 0, 0, 7); c.fill(); }
}

// Cel-shaded character (ink outline, hard shadow, rim light, anime face), cached per size.
const CHAR_CACHE = new Map();
export function animeCharacter(key, size) {
  const id = `${key}|${Math.round(size / 8) * 8}`;
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
  animeFace(o, pad + fx * u, pad + fy * u, u, ANIME_LOOK[key].iris);
  const [glow, gl] = makeCanvas(S);                                 // glowing white silhouette (transformation)
  gl.drawImage(img, pad, pad, size, size); gl.globalCompositeOperation = 'source-in'; gl.fillStyle = '#fff'; gl.fillRect(0, 0, S, S);
  const res = { canvas: out, silhouette: sil, glow, size: S };
  CHAR_CACHE.set(id, res);
  return res;
}
function drawChar(c, key, x, y, size, { flip = false, silhouette = false, glow = false, alpha = 1, scaleX = 1 } = {}) {
  const ch = animeCharacter(key, size);
  if (!ch) return;
  c.save(); c.globalAlpha = alpha; c.translate(x, y); c.scale((flip ? -1 : 1) * scaleX, 1);
  c.drawImage(glow ? ch.glow : silhouette ? ch.silhouette : ch.canvas, -ch.size / 2, -ch.size / 2); c.restore();
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
      c.fillStyle = '#fff';                                                       // twinkles around the eye
      for (let k = 0; k < 5; k++) { const ang = k * 1.26 + i, tw = .6 + .4 * Math.sin(t * 12 + k * 2); sparkle4(c, ex + Math.cos(ang) * 190, y0 + H / 4 + Math.sin(ang) * 120, 16 * tw); }
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

// The anime-style 1P transformation: a sparkling eye opens, a glowing silhouette spins in a column of light,
// the chef outfit lands piece by piece, then the character bursts into colour for a hero pose.
export function introTransformAnime(c, it, tr) {
  const t = it.t, ch = it.chars[0], look = ANIME_LOOK[ch.key], cx = W / 2;
  const bg = c.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#ffd6f0'); bg.addColorStop(.5, '#e2c6ff'); bg.addColorStop(1, '#a9d8ff');
  c.fillStyle = bg; c.fillRect(0, 0, W, H);
  // floating bubbles
  c.save(); c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = 3;
  for (let i = 0; i < 26; i++) { const r = 10 + hash01(i) * 26, x = hash01(i + 40) * W, y = ((hash01(i + 80) * (H + 100) - t * (40 + hash01(i + 9) * 60)) % (H + 100) + H + 100) % (H + 100) - 50; c.beginPath(); c.arc(x, y, r, 0, 7); c.stroke(); }
  c.restore();

  if (t < 1.0) {
    // CUT 1: a big sparkling eye opens
    const halo = c.createRadialGradient(cx, H / 2, 20, cx, H / 2, 420); halo.addColorStop(0, 'rgba(255,255,255,.9)'); halo.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = halo; c.fillRect(0, 0, W, H);
    animeEye(c, cx, H / 2 + 10, 300, 380, look.iris, easeBack(span(t, .25, .55)));
    c.fillStyle = '#fff';
    for (let k = 0; k < 6; k++) { const a = k * 1.05 + t, tw = .6 + .4 * Math.sin(t * 12 + k * 2); sparkle4(c, cx + Math.cos(a) * 250, H / 2 + Math.sin(a) * 210, 18 * tw); }
    comic(c, tr('introSpark'), cx, H * .1, 40, '#fff', 0, span(t, .4, .6));
    if (t < .25) { c.fillStyle = `rgba(255,255,255,${1 - t / .25})`; c.fillRect(0, 0, W, H); }
    return;
  }
  const pose = span(t, 3.6, 3.8);
  if (pose > 0) {
    // CUT 4 background: pastel speed lines, a giant faint 変身 ("transform!"), sakura
    c.save(); c.strokeStyle = `rgba(255,255,255,${.8 * pose})`;
    for (let i = 0; i < 70; i++) { const a = i / 70 * Math.PI * 2 + hash01(i + Math.floor(t * 12)) * .05, r0 = 260 + hash01(i * 3) * 100; c.lineWidth = 2 + hash01(i * 7) * 5; c.beginPath(); c.moveTo(cx + Math.cos(a) * r0, H / 2 + Math.sin(a) * r0); c.lineTo(cx + Math.cos(a) * 1500, H / 2 + Math.sin(a) * 1500); c.stroke(); }
    c.restore();
    c.save(); c.globalAlpha = .3 * pose; c.font = `900 300px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#fff'; c.fillText('変身', cx, H * .45); c.restore();
  }
  // column of light
  const colA = (1 - pose) * (.45 + .15 * Math.sin(t * 9));
  const lc = c.createLinearGradient(cx - 230, 0, cx + 230, 0);
  lc.addColorStop(0, 'rgba(255,255,255,0)'); lc.addColorStop(.5, `rgba(255,255,255,${colA})`); lc.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = lc; c.fillRect(cx - 230, 0, 460, H);
  const size = 300 * (1 + .18 * easeInOut(pose)), cy = H * .5 + 30 * easeInOut(pose) + Math.sin(t * 3) * 8;
  // ribbons spiralling around the column while spinning
  const rib = span(t, 1.0, 1.2) * (1 - span(t, 3.2, 3.6));
  if (rib > 0) for (const [k, col] of [[0, '#ff5fb0'], [1, '#ffe14d'], [2, '#7ad8ff']]) {
    c.save(); c.globalAlpha = rib; c.strokeStyle = col; c.lineWidth = 14; c.lineCap = 'round'; c.beginPath();
    for (let i = 0; i <= 60; i++) { const y = H + 40 - i * 14 - ((t * 260) % 14), a = i * .32 + t * 6 + k * 2.1; c.lineTo(cx + Math.sin(a) * 200, y); }
    c.stroke(); c.restore();
  }
  // the character: glowing white silhouette that spins, then bursts into colour
  const spin = easeInOut(span(t, 1.0, 2.6)) * Math.PI * 6, sx = Math.max(.08, Math.abs(Math.cos(spin)));
  const colourIn = span(t, 3.4, 3.7);
  if (colourIn < 1) { c.save(); c.shadowColor = '#ff6fc0'; c.shadowBlur = 40; drawChar(c, ch.key, cx, cy, size, { glow: true, scaleX: t < 2.6 ? sx : 1, alpha: 1 - colourIn }); c.restore(); }
  if (colourIn > 0) drawChar(c, ch.key, cx, cy, size, { alpha: colourIn });
  // chef outfit lands piece by piece
  if (t >= 2.6) chefHat(c, cx, -160 + ((cy - size * .38) + 160) * easeBack(span(t, 2.6, 2.85)), size);
  if (t >= 2.95) { const k = easeBack(span(t, 2.95, 3.1)); c.save(); c.translate(cx, cy + size * .36); c.scale(k, k); bandana(c, 0, 0, size); c.restore(); }
  if (t >= 3.25) chopsticks(c, W + 100 + (cx + size * .3 - W - 100) * easeInOut(span(t, 3.25, 3.4)), cy + size * .3, size);
  for (const L of [2.85, 3.1, 3.4]) { const d = t - L; if (d >= 0 && d < .6) starRing(c, cx, cy, 70 + 340 * d, 12, 15, 1 - d / .6, '#fff'); }
  if (t > 3.4 && t < 3.55) { c.fillStyle = `rgba(255,255,255,${1 - span(t, 3.4, 3.55)})`; c.fillRect(0, 0, W, H); }   // burst of colour
  if (pose > 0) sakura(c, it, t);
  // words
  if (t >= 3.7) { const k = span(t, 3.7, 3.9); comic(c, tr('introChef'), cx, H * .89, 66 * (2.2 - 1.2 * easeBack(k)), '#ff5fb0', -.04, Math.min(1, k * 3)); }
  if (t >= 4.7) { const k = span(t, 4.7, 4.9); comic(c, tr('introReady'), cx, 58, 84 * (1.5 - .5 * easeBack(k)), '#7dff9b', .05, Math.min(1, k * 3)); }
  if (t > 5.45) { c.fillStyle = `rgba(255,255,255,${span(t, 5.45, 5.8)})`; c.fillRect(0, 0, W, H); }
}
