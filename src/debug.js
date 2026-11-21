// Debug overlay (key D) and clip tools (SPEC §10): see exactly what the tracker sees and why hands are accepted or rejected.
import { CONFIG, W, dropLineY } from './config.js';
import { itemRadius } from './game.js';

export function createDebug(handlers) {
  const el = document.createElement('div');
  el.id = 'debugPanel';
  el.className = 'hidden';
  el.innerHTML = `
    <div class="dbg-title">DEBUG <small>(press D to hide)</small></div>
    <div id="dbgStats">–</div>
    <div class="dbg-row">
      <button id="dbgRec">⏺ Record clip (20 s)</button>
      <button id="dbgLoad">📂 Load clip</button>
      <button id="dbgCam">🎥 Use webcam</button>
    </div>
    <div class="dbg-row">
      <button id="dbgExport">⬇ Export landmarks (JSON)</button>
      <span id="dbgFrames"></span>
    </div>
    <input type="file" id="dbgFile" accept="video/*" hidden>`;
  document.getElementById('stage').appendChild(el);
  const $d = id => el.querySelector('#' + id);
  $d('dbgRec').onclick = () => handlers.onRecord();
  $d('dbgLoad').onclick = () => $d('dbgFile').click();
  $d('dbgFile').onchange = e => { const f = e.target.files[0]; if (f) handlers.onLoadClip(f); e.target.value = ''; };
  $d('dbgCam').onclick = () => handlers.onWebcam();
  $d('dbgExport').onclick = () => handlers.onExport();
  return {
    el, visible: false, timeline: [],
    toggle() { this.visible = !this.visible; el.classList.toggle('hidden', !this.visible); },
    setStats(text) { $d('dbgStats').textContent = text; },
    setFrames(n) { $d('dbgFrames').textContent = n ? `${n} frames captured` : ''; },
    setRecording(label) { $d('dbgRec').textContent = label; }
  };
}

export function drawDebugOverlay(ctx, { inputDebug, hands, game }) {
  ctx.save();
  ctx.font = '700 14px system-ui, sans-serif'; ctx.textBaseline = 'middle';
  // every landmark the tracker returned
  ctx.fillStyle = 'rgba(255,255,255,.7)';
  for (const person of inputDebug.people) for (const [x, y] of person) { ctx.beginPath(); ctx.arc(x, y, 3, 0, 7); ctx.fill(); }
  // rejected wrists, with the reason
  for (const r of inputDebug.rejects) {
    ctx.strokeStyle = '#ff4d4d'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(r.x - 10, r.y - 10); ctx.lineTo(r.x + 10, r.y + 10); ctx.moveTo(r.x + 10, r.y - 10); ctx.lineTo(r.x - 10, r.y + 10); ctx.stroke();
    ctx.fillStyle = '#ff4d4d'; ctx.textAlign = 'left'; ctx.fillText(r.why, r.x + 14, r.y);
  }
  // accepted hand points
  for (const h of hands) {
    ctx.strokeStyle = h.lost ? '#ffb84d' : '#3ecf6a'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(h.x, h.y, 14, 0, 7); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(`${h.id}${h.lost ? ' (lost)' : ''}`, h.x, h.y - 26);
  }
  if (game && game.phase === 'play') {
    // drop line and grab reach
    ctx.setLineDash([10, 8]); ctx.strokeStyle = '#ffe14d'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, dropLineY()); ctx.lineTo(W, dropLineY()); ctx.stroke();
    const reach = itemRadius(game) * CONFIG.interaction.reachCamera;
    ctx.strokeStyle = 'rgba(125,255,155,.6)';
    for (const it of game.items) if (it.st === 'belt' || it.st === 'float') { ctx.beginPath(); ctx.arc(it.x, it.y, reach, 0, 7); ctx.stroke(); }
    ctx.setLineDash([]);
  }
  ctx.restore();
}
