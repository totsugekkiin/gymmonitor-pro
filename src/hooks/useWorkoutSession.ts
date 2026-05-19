import { useCallback, useEffect, useRef, useState } from 'react';
import type { Frame, WorkoutSession, WorkoutSet } from '../types/workout';

function normalizeFrame(raw: Partial<Frame> & Pick<Frame, 'depth' | 'angle' | 'rep'> & { t: number }): Frame {
  return {
    t: raw.t,
    deviceT: raw.deviceT ?? 0,
    depth: raw.depth,
    angle: raw.angle,
    rep: raw.rep,
    warn: raw.warn ?? false,
    repEvent: raw.repEvent ?? false,
  };
}

function normalizeSession(s: WorkoutSession): WorkoutSession {
  return {
    ...s,
    sets: s.sets.map((set) => ({
      ...set,
      frames: set.frames.map((f) =>
        normalizeFrame({
          t: f.t,
          deviceT: (f as Frame).deviceT,
          depth: f.depth,
          angle: f.angle,
          rep: f.rep,
          warn: (f as Frame).warn,
          repEvent: (f as Frame).repEvent,
        }),
      ),
    })),
  };
}
import { STORAGE_KEY } from '../types/workout';
import { analyzeReps } from '../lib/repAnalysis';
import { computeSetSummary } from '../lib/setSummary';

export type SessionPhase = 'idle' | 'in_session';

function createEmptySet(weight: number): WorkoutSet {
  return {
    id: String(Date.now()),
    weight,
    status: 'pending',
    baselineRep: 0,
    actualReps: 0,
    frames: [],
  };
}

function createSession(): WorkoutSession {
  return {
    id: String(Date.now()),
    exercise: 'bench_press',
    startedAt: Date.now(),
    sets: [createEmptySet(20)],
  };
}

function loadSession(): WorkoutSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WorkoutSession;
    if (parsed.endedAt) return null;
    return normalizeSession(parsed);
  } catch {
    return null;
  }
}

export function useWorkoutSession() {
  const [session, setSession] = useState<WorkoutSession | null>(() => loadSession());
  const [phase, setPhase] = useState<SessionPhase>(() =>
    loadSession() ? 'in_session' : 'idle',
  );
  const [lastCompletedSetId, setLastCompletedSetId] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persist = useCallback((s: WorkoutSession | null) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      if (s && !s.endedAt) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    }, 500);
  }, []);

  useEffect(() => {
    if (session && phase === 'in_session' && !session.endedAt) {
      persist(session);
    }
  }, [session, phase, persist]);

  const startSession = useCallback(() => {
    const s = createSession();
    setSession(s);
    setPhase('in_session');
    setLastCompletedSetId(null);
    persist(s);
  }, [persist]);

  const endSession = useCallback(() => {
    setSession((prev) => {
      if (!prev) return prev;
      const ended = { ...prev, endedAt: Date.now() };
      localStorage.setItem(`${STORAGE_KEY}:archive:${ended.id}`, JSON.stringify(ended));
      localStorage.removeItem(STORAGE_KEY);
      return ended;
    });
    setPhase('idle');
    setLastCompletedSetId(null);
  }, []);

  const addSet = useCallback(() => {
    setSession((prev) => {
      if (!prev) return prev;
      const last = prev.sets[prev.sets.length - 1];
      return {
        ...prev,
        sets: [...prev.sets, createEmptySet(last?.weight ?? 20)],
      };
    });
  }, []);

  const updateWeight = useCallback((setId: string, weight: number) => {
    setSession((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        sets: prev.sets.map((s) => (s.id === setId ? { ...s, weight } : s)),
      };
    });
  }, []);

  const startSet = useCallback((setId: string, baselineRep: number) => {
    setSession((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        sets: prev.sets.map((s) =>
          s.id === setId
            ? {
                ...s,
                status: 'active' as const,
                startedAt: Date.now(),
                baselineRep,
                frames: [],
                actualReps: 0,
              }
            : s.status === 'active'
              ? { ...s, status: 'pending' as const }
              : s,
        ),
      };
    });
  }, []);

  const appendFrame = useCallback((setId: string, frame: Frame) => {
    setSession((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        sets: prev.sets.map((s) =>
          s.id === setId && s.status === 'active'
            ? { ...s, frames: [...s.frames, frame] }
            : s,
        ),
      };
    });
  }, []);

  const endSet = useCallback((setId: string, finalRep: number) => {
    setSession((prev) => {
      if (!prev) return prev;
      const updated = prev.sets.map((s) => {
        if (s.id !== setId) return s;
        const actualReps = Math.max(0, finalRep - s.baselineRep);
        const repSegments = analyzeReps(s.frames);
        const summary = computeSetSummary(s.frames, actualReps, repSegments);
        return {
          ...s,
          status: 'done' as const,
          endedAt: Date.now(),
          actualReps,
          repSegments,
          summary,
        };
      });
      return { ...prev, sets: updated };
    });
    setLastCompletedSetId(setId);
  }, []);

  const activeSet = session?.sets.find((s) => s.status === 'active') ?? null;

  const getSet = useCallback(
    (setId: string) => session?.sets.find((s) => s.id === setId),
    [session],
  );

  return {
    session,
    phase,
    activeSet,
    lastCompletedSetId,
    clearLastCompleted: () => setLastCompletedSetId(null),
    startSession,
    endSession,
    addSet,
    updateWeight,
    startSet,
    endSet,
    appendFrame,
    getSet,
  };
}
