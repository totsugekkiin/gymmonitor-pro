import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { ArrowLeft, Pause, Play } from 'lucide-react';
import type { Frame, WorkoutSet } from '../types/workout';
import { TILT_THRESHOLD } from '../types/workout';
import { BarbellVisualizer } from './BarbellVisualizer';
import {
  buildAnglePath,
  buildDepthPath,
  CHART_H,
  CHART_W,
  frameTimeRange,
  tiltViolationPoints,
} from '../lib/chartPath';

function frameTime(f: Frame): number {
  return f.deviceT > 0 ? f.deviceT : f.t;
}

type Props = {
  set: WorkoutSet;
  setIndex: number;
  onBack: () => void;
};

export function ReviewPage({ set, setIndex, onBack }: Props) {
  const frames = set.frames;
  const [frameIndex, setFrameIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const playRef = useRef<number | null>(null);
  const playIndexRef = useRef(0);

  const current = frames[frameIndex];
  const { t0, t1 } = useMemo(() => frameTimeRange(frames), [frames]);
  const depthPath = useMemo(() => buildDepthPath(frames), [frames]);
  const anglePath = useMemo(() => buildAnglePath(frames), [frames]);
  const violations = useMemo(() => tiltViolationPoints(frames), [frames]);
  const progress = frames.length > 1 ? frameIndex / (frames.length - 1) : 0;

  const seekToTime = useCallback(
    (targetT: number) => {
      if (frames.length === 0) return;
      let best = 0;
      let bestDiff = Infinity;
      frames.forEach((f, i) => {
        const d = Math.abs(frameTime(f) - targetT);
        if (d < bestDiff) {
          bestDiff = d;
          best = i;
        }
      });
      setFrameIndex(best);
      playIndexRef.current = best;
    },
    [frames],
  );

  const stopPlay = useCallback(() => {
    if (playRef.current != null) {
      cancelAnimationFrame(playRef.current);
      playRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  useEffect(() => {
    if (!isPlaying || frames.length < 2) return;

    playIndexRef.current = frameIndex;
    let lastTs = performance.now();

    const tick = (now: number) => {
      const idx = playIndexRef.current;
      const f = frames[idx];
      const next = frames[idx + 1];
      if (!next) {
        stopPlay();
        return;
      }
      const dt = Math.max(frameTime(next) - frameTime(f), 20);
      if (now - lastTs >= dt) {
        const nextIdx = idx + 1;
        playIndexRef.current = nextIdx;
        setFrameIndex(nextIdx);
        lastTs = now;
      }
      playRef.current = requestAnimationFrame(tick);
    };

    playRef.current = requestAnimationFrame(tick);
    return () => {
      if (playRef.current != null) cancelAnimationFrame(playRef.current);
    };
  }, [isPlaying, frames, frameIndex, stopPlay]);

  const togglePlay = () => {
    if (isPlaying) {
      stopPlay();
    } else {
      if (frameIndex >= frames.length - 1) {
        setFrameIndex(0);
        playIndexRef.current = 0;
      }
      setIsPlaying(true);
    }
  };

  const handleScrub = (e: ChangeEvent<HTMLInputElement>) => {
    const p = parseFloat(e.target.value);
    const t = t0 + p * (t1 - t0);
    seekToTime(t);
    stopPlay();
  };

  if (frames.length === 0) {
    return (
      <div className="flex flex-col h-screen bg-black p-6">
        <button type="button" onClick={onBack} className="flex items-center gap-2 text-ios-blue mb-8">
          <ArrowLeft size={20} /> 返回
        </button>
        <p className="text-ios-gray">本组无录制数据。</p>
      </div>
    );
  }

  const displayRep = Math.max(0, (current?.rep ?? 0) - set.baselineRep);

  return (
    <div className="flex flex-col h-screen w-full bg-black overflow-hidden">
      <header className="px-5 pt-4 pb-3 flex items-center justify-between shrink-0 border-b border-white/5">
        <button type="button" onClick={onBack} className="flex items-center gap-2 text-ios-blue text-sm font-semibold">
          <ArrowLeft size={18} /> 返回
        </button>
        <div className="text-center">
          <p className="text-xs text-ios-gray">复盘</p>
          <p className="font-bold text-sm">
            第 {setIndex + 1} 组 · {set.weight}kg · {set.actualReps} 次
          </p>
        </div>
        <button
          type="button"
          onClick={togglePlay}
          className="w-10 h-10 rounded-full bg-ios-blue flex items-center justify-center"
        >
          {isPlaying ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
        </button>
      </header>

      <main className="flex-1 overflow-y-auto px-5 py-4 space-y-5 custom-scrollbar pb-8">
        <p className="text-[10px] text-ios-gray text-center">
          红点：设备标记 W=1 或倾斜超过 {TILT_THRESHOLD}°；按 E=1 切分次数（新固件）。
        </p>

        <div className="h-36 flex items-center justify-center">
          <BarbellVisualizer angle={current?.angle ?? 0} label={isPlaying ? '回放中' : undefined} />
        </div>

        <div className="ios-glass p-3 space-y-1">
          <p className="text-[10px] text-ios-gray font-bold">深度 cm</p>
          <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} className="w-full h-16">
            <path d={depthPath} fill="none" stroke="#34c759" strokeWidth="2" />
            {violations.map((v, i) => (
              <circle key={i} cx={v.x} cy={CHART_H / 2} r="3" fill="#ff3b30" opacity="0.5" />
            ))}
            <line
              x1={normX(frameIndex)}
              x2={normX(frameIndex)}
              y1={0}
              y2={CHART_H}
              stroke="#007aff"
              strokeWidth="1"
              strokeDasharray="4 2"
            />
          </svg>
        </div>

        <div className="ios-glass p-3 space-y-1">
          <p className="text-[10px] text-ios-gray font-bold">倾斜 °</p>
          <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} className="w-full h-16">
            <line x1={0} y1={CHART_H / 2} x2={CHART_W} y2={CHART_H / 2} stroke="#333" strokeWidth="1" />
            <path d={anglePath} fill="none" stroke="#fff" strokeWidth="2" />
            {violations.map((v, i) => (
              <circle key={i} cx={v.x} cy={CHART_H / 2} r="4" fill="#ff3b30" />
            ))}
            <line
              x1={normX(frameIndex)}
              x2={normX(frameIndex)}
              y1={0}
              y2={CHART_H}
              stroke="#007aff"
              strokeWidth="1"
            />
          </svg>
        </div>

        <div className="space-y-2">
          <input
            type="range"
            min={0}
            max={1}
            step={0.001}
            value={progress}
            onChange={handleScrub}
            className="w-full accent-ios-blue"
          />
          <div className="flex justify-between text-[10px] text-ios-gray font-mono">
            <span>深度 {current?.depth ?? 0}cm</span>
            <span>倾斜 {(current?.angle ?? 0).toFixed(1)}°</span>
            <span>第 {displayRep} 次</span>
          </div>
        </div>

        {set.repSegments && set.repSegments.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-ios-gray font-bold uppercase">按次查看</p>
            {set.repSegments.map((seg) => (
              <button
                key={seg.repIndex}
                type="button"
                onClick={() => {
                  seekToTime(seg.startT);
                  stopPlay();
                }}
                className="w-full text-left ios-glass px-4 py-3 rounded-xl active:bg-white/10"
              >
                <span className="font-semibold">第 {seg.repIndex} 次</span>
                <span className="text-ios-gray text-sm ml-2">
                  最大倾斜 {seg.maxTilt.toFixed(0)}° · 最浅 {seg.minDepth}cm
                  {seg.tiltEvents > 0 && (
                    <span className="text-ios-red ml-1">· 超标 {seg.tiltEvents} 帧</span>
                  )}
                </span>
              </button>
            ))}
          </div>
        )}

        {set.summary && (
          <div className="ios-glass p-4 text-sm text-ios-gray space-y-1">
            <p>平均倾斜 {set.summary.avgTilt.toFixed(1)}°</p>
            <p>倾斜超标帧 {set.summary.tiltOver10Count} 个</p>
            {set.summary.shallowReps > 0 && (
              <p className="text-ios-red">未充分触底约 {set.summary.shallowReps} 次</p>
            )}
          </div>
        )}
      </main>
    </div>
  );

  function normX(index: number) {
    if (frames.length <= 1) return CHART_W / 2;
    const f = frames[index];
    const span = Math.max(t1 - t0, 1);
    return 4 + ((frameTime(f) - t0) / span) * (CHART_W - 8);
  }
}
