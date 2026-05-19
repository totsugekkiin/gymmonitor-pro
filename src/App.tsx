import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { Activity, Bluetooth, Plus } from 'lucide-react';
import { LiveHud } from './components/LiveHud';
import { SetTable } from './components/SetTable';
import { SetSummaryCard } from './components/SetSummaryCard';
import { ReviewPage } from './components/ReviewPage';
import { useWorkoutSession } from './hooks/useWorkoutSession';
import { useBluetooth } from './hooks/useBluetooth';

type AppMode = 'live' | 'review';

function formatSessionTime(s: number) {
  const min = Math.floor(s / 60);
  const sec = s % 60;
  return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}

export default function App() {
  const [mode, setMode] = useState<AppMode>('live');
  const [reviewSetId, setReviewSetId] = useState<string | null>(null);
  const [sessionTime, setSessionTime] = useState(0);

  const {
    session,
    phase,
    activeSet,
    lastCompletedSetId,
    clearLastCompleted,
    startSession,
    endSession,
    addSet,
    updateWeight,
    startSet,
    endSet,
    appendFrame,
    getSet,
  } = useWorkoutSession();

  const { live, isConnected, error, connect, sendCommand, registerTelemetryHandler } =
    useBluetooth();

  useEffect(() => {
    registerTelemetryHandler((data) => {
      if (activeSet) {
        appendFrame(activeSet.id, {
          t: Date.now(),
          deviceT: data.deviceT,
          depth: data.depth,
          angle: data.angle,
          rep: data.rep,
          warn: data.warn,
          repEvent: data.repEvent,
        });
      }
    });
    return () => registerTelemetryHandler(null);
  }, [activeSet, appendFrame, registerTelemetryHandler]);

  useEffect(() => {
    if (phase !== 'in_session') return;
    const timer = setInterval(() => setSessionTime((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, [phase]);

  const handleStartSession = () => {
    startSession();
    setSessionTime(0);
  };

  const handleEndSession = () => {
    if (activeSet) {
      alert('请先结束当前组');
      return;
    }
    endSession();
    setSessionTime(0);
  };

  const handleStartSet = useCallback(
    async (setId: string) => {
      if (!isConnected) await connect();
      try {
        await sendCommand('RESET');
        await new Promise((r) => setTimeout(r, 150));
      } catch {
        alert('无法发送 RESET，请重新连接蓝牙');
        return;
      }
      startSet(setId, 0);
    },
    [isConnected, connect, sendCommand, startSet],
  );

  const handleEndSet = useCallback(
    (setId: string) => {
      endSet(setId, live.rep);
    },
    [endSet, live.rep],
  );

  const openReview = (setId: string) => {
    const s = getSet(setId);
    if (!s || s.frames.length === 0) return;
    if (activeSet) return;
    setReviewSetId(setId);
    setMode('review');
  };

  const reviewSet = reviewSetId ? getSet(reviewSetId) : null;
  const reviewIndex =
    reviewSet && session ? session.sets.findIndex((s) => s.id === reviewSetId) : -1;

  const lastCompletedSet =
    lastCompletedSetId && session
      ? session.sets.find((s) => s.id === lastCompletedSetId)
      : null;
  const lastCompletedIndex =
    lastCompletedSet && session
      ? session.sets.findIndex((s) => s.id === lastCompletedSetId)
      : -1;

  if (mode === 'review' && reviewSet && reviewIndex >= 0) {
    return (
      <ReviewPage
        set={reviewSet}
        setIndex={reviewIndex}
        onBack={() => {
          setMode('live');
          setReviewSetId(null);
        }}
      />
    );
  }

  const sets = session?.sets ?? [];
  const isImbalanced = live.warn || Math.abs(live.angle) > 10;

  return (
    <div
      className={`flex flex-col h-screen w-full bg-black touch-none select-none overflow-hidden ${
        phase === 'in_session' && isImbalanced ? 'ambient-red' : ''
      }`}
    >
      <header className="px-6 pt-4 pb-2 flex items-center justify-between z-50 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-4xl font-bold tracking-tighter tabular-nums">
            {phase === 'in_session' ? formatSessionTime(sessionTime) : '--:--'}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => connect()}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
              isConnected ? 'bg-ios-blue/20 text-ios-blue' : 'bg-white/5 text-white/20'
            }`}
            aria-label="连接蓝牙"
          >
            <Bluetooth size={20} className={isConnected ? 'animate-pulse' : ''} />
          </button>
          {phase === 'in_session' ? (
            <button
              type="button"
              onClick={handleEndSession}
              className="px-4 py-2 bg-ios-blue rounded-full text-white font-semibold text-sm"
            >
              完成训练
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStartSession}
              className="px-4 py-2 bg-ios-green rounded-full text-white font-semibold text-sm"
            >
              开始训练
            </button>
          )}
        </div>
      </header>

      {error && (
        <p className="px-6 text-xs text-ios-red pb-2">{error}</p>
      )}

      <main className="flex-1 overflow-y-auto px-5 pb-32 space-y-6 custom-scrollbar">
        {phase === 'idle' && (
          <div className="ios-glass p-8 text-center space-y-4 mt-8">
            <h2 className="text-xl font-bold">GymMonitor Pro</h2>
            <p className="text-sm text-ios-gray leading-relaxed">
              连接杠铃上的传感器，开始训练后记录每一组，练完可回放查看倾斜与深度。
            </p>
            <button
              type="button"
              onClick={() => connect()}
              className="text-sm text-ios-blue font-semibold"
            >
              {isConnected ? '蓝牙已连接' : '先连接蓝牙设备'}
            </button>
          </div>
        )}

        {phase === 'in_session' && (
          <>
            <LiveHud
              live={live}
              isConnected={isConnected}
              activeSet={activeSet}
              activeSetIndex={
                activeSet ? sets.findIndex((s) => s.id === activeSet.id) : -1
              }
              onConnect={connect}
            />
            <SetTable
              sets={sets}
              live={live}
              activeSetId={activeSet?.id ?? null}
              hasActiveSet={!!activeSet}
              onStartSet={handleStartSet}
              onEndSet={handleEndSet}
              onReview={openReview}
              onUpdateWeight={updateWeight}
              onAddSet={addSet}
            />
          </>
        )}
      </main>

      {phase === 'in_session' && (
        <nav className="fixed bottom-0 left-0 w-full ios-glass border-t border-white/5 px-12 pt-4 pb-10 flex justify-between items-center z-40">
          <button
            type="button"
            className="w-14 h-14 bg-ios-blue rounded-full flex items-center justify-center shadow-xl shadow-ios-blue/30 -mt-12 border-4 border-black active:scale-90 transition-transform"
            onClick={addSet}
          >
            <Plus size={28} className="text-white" />
          </button>
          <div className="flex flex-col items-center gap-1 opacity-40">
            <Activity size={24} />
            <span className="text-[10px] font-bold">卧推</span>
          </div>
        </nav>
      )}

      <AnimatePresence>
        {lastCompletedSet && lastCompletedIndex >= 0 && phase === 'in_session' && (
          <SetSummaryCard
            set={lastCompletedSet}
            setIndex={lastCompletedIndex}
            onViewReplay={() => {
              openReview(lastCompletedSet.id);
              clearLastCompleted();
            }}
            onDismiss={clearLastCompleted}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
