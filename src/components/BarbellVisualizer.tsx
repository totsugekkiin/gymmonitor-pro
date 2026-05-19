import { motion } from 'motion/react';

type Props = {
  angle: number;
  label?: string;
};

export function BarbellVisualizer({ angle, label }: Props) {
  return (
    <div className="w-full max-w-[280px] relative flex items-center justify-center">
      <motion.div
        className="w-full relative flex items-center justify-center"
        animate={{ rotate: angle }}
        transition={{ type: 'spring', stiffness: 150, damping: 25 }}
      >
        <div className="absolute w-full h-[3px] bg-gradient-to-r from-gray-700 via-white/50 to-gray-700 rounded-full" />
        <div className="absolute left-0 flex flex-row-reverse gap-0.5">
          <div className="w-5 h-24 bg-ios-bg border border-white/10 rounded-sm" />
          <div className="w-3 h-20 bg-ios-bg border border-white/10 rounded-sm opacity-60" />
        </div>
        <div className="absolute right-0 flex gap-0.5">
          <div className="w-5 h-24 bg-ios-bg border border-white/10 rounded-sm" />
          <div className="w-3 h-20 bg-ios-bg border border-white/10 rounded-sm opacity-60" />
        </div>
        <div className="absolute w-2 h-2 bg-ios-blue rounded-full shadow-[0_0_10px_rgba(0,122,255,1)]" />
      </motion.div>
      {label && (
        <div className="absolute -top-6 right-0 px-2 py-1 bg-ios-blue/20 text-ios-blue text-[10px] font-black uppercase rounded tracking-widest animate-pulse">
          {label}
        </div>
      )}
    </div>
  );
}
