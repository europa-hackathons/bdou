// Shared canvas drawing helpers (used by render.js and anime.js).
import { clamp } from './util.js';

export const FONT = "Fredoka,'Baloo 2','Chalkboard SE','Comic Sans MS','Arial Rounded MT Bold',sans-serif";
export const PLAYER_COLORS = ['#ff5fb0', '#2de2e6'];
export const easeInOut = k => k * k * (3 - 2 * k);
export const easeBack = k => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); };
export const span = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
export const hash01 = n => { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); };
export function rrect(c, x, y, w, h, rad) { c.beginPath(); c.roundRect(x, y, w, h, rad); }
export function comic(c, text, x, y, size, fill, rot = 0, alpha = 1) {
  c.save(); c.translate(x, y); c.rotate(rot); c.globalAlpha = alpha;
  c.font = `700 ${size}px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
  // soft drop shadow, then a solid dark outline all the way round, so any colour reads on any background
  const ow = Math.max(5, size * .24);
  c.lineWidth = ow + 4; c.strokeStyle = 'rgba(20,8,40,.45)'; c.strokeText(text, size * .05, size * .07);
  c.lineWidth = ow; c.strokeStyle = '#2b1b4a'; c.strokeText(text, 0, 0);
  c.fillStyle = fill; c.fillText(text, 0, 0);
  c.restore();
}
export function starShape(c, x, y, rad, rot) {
  c.save(); c.translate(x, y); c.rotate(rot); c.beginPath();
  for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5, q = i % 2 ? rad * .45 : rad; c.lineTo(Math.cos(a) * q, Math.sin(a) * q); }
  c.closePath(); c.fill(); c.restore();
}

// chef outfit pieces and a ring of stars (used by the 1P transformations)
export function chefHat(c, x, y, s) {
  c.save(); c.fillStyle = '#fff'; c.strokeStyle = '#d9d2e6'; c.lineWidth = s * .02;
  for (const [dx, dy, rad] of [[-.2, -.25, .17], [.2, -.25, .17], [0, -.34, .21]]) { c.beginPath(); c.arc(x + dx * s, y + dy * s, rad * s, 0, 7); c.fill(); c.stroke(); }
  rrect(c, x - s * .29, y - s * .13, s * .58, s * .17, s * .05); c.fill(); c.stroke();
  c.strokeStyle = '#e9e3f2'; c.lineWidth = s * .012;
  for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(x + i * s * .09, y - s * .11); c.lineTo(x + i * s * .09, y + s * .02); c.stroke(); }
  c.restore();
}
export function bandana(c, x, y, s) {
  c.save(); c.fillStyle = '#ff4d6d'; c.strokeStyle = '#c2185b'; c.lineWidth = s * .02; c.lineJoin = 'round';
  c.beginPath(); c.moveTo(x - s * .32, y - s * .04); c.lineTo(x + s * .32, y - s * .04); c.lineTo(x, y + s * .24); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = '#fff';
  for (const [dx, dy] of [[-.15, .02], [.15, .02], [0, .1], [-.05, -.01], [.06, .17]]) { c.beginPath(); c.arc(x + dx * s, y + dy * s, s * .022, 0, 7); c.fill(); }
  c.fillStyle = '#ff4d6d'; c.beginPath(); c.arc(x + s * .33, y - s * .03, s * .06, 0, 7); c.fill(); c.stroke();
  c.restore();
}
export function chopsticks(c, x, y, s) {
  c.save(); c.translate(x, y); c.rotate(-.65); c.lineCap = 'round';
  for (const [dy, rot] of [[0, 0], [s * .05, .07]]) { c.save(); c.rotate(rot); c.strokeStyle = '#8a5a2b'; c.lineWidth = s * .045; c.beginPath(); c.moveTo(0, dy); c.lineTo(s * .75, dy); c.stroke(); c.strokeStyle = '#d9a066'; c.lineWidth = s * .025; c.beginPath(); c.moveTo(s * .05, dy - s * .006); c.lineTo(s * .72, dy - s * .006); c.stroke(); c.restore(); }
  c.restore();
}
export function starRing(c, x, y, rad, n, size, alpha, col = '#ffe14d') {
  c.save(); c.globalAlpha = alpha; c.fillStyle = col;
  for (let i = 0; i < n; i++) { const a = i * Math.PI * 2 / n; starShape(c, x + Math.cos(a) * rad, y + Math.sin(a) * rad, size, a); }
  c.restore();
}
