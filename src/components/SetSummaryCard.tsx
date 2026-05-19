import { motion } from 'motion/react';
import type { WorkoutSet } from '../types/workout';

type Props = {
  set: WorkoutSet;
  setIndex: number;
  onViewReplay: () => void;
  onDismiss: () => void;
};

export function SetSummaryCard({ set, setIndex, onViewReplay, onDismiss }: Props) {
  const summary = set.summary;
  if (!summary) return null;

  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 80, opacity: 0 }}
      className="fixed bottom-24 left-4 right-4 z-50 ios-glass p-5 space-y-3 border border-ios-blue/30"
    >
      <h3 className="font-bold text-lg">第 {setIndex + 1} 组完成</h3>
      <p className="text-sm text-ios-gray leading-relaxed">
        本组 {summary.actualReps} 次 · {summary.tiltOver10Count} 帧倾斜超标 · 最大{' '}
        {summary.maxTilt.toFixed(0)}° · 平均深度 {summary.avgDepth.toFixed(0)} cm
      </p>
      {set.frames.length === 0 && (
        <p className="text-xs text-ios-red/80">
          倾斜报警时设备可能暂停推送，曲线或有缺口。
        </p>
      )}
      <motion.div className="flex gap-3">
        <button
          type="button"
          onClick={onViewReplay}
          className="flex-1 py-3 bg-ios-blue rounded-xl font-semibold text-sm"
        >
          查看回放
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="px-5 py-3 bg-white/10 rounded-xl text-sm"
        >
          继续
        </button>
      </motion.div>
    </motion.div>
  );
}
