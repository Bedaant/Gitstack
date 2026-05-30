import { useReducer, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'signal_session';
const CALIBRATION_KEY = 'signal_calibration';

function getStoredSession() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch { return null; }
}
function saveSession(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    trace: state.trace,
    history: state.history.slice(-20),
  }));
}
function getCalibration() {
  try {
    return JSON.parse(localStorage.getItem(CALIBRATION_KEY)) || { count: 0, decisions: [], patterns: {} };
  } catch { return { count: 0, decisions: [], patterns: {} }; }
}
function saveCalibration(cal) {
  localStorage.setItem(CALIBRATION_KEY, JSON.stringify(cal));
}

function injectComment(code, lineNumber, comment) {
  const lines = code.split('\n');
  const idx = lineNumber - 1;
  const indent = lines[idx].match(/^(\s*)/)?.[1] || '';
  lines.splice(idx, 0, `${indent}# ${comment}`);
  return lines.join('\n');
}

function removeComment(code, comment) {
  return code.split('\n').filter(l => !l.includes(comment)).join('\n');
}

function initialState() {
  const stored = getStoredSession();
  return {
    trace: stored?.trace || null,
    history: stored?.history || [],
    activeAssumptionId: null,
    hoveredLine: null,
    filter: { type: 'all', confidence: 'all' },
    showTour: false,
    tourStep: 0,
    toast: null,
  };
}

function reducer(state, action) {
  switch (action.type) {
    case 'GENERATE': {
      const trace = action.trace;
      const newState = { ...state, trace, history: [], activeAssumptionId: null };
      saveSession(newState);
      return newState;
    }
    case 'OVERRIDE': {
      const { id } = action;
      const assumption = state.trace.assumptions.find(a => a.id === id);
      const newCode = injectComment(
        state.trace.code,
        assumption.lineNumber,
        `NOTE: ${assumption.text} assumed by user [Signal]`
      );
      const newTrace = {
        ...state.trace,
        code: newCode,
        assumptions: state.trace.assumptions.map(a =>
          a.id === id ? { ...a, status: 'overridden' } : a
        )
      };
      const cal = getCalibration();
      cal.count += 1;
      cal.decisions.push({ assumptionId: id, traceId: state.trace.id, type: assumption.type, timestamp: Date.now() });
      // Learn patterns
      cal.patterns[assumption.type] = (cal.patterns[assumption.type] || 0) + 1;
      saveCalibration(cal);
      const newState = {
        ...state,
        trace: newTrace,
        history: [...state.history, { type: 'override', id, code: state.trace.code }],
        toast: "Recorded. We'll remember you checked this.",
      };
      saveSession(newState);
      return newState;
    }
    case 'CONFIRM': {
      const { id } = action;
      const assumption = state.trace.assumptions.find(a => a.id === id);
      const newTrace = {
        ...state.trace,
        assumptions: state.trace.assumptions.map(a =>
          a.id === id ? { ...a, status: 'confirmed' } : a
        )
      };
      const cal = getCalibration();
      cal.count += 1;
      cal.decisions.push({ assumptionId: id, traceId: state.trace.id, type: assumption.type, timestamp: Date.now() });
      cal.patterns[`confirm_${assumption.type}`] = (cal.patterns[`confirm_${assumption.type}`] || 0) + 1;
      saveCalibration(cal);
      const newState = {
        ...state,
        trace: newTrace,
        history: [...state.history, { type: 'confirm', id }],
        toast: 'Assumption confirmed.',
      };
      saveSession(newState);
      return newState;
    }
    case 'UNDO': {
      if (state.history.length === 0) return state;
      const last = state.history[state.history.length - 1];
      const assumption = state.trace.assumptions.find(a => a.id === last.id);
      let newCode = state.trace.code;
      if (last.type === 'override') {
        newCode = removeComment(state.trace.code, `[Signal]`);
      }
      const newTrace = {
        ...state.trace,
        code: newCode,
        assumptions: state.trace.assumptions.map(a =>
          a.id === last.id ? { ...a, status: 'pending' } : a
        )
      };
      const newState = {
        ...state,
        trace: newTrace,
        history: state.history.slice(0, -1),
        toast: 'Undone.',
      };
      saveSession(newState);
      return newState;
    }
    case 'AUTO_CONFIRM': {
      // After calibration, auto-confirm assumptions matching user patterns
      const cal = getCalibration();
      const isCalibrated = cal.count >= 5;
      if (!isCalibrated) return state;
      const autoTypes = Object.entries(cal.patterns)
        .filter(([k, v]) => k.startsWith('confirm_') && v >= 2)
        .map(([k]) => k.replace('confirm_', ''));
      const newAssumptions = state.trace.assumptions.map(a => {
        if (a.status === 'pending' && autoTypes.includes(a.type)) {
          return { ...a, status: 'auto_confirmed' };
        }
        return a;
      });
      const autoCount = newAssumptions.filter(a => a.status === 'auto_confirmed').length;
      if (autoCount === 0) return state;
      const newState = {
        ...state,
        trace: { ...state.trace, assumptions: newAssumptions },
        toast: `${autoCount} assumption${autoCount > 1 ? 's' : ''} auto-confirmed based on your patterns.`,
      };
      saveSession(newState);
      return newState;
    }
    case 'SET_ACTIVE':
      return { ...state, activeAssumptionId: action.id };
    case 'SET_HOVERED_LINE':
      return { ...state, hoveredLine: action.line };
    case 'SET_FILTER':
      return { ...state, filter: { ...state.filter, ...action.filter } };
    case 'CLEAR_TOAST':
      return { ...state, toast: null };
    case 'START_TOUR':
      return { ...state, showTour: true, tourStep: 0 };
    case 'NEXT_TOUR':
      return { ...state, tourStep: state.tourStep + 1 };
    case 'END_TOUR':
      return { ...state, showTour: false, tourStep: 0 };
    case 'CLEAR_SESSION':
      localStorage.removeItem(STORAGE_KEY);
      return initialState();
    default:
      return state;
  }
}

