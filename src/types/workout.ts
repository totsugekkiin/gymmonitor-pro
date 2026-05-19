export type Frame = {
  /** 浏览器时间戳，用于存储顺序 */
  t: number;
  /** ESP millis()，用于按设备时间回放 */
  deviceT: number;
  depth: number;
  angle: number;
  rep: number;
  warn: boolean;
  repEvent: boolean;
};

export type RepSegment = {
  repIndex: number;
  startT: number;
  endT: number;
  maxTilt: number;
  minDepth: number;
  tiltEvents: number;
};

export type SetSummary = {
  actualReps: number;
  maxTilt: number;
  avgTilt: number;
  tiltOver10Count: number;
  avgDepth: number;
  shallowReps: number;
};

export type WorkoutSet = {
  id: string;
  weight: number;
  targetReps?: number;
  status: 'pending' | 'active' | 'done';
  startedAt?: number;
  endedAt?: number;
  baselineRep: number;
  actualReps: number;
  frames: Frame[];
  summary?: SetSummary;
  repSegments?: RepSegment[];
};

export type WorkoutSession = {
  id: string;
  exercise: 'bench_press';
  startedAt: number;
  endedAt?: number;
  sets: WorkoutSet[];
};

export type LiveTelemetry = {
  depth: number;
  angle: number;
  rep: number;
  warn: boolean;
};

export const TILT_THRESHOLD = 10;
export const STORAGE_KEY = 'gymmonitor:session:v1';
