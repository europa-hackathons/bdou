// Video sources: the webcam, or a recorded clip played back through the same pipeline (SPEC §10.2).

function hiddenVideo() {
  const v = document.createElement('video');
  v.setAttribute('playsinline', ''); v.muted = true;
  v.style.cssText = 'position:fixed;left:0;top:0;width:2px;height:2px;opacity:0;pointer-events:none';
  document.body.appendChild(v);
  return v;
}

export async function openWebcam() {
  const stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }, audio: false });
  const video = hiddenVideo();
  video.srcObject = stream;
  await video.play();
  return { kind: 'webcam', video, stream };
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