export function useSignal() {
  const [state, dispatch] = useReducer(reducer, null, initialState);

  useEffect(() => {
    if (state.toast) {
      const t = setTimeout(() => dispatch({ type: 'CLEAR_TOAST' }), 3000);
      return () => clearTimeout(t);
    }
  }, [state.toast]);

  const generate = useCallback((trace) => {
    dispatch({ type: 'GENERATE', trace });
    // Auto-confirm after a short delay if calibrated
    setTimeout(() => dispatch({ type: 'AUTO_CONFIRM' }), 800);
  }, []);

  const override = useCallback((id) => dispatch({ type: 'OVERRIDE', id }), []);
  const confirm = useCallback((id) => dispatch({ type: 'CONFIRM', id }), []);
  const undo = useCallback(() => dispatch({ type: 'UNDO' }), []);
  const setActive = useCallback((id) => dispatch({ type: 'SET_ACTIVE', id }), []);
  const setHoveredLine = useCallback((line) => dispatch({ type: 'SET_HOVERED_LINE', line }), []);
  const setFilter = useCallback((filter) => dispatch({ type: 'SET_FILTER', filter }), []);
  const startTour = useCallback(() => dispatch({ type: 'START_TOUR' }), []);
  const nextTour = useCallback(() => dispatch({ type: 'NEXT_TOUR' }), []);
  const endTour = useCallback(() => dispatch({ type: 'END_TOUR' }), []);
  const clearSession = useCallback(() => dispatch({ type: 'CLEAR_SESSION' }), []);

  return {
    ...state,
    calibration: getCalibration(),
    generate,
    override,
    confirm,
    undo,
    setActive,
    setHoveredLine,
    setFilter,
    startTour,
    nextTour,
    endTour,
    clearSession,
  };
}
