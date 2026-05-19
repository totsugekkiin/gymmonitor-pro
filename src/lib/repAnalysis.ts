import type { Frame, RepSegment } from '../types/workout';
import { TILT_THRESHOLD } from '../types/workout';

function frameTime(f: Frame): number {
  return f.deviceT > 0 ? f.deviceT : f.t;
}

function isTiltFrame(f: Frame): boolean {
  return f.warn || Math.abs(f.angle) > TILT_THRESHOLD;
}

/** 优先用固件 E:1；否则用 R 跳变 */
export function analyzeReps(frames: Frame[]): RepSegment[] {
  if (frames.length === 0) return [];

  const hasRepEvents = frames.some((f) => f.repEvent);
  const segments: RepSegment[] = [];
  let segmentStart = frameTime(frames[0]);
  let lastRep = frames[0].rep;
  let repIndex = 0;
  let maxTilt = 0;
  let minDepth = 999;
  let tiltEvents = 0;

  const pushSegment = (endT: number, index: number) => {
    segments.push({
      repIndex: index,
      startT: segmentStart,
      endT,
      maxTilt,
      minDepth: minDepth === 999 ? 0 : minDepth,
      tiltEvents,
    });
  };

  const resetStats = (t: number) => {
    segmentStart = t;
    maxTilt = 0;
    minDepth = 999;
    tiltEvents = 0;
  };

  const absorb = (frame: Frame) => {
    maxTilt = Math.max(maxTilt, Math.abs(frame.angle));
    minDepth = Math.min(minDepth, frame.depth);
    if (isTiltFrame(frame)) tiltEvents += 1;
  };

  for (const frame of frames) {
    absorb(frame);
    const ft = frameTime(frame);

    const repCompleted = hasRepEvents ? frame.repEvent : frame.rep > lastRep;

    if (repCompleted) {
      repIndex += 1;
      pushSegment(ft, repIndex);
      lastRep = frame.rep;
      resetStats(ft);
    }
  }

  return segments;
}
