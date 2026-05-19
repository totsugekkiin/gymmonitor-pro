import type { Frame } from '../types/workout';
import { TILT_THRESHOLD } from '../types/workout';

const W = 320;
const H = 72;
const PAD = 4;

function frameTime(f: Frame): number {
  return f.deviceT > 0 ? f.deviceT : f.t;
}

export function frameTimeRange(frames: Frame[]) {
  if (frames.length === 0) return { t0: 0, t1: 1 };
  const t0 = frameTime(frames[0]);
  const t1 = frameTime(frames[frames.length - 1]);
  return { t0, t1: Math.max(t1, t0 + 1) };
}

function normT(t: number, t0: number, t1: number) {
  const span = Math.max(t1 - t0, 1);
  return PAD + ((t - t0) / span) * (W - PAD * 2);
}

export function buildDepthPath(frames: Frame[]): string {
  if (frames.length < 2) return '';
  const { t0, t1 } = frameTimeRange(frames);
  const maxD = Math.max(...frames.map((f) => f.depth), 50);
  const pts = frames.map((f) => {
    const x = normT(frameTime(f), t0, t1);
    const y = H - PAD - (f.depth / maxD) * (H - PAD * 2);
    return `${x},${y}`;
  });
  return `M ${pts.join(' L ')}`;
}

export function buildAnglePath(frames: Frame[]): string {
  if (frames.length < 2) return '';
  const { t0, t1 } = frameTimeRange(frames);
  const maxA = Math.max(...frames.map((f) => Math.abs(f.angle)), 15);
  const pts = frames.map((f) => {
    const x = normT(frameTime(f), t0, t1);
    const y = H / 2 - (f.angle / maxA) * (H / 2 - PAD);
    return `${x},${y}`;
  });
  return `M ${pts.join(' L ')}`;
}

export function tiltViolationPoints(frames: Frame[]) {
  const { t0, t1 } = frameTimeRange(frames);
  return frames
    .filter((f) => f.warn || Math.abs(f.angle) > TILT_THRESHOLD)
    .map((f) => ({ x: normT(frameTime(f), t0, t1), t: frameTime(f) }));
}

export { W as CHART_W, H as CHART_H };
