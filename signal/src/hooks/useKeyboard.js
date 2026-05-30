import { useEffect } from 'react';

export function useKeyboard({ onUndo, onNextAssumption, onPrevAssumption, onConfirm, onOverride, canUndo, activeId, assumptionIds }) {
  useEffect(() => {
    const handler = (e) => {
      // Don't trigger when typing in inputs
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.key === 'z' && (e.metaKey || e.ctrlKey) && canUndo) {
        e.preventDefault();
        onUndo();
        return;
      }

      if (e.key === '?' && !e.shiftKey) {
        e.preventDefault();
        // Could show shortcuts help
        return;
      }

      if (!activeId && assumptionIds.length > 0) return;

      const idx = assumptionIds.indexOf(activeId);

      if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault();
        const next = assumptionIds[Math.min(idx + 1, assumptionIds.length - 1)];
        if (next) onNextAssumption(next);
      }
      if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = assumptionIds[Math.max(idx - 1, 0)];
        if (prev) onPrevAssumption(prev);
      }
      if (e.key === 'Enter' || e.key === 'c') {
        e.preventDefault();
        onConfirm(activeId);
      }
      if (e.key === 'o') {
        e.preventDefault();
        onOverride(activeId);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onUndo, onNextAssumption, onPrevAssumption, onConfirm, onOverride, canUndo, activeId, assumptionIds]);
}
