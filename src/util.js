// Small shared helpers.
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const rndRange = (a, b) => a + Math.random() * (b - a);
export const nowMs = () => performance.now();
