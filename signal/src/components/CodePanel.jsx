import React from 'react';
import { motion } from 'framer-motion';
import { FileCode } from 'lucide-react';

const TYPE_COLORS = {
  security: '#E07A5F',
  infra: '#60A5FA',
  env: '#A78BFA',
  validation: '#FBBF24',
  perf: '#34D399',
};

export default function CodePanel({ trace, onAssumptionClick, activeAssumptionId, hoveredLine, onLineHover }) {
  const lines = trace.code.split('\n');

  const getLineAssumptions = (lineNum) =>
    trace.assumptions.filter(a => a.lineNumber === lineNum && a.status === 'pending');

  const getOverriddenAtLine = (lineNum) =>
    trace.assumptions.filter(a => a.lineNumber === lineNum && a.status === 'overridden');

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileCode className="w-4 h-4 text-gray-500" />
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Generated Code</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">Python · Flask</span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
            trace.overallConfidence === 'High' ? 'bg-signal-green/10 border-signal-green/30 text-signal-green' :
            trace.overallConfidence === 'Medium' ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400' :
            'bg-signal-coral/10 border-signal-coral/30 text-signal-coral'
          }`}>
            {trace.overallConfidence} Confidence
          </span>
        </div>
      </div>

      <div className="bg-[#0f0f12] border border-signal-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          {lines.map((line, i) => {
            const lineNum = i + 1;
            const lineAssumptions = getLineAssumptions(lineNum);
            const overridden = getOverriddenAtLine(lineNum);
            const isHovered = hoveredLine === lineNum;
            const isActive = lineAssumptions.some(a => a.id === activeAssumptionId);
            const hasOverrideComment = line.includes('[Signal]');

            return (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: Math.min(i * 0.01, 0.3) }}
                className={`flex items-start group transition-colors ${
                  isActive ? 'bg-signal-purple/10' : isHovered ? 'bg-white/5' : ''
                } ${hasOverrideComment ? 'bg-signal-coral/5' : ''}`}
                onMouseEnter={() => {
                  if (lineAssumptions.length > 0) {
                    onLineHover(lineNum);
                  }
                }}
                onMouseLeave={() => onLineHover(null)}
              >
                <div className="shrink-0 w-12 text-right pr-3 py-0.5 text-gray-600 text-xs font-mono select-none bg-[#0a0a0c]/50">
                  {lineNum}
                </div>

                <div className="shrink-0 w-5 flex flex-col items-center py-0.5 gap-0.5">
                  {lineAssumptions.map(a => (
                    <button
                      key={a.id}
                      onClick={() => onAssumptionClick(a.id)}
                      className="w-2 h-2 rounded-full hover:scale-150 transition-transform cursor-pointer"
                      style={{ backgroundColor: TYPE_COLORS[a.type] || '#9CA3AF' }}
                      title={`${a.type}: ${a.text}`}
                    />
                  ))}
                  {overridden.map(a => (
                    <div key={a.id} className="w-2 h-2 rounded-full bg-signal-coral/50" title="Overridden" />
                  ))}
                </div>

                <pre className="flex-1 py-0.5 px-2 text-sm font-mono whitespace-pre">
                  <code>
                    {hasOverrideComment ? (
                      <span className="text-signal-coral">{line}</span>
                    ) : (
                      line || ' '
                    )}
                  </code>
                </pre>
              </motion.div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-4 mt-3 text-[10px] text-gray-500">
        <span className="font-semibold uppercase tracking-wider">Legend:</span>
        {Object.entries(TYPE_COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
            <span className="capitalize">{type}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
