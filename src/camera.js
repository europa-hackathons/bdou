// Video sources: the webcam, or a recorded clip played back through the same pipeline (SPEC §10.2).

function hiddenVideo() {
  const v = document.createElement('video');
  v.setAttribute('playsinline', ''); v.muted = true;
  v.style.cssText = 'position:fixed;left:0;top:0;width:2px;height:2px;opacity:0;pointer-events:none';
  document.body.appendChild(v);
  return v;
}

/* ---------- choosing a camera (pure, unit tested) ---------- */
// Prefer a real external webcam over the laptop's built-in camera; avoid virtual cameras (OBS etc.).
const WEBCAM_BRAND = /\b(logitech|logi|brio|streamcam|c9\d\d|c270|c310|razer|kiyo|elgato|facecam|lifecam|anker|powerconf|insta360|obsbot|avermedia|emeet|nexigo|aukey|ugreen|jabra|panacast|poly|creative|usb)\b/i;
const BUILTIN_CAM = /\b(built[- ]?in|integrated|internal|facetime|isight|macbook|imac|truevision|easycamera|front camera|user facing)\b/i;
const VIRTUAL_CAM = /\b(virtual|obs|snap camera|mmhmm|xsplit|manycam|nvidia broadcast|camo|droidcam|epoccam|ndi)\b/i;
const PHONE_CAM = /\b(iphone|continuity|android|phone)\b/i;
const CAM_RANK = { webcam: 0, external: 1, phone: 2, builtin: 3, virtual: 4 };

export function cameraKind(label = '') {
  if (VIRTUAL_CAM.test(label)) return 'virtual';
  if (BUILTIN_CAM.test(label)) return 'builtin';
  if (PHONE_CAM.test(label)) return 'phone';
  if (WEBCAM_BRAND.test(label)) return 'webcam';
  return 'external';   // unknown name: probably a plugged-in camera
}
// devices: [{ deviceId, label, kind: 'videoinput' }]; preferredId: a deviceId chosen in Settings, or 'auto'
export function pickCamera(devices, preferredId = 'auto') {
  const cams = (devices || []).filter(d => d.kind === 'videoinput');
  if (!cams.length) return null;
  if (preferredId && preferredId !== 'auto') { const chosen = cams.find(d => d.deviceId === preferredId); if (chosen) return chosen; }
  return cams.map((d, i) => ({ d, i, r: CAM_RANK[cameraKind(d.label)] })).sort((a, b) => a.r - b.r || a.i - b.i)[0].d;
}
export async function listCameras() {
  try { return (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === 'videoinput').map(d => ({ deviceId: d.deviceId, label: d.label, kind: 'videoinput' })); }
  catch { return []; }
}

// Opens a camera (a specific one if deviceId is given) and reports which one it really is.
export async function openWebcam(deviceId = null) {
  const constraints = { width: { ideal: 1280 }, height: { ideal: 720 } };
  if (deviceId) constraints.deviceId = { exact: deviceId }; else constraints.facingMode = 'user';
  const stream = await navigator.mediaDevices.getUserMedia({ video: constraints, audio: false });
  const track = stream.getVideoTracks()[0], st = track && track.getSettings ? track.getSettings() : {};
  const video = hiddenVideo();
  video.srcObject = stream;
  await video.play();
  return { kind: 'webcam', video, stream, deviceId: st.deviceId || deviceId || '', label: (track && track.label) || '' };
}

export async function openClip(file) {
  const video = hiddenVideo();
  video.src = URL.createObjectURL(file);
  video.loop = true;
  await video.play();
  return { kind: 'clip', video, stream: null, name: file.name };
}

export function closeSource(src) {
  if (!src) return;
  if (src.stream) src.stream.getTracks().forEach(t => t.stop());
  if (src.kind === 'clip') URL.revokeObjectURL(src.video.src);
  src.video.remove();
}

export function downloadBlob(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

// Records `seconds` of the webcam stream and saves it as a .webm file on this computer.
export function recordClip(stream, seconds, onTick, onDone) {
  const type = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find(t => window.MediaRecorder && MediaRecorder.isTypeSupported(t));
  if (!type) { onDone(new Error('Recording is not supported in this browser')); return null; }
  const rec = new MediaRecorder(stream, { mimeType: type }), chunks = [];
  rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
  rec.onstop = () => {
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    downloadBlob(new Blob(chunks, { type: 'video/webm' }), `bdou-clip-${stamp}.webm`);
    onDone(null);
  };
  rec.start(500);
  let left = seconds;
  onTick(left);
  const timer = setInterval(() => { left--; onTick(left); if (left <= 0) { clearInterval(timer); rec.stop(); } }, 1000);
  return { stop() { clearInterval(timer); if (rec.state !== 'inactive') rec.stop(); } };
}
