// Settings and top-5 high scores in localStorage. A storage object can be passed in for tests.
const SETTINGS_KEY = 'bdou.v1.settings', SCORES_KEY = 'bdou.v1.highscores';

function defaultStore() { try { return globalThis.localStorage || null; } catch { return null; } }
function readJSON(key, fallback, st) {
  try { const v = st && st.getItem(key); return v == null ? fallback : JSON.parse(v); } catch { return fallback; }
}
function writeJSON(key, value, st) { try { st && st.setItem(key, JSON.stringify(value)); } catch { /* storage full or blocked */ } }

export function loadSettings(defaults, st = defaultStore()) {
  const saved = readJSON(SETTINGS_KEY, {}, st);
  return Object.assign({}, defaults, saved && typeof saved === 'object' ? saved : {});
}
export function saveSettings(s, st = defaultStore()) { writeJSON(SETTINGS_KEY, s, st); }

export function loadScores(st = defaultStore()) {
  const a = readJSON(SCORES_KEY, [], st);
  return (Array.isArray(a) ? a : [])
    .filter(e => e && typeof e.score === 'number' && typeof e.name === 'string')
    .sort((x, y) => y.score - x.score || x.date - y.date)
    .slice(0, 5);
}
export function qualifies(score, st = defaultStore()) {
  const h = loadScores(st);
  return score > 0 && (h.length < 5 || score > h[h.length - 1].score);
}
export function addScore(name, score, mode, st = defaultStore(), date = Date.now()) {
  const entry = { id: `${date}-${Math.random().toString(36).slice(2, 7)}`, name: String(name).slice(0, 3).toUpperCase(), score, mode, date };
  const h = loadScores(st); h.push(entry);
  h.sort((x, y) => y.score - x.score || x.date - y.date);
  writeJSON(SCORES_KEY, h.slice(0, 5), st);
  return entry.id;
}
