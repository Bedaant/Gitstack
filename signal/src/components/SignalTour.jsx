import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MousePointer, Eye, AlertTriangle, CheckCircle, X } from 'lucide-react';

const STEPS = [
  {
    icon: <MousePointer className="w-5 h-5" />,
    title: "Generate Code",
    desc: "Type a prompt and Signal generates code + a reasoning trace.",
    target: null,
  },
  {
    icon: <Eye className="w-5 h-5" />,
    title: "Review Assumptions",
    desc: "Colored dots in the code gutter show where invisible assumptions live. Click any dot.",
    target: "code-gutter",
  },
  {
    icon: <AlertTriangle className="w-5 h-5" />,
    title: "Override When Needed",
    desc: "If you accept a risk, click Override. Signal adds an inline comment and learns your pattern.",
    target: "override-btn",
  },
  {
    icon: <CheckCircle className="w-5 h-5" />,
    title: "Build Calibration",
    desc: "After 5 decisions, Signal auto-confirms assumptions that match your patterns.",
    target: "calibration-bar",
  },
];

export default function SignalTour({ step, onNext, onEnd }) {
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-6 pointer-events-none">
      <div className="absolute inset-0 bg-black/40 pointer-events-auto" onClick={onEnd} />
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        className="relative bg-signal-card border border-signal-border rounded-xl p-5 max-w-md w-full shadow-2xl pointer-events-auto"
      >
        <button onClick={onEnd} className="absolute top-3 right-3 hover:bg-white/5 p-1 rounded">
          <X className="w-4 h-4 text-gray-500" />
        </button>

        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-lg bg-signal-purple/20 flex items-center justify-center text-signal-purple">
            {current.icon}
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Step {step + 1} of {STEPS.length}</span>
            <h3 className="font-bold text-gray-100">{current.title}</h3>
          </div>
        </div>

        <p className="text-sm text-gray-400 leading-relaxed mb-4">{current.desc}</p>

        <div className="flex items-center gap-2">
          <div className="flex gap-1.5 flex-1">
            {STEPS.map((_, i) => (
              <div key={i} className={`h-1 rounded-full flex-1 ${i <= step ? 'bg-signal-purple' : 'bg-signal-border'}`} />
            ))}
          </div>
          {isLast ? (
            <button onClick={onEnd} className="signal-btn-primary text-xs px-4 py-2">Start Using Signal</button>
          ) : (
            <button onClick={onNext} className="signal-btn-primary text-xs px-4 py-2">Next</button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
