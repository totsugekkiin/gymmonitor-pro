import { motion } from 'motion/react';
import { AlertCircle } from 'lucide-react';
import type { LiveTelemetry, WorkoutSet } from '../types/workout';
import { TILT_THRESHOLD } from '../types/workout';
import { BarbellVisualizer } from './BarbellVisualizer';

type Props = {
  live: LiveTelemetry;
  isConnected: boolean;
  activeSet: WorkoutSet | null;
  activeSetIndex: number;
  onConnect: () => void;
};

export function LiveHud({ live, isConnected, activeSet, activeSetIndex, onConnect }: Props) {
  const isImbalanced = live.warn || Math.abs(live.angle) > TILT_THRESHOLD;
  const isTargetDepth = live.depth <= 5 && live.depth > 0;
  const setReps =
    activeSet != null ? Math.max(0, live.rep - activeSet.baselineRep) : live.rep;

  return (
    <section className="mt-4">
      <motion.div
        className={`ios-glass p-5 space-y-6 shadow-2xl relative overflow-hidden ${isImbalanced ? 'ambient-red' : ''}`}
      >
        <div className="flex items-center justify-between text-ios-gray">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white tracking-tight">杠铃卧推</span>
            {activeSet && activeSetIndex >= 0 && (
              <span className="text-[10px] bg-ios-red/20 text-ios-red px-2 py-0.5 rounded font-bold">
                第 {activeSetIndex + 1} 组
              </span>
            )}
          </div>
          {!isConnected && (
            <button
              type="button"
              onClick={onConnect}
              className="text-[10px] bg-ios-blue/10 text-ios-blue px-2 py-1 rounded font-bold"
            >
              点击连接
            </button>
          )}
        </div>

        {activeSet && (
          <p className="text-xs text-ios-blue font-semibold -mt-4">本组进行中 · 结束后可复盘</p>
        )}

        <div className="grid grid-cols-3 gap-4">
          <div className="flex flex-col">
            <span
              className={`text-4xl font-light tracking-tighter ${isTargetDepth ? 'text-ios-green' : 'text-white'}`}
            >
              {live.depth}
            </span>
            <span className="text-[10px] text-ios-gray font-bold">触底深度 cm</span>
          </div>
          <div className="flex flex-col">
            <span
              className={`text-4xl font-light tracking-tighter ${isImbalanced ? 'text-ios-red' : 'text-white'}`}
            >
              {live.angle.toFixed(0)}°
            </span>
            <span className="text-[10px] text-ios-gray font-bold">左右平衡</span>
          </div>
          <div className="flex flex-col">
            <span className="text-4xl font-light tracking-tighter text-ios-blue">
              {activeSet ? setReps : live.rep}
            </span>
            <span className="text-[10px] text-ios-gray font-bold">
              {activeSet ? '本组次数' : '累计次数'}
            </span>
          </div>
        </div>

        <div className="h-40 flex items-center justify-center relative">
          <BarbellVisualizer angle={live.angle} />
        </div>

        {isImbalanced && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-ios-red/5 pointer-events-none border border-ios-red/20 rounded-[20px]"
          />
        )}

        {isImbalanced && (
          <div className="flex items-center gap-3 pt-2 border-t border-white/5">
            <AlertCircle className="text-ios-red w-5 h-5 shrink-0" />
            <p className="text-sm text-ios-red">
              杠铃倾斜 {Math.abs(live.angle).toFixed(0)}°，请调整姿势
            </p>
          </div>
        )}
      </motion.div>
    </section>
  );
}
