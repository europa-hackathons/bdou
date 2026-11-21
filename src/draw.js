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
