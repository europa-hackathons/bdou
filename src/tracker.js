// MediaPipe body / hand tracking. Loads the pinned library from the CDN and runs one detection per video frame.
import { CONFIG, W, H } from './config.js';

let VISION = null, FILESET = null;

export async function loadTracker(kind) {
  const T = CONFIG.tracker;
  if (!VISION) {
    VISION = await import(/* @vite-ignore */ T.base + '/vision_bundle.mjs');
    FILESET = await VISION.FilesetResolver.forVisionTasks(T.base + '/wasm');
  }
  const make = delegate => kind === 'hand'
    ? VISION.HandLandmarker.createFromOptions(FILESET, {
        baseOptions: { modelAssetPath: T.models.hand, delegate }, runningMode: 'VIDEO', numHands: T.numHands,
        minHandDetectionConfidence: .3, minHandPresenceConfidence: .3, minTrackingConfidence: .3 })
    : VISION.PoseLandmarker.createFromOptions(FILESET, {
        baseOptions: { modelAssetPath: T.models.pose, delegate }, runningMode: 'VIDEO', numPoses: T.numPoses,
        minPoseDetectionConfidence: .4, minPosePresenceConfidence: .4, minTrackingConfidence: .4 });
  let lm;
  try { lm = await make('GPU'); } catch { lm = await make('CPU'); }
  const canvas = document.createElement('canvas');
  return { kind: kind === 'hand' ? 'hand' : 'pose', lm, canvas, c2d: canvas.getContext('2d'), lastTs: 0 };
}

export function closeTracker(tr) { try { tr && tr.lm && tr.lm.close(); } catch { /* already closed */ } }

// Returns { kind, landmarks, vw, vh } or null.
export function detectFrame(tr, video, { mode, zoom }) {
  const vw = video.videoWidth, vh = video.videoHeight;
  if (!vw || !vh || video.readyState < 2) return null;
  const cv = tr.canvas, ts = Math.max(performance.now(), tr.lastTs + 1);
  tr.lastTs = ts;
  if (tr.kind === 'pose') {
    // the body model needs to see the whole body: give it the full frame
    const dw = CONFIG.tracker.detectWidth[mode] || 640, dh = Math.round(dw * vh / vw);
    if (cv.width !== dw || cv.height !== dh) { cv.width = dw; cv.height = dh; }
    tr.c2d.drawImage(video, 0, 0, dw, dh);
  } else {
    // hand model: only the zoomed part that is shown, so hands are bigger
    const s = Math.max(W / vw, H / vh) * zoom, cw = W / s, ch = H / s;
    if (cv.width !== 960 || cv.height !== 540) { cv.width = 960; cv.height = 540; }
    tr.c2d.drawImage(video, (vw - cw) / 2, (vh - ch) / 2, cw, ch, 0, 0, 960, 540);
  }
  const res = tr.lm.detectForVideo(cv, ts);
  return { kind: tr.kind, landmarks: res.landmarks || [], vw, vh };
}
