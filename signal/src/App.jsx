import React, { useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MOCK_TRACES } from './data/mockTraces';
import { useSignal } from './hooks/useSignal';
import { useKeyboard } from './hooks/useKeyboard';
import CodePanel from './components/CodePanel';
import SignalPanel from './components/SignalPanel';
import PromptBar from './components/PromptBar';
import SignalTour from './components/SignalTour';
import ExportModal from './components/ExportModal';
import { Undo2, Download, Keyboard, X } from 'lucide-react';

export default function App() {
  const signal = useSignal();
  const {
    trace, calibration, activeAssumptionId, hoveredLine, filter,
    showTour, tourStep, toast,
    generate, override, confirm, undo, setActive, setHoveredLine, setFilter,
    startTour, nextTour, endTour, clearSession,
  } = signal;

  const [showExport, setShowExport] = React.useState(false);
  const [showShortcuts, setShowShortcuts] = React.useState(false);

  // Onboarding: show tour on first visit with no calibration
  useEffect(() => {
    if (trace && calibration.count === 0 && !showTour) {
      const t = setTimeout(startTour, 1200);
      return () => clearTimeout(t);
    }
  }, [trace, calibration.count, showTour, startTour]);

  const handleGenerate = (prompt) => {
    const match = MOCK_TRACES.find(t =>
      t.prompt.toLowerCase().includes(prompt.toLowerCase().split(' ').slice(0, 2).join(' '))
    ) || MOCK_TRACES[0];
    generate({
      ...match,
      assumptions: match.assumptions.map(a => ({ ...a, status: 'pending' }))
    });
  };

  const pendingIds = useMemo(() =>
    trace?.assumptions.filter(a => a.status === 'pending').map(a => a.id) || [],
    [trace]
  );

  useKeyboard({
    onUndo: undo,
    onNextAssumption: setActive,
    onPrevAssumption: setActive,
    onConfirm: confirm,
    onOverride: override,
    canUndo: signal.history.length > 0,
    activeId: activeAssumptionId || pendingIds[0],
    assumptionIds: pendingIds,
  });

  return (
    <div className="h-screen flex flex-col bg-[#0a0a0c] text-gray-100 overflow-hidden">
      {/* Header */}
      <PromptBar onGenerate={handleGenerate} hasTrace={!!trace} onNew={clearSession} />

      {/* Toolbar */}
      {trace && (
        <div className="border-b border-signal-border px-5 py-2 flex items-center gap-3 bg-[#0f0f12]">
          <button
            onClick={undo}
            disabled={signal.history.length === 0}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Undo last action (Ctrl+Z)"
          >
            <Undo2 className="w-3.5 h-3.5" /> Undo
          </button>
          <div className="w-px h-3 bg-signal-border" />
          <button
            onClick={() => setShowExport(true)}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Export
          </button>
          <div className="w-px h-3 bg-signal-border" />
          <button
            onClick={() => setShowShortcuts(true)}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
          >
            <Keyboard className="w-3.5 h-3.5" /> Shortcuts
          </button>
          <div className="ml-auto text-xs text-gray-600">
            {trace.assumptions.filter(a => a.status === 'pending').length} pending
          </div>
        </div>
      )}

      {/* Main */}
      {trace ? (
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 min-w-0 overflow-auto">
            <CodePanel
              trace={trace}
              onAssumptionClick={setActive}
              activeAssumptionId={activeAssumptionId}
              hoveredLine={hoveredLine}
              onLineHover={setHoveredLine}
            />
          </div>
          <div className="w-[440px] border-l border-signal-border overflow-hidden flex flex-col">
            <SignalPanel
              trace={trace}
              calibration={calibration}
              onOverride={override}
              onConfirm={confirm}
              activeAssumptionId={activeAssumptionId}
              onAssumptionClick={setActive}
              filter={filter}
              onFilterChange={setFilter}
            />
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <EmptyState onExampleClick={handleGenerate} />
        </div>
      )}

      {/* Tour */}
      <AnimatePresence>
        {showTour && (
          <SignalTour step={tourStep} onNext={nextTour} onEnd={endTour} />
        )}
      </AnimatePresence>

      {/* Export Modal */}
      <AnimatePresence>
        {showExport && trace && (
          <ExportModal trace={trace} onClose={() => setShowExport(false)} />
        )}
      </AnimatePresence>

      {/* Shortcuts Modal */}
      <AnimatePresence>
        {showShortcuts && (
          <ShortcutsModal onClose={() => setShowShortcuts(false)} />
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 10, x: '-50%' }}
            className="fixed bottom-6 left-1/2 bg-signal-purple text-white px-5 py-3 rounded-lg shadow-2xl font-medium text-sm z-50"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function EmptyState({ onExampleClick }) {
  const examples = [
    "Create a Python login endpoint",
    "Build a file upload handler",
    "Export user data as CSV"
  ];
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center space-y-6"
    >
      <div className="w-16 h-16 rounded-2xl bg-signal-purple/20 flex items-center justify-center mx-auto">
        <span className="text-3xl">⚡</span>
      </div>
      <div>
        <h2 className="text-xl font-bold text-gray-100 mb-2">Claude Signal</h2>
        <p className="text-gray-400 text-sm max-w-sm mx-auto">
          Generate code and review the invisible assumptions before they break in production.
        </p>
      </div>
      <div className="space-y-2">
        <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Try an example</p>
        <div className="flex gap-2 justify-center flex-wrap">
          {examples.map(ex => (
            <button
              key={ex}
              onClick={() => onExampleClick(ex)}
              className="px-4 py-2 bg-signal-card border border-signal-border rounded-lg text-sm text-gray-300 hover:border-signal-purple/50 hover:text-white transition-all"
            >
              {ex}
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function ShortcutsModal({ onClose }) {
  const shortcuts = [
    { key: 'Ctrl + Z', action: 'Undo last decision' },
    { key: 'J / ↓', action: 'Next assumption' },
    { key: 'K / ↑', action: 'Previous assumption' },
    { key: 'Enter / C', action: 'Confirm assumption' },
    { key: 'O', action: 'Override assumption' },
    { key: '?', action: 'Show this help' },
  ];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-signal-card border border-signal-border rounded-xl max-w-sm w-full p-5"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-100">Keyboard Shortcuts</h3>
          <button onClick={onClose} className="hover:bg-white/5 p-1 rounded"><X className="w-4 h-4 text-gray-400" /></button>
        </div>
        <div className="space-y-2">
          {shortcuts.map((s, i) => (
            <div key={i} className="flex items-center justify-between py-1.5 border-b border-signal-border last:border-0">
              <kbd className="bg-signal-dark border border-signal-border px-2 py-0.5 rounded text-xs font-mono text-gray-300">{s.key}</kbd>
              <span className="text-sm text-gray-400">{s.action}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
