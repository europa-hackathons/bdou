// Input contract (SPEC §7): raw tracking / mouse / touch  ->  stable hand points.
// Pure apart from the timestamps passed in, so it can be tested in Node with recorded landmarks.
//
//   const inp = createInput();
//   inputFromPose(inp, poseLandmarks, { now, mode, vw, vh, zoom });   // body tracking
//   inputFromHands(inp, handLandmarks, { now, mode });                 // hand tracking (cropped frame)
//   pointerMove(inp, id, 'mouse'|'touch', x, y, now, mode); pointerEnd(inp, id);
//   const hands = handPoints(inp, now, holdingIds);  // [{ id, kind, player, x, y, lost }]
import { CONFIG, W, H, lanesFor, laneAt } from './config.js';
import { clamp } from './util.js';

export function createInput(cfg = CONFIG.input) {
  return { cfg, ptrs: new Map(), nid: 0, debug: { people: [], rejects: [] } };
}

// One Euro filter: smooth when still, responsive when moving fast.
function euroFilter(p, x, y, tSec, c) {
  const f = p.f;
  if (!f || tSec - f.t > .5) { p.f = { t: tSec, x, y, dx: 0, dy: 0 }; return [x, y]; }
  const dt = Math.max(1e-3, tSec - f.t), alpha = cut => 1 / (1 + 1 / (2 * Math.PI * cut * dt));
  const ad = alpha(c.dCutoff);
  f.dx += ((x - f.x) / dt - f.dx) * ad;
  f.dy += ((y - f.y) / dt - f.dy) * ad;
  const a = alpha(c.minCutoff + c.beta * Math.hypot(f.dx, f.dy));
  f.x += (x - f.x) * a; f.y += (y - f.y) * a; f.t = tSec;
  return [f.x, f.y];
}

// Feed one camera detection into its (fixed-identity) hand point.
function feedCamera(inp, id, kind, player, x, y, now, mode) {
  const c = inp.cfg;
  let p = inp.ptrs.get(id);
  if (!p) { p = { id, kind, player, x, y, init: false, hits: 0, ok: false, seen: now, jumpN: 0, f: null }; inp.ptrs.set(id, p); }
  p.player = player;
  const lane = lanesFor(mode)[player];
  if (lane) x = clamp(x, lane.x0, lane.x0 + lane.w);   // a hand stays in its own player's half
  x = clamp(x, 0, W); y = clamp(y, 0, H);
  if (p.init && Math.hypot(x - p.x, y - p.y) > c.jumpRejectPx) {
    p.jumpN++;
    if (p.jumpN < c.jumpConfirmFrames) { p.seen = now; return p; }  // one-off spike: ignore
    p.f = null;                                                     // it really moved: accept, restart filter
  }
  p.jumpN = 0;
  p.hits = p.init && now - p.seen <= c.confirmGapMs ? p.hits + 1 : 1;
  if (p.hits >= c.confirmFrames) p.ok = true;
  [p.x, p.y] = euroFilter(p, x, y, now / 1000, c.oneEuro);
  p.init = true; p.seen = now;
  return p;
}

const vis = q => (q && q.visibility != null ? q.visibility : 1);

