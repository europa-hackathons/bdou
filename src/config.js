// Every tunable number in the game lives here (SPEC §5, §7, §8).
import { clamp } from './util.js';

export const W = 1280, H = 720; // logical play-area size; the canvas is scaled to fit the window

export const CONFIG = {
  layout: { beltTop: 255, beltH: 96, itemY: 200, boxTop: 450, boxH: 225 },
  itemRadius: 60,                       // sushi radius at scale 1
  itemScale: { 1: 1.3, 2: 1.05 },        // bigger sushi for 1P; kids play ~2 m away
  countdown: 3,
  rampEvery: 4,                          // seconds between speed steps
  difficulty: {
    easy:   { start: 110, ramp: .06, max: 260, spacing: 280 },
    normal: { start: 150, ramp: .07, max: 340, spacing: 250 },
    hard:   { start: 180, ramp: .08, max: 420, spacing: 215 }
  },
  scoring: { base: 10, comboStep: 2, comboCap: 15, wrong: 5, milestones: [3, 5, 8, 12, 16, 20] },

  // SPEC §7.5 – turning raw tracking into stable hand points
  input: {
    minWristVisibility: .5,
    minShoulderVisibility: .6,
    minShoulderWidth: .035,              // fraction of the camera frame
    hipMargin: .02,                      // wrist must be at least this far above the hip
    confirmFrames: 3,
    confirmGapMs: 150,                   // frames further apart than this do not count as "in a row"
    jumpRejectPx: 260,
    jumpConfirmFrames: 3,
    oneEuro: { minCutoff: 1.2, beta: .004, dCutoff: 1 },
    lostAfterMs: 150,                    // shown faded after this
    lossGraceMs: 600,
    lossGraceHoldingMs: 1000,
    mouseIdleMs: 1500,
    handMatchPx: 230,                    // hand-tracking mode: max distance to keep a hand's identity
    reachPastWrist: 1.3,                 // body mode: hand point = wrist + 1.3 × (wrist→fingers)
    edgeMarginPx: 40
  },

  // SPEC §8 – grab / carry / drop
  interaction: {
    reachCamera: 1.9,                    // × sushi radius
    reachPointer: 1.35,
    lagCompMs: 180,
    followRate: 28,
    dropBelowBeltPx: 90,                 // the drop zone starts this far below the belt…
    dropDwellMs: 220,                    // …and the hand must stay over one box this long (so diagonal moves don't drop early)
    minHoldMs: 250,
    floatMs: 1500,
    sinkMs: 300
  },

  // SPEC §12.2 – belt reversal: first flip (s), then every [min, max] s, after a warning
  reversal: {
    easy:   { first: 30, every: [11, 14] },
    normal: { first: 22, every: [9, 12] },
    hard:   { first: 14, every: [7, 10] },
    warnSec: 1.6,          // "⇄ REVERSE!" warning before the flip
    ease: 2.2,             // how quickly the belt slows, stops and runs the other way
    quietEnd: 4            // no new flip in the last few seconds
  },

  // SPEC §12.1 – mega sushi
  mega: { mergeDist: 2.2, scale: 1.7, base: 100, comboStep: 4, wrong: 15, floatMs: 4000, tipAt: 6 },

  tracker: {
    base: 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14',
    models: {
      pose: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task',
      hand: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'
    },
    detectWidth: { 1: 640, 2: 960 },
    numPoses: 2,
    numHands: 4
  },

  durations: [30, 45, 60, 90],
  defaults: { lang: 'en', dur: 60, diff: 'easy', vol: .6, mute: false, cam: true, zoom: 1.5, backdrop: true, track: 'pose', mega: true, music: true, anim: 'kawaii', reverse: true }
};

export const BOX_TYPES = ['maki', 'sashimi', 'avo'];

// characters for the 1P / 2P intros
export const ROSTER = [
  { key: 'maki', name: 'MAKI-CHAN' },
  { key: 'sashimi', name: 'SASHIMI-KUN' },
  { key: 'avo', name: 'AVO-SAN' },
  { key: 'tamago', name: 'TAMAGO-CHAN' },
  { key: 'onigiri', name: 'ONIGIRI-KUN' }
];

export function lanesFor(mode) {
  return mode === 2 ? [0, 1].map(i => ({ x0: 14 + i * 646, w: 606 })) : [{ x0: 0, w: W }];
}
export function laneAt(mode, x) { return mode === 2 ? (x < W / 2 ? 0 : 1) : 0; }
export function boxIndexAt(lane, x) { return clamp(Math.floor((x - lane.x0) / (lane.w / 3)), 0, 2); }
export function boxCenter(lane, i) { const bw = lane.w / 3; return { x: lane.x0 + bw * i + bw / 2, y: CONFIG.layout.boxTop + 70 }; }
export function dropLineY() { return CONFIG.layout.beltTop + CONFIG.layout.beltH + CONFIG.interaction.dropBelowBeltPx; }
