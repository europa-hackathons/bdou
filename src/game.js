// Pure, deterministic game rules (SPEC §5, §8). No DOM, no canvas, no clock.
//   const g = createGame({ mode, difficulty, duration, seed });
//   const events = stepGame(g, dt, handPoints);
// handPoints: [{ id, kind: 'body'|'hand'|'mouse'|'touch', player, x, y, lost }]
import { CONFIG, H, BOX_TYPES, lanesFor, boxIndexAt, boxCenter, dropLineY } from './config.js';
import { clamp } from './util.js';

export function makeRng(seed) { return { s: seed | 0 }; }
export function rand(r) { // mulberry32
  r.s = (r.s + 0x6D2B79F5) | 0;
  let t = r.s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function createGame({ mode = 1, difficulty = 'easy', duration = 60, seed = 1, mega = true } = {}) {
  const lanes = lanesFor(mode).map((l, i) => ({ ...l, i, score: 0, combo: 0, maxCombo: 0, sorted: 0, wrong: 0, missed: 0, spawnT: .3 + i * .35 }));
  return {
    mode, difficulty: CONFIG.difficulty[difficulty] ? difficulty : 'easy', duration,
    phase: 'countdown', cd: CONFIG.countdown, time: 0, left: duration,
    speed: 0, beltDist: 0, step: 0, lastTick: null,
    sz: CONFIG.itemScale[mode] || 1, lanes, items: [], rng: makeRng(seed), nextId: 1,
    mega: !!mega, tipShown: false
  };
}

export function beltSpeedAt(difficulty, t) {
  const d = CONFIG.difficulty[difficulty] || CONFIG.difficulty.easy;
  return Math.min(d.max, d.start * (1 + d.ramp * Math.floor(t / CONFIG.rampEvery)));
}

export function itemRadius(g) { return CONFIG.itemRadius * g.sz; }
// radius of one particular sushi (a mega sushi is bigger)
export function sushiRadius(g, it) { return itemRadius(g) * (it.mega ? CONFIG.mega.scale : 1); }
const isCamera = h => h.kind === 'body' || h.kind === 'hand';

export function stepGame(g, dt, hands = []) {
  const ev = [];
  if (g.phase === 'countdown') {
    const before = Math.ceil(g.cd);
    g.cd -= dt;
    const after = Math.ceil(g.cd);
    if (after !== before && after >= 1) ev.push({ type: 'tick' });
    g.beltDist += 60 * dt;
    if (g.cd <= 0) { g.phase = 'play'; ev.push({ type: 'go' }); }
    return ev;
  }
  if (g.phase !== 'play') return ev;

  // clock, pace
  g.time += dt;
  g.left = Math.max(0, g.duration - g.time);
  const st = Math.floor(g.time / CONFIG.rampEvery);
  if (st !== g.step) { g.step = st; if (st % 3 === 0) ev.push({ type: 'faster' }); }
  if (g.mega && !g.tipShown && g.time >= CONFIG.mega.tipAt) { g.tipShown = true; ev.push({ type: 'tip' }); }
  if (g.left <= 5) { const s = Math.ceil(g.left); if (s !== g.lastTick && s > 0) { g.lastTick = s; ev.push({ type: 'tick' }); } }
  g.speed = beltSpeedAt(g.difficulty, g.time);
  g.beltDist += g.speed * dt;
  const R = itemRadius(g), L = CONFIG.layout, I = CONFIG.interaction, diff = CONFIG.difficulty[g.difficulty];

  // spawn
  for (const lane of g.lanes) {
    lane.spawnT -= dt;
    if (lane.spawnT <= 0) {
      const type = BOX_TYPES[Math.floor(rand(g.rng) * 3)];
      g.items.push({ id: g.nextId++, type, lane: lane.i, x: lane.x0 + lane.w + R + 10, y: L.itemY, st: 'belt', seen: false, holder: null, heldAt: 0, dropCol: -1, dropT: 0, ft: 0, t: 0, ph: rand(g.rng) * 6 });
      lane.spawnT = diff.spacing / g.speed * (.85 + .5 * rand(g.rng));
    }
  }

  // a sushi whose hand vanished floats for a moment (can be grabbed again)
  const byId = new Map(hands.map(h => [h.id, h]));
  for (const it of g.items) if (it.st === 'held' && !byId.has(it.holder)) { it.st = 'float'; it.ft = it.ft0 = (it.mega ? CONFIG.mega.floatMs : I.floatMs) / 1000; it.holder = null; }

  // grab
  const holding = new Set(g.items.filter(i => i.st === 'held').map(i => i.holder));
  for (const h of hands) {
    if (holding.has(h.id) || h.lost) continue;
    const li = g.mode === 2 ? h.player : 0;
    if (!g.lanes[li]) continue;
    const it = findGrab(g, h, li, R);
    if (it) { it.st = 'held'; it.holder = h.id; it.heldAt = g.time; holding.add(h.id); ev.push({ type: 'grab', lane: li, x: it.x, y: it.y }); }
  }

  // carry and drop
  const dropY = dropLineY(), k = Math.min(1, dt * I.followRate);
  for (const it of g.items) {
    if (it.st !== 'held') continue;
    const h = byId.get(it.holder), lane = g.lanes[it.lane], ir = sushiRadius(g, it);
    it.x += (clamp(h.x, lane.x0 + ir * .6, lane.x0 + lane.w - ir * .6) - it.x) * k;
    it.y += (clamp(h.y, 60, H - 40) - it.y) * k;
    if (h.y >= dropY && g.time - it.heldAt >= I.minHoldMs / 1000) {
      const col = boxIndexAt(lane, h.x);
      if (it.dropCol !== col) { it.dropCol = col; it.dropT = 0; } else it.dropT += dt;
      if (it.dropT >= I.dropDwellMs / 1000) drop(g, it, h.x, ev);
    } else { it.dropCol = -1; it.dropT = 0; }
  }

  if (g.mega) mergeCheck(g, ev);

  // movement
  for (let i = g.items.length - 1; i >= 0; i--) {
    const it = g.items[i], lane = g.lanes[it.lane];
    it.ph += dt * 6;
    if (it.st === 'belt') {
      it.x -= g.speed * dt;
      it.y += (L.itemY - it.y) * Math.min(1, dt * 12);
      if (it.x < lane.x0 + lane.w - 10) it.seen = true;
      if (it.x < lane.x0 - sushiRadius(g, it) - 20) {
        g.items.splice(i, 1);
        if (it.seen) { lane.combo = 0; lane.missed++; ev.push({ type: 'miss', lane: lane.i, x: lane.x0 + 90, y: L.itemY }); }
      }
    } else if (it.st === 'float') {
      it.ft -= dt;
      if (it.ft <= 0 && it.mega) drop(g, it, boxCenter(lane, BOX_TYPES.indexOf(it.type)).x, ev); // a mega sushi is never lost
      else if (it.ft <= 0) it.st = 'belt';
    } else if (it.st === 'sink') {
      it.t += dt / (I.sinkMs / 1000);
      const s = Math.min(1, it.t);
      it.x = it.sx + (it.tx - it.sx) * s;
      it.y = it.sy + (it.ty - it.sy) * s - Math.sin(s * Math.PI) * 40;
      if (it.t >= 1) g.items.splice(i, 1);
    }
  }

  if (g.left <= 0) { g.phase = 'over'; ev.push({ type: 'over' }); }
  return ev;
}

function findGrab(g, h, li, R) {
  const I = CONFIG.interaction, cam = isCamera(h);
  const reach = R * (cam ? I.reachCamera : I.reachPointer), lag = cam ? I.lagCompMs / 1000 : 0;
  let best = null, bd = Infinity;
  for (const it of g.items) {
    if (it.lane !== li || (it.st !== 'belt' && it.st !== 'float')) continue;
    const pastX = it.x + (it.st === 'belt' ? g.speed * lag : 0);  // where it was a moment ago (camera lag)
    const dx = Math.min(Math.abs(it.x - h.x), Math.abs(pastX - h.x)), dy = Math.abs(it.y - h.y);
    const d = dx * dx + dy * dy, rr = reach * (it.mega ? CONFIG.mega.scale : 1);
    if (d <= rr * rr && d < bd) { best = it; bd = d; }
  }
  return best;
}

function drop(g, it, handX, ev) {
  const lane = g.lanes[it.lane], S = CONFIG.scoring;
  const bi = boxIndexAt(lane, handX), c = boxCenter(lane, bi), correct = BOX_TYPES[bi] === it.type;
  it.st = 'sink'; it.holder = null; it.t = 0; it.sx = it.x; it.sy = it.y; it.tx = c.x; it.ty = c.y;
  const M = CONFIG.mega, mega = !!it.mega;
  if (correct) {
    lane.combo++; lane.sorted += mega ? 2 : 1; lane.maxCombo = Math.max(lane.maxCombo, lane.combo);
    const points = mega ? M.base + M.comboStep * Math.min(lane.combo - 1, S.comboCap) : S.base + S.comboStep * Math.min(lane.combo - 1, S.comboCap);
    lane.score += points;
    ev.push({ type: 'correct', lane: lane.i, box: bi, x: c.x, y: c.y, points, combo: lane.combo, mega, milestone: S.milestones.includes(lane.combo) });
  } else {
    const loss = mega ? M.wrong : S.wrong;
    lane.combo = 0; lane.wrong++;
    lane.score = Math.max(0, lane.score - loss);
    ev.push({ type: 'wrong', lane: lane.i, box: bi, x: c.x, y: c.y, points: -loss, mega });
  }
}

// Two sushi of the same type, held in two different hands of the same player, brought together -> one mega sushi.
export function heldPairs(g) {
  const held = g.items.filter(i => i.st === 'held' && !i.mega), out = [];
  for (let a = 0; a < held.length; a++) for (let b = a + 1; b < held.length; b++)
    if (held[a].lane === held[b].lane && held[a].type === held[b].type && held[a].holder !== held[b].holder) out.push([held[a], held[b]]);
  return out;
}
function mergeCheck(g, ev) {
  const R = itemRadius(g);
  for (const [a, b] of heldPairs(g)) {
    if (Math.hypot(a.x - b.x, a.y - b.y) >= R * CONFIG.mega.mergeDist) continue;
    a.mega = true; a.x = (a.x + b.x) / 2; a.y = (a.y + b.y) / 2; a.dropCol = -1; a.dropT = 0;
    g.items.splice(g.items.indexOf(b), 1);           // the second hand is free again
    ev.push({ type: 'merge', lane: a.lane, x: a.x, y: a.y });
    return;                                         // at most one merge per step
  }
}

export function gameStats(lane) {
  const tot = lane.sorted + lane.wrong + lane.missed;
  return { score: lane.score, sorted: lane.sorted, best: lane.maxCombo, accuracy: tot ? Math.round(100 * lane.sorted / tot) : 0 };
}
