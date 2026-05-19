import { Check, ChevronRight, Play, RotateCcw, Square } from 'lucide-react';
import type { LiveTelemetry, WorkoutSet } from '../types/workout';

type Props = {
  sets: WorkoutSet[];
  live: LiveTelemetry;
  activeSetId: string | null;
  hasActiveSet: boolean;
  onStartSet: (id: string) => void;
  onEndSet: (id: string) => void;
  onReview: (id: string) => void;
  onUpdateWeight: (id: string, weight: number) => void;
  onAddSet: () => void;
};

export function SetTable({
  sets,
  live,
  activeSetId,
  hasActiveSet,
  onStartSet,
  onEndSet,
  onReview,
  onUpdateWeight,
  onAddSet,
}: Props) {
  const doneCount = sets.filter((s) => s.status === 'done').length;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between px-2">
        <h3 className="text-sm font-semibold text-ios-gray uppercase tracking-widest">训练记录</h3>
        <span className="text-[10px] text-ios-gray font-bold">
          {doneCount}/{sets.length} 组
        </span>
      </div>

      <div className="space-y-2">
        <div className="grid grid-cols-[40px_1fr_1fr_120px_36px] gap-2 px-2 text-[10px] font-black text-ios-gray">
          <span>组</span>
          <span className="text-center">重量</span>
          <span className="text-center">次数</span>
          <span className="text-center">操作</span>
          <span />
        </div>

        {sets.map((set, idx) => {
          const isActive = set.id === activeSetId;
          const setReps = isActive
            ? Math.max(0, live.rep - set.baselineRep)
            : set.actualReps;
          const canReview = set.status === 'done' && set.frames.length > 0;
          const canStart = set.status === 'pending' && !hasActiveSet;

          return (
            <div
              key={set.id}
              className={`grid grid-cols-[40px_1fr_1fr_120px_36px] gap-2 items-center p-2 rounded-xl transition-all ${
                isActive ? 'bg-ios-blue/10 border border-ios-blue/20' : 'bg-white/5'
              }`}
            >
              <div className="text-center font-bold text-sm text-ios-gray">{idx + 1}</div>

              <button
                type="button"
                className="bg-white/5 rounded-lg py-2 flex items-center justify-center gap-1 active:bg-white/15"
                onClick={() => {
                  const v = prompt('重量 (kg)', String(set.weight));
                  if (v != null) {
                    const n = parseFloat(v);
                    if (!Number.isNaN(n) && n >= 0) onUpdateWeight(set.id, n);
                  }
                }}
              >
                <span className="text-lg font-mono">{set.weight}</span>
                <span className="text-[8px] text-ios-gray font-bold">KG</span>
              </button>

              <div className="bg-white/5 rounded-lg py-2 flex items-center justify-center gap-1">
                <span className="text-lg font-mono">{setReps}</span>
                <span className="text-[8px] text-ios-gray font-bold">次</span>
              </div>

              <div className="flex gap-1">
                {set.status === 'done' && (
                  <button
                    type="button"
                    onClick={() => onReview(set.id)}
                    disabled={!canReview}
                    className={`flex-1 h-10 rounded-lg flex items-center justify-center ${
                      canReview ? 'bg-white/10 text-ios-blue' : 'bg-white/5 text-white/20 cursor-not-allowed'
                    }`}
                    title="回放"
                  >
                    <RotateCcw size={16} />
                  </button>
                )}
                {set.status === 'pending' && (
                  <button
                    type="button"
                    onClick={() => onStartSet(set.id)}
                    disabled={!canStart}
                    className={`flex-1 h-10 rounded-lg flex items-center justify-center ${
                      canStart ? 'bg-white/10 text-white' : 'bg-white/5 text-white/20 cursor-not-allowed'
                    }`}
                    title="开始本组"
                  >
                    <Play size={16} className="ml-0.5" />
                  </button>
                )}
                {set.status === 'active' && (
                  <button
                    type="button"
                    onClick={() => onEndSet(set.id)}
                    className="flex-1 h-10 rounded-lg flex items-center justify-center bg-ios-red animate-pulse"
                    title="结束本组"
                  >
                    <Square size={16} className="fill-white text-white" />
                  </button>
                )}
                {set.status === 'done' && (
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-ios-green/20">
                    <Check size={18} className="text-ios-green" />
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => canReview && onReview(set.id)}
                disabled={!canReview}
                className="flex justify-center disabled:opacity-20"
              >
                <ChevronRight size={16} className="text-white/40" />
              </button>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onAddSet}
        className="w-full py-4 ios-glass bg-white/5 text-sm font-semibold rounded-xl active:bg-white/10"
      >
        + 新增一组
      </button>
    </section>
  );
}
