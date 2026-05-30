import React from 'react';
import { motion } from 'framer-motion';
import { Brain, AlertTriangle, CheckCircle, ShieldCheck, Search, Filter } from 'lucide-react';
import AssumptionCard from './AssumptionCard';

export default function SignalPanel({ trace, calibration, onOverride, onConfirm, activeAssumptionId, onAssumptionClick, filter, onFilterChange }) {
  const progress = Math.min((calibration.count / 5) * 100, 100);
  const isCalibrated = calibration.count >= 5;

  const filteredAssumptions = trace.assumptions.filter(a => {
    if (filter.type !== 'all' && a.type !== filter.type) return false;
    if (filter.confidence !== 'all' && a.confidence !== filter.confidence) return false;
    return true;
  });

  const pending = filteredAssumptions.filter(a => a.status === 'pending');
  const confirmed = filteredAssumptions.filter(a => a.status === 'confirmed' || a.status === 'auto_confirmed');
  const overridden = filteredAssumptions.filter(a => a.status === 'overridden');

  const types = ['all', ...new Set(trace.assumptions.map(a => a.type))];
  const confidences = ['all', ...new Set(trace.assumptions.map(a => a.confidence))];

  return (
    <div className="flex flex-col h-full">
      {/* Calibration Header */}
      <div className="border-b border-signal-border p-4 bg-[#0f0f12]">
        <div className="flex items-center gap-2 mb-3">
          <Brain className="w-4 h-4 text-signal-purple" />
          <span className="text-sm font-bold text-gray-100">Signal Calibration</span>
          {isCalibrated && (
            <span className="text-[10px] font-bold uppercase tracking-wider bg-signal-green/20 text-signal-green px-2 py-0.5 rounded border border-signal-green/30 ml-auto">
              Active
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl font-bold text-gray-100">{calibration.count}</span>
          <span className="text-sm text-gray-500">/ 5 overrides</span>
        </div>

        <div className="w-full bg-signal-border rounded-full h-1.5">
          <motion.div className="bg-signal-purple h-1.5 rounded-full" initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.5 }} />
        </div>

        <p className="text-[11px] text-gray-500 mt-2">
          {isCalibrated ? 'Well-calibrated users see fewer interruptions' : 'Signal learns your verification patterns after 5 decisions'}
        </p>
      </div>

      {/* Filters */}
      <div className="border-b border-signal-border p-3 space-y-2">
        <div className="flex items-center gap-2 text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
          <Filter className="w-3 h-3" /> Filter
        </div>
        <div className="flex gap-2">
          <select
            value={filter.type}
            onChange={(e) => onFilterChange({ type: e.target.value })}
            className="bg-signal-dark border border-signal-border rounded text-xs text-gray-300 px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-signal-purple/50"
          >
            {types.map(t => (
              <option key={t} value={t}>{t === 'all' ? 'All Types' : t.charAt(0).toUpperCase() + t.slice(1)}</option>
            ))}
          </select>
          <select
            value={filter.confidence}
            onChange={(e) => onFilterChange({ confidence: e.target.value })}
            className="bg-signal-dark border border-signal-border rounded text-xs text-gray-300 px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-signal-purple/50"
          >
            {confidences.map(c => (
              <option key={c} value={c}>{c === 'all' ? 'All Confidence' : c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Assumption Registry */}
      <div className="flex-1 overflow-auto p-4 space-y-3">
        {pending.length > 0 && (
          <div className="flex items-center gap-2 sticky top-0 bg-[#0a0a0c] py-2 z-10">
            <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-yellow-400">
              Pending Review ({pending.length})
            </span>
          </div>
        )}

        {pending.map((a, i) => (
          <motion.div key={a.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}>
            <AssumptionCard
              assumption={a}
              onOverride={() => onOverride(a.id)}
              onConfirm={() => onConfirm(a.id)}
              isActive={a.id === activeAssumptionId}
              onClick={() => onAssumptionClick(a.id)}
            />
          </motion.div>
        ))}

        {confirmed.length > 0 && (
          <div className="flex items-center gap-2 pt-2">
            <CheckCircle className="w-3.5 h-3.5 text-signal-green" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-signal-green">
              Confirmed ({confirmed.length})
            </span>
          </div>
        )}

        {confirmed.map(a => (
          <div key={a.id} className={`signal-card border-l-2 border-l-signal-green opacity-60 py-3 px-3 ${a.status === 'auto_confirmed' ? 'bg-signal-green/5' : ''}`}>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-signal-green shrink-0" />
              <p className="text-sm text-gray-400 line-through">{a.text}</p>
              {a.status === 'auto_confirmed' && <span className="text-[10px] text-signal-green ml-auto">Auto</span>}
            </div>
          </div>
        ))}

        {overridden.length > 0 && (
          <div className="flex items-center gap-2 pt-2">
            <AlertTriangle className="w-3.5 h-3.5 text-signal-coral" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-signal-coral">
              Accepted Risks ({overridden.length})
            </span>
          </div>
        )}

        {overridden.map(a => (
          <div key={a.id} className="signal-card border-l-2 border-l-signal-coral opacity-60 py-3 px-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-signal-coral shrink-0" />
              <p className="text-sm text-gray-400 line-through">{a.text}</p>
            </div>
          </div>
        ))}

        {pending.length === 0 && confirmed.length === 0 && overridden.length === 0 && (
          <div className="text-center py-8 text-gray-600 text-sm">
            <Search className="w-6 h-6 mx-auto mb-2 opacity-50" />
            No assumptions match your filters.
          </div>
        )}
      </div>
    </div>
  );
}
