import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Copy, Check, FileCode, Download } from 'lucide-react';

export default function ExportModal({ trace, onClose }) {
  const [copied, setCopied] = useState(false);
  const [includeMeta, setIncludeMeta] = useState(true);

  const overridden = trace.assumptions.filter(a => a.status === 'overridden');
  const confirmed = trace.assumptions.filter(a => a.status === 'confirmed' || a.status === 'auto_confirmed');

  const metaBlock = `
# ── Signal Review Summary ──
# Goal: ${trace.goal}
# Approach: ${trace.approach}
# Overall Confidence: ${trace.overallConfidence}
# Assumptions Confirmed: ${confirmed.length}
# Assumptions Overridden: ${overridden.length}
# ${overridden.map(a => `# [OVERRIDE] ${a.text} (line ${a.lineNumber})`).join('\n# ')}
# ── End Signal Summary ──
`;

  const exportCode = includeMeta
    ? metaBlock + '\n' + trace.code
    : trace.code;

  const handleCopy = () => {
    navigator.clipboard.writeText(exportCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([exportCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'signal_review.py';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-signal-card border border-signal-border rounded-xl max-w-2xl w-full flex flex-col max-h-[80vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-signal-border">
          <div className="flex items-center gap-2">
            <FileCode className="w-5 h-5 text-signal-purple" />
            <h3 className="font-bold text-gray-100">Export Reviewed Code</h3>
          </div>
          <button onClick={onClose} className="hover:bg-white/5 p-1.5 rounded"><X className="w-4 h-4 text-gray-400" /></button>
        </div>

        <div className="p-5 border-b border-signal-border">
          <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={includeMeta}
              onChange={(e) => setIncludeMeta(e.target.checked)}
              className="rounded border-signal-border bg-signal-dark text-signal-purple focus:ring-signal-purple/50"
            />
            Include Signal review summary as header comment
          </label>
          <div className="flex gap-4 mt-3 text-xs text-gray-500">
            <span>{confirmed.length} confirmed</span>
            <span>{overridden.length} overridden</span>
            <span>{trace.assumptions.filter(a => a.status === 'pending').length} pending</span>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-5">
          <pre className="bg-[#0f0f12] border border-signal-border rounded-lg p-4 text-sm font-mono text-gray-300 whitespace-pre">
            <code>{exportCode}</code>
          </pre>
        </div>

        <div className="flex items-center gap-3 p-5 border-t border-signal-border">
          <button onClick={handleCopy} className="signal-btn-primary text-sm flex items-center gap-2 flex-1 justify-center">
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied!' : 'Copy to Clipboard'}
          </button>
          <button onClick={handleDownload} className="signal-btn-ghost text-sm flex items-center gap-2 border border-signal-border">
            <Download className="w-4 h-4" /> Download .py
          </button>
        </div>
      </motion.div>
    </div>
  );
}
