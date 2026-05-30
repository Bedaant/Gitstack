import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, ShieldCheck, ChevronDown, HelpCircle, Lightbulb } from 'lucide-react';

const TYPE_CONFIG = {
  security: { label: 'Security', color: '#E07A5F', border: 'border-l-[#E07A5F]' },
  infra: { label: 'Infrastructure', color: '#60A5FA', border: 'border-l-[#60A5FA]' },
  env: { label: 'Environment', color: '#A78BFA', border: 'border-l-[#A78BFA]' },
  validation: { label: 'Validation', color: '#FBBF24', border: 'border-l-[#FBBF24]' },
  perf: { label: 'Performance', color: '#34D399', border: 'border-l-[#34D399]' },
};

const CONFIDENCE_CONFIG = {
  High: { text: 'text-signal-green', bg: 'bg-signal-green/10', border: 'border-signal-green/20' },
  Medium: { text: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
  Low: { text: 'text-signal-coral', bg: 'bg-signal-coral/10', border: 'border-signal-coral/20' },
};

export default function AssumptionCard({ assumption, onOverride, onConfirm, isActive, onClick }) {
  const [showWhy, setShowWhy] = useState(false);
  const [showConfirmOverride, setShowConfirmOverride] = useState(false);
  const type = TYPE_CONFIG[assumption.type] || TYPE_CONFIG.validation;
  const conf = CONFIDENCE_CONFIG[assumption.confidence] || CONFIDENCE_CONFIG.Medium;

  return (
    <div
      id={`assumption-${assumption.id}`}
      onClick={onClick}
      className={`signal-card border-l-4 ${type.border} cursor-pointer transition-all hover:brightness-110 ${isActive ? 'ring-2 ring-signal-purple/30' : ''}`}
    >
      <div className="flex items-start gap-2.5">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: type.color }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{type.label}</span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${conf.bg} ${conf.text} ${conf.border}`}>
              {assumption.confidence}
            </span>
            {assumption.lineNumber && (
              <span className="text-[10px] text-gray-600 font-mono">line {assumption.lineNumber}</span>
            )}
          </div>
          <p className="text-sm text-gray-200 font-medium leading-snug">{assumption.text}</p>
        </div>
      </div>

      <button
        onClick={(e) => { e.stopPropagation(); setShowWhy(!showWhy); }}
        className="flex items-center gap-1 mt-3 text-[11px] text-gray-500 hover:text-gray-300 transition-colors"
      >
        <HelpCircle className="w-3 h-3" />
        Why this matters
        <ChevronDown className={`w-3 h-3 transition-transform ${showWhy ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {showWhy && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="mt-2 bg-signal-dark rounded-lg p-3 border border-signal-border space-y-2">
              <p className="text-xs text-gray-400 leading-relaxed">{assumption.whyItMatters}</p>
              {assumption.suggestedFix && (
                <div className="flex items-start gap-1.5">
                  <Lightbulb className="w-3 h-3 text-signal-purple shrink-0 mt-0.5" />
                  <p className="text-xs text-gray-500"><span className="text-gray-400">Suggestion:</span> {assumption.suggestedFix}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex gap-2 mt-3">
        {!showConfirmOverride ? (
          <>
            <button onClick={(e) => { e.stopPropagation(); onConfirm(); }} className="signal-btn-confirm text-xs flex items-center gap-1.5 py-1.5 px-3">
              <ShieldCheck className="w-3.5 h-3.5" /> Confirm
            </button>
            <button onClick={(e) => { e.stopPropagation(); setShowConfirmOverride(true); }} className="signal-btn-override text-xs flex items-center gap-1.5 py-1.5 px-3">
              <AlertTriangle className="w-3.5 h-3.5" /> Override
            </button>
          </>
        ) : (
          <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 bg-signal-coral/10 border border-signal-coral/20 rounded-lg p-2 flex-1">
            <span className="text-xs text-signal-coral flex-1">Mark as accepted risk?</span>
            <button onClick={(e) => { e.stopPropagation(); setShowConfirmOverride(false); }} className="text-xs text-gray-400 hover:text-white px-2 py-1">Cancel</button>
            <button onClick={(e) => { e.stopPropagation(); onOverride(); }} className="text-xs bg-signal-coral text-white font-semibold px-3 py-1.5 rounded hover:bg-opacity-90 transition-all">Yes, override</button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
