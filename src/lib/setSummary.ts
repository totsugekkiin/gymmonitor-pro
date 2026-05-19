import type { Frame, RepSegment, SetSummary } from '../types/workout';
import { TILT_THRESHOLD } from '../types/workout';
import { analyzeReps } from './repAnalysis';

function isTiltFrame(f: Frame): boolean {
  return f.warn || Math.abs(f.angle) > TILT_THRESHOLD;
}

export function computeSetSummary(
  frames: Frame[],
  actualReps: number,
  repSegments?: RepSegment[],
): SetSummary {
  const segments = repSegments ?? analyzeReps(frames);

  if (frames.length === 0) {
    return {
      actualReps,
      maxTilt: 0,
      avgTilt: 0,
      tiltOver10Count: 0,
      avgDepth: 0,
      shallowReps: 0,
    };
  }

  const tilts = frames.map((f) => Math.abs(f.angle));
  const depths = frames.map((f) => f.depth);
  const tiltOver10Count = frames.filter(isTiltFrame).length;
  const shallowReps = segments.filter((s) => s.minDepth > 5).length;

  return {
    actualReps,
    maxTilt: Math.max(...tilts),
    avgTilt: tilts.reduce((a, b) => a + b, 0) / tilts.length,
    tiltOver10Count,
    avgDepth: depths.reduce((a, b) => a + b, 0) / depths.length,
    shallowReps,
  };
}