// Body tracking: landmarks are normalised to the full camera frame; screen = mirrored + zoomed.
export function inputFromPose(inp, poses, { now, mode, vw, vh, zoom }) {
  const c = inp.cfg, s = Math.max(W / vw, H / vh) * zoom;
  const map = q => [W / 2 + (.5 - q.x) * vw * s, H / 2 + (q.y - .5) * vh * s];
  const rejects = [];
  inp.debug.people = poses.map(l => l.map(map));

  const people = [];
  for (const l of poses) {
    const real = vis(l[11]) > c.minShoulderVisibility && vis(l[12]) > c.minShoulderVisibility &&
      Math.hypot(l[11].x - l[12].x, l[11].y - l[12].y) > c.minShoulderWidth;
    const sx = (map(l[11])[0] + map(l[12])[0]) / 2, sy = (map(l[11])[1] + map(l[12])[1]) / 2;
    if (real) people.push({ l, sx }); else rejects.push({ x: sx, y: sy, why: 'weak person' });
  }
  people.sort((a, b) => a.sx - b.sx);

  let assign = [];
  if (mode === 2) {
    if (people.length >= 2) assign = [[people[0], 0], [people[people.length - 1], 1]];
    else if (people.length === 1) assign = [[people[0], laneAt(2, people[0].sx)]];
  } else if (people.length) {
    assign = [[people.slice().sort((a, b) => Math.abs(a.sx - W / 2) - Math.abs(b.sx - W / 2))[0], 0]];
  }

  for (const [pp, player] of assign) {
    for (const [side, w, a, b, hipI] of [['L', 15, 17, 19, 23], ['R', 16, 18, 20, 24]]) {
      const l = pp.l, wr = l[w], [wx, wy] = map(wr);
      if (vis(wr) < c.minWristVisibility) { rejects.push({ x: wx, y: wy, why: 'low confidence' }); continue; }
      if (wr.x < -.02 || wr.x > 1.02 || wr.y < -.02 || wr.y > 1.02) { rejects.push({ x: clamp(wx, 0, W), y: clamp(wy, 0, H), why: 'outside picture' }); continue; }
      const hip = l[hipI];
      if (hip && vis(hip) > .3 && wr.y > hip.y - c.hipMargin) { rejects.push({ x: wx, y: wy, why: 'resting' }); continue; }
      const [ax, ay] = map(l[a]), [bx, by] = map(l[b]);
      const hx = wx + ((ax + bx) / 2 - wx) * c.reachPastWrist, hy = wy + ((ay + by) / 2 - wy) * c.reachPastWrist;
      const m = c.edgeMarginPx;
      if (hx < -m || hx > W + m || hy < -m || hy > H + m) { rejects.push({ x: clamp(hx, 0, W), y: clamp(hy, 0, H), why: 'outside play area' }); continue; }
      feedCamera(inp, `P${player + 1}-${side}`, 'body', player, hx, hy, now, mode);
    }
  }
  inp.debug.rejects = rejects;
}

// Hand tracking: landmarks are normalised to the cropped (already zoomed) frame.
export function inputFromHands(inp, handsLm, { now, mode }) {
  const c = inp.cfg, m = c.edgeMarginPx;
  inp.debug.people = handsLm.map(l => l.map(q => [(1 - q.x) * W, q.y * H]));
  inp.debug.rejects = [];
  const found = handsLm.map(l => {
    const pts = [0, 5, 9, 13, 17].map(i => [(1 - l[i].x) * W, l[i].y * H]);
    return { x: pts.reduce((a, q) => a + q[0], 0) / 5, y: pts.reduce((a, q) => a + q[1], 0) / 5 };
  }).filter(h => {
    const ok = h.x > -m && h.x < W + m && h.y > -m && h.y < H + m;
    if (!ok) inp.debug.rejects.push({ x: clamp(h.x, 0, W), y: clamp(h.y, 0, H), why: 'outside play area' });
    return ok;
  });
  const live = [...inp.ptrs.values()].filter(p => p.kind === 'hand'), used = new Set();
  for (const h of found) {
    const player = laneAt(mode, h.x);
    let best = null, bd = c.handMatchPx;
    for (const p of live) {
      if (used.has(p) || p.player !== player) continue;
      const d = Math.hypot(h.x - p.x, h.y - p.y);
      if (d < bd) { best = p; bd = d; }
    }
    const id = best ? best.id : `H${++inp.nid}`;
    used.add(feedCamera(inp, id, 'hand', player, h.x, h.y, now, mode));
  }
}

// Mouse and touch: no filtering needed; a mouse only counts while it moves.
export function pointerMove(inp, id, kind, x, y, now, mode) {
  let p = inp.ptrs.get(id);
  if (!p) { p = { id, kind, init: true, ok: true, hits: 0, jumpN: 0 }; inp.ptrs.set(id, p); }
  p.x = clamp(x, 0, W); p.y = clamp(y, 0, H); p.player = laneAt(mode, p.x); p.seen = now;
}
export function pointerEnd(inp, id) { inp.ptrs.delete(id); }
export function clearCamera(inp) { for (const [id, p] of inp.ptrs) if (p.kind === 'body' || p.kind === 'hand') inp.ptrs.delete(id); }

export function handPoints(inp, now, holding = new Set()) {
  const c = inp.cfg, out = [];
  for (const [id, p] of inp.ptrs) {
    const age = now - p.seen, cam = p.kind === 'body' || p.kind === 'hand';
    if (cam && age > (holding.has(id) ? c.lossGraceHoldingMs : c.lossGraceMs)) { inp.ptrs.delete(id); continue; }
    if (p.kind === 'mouse' && age > c.mouseIdleMs) { inp.ptrs.delete(id); continue; }
    if (!p.ok) continue;
    out.push({ id, kind: p.kind, player: p.player, x: p.x, y: p.y, lost: cam && age > c.lostAfterMs });
  }
  return out;
}
