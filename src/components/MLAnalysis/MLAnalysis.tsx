import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Play, Square, AlertTriangle, Brain, Target, Activity, Zap, Timer,
  TrendingUp, GitFork, Gauge, ArrowRightLeft, ShieldCheck, Layers, Settings,
  Upload, X,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, ZAxis, ReferenceLine,
} from 'recharts';
import Papa from 'papaparse';

import { ML_CONFIG } from '../../ml-config';
import MLWorker from './mlWorker?worker&inline';
import { mergeSessions, colorForState, downsample } from './utils';
import type { NormalizedRow, MLResults, OutgoingMessage } from './types';

// ─── Constants ────────────────────────────────────────────────────────────

const TAB_LABELS = ['Overview', 'Safety & Risk', 'Driving Style', 'Vehicle Dynamics', 'Wear', 'Quality'] as const;
type Tab = (typeof TAB_LABELS)[number];

const INITIAL_RESULTS: MLResults = {
  progress: 0,
  isProcessing: false,
  safetyScore: { score: 0, deductions: [], penaltyBreakdown: [] },
  pca: { data: [], profile: 'Unknown' },
  anomalies: { data: [], anomalyCount: 0 },
  svm: { overlapPercentage: 0, overlapEvents: 0 },
  rfWear: { data: [], endLife: 100 },
  hmm: { data: [], statePercentages: {} },
  fatigue: { score: 100, decay: 0, decayLabel: '0.0%', trend: 'stable', timeline: [] },
  grip: { score: 100, understeer: 0, oversteer: 0 },
  shifts: { early: 0, optimal: 0, late: 0 },
  exitForecast: { speedCoeff: 0.5, throttleCoeff: 0.2 },
  consistency: { dtwScore: 85 },
  brakingTech: { trailPercent: 50 },
  markov: {},
  aggression: { safeFast: 25, safeSlow: 25, riskyFast: 25, riskySlow: 25 },
  qualityMetrics: {
    clusteringSilhouette: { score: 0, analysis: '', formula: '' },
    pcaVariance: { score: 0, analysis: '', formula: '' },
    randomForestOOB: { score: 0, analysis: '', formula: '' },
    anomalySkewness: { score: 0, analysis: '', formula: '' },
    svmMargin: { score: 0, analysis: '', formula: '' },
    regressionFit: { score: 0, analysis: '', formula: '' },
    knnConfidence: { score: 0, analysis: '', formula: '' },
  },
  modelStatus: {} as Record<string, 'loaded' | 'not_found' | 'error'>,
  sessionBoundaries: [],
};

type Toast = { message: string; type: 'error' | 'warning' | 'info' };

const WORKER_STARTUP_TIMEOUT_MS = 15000;

const errorMessage = (err: unknown): string => (
  err instanceof Error ? err.message : 'Unknown error'
);

const colorMap: Record<string, string> = {
  emerald: 'text-emerald-400',
  indigo: 'text-indigo-400',
  amber: 'text-amber-400',
  pink: 'text-pink-400',
  red: 'text-red-400',
  orange: 'text-orange-400',
  purple: 'text-purple-400',
  blue: 'text-blue-400',
  teal: 'text-teal-400',
  fuchsia: 'text-fuchsia-400',
  green: 'text-green-400',
  slate: 'text-slate-400',
  sky: 'text-sky-400',
  white: 'text-white',
};

const bgColorMap: Record<string, string> = {
  emerald: 'bg-emerald-500/10 border-emerald-500/30',
  indigo: 'bg-indigo-500/10 border-indigo-500/30',
  amber: 'bg-amber-500/10 border-amber-500/30',
  pink: 'bg-pink-500/10 border-pink-500/30',
  red: 'bg-red-500/10 border-red-500/30',
  orange: 'bg-orange-500/10 border-orange-500/30',
  purple: 'bg-purple-500/10 border-purple-500/30',
  blue: 'bg-blue-500/10 border-blue-500/30',
  teal: 'bg-teal-500/10 border-teal-500/30',
  fuchsia: 'bg-fuchsia-500/10 border-fuchsia-500/30',
};

// ─── Component ────────────────────────────────────────────────────────────

const MLAnalysis = () => {
  // State
  const [results, setResults] = useState<MLResults>(INITIAL_RESULTS);
  const [sessionData, setSessionData] = useState<NormalizedRow[] | null>(null);
  const [sessionCount, setSessionCount] = useState(0);
  const [activeTab, setActiveTab] = useState<Tab>('Overview');
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [abortTimeout, setAbortTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  const workerRef = useRef<Worker | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isDone = !results.isProcessing && results.progress === 100;

  // Cleanup
  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
      if (abortTimeout) clearTimeout(abortTimeout);
    };
  }, [abortTimeout]);

  // ─── Toast auto-dismiss ──────────────────────────────────────────────

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  // ─── Row normalizer (camelCase + snake_case) ─────────────────────────

  const normalizeRow = useCallback((row: Record<string, unknown>, i: number): NormalizedRow => {
    const getExact = (keys: string[]): number => {
      for (const key of keys) {
        const found = Object.keys(row).find((k) => k.toLowerCase() === key.toLowerCase());
        if (found !== undefined && row[found] != null) return Number(row[found]) || 0;
      }
      return 0;
    };

    return {
      timestamp: getExact(['timestamp', 'time']) || i * 16,
      speed: getExact(['speed']),
      throttle: getExact(['throttle', 'gas']),
      brake: getExact(['brake']),
      steering: getExact(['steering', 'steer']),
      rpm: getExact(['rpm']),
      gear: getExact(['gear']),
      clutch: getExact(['clutch']),
      fuel: getExact(['fuel']),
      engineTemp: getExact(['engine_temp', 'engineTemp']),
      gForceX: getExact(['gforcex', 'gforce_x', 'gForceX']),
      gForceY: getExact(['gforcey', 'gforce_y', 'gForceY']),
      gForceZ: getExact(['gforcez', 'gforce_z', 'gForceZ']),
      gforceCombined: getExact(['gforce_combined', 'gforceCombined']),
      jerkX: getExact(['jerk_x', 'jerkX']),
      jerkY: getExact(['jerk_y', 'jerkY']),
      throttleDelta: getExact(['throttle_delta', 'throttleDelta']),
      brakeDelta: getExact(['brake_delta', 'brakeDelta']),
      steeringDelta: getExact(['steering_delta', 'steeringDelta']),
      speedDelta: getExact(['speed_delta', 'speedDelta']),
      tireTempFL: getExact(['tire_temp_fl', 'tireTempFL']),
      tireTempFR: getExact(['tire_temp_fr', 'tireTempFR']),
      tireTempRL: getExact(['tire_temp_rl', 'tireTempRL']),
      tireTempRR: getExact(['tire_temp_rr', 'tireTempRR']),
      tirePressureFL: getExact(['tire_pressure_fl', 'tirePressureFL']),
      tirePressureFR: getExact(['tire_pressure_fr', 'tirePressureFR']),
      tirePressureRL: getExact(['tire_pressure_rl', 'tirePressureRL']),
      tirePressureRR: getExact(['tire_pressure_rr', 'tirePressureRR']),
      posX: getExact(['pos_x', 'posX']),
      posY: getExact(['pos_y', 'posY']),
      posZ: getExact(['pos_z', 'posZ']),
      yawRate: getExact(['yaw_rate', 'yawRate']),
      pedalOverlap: getExact(['pedal_overlap', 'pedalOverlap']),
      turnRadius: getExact(['turn_radius', 'turnRadius']),
      slipAngleEstimate: getExact(['slip_angle_estimate', 'slipAngleEstimate']),
      isTrailBraking: getExact(['is_trail_braking', 'isTrailBraking']),
      isCoasting: getExact(['is_coasting', 'isCoasting']),
      isWots: getExact(['is_wots', 'isWots']),
      isBraking: getExact(['is_braking', 'isBraking']),
      isTurning: getExact(['is_turning', 'isTurning']),
      oversteerCorrection: getExact(['oversteer_correction', 'oversteerCorrection']),
      understeerPlough: getExact(['understeer_plough', 'understeerPlough']),
      brakeBiasUtilization: getExact(['brake_bias_utilization', 'brakeBiasUtilization']),
      coastingTimePct: getExact(['coasting_time_pct', 'coastingTimePct']),
      _sessionId: 0,
      _sessionBoundary: false,
    };
  }, []);

  // ─── File handling ──────────────────────────────────────────────────

  const processFiles = useCallback((files: File[]) => {
    if (files.length === 0) return;

    let filesProcessed = 0;
    const allRaw: Record<string, unknown>[][] = [];
    const failedFiles: string[] = [];

    const tryFinalize = () => {
      if (filesProcessed !== files.length) return;

      if (allRaw.length === 0) {
        setToast({ message: 'No valid session data found in any file.', type: 'error' });
        return;
      }

      const normalized = allRaw.map((rows) => rows.map((row, i) => normalizeRow(row, i)));
      const merged = mergeSessions(normalized);

      if (merged.length < 50) {
        setToast({ message: `Merged dataset has only ${merged.length} rows. Need at least 50.`, type: 'warning' });
        return;
      }

      setSessionData(merged as NormalizedRow[]);
      setSessionCount(normalized.length);
      setResults(INITIAL_RESULTS);

      if (failedFiles.length > 0) {
        setToast({ message: `${normalized.length} session(s) loaded. ${failedFiles.length} file(s) skipped.`, type: 'warning' });
      }
    };

    for (const file of files) {
      Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        comments: '#',
        complete: (parseResult) => {
          const data = parseResult.data as Record<string, unknown>[];
          if (data.length > 50) {
            if (data[0]?.speed !== undefined || data[0]?.throttle !== undefined) {
              allRaw.push(data);
            } else {
              failedFiles.push(file.name);
              console.warn(`Skipped "${file.name}" — missing speed/throttle`);
            }
          } else {
            failedFiles.push(file.name);
            console.warn(`Skipped "${file.name}" — only ${data.length} rows`);
          }
          filesProcessed++;
          tryFinalize();
        },
        error: (err) => {
          failedFiles.push(file.name);
          console.error(`Failed to parse "${file.name}":`, err.message);
          filesProcessed++;
          tryFinalize();
        },
      });
    }
  }, [normalizeRow]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) processFiles(Array.from(e.target.files));
  }, [processFiles]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) processFiles(Array.from(e.dataTransfer.files));
  }, [processFiles]);

  // ─── Run / Cancel Analysis ──────────────────────────────────────────

  const runAnalysis = useCallback(() => {
    if (!sessionData || sessionData.length < 50) {
      setToast({ message: 'Need at least 50 data rows to run analysis.', type: 'warning' });
      return;
    }

    setResults({ ...INITIAL_RESULTS, progress: 1, isProcessing: true, status: 'Starting analysis engine...' });

    workerRef.current?.terminate();
    workerRef.current = null;

    try {
      const worker = new MLWorker();
      workerRef.current = worker;

      const startupTimeout = setTimeout(() => {
        worker.terminate();
        if (workerRef.current === worker) workerRef.current = null;
        setResults((r) => ({ ...r, progress: 0, isProcessing: false }));
        setToast({ message: 'ML worker did not start. Reload the app and try again.', type: 'error' });
      }, WORKER_STARTUP_TIMEOUT_MS);

      const timeout = setTimeout(() => {
        clearTimeout(startupTimeout);
        setAbortTimeout(null);
        worker.terminate();
        if (workerRef.current === worker) workerRef.current = null;
        setResults((r) => ({ ...r, progress: 0, isProcessing: false }));
        setToast({ message: 'Analysis timed out after 2 minutes. Try with fewer or shorter sessions.', type: 'error' });
      }, ML_CONFIG.ANALYSIS_TIMEOUT_MS);

      setAbortTimeout(timeout);

      const cleanup = () => {
        clearTimeout(startupTimeout);
        clearTimeout(timeout);
        setAbortTimeout(null);
      };

      const fail = (message: string) => {
        cleanup();
        worker.terminate();
        if (workerRef.current === worker) workerRef.current = null;
        setResults((r) => ({ ...r, progress: 0, isProcessing: false }));
        setToast({ message, type: 'error' });
      };

      worker.onerror = (e) => {
        console.error('ML worker error:', e);
        fail(`Worker failed: ${e.message || 'Failed to load ML engine'}`);
      };

      worker.onmessageerror = () => {
        fail('Worker communication error (message deserialization failed).');
      };

      worker.onmessage = (e: MessageEvent<OutgoingMessage>) => {
        const message = e.data;

        if (message.type === 'READY') {
          clearTimeout(startupTimeout);
          setResults((r) => ({ ...r, progress: 2, status: 'Sending telemetry to worker...' }));
          try {
            worker.postMessage({ type: 'ANALYZE_SESSION', payload: { sessionArray: sessionData } });
          } catch (err) {
            fail(`Failed to send telemetry data to worker: ${errorMessage(err)}`);
          }
          return;
        }

        clearTimeout(startupTimeout);

        if (message.type === 'PROGRESS') {
          setResults((r) => ({ ...r, progress: message.progress, status: message.status }));
        }
        if (message.type === 'COMPLETE') {
          cleanup();
          worker.terminate();
          if (workerRef.current === worker) workerRef.current = null;
          setResults((r) => ({ ...r, ...message.results, progress: 100, isProcessing: false }));
        }
        if (message.type === 'ERROR') {
          fail(message.message);
        }
      };

      const modelsBase = new URL('models/', window.location.href).href;
      const assetsBase = new URL('assets/', window.location.href).href;
      worker.postMessage({ type: 'INIT', payload: { modelsBase, assetsBase } });
    } catch (err) {
      setResults((r) => ({ ...r, progress: 0, isProcessing: false }));
      setToast({ message: `Failed to create worker: ${errorMessage(err)}`, type: 'error' });
      return;
    }
  }, [sessionData]);

  const cancelAnalysis = useCallback(() => {
    workerRef.current?.terminate();
    if (abortTimeout) clearTimeout(abortTimeout);
    setAbortTimeout(null);
    setResults(INITIAL_RESULTS);
    setToast({ message: 'Analysis cancelled.', type: 'info' });
  }, [abortTimeout]);

  // ─── Derived values for hero ─────────────────────────────────────────

  const heroMetrics = isDone
    ? [
        { label: 'Safety Score', value: results.safetyScore.score, unit: '', color: 'emerald' as const },
        { label: 'Driving Profile', value: results.pca.profile || results.pca.knnProfile || 'Unknown', unit: '', color: 'indigo' as const },
        { label: 'Grip Retention', value: Math.round(results.grip.score), unit: '%', color: 'amber' as const },
        { label: 'Tire Remaining', value: Math.round(results.rfWear.endLife), unit: '%', color: 'pink' as const },
      ]
    : [];

  // ─── Render ─────────────────────────────────────────────────────────

  return (
    <div className="h-full flex flex-col bg-slate-950">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl border text-sm font-semibold animate-in slide-in-from-right-4 fade-in duration-200 ${
          toast.type === 'error'
            ? 'bg-red-900/90 border-red-700/50 text-red-200'
            : toast.type === 'warning'
              ? 'bg-amber-900/90 border-amber-700/50 text-amber-200'
              : 'bg-slate-800/90 border-slate-700/50 text-slate-200'
        }`}>
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* ─── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between p-6 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Brain className="w-7 h-7 text-purple-400" />
            Machine Learning Analysis
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Analyze telemetry across 13+ ML models — safety, fatigue, grip, shifts, and more.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Drag-drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed cursor-pointer transition-all text-sm font-semibold ${
              isDragging
                ? 'border-purple-500 bg-purple-900/20 text-purple-300'
                : sessionData
                  ? 'border-emerald-700/50 bg-emerald-900/20 text-emerald-300 hover:bg-emerald-900/30'
                  : 'border-slate-700 bg-slate-800/50 text-slate-300 hover:border-slate-600 hover:bg-slate-800'
            }`}
          >
            <Upload className={`w-4 h-4 ${isDragging ? 'animate-bounce' : ''}`} />
            <span>
              {isDragging
                ? 'Drop files here'
                : sessionData
                  ? `${sessionCount} Session${sessionCount > 1 ? 's' : ''} Loaded`
                  : 'Load CSV(s)'
              }
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              multiple
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>

          {/* Run / Cancel */}
          {!results.isProcessing ? (
            <button
              onClick={runAnalysis}
              disabled={!sessionData}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg ${
                !sessionData
                  ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                  : 'bg-purple-600 hover:bg-purple-500 text-white hover:scale-105'
              }`}
            >
              <Play className="w-4 h-4 fill-current" />
              Run Analysis
            </button>
          ) : (
            <button
              onClick={cancelAnalysis}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-red-600/80 hover:bg-red-600 text-white transition-all"
            >
              <Square className="w-4 h-4" />
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* ─── Progress Bar ────────────────────────────────────────────────── */}
      {results.isProcessing && (
        <div className="px-6 py-2 space-y-1">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-violet-400 rounded-full transition-all duration-300"
                style={{ width: `${results.progress || 0}%` }}
              />
            </div>
            <span className="text-xs font-mono font-bold text-purple-400 w-12 text-right">
              {results.progress || 0}%
            </span>
            <Settings className="w-4 h-4 text-purple-400 animate-spin shrink-0" />
          </div>
          {results.status && (
            <div className="text-xs text-slate-500 font-medium flex items-center gap-2 pl-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
              {results.status}
            </div>
          )}
        </div>
      )}

      {/* ─── Empty State ─────────────────────────────────────────────────── */}
      {!isDone && !results.isProcessing && !toast?.type && (
        <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-3xl mx-8 my-8 text-slate-500">
          <Brain className="w-20 h-20 text-slate-800 mb-4" />
          <h2 className="text-xl font-bold text-slate-400">Awaiting Telemetry Data</h2>
          <p className="text-sm text-slate-600 mt-2 max-w-md text-center">
            Drop one or more CSV session files above, or click <strong>Load CSV(s)</strong> to begin.
          </p>
        </div>
      )}

      {/* ─── Results ─────────────────────────────────────────────────────── */}
      {isDone && (
        <div className="flex-1 overflow-y-auto">
          {/* Summary Hero Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 px-6 pt-4 pb-3">
            {heroMetrics.map((m) => (
              <div key={m.label} className={`${bgColorMap[m.color]} rounded-xl border p-4 flex items-center justify-between`}>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{m.label}</span>
                <span className={`text-2xl font-black font-mono ${colorMap[m.color]}`}>
                  {m.value}{m.unit}
                </span>
              </div>
            ))}
          </div>

          {/* Session Badge */}
          {sessionCount > 1 && (
            <div className="px-6 pb-2 flex gap-1.5 text-xs text-slate-500">
              <span className="font-semibold">Sessions:</span>
              {Array.from({ length: sessionCount }).map((_, i) => (
                <span key={i} className="px-2 py-0.5 rounded bg-slate-800 font-mono">S{i + 1}</span>
              ))}
            </div>
          )}

          {/* Model Status Badges */}
          {results.modelStatus && Object.keys(results.modelStatus).length > 0 && (
            <div className="px-6 pb-3 flex flex-wrap gap-1.5">
              {Object.entries(results.modelStatus).map(([name, status]) => (
                <div key={name} className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border ${
                  status === 'loaded'
                    ? 'bg-emerald-900/30 border-emerald-700/40 text-emerald-400'
                    : 'bg-slate-800 border-slate-700 text-slate-500'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${status === 'loaded' ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                  {name.replace(/_/g, ' ')}
                </div>
              ))}
            </div>
          )}

          {/* ─── Tab Bar ──────────────────────────────────────────────────── */}
          <div className="px-6 pb-4">
            <div className="flex gap-1 bg-slate-900 rounded-xl p-1 border border-slate-800 inline-flex">
              {TAB_LABELS.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                    activeTab === tab
                      ? 'bg-purple-600 text-white shadow-lg'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* ─── Tab Content ──────────────────────────────────────────────── */}
          <div className="px-6 pb-8">
            {activeTab === 'Overview' && <OverviewTab results={results} sessionBoundaries={results.sessionBoundaries} />}
            {activeTab === 'Safety & Risk' && <SafetyTab results={results} />}
            {activeTab === 'Driving Style' && <StyleTab results={results} />}
            {activeTab === 'Vehicle Dynamics' && <DynamicsTab results={results} />}
            {activeTab === 'Wear' && <WearTab results={results} />}
            {activeTab === 'Quality' && (
              <QualityTab
                results={results}
                selectedMetric={selectedMetric}
                onSelectMetric={setSelectedMetric}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════
//  TAB COMPONENTS
// ══════════════════════════════════════════════════════════════════════════

// ─── Overview ──────────────────────────────────────────────────────────────

function OverviewTab({ results, sessionBoundaries }: { results: MLResults; sessionBoundaries: number[] }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
      {/* Safety Score Gauge */}
      <Card title="Safety Score" subtitle="Heuristic Penalty Score" icon={Target} color="emerald">
        <div className="flex flex-col items-center py-2">
          <div className="relative">
            <svg viewBox="0 0 100 50" className="w-40 h-20 overflow-visible">
              <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#1e293b" strokeWidth="12" strokeLinecap="round" />
              <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="url(#ov-grad)" strokeWidth="12" strokeLinecap="round"
                strokeDasharray={`${(results.safetyScore.score / 100) * 125} 125`} />
              <defs>
                <linearGradient id="ov-grad">
                  <stop offset="0%" stopColor="#ef4444" /><stop offset="50%" stopColor="#eab308" /><stop offset="100%" stopColor="#22c55e" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute bottom-0 inset-x-0 text-center">
              <span className="text-4xl font-black font-mono text-white">{results.safetyScore.score}</span>
              <span className="text-slate-600 font-bold text-lg">/100</span>
            </div>
          </div>
        </div>
        {results.safetyScore.penaltyBreakdown && results.safetyScore.penaltyBreakdown.length > 0 && (
          <div className="mt-2">
            <div className="flex gap-1 h-2 rounded-full overflow-hidden mb-2">
              {results.safetyScore.penaltyBreakdown.map((p, i) => (
                <div key={i} style={{ width: `${p.pct}%`, backgroundColor: p.color }} className="h-full" title={`${p.label}: ${p.count}`} />
              ))}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-500">
              {results.safetyScore.penaltyBreakdown.map((p, i) => (
                <span key={i} className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.color }} />
                  {p.label}: {p.count}
                </span>
              ))}
            </div>
          </div>
        )}
        <Interpretation>
          {results.safetyScore.score >= 85
            ? 'Driver exhibits highly controlled inputs with minimal penalty events.'
            : results.safetyScore.score >= 65
              ? 'Moderate penalty density — periodic exceedances of jerk and steering volatility thresholds.'
              : 'Significant safety cost — high jerk and/or steering volatility events are frequent.'}
        </Interpretation>
      </Card>

      {/* Driver Profile */}
      <Card title="Driver Profile" subtitle="PCA + KNN Classification" icon={Brain} color="indigo">
        <div className="h-44 -ml-4">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
              <XAxis type="number" dataKey="x" hide />
              <YAxis type="number" dataKey="y" hide />
              <ZAxis type="number" dataKey="intensity" range={[15, 50]} />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }} />
              <Scatter data={results.pca.data} fill="#6366f1" opacity={0.5} />
              {/* Quadrant lines */}
              <ReferenceLine x={0} stroke="#334155" strokeWidth={1} />
              <ReferenceLine y={0} stroke="#334155" strokeWidth={1} />
              {/* Quadrant labels via SVG */}
              <text x="5%" y="12%" fill="#475569" fontSize={10} fontWeight="bold">Smooth</text>
              <text x="75%" y="12%" fill="#475569" fontSize={10} fontWeight="bold">Erratic</text>
              <text x="5%" y="95%" fill="#475569" fontSize={10} fontWeight="bold">Cautious</text>
              <text x="75%" y="95%" fill="#475569" fontSize={10} fontWeight="bold">Aggressive</text>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
        <div className="text-center bg-indigo-950/30 border border-indigo-900/50 rounded-lg py-1.5 text-xs font-bold text-indigo-300 uppercase tracking-widest">
          {results.pca.profile || results.pca.knnProfile || 'Unknown'}
        </div>
      </Card>

      {/* Session Timeline */}
      <Card title="Session Timeline" subtitle="Speed with Anomaly Markers" icon={Activity} color="red" className="xl:col-span-1 lg:col-span-2">
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={downsample(results.anomalies.data, 500)} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="timestamp" stroke="#475569" tickFormatter={(t) => `${(t / 1000).toFixed(0)}s`} fontSize={10} />
              <YAxis stroke="#475569" fontSize={10} />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }} />
              {sessionBoundaries.map((ts, i) => (
                <ReferenceLine key={i} x={ts} stroke="#475569" strokeDasharray="4 4" strokeWidth={1} label={{ value: `S${i + 1}→S${i + 2}`, fill: '#475569', fontSize: 9 }} />
              ))}
              <Line type="monotone" dataKey="speed" stroke="#3b82f6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-between text-xs text-slate-500 mt-1">
          <span>{results.anomalies.anomalyCount} harsh events</span>
          <span className="text-red-400">{results.safetyScore.score >= 70 ? '✅ Safe' : results.safetyScore.score >= 40 ? '⚠️ Moderate' : '🔴 Risky'}</span>
        </div>
      </Card>
    </div>
  );
}

// ─── Safety & Risk ─────────────────────────────────────────────────────────

function SafetyTab({ results }: { results: MLResults }) {
  const bd = results.safetyScore.penaltyBreakdown || [];
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
      {/* Safety Score Detail */}
      <Card title="Safety Score" subtitle="Detailed Penalty Breakdown" icon={Target} color="emerald">
        <div className="text-center py-4">
          <span className="text-6xl font-black font-mono text-white">{results.safetyScore.score}</span>
          <span className="text-slate-600 font-bold text-2xl">/100</span>
        </div>
        {bd.length > 0 && (
          <div>
            <div className="h-3 rounded-full overflow-hidden flex mb-3">
              {bd.map((p, i) => (
                <div key={i} style={{ width: `${p.pct}%`, backgroundColor: p.color }} className="h-full" title={`${p.label}: ${p.count}`} />
              ))}
            </div>
            <div className="space-y-1.5">
              {bd.map((p, i) => (
                <div key={i} className="flex justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-slate-400">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                    {p.label}
                  </span>
                  <span className="font-mono font-bold text-slate-300">{p.count} ({p.pct.toFixed(0)}%)</span>
                </div>
              ))}
            </div>
          </div>
        )}
        <Interpretation>
          {results.safetyScore.score >= 85
            ? 'Disciplined driver profile with minimal risk events.'
            : results.safetyScore.score >= 65
              ? 'Adequate but periodic lapses in smoothness.'
              : 'Frequent harsh inputs — focus on smoother transitions.'}
        </Interpretation>
      </Card>

      {/* Anomalies */}
      <Card title="Discomfort Anomalies" subtitle="3σ + G-Force Detection" icon={Activity} color="red" className="xl:col-span-2">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-slate-500">{results.anomalies.anomalyCount} events</span>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
            results.anomalies.anomalyCount < 5 ? 'bg-emerald-900/40 text-emerald-400' :
            results.anomalies.anomalyCount < 20 ? 'bg-amber-900/40 text-amber-400' :
            'bg-red-900/40 text-red-400'
          }`}>
            {results.anomalies.anomalyCount < 5 ? 'Low' : results.anomalies.anomalyCount < 20 ? 'Moderate' : 'High'}
          </span>
        </div>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={downsample(results.anomalies.data, 500)} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="timestamp" stroke="#475569" tickFormatter={(t) => `${(t / 1000).toFixed(0)}s`} fontSize={10} />
              <YAxis stroke="#475569" fontSize={10} />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }} />
              <Line type="monotone" dataKey="speed" stroke="#3b82f6" strokeWidth={2}
                dot={(props) => props.payload.isAnomaly
                  ? <circle key={props.key} cx={props.cx} cy={props.cy} r={5} fill="#ef4444" stroke="#7f1d1d" strokeWidth={2} />
                  : <></>}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap gap-2 mt-1 text-[10px] text-slate-500">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Anomaly</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> Speed</span>
        </div>
      </Card>

      {/* Aggression Matrix */}
      <Card title="Aggression Matrix" subtitle="Driving Style Quadrants" icon={Layers} color="fuchsia">
        <div className="grid grid-cols-2 gap-2">
          <Quadrant color="emerald" label="SAFE + FAST" value={Math.round(results.aggression.safeFast)} />
          <Quadrant color="amber" label="RISKY + FAST" value={Math.round(results.aggression.riskyFast)} />
          <Quadrant color="blue" label="SAFE + SLOW" value={Math.round(results.aggression.safeSlow)} />
          <Quadrant color="red" label="RISKY + SLOW" value={Math.round(results.aggression.riskySlow)} />
        </div>
      </Card>
    </div>
  );
}

// ─── Driving Style ─────────────────────────────────────────────────────────

function StyleTab({ results }: { results: MLResults }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
      {/* PCA */}
      <Card title="Driver Profiler" subtitle="PCA Projection" icon={Brain} color="indigo">
        <div className="h-48 -ml-4">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 15, right: 15, bottom: 15, left: 15 }}>
              <XAxis type="number" dataKey="x" hide />
              <YAxis type="number" dataKey="y" hide />
              <ZAxis type="number" dataKey="intensity" range={[15, 50]} />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }} />
              <Scatter data={results.pca.data} fill="#6366f1" opacity={0.5} />
              <ReferenceLine x={0} stroke="#334155" strokeWidth={1} />
              <ReferenceLine y={0} stroke="#334155" strokeWidth={1} />
              <text x="5%" y="12%" fill="#475569" fontSize={10} fontWeight="bold">Smooth</text>
              <text x="75%" y="12%" fill="#475569" fontSize={10} fontWeight="bold">Erratic</text>
              <text x="5%" y="95%" fill="#475569" fontSize={10} fontWeight="bold">Cautious</text>
              <text x="75%" y="95%" fill="#475569" fontSize={10} fontWeight="bold">Aggressive</text>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
        <div className="text-center bg-indigo-950/30 border border-indigo-900/50 rounded-lg py-1.5 text-xs font-bold text-indigo-300 uppercase tracking-widest">
          {results.pca.profile || results.pca.knnProfile || 'Unknown'}
        </div>
      </Card>

      {/* State Timeline */}
      <Card title="Driving States" subtitle="K-Means Classification" icon={Layers} color="teal" className="xl:col-span-2">
        <div className="grid grid-cols-4 gap-2 mb-3">
          {Object.entries(results.hmm.statePercentages).map(([state, pct]) => (
            <div key={state} className="bg-slate-800/50 rounded-lg p-2 text-center">
              <div className={`w-2 h-2 rounded-full ${colorForState(state)} mx-auto mb-1`} />
              <div className="text-[10px] text-slate-500">{state}</div>
              <div className="text-sm font-bold font-mono text-white">{pct.toFixed(0)}%</div>
            </div>
          ))}
        </div>
        <div className="h-6 rounded-md overflow-hidden flex border border-slate-700">
          {downsample(results.hmm.data, 1000).map((d, i) => (
            <div key={i} className={`h-full flex-1 ${colorForState(d.state, true)} opacity-70`}
              title={`${d.state} @ ${(d.timestamp / 1000).toFixed(1)}s`} />
          ))}
        </div>
      </Card>

      {/* Markov */}
      <Card title="State Transitions" subtitle="Markov Chain" icon={ShieldCheck} color="teal">
        <div className="space-y-2">
          {(['Cruising', 'Cornering', 'Slow / Cautious', 'Erratic'] as const).map((from) => {
            const row = results.markov[from] || {};
            const total = Object.values(row).reduce((a, b) => a + Number(b), 0) || 1;
            const top = Object.entries(row).sort((a, b) => b[1] - a[1]).slice(0, 2);
            return (
              <div key={from} className="bg-slate-800/50 rounded-lg p-2">
                <div className="text-xs font-bold mb-1" style={{ color: from === 'Erratic' ? '#f87171' : from === 'Cruising' ? '#34d399' : from === 'Cornering' ? '#fbbf24' : '#60a5fa' }}>
                  {from}
                </div>
                {top.length === 0
                  ? <div className="text-[10px] text-slate-600">No transitions</div>
                  : top.map(([to, count]) => (
                      <div key={to} className="flex justify-between text-[10px] text-slate-400 py-0.5">
                        <span>→ {to}</span>
                        <span className="font-mono font-bold text-teal-400">{((Number(count) / total) * 100).toFixed(0)}%</span>
                      </div>
                    ))}
              </div>
            );
          })}
        </div>
      </Card>

      {/* DTW Consistency */}
      <Card title="Pedal Consistency" subtitle="Brake Zone DTW Score" icon={Gauge} color="indigo">
        <div className="flex gap-4 items-center py-2">
          <div className="relative w-20 h-20 shrink-0">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="40" fill="none" stroke="#1e293b" strokeWidth="12" />
              <circle cx="50" cy="50" r="40" fill="none"
                stroke={results.consistency.dtwScore > 70 ? '#818cf8' : results.consistency.dtwScore > 40 ? '#f59e0b' : '#ef4444'}
                strokeWidth="12"
                strokeDasharray={`${2.51 * results.consistency.dtwScore} 251`}
                strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-lg font-black text-indigo-400">{Math.round(results.consistency.dtwScore)}</span>
            </div>
          </div>
          <div className="text-xs text-slate-500">
            <div className="font-semibold text-slate-300 mb-1">
              {results.consistency.dtwScore > 70 ? 'High Repeatability' : results.consistency.dtwScore > 40 ? 'Variable Pattern' : 'Inconsistent'}
            </div>
            <div className="w-full h-1.5 rounded-full bg-slate-800 mt-1">
              <div className="h-full rounded-full bg-gradient-to-r from-red-500 via-amber-400 to-indigo-400"
                style={{ width: `${results.consistency.dtwScore}%` }} />
            </div>
            <div className="flex justify-between mt-0.5">
              <span>0</span><span>50</span><span>100</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ─── Vehicle Dynamics ──────────────────────────────────────────────────────

function DynamicsTab({ results }: { results: MLResults }) {
  const exitData = results.exitForecast.predicted;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
      {/* Pedal Overlap */}
      <Card title="Pedal Confusion" subtitle="SVM Overlap Ratio" icon={Zap} color="orange">
        <div className="text-center py-2">
          <span className="text-5xl font-black font-mono text-white">{results.svm.overlapPercentage.toFixed(1)}</span>
          <span className="text-slate-500 text-xl">%</span>
        </div>
        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full bg-orange-500 rounded-full" style={{ width: `${Math.min(results.svm.overlapPercentage * 2, 100)}%` }} />
        </div>
        <div className="flex justify-between text-[10px] text-slate-600 mt-1">
          <span>Perfect (0%)</span>
          <span>Messy (&gt;10%)</span>
        </div>
      </Card>

      {/* Grip */}
      <Card title="Grip Limits" subtitle="ONNX / Physics Classification" icon={TrendingUp} color="red">
        <div className="grid grid-cols-3 gap-2 text-center py-2">
          <div className="bg-slate-800/50 rounded-lg p-2">
            <div className="text-lg font-black text-emerald-400">{Math.round(results.grip.score)}%</div>
            <div className="text-[10px] text-slate-500">In Grip</div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-2">
            <div className="text-lg font-black text-amber-400">{results.grip.understeer}</div>
            <div className="text-[10px] text-slate-500">Understeer</div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-2">
            <div className="text-lg font-black text-red-400">{results.grip.oversteer}</div>
            <div className="text-[10px] text-slate-500">Oversteer</div>
          </div>
        </div>
      </Card>

      {/* Shifts */}
      <Card title="Shift Points" subtitle="ONNX / RPM Heuristic" icon={GitFork} color="purple">
        <div className="grid grid-cols-3 gap-2 text-center py-2">
          <div className="bg-slate-800/50 rounded-lg p-2">
            <div className="text-lg font-black text-blue-400">{results.shifts.early}</div>
            <div className="text-[10px] text-slate-500">Early</div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-2">
            <div className="text-lg font-black text-emerald-400">{results.shifts.optimal}</div>
            <div className="text-[10px] text-slate-500">Optimal</div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-2">
            <div className="text-lg font-black text-red-400">{results.shifts.late}</div>
            <div className="text-[10px] text-slate-500">Late</div>
          </div>
        </div>
        <p className="text-[10px] text-slate-500 mt-1">
          Early &lt;4000 RPM / Optimal 4000–7200 RPM / Late &gt;7200 RPM.
          {results.shifts.optimal > results.shifts.early + results.shifts.late ? ' ✅ Good timing.' : ' ⚠️ Needs refinement.'}
        </p>
      </Card>

      {/* Braking Technique */}
      <Card title="Braking Technique" subtitle="Trail vs Stab Braking" icon={ArrowRightLeft} color="blue">
        <div className="py-2">
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span>Stab</span>
            <span>Trail</span>
          </div>
          <div className="h-3 bg-slate-800 rounded-full overflow-hidden flex">
            <div className="h-full bg-blue-500 transition-all" style={{ width: `${100 - results.brakingTech.trailPercent}%` }} />
            <div className="h-full bg-orange-500 transition-all" style={{ width: `${results.brakingTech.trailPercent}%` }} />
          </div>
          <div className="flex justify-between font-mono font-bold text-xs mt-1">
            <span className="text-blue-400">{100 - results.brakingTech.trailPercent}%</span>
            <span className="text-orange-400">{results.brakingTech.trailPercent}%</span>
          </div>
        </div>
        <Interpretation>
          {results.brakingTech.trailPercent > 40
            ? 'Trail braking used frequently — advanced corner-entry technique.'
            : 'Primarily stab braking — safer but leaves speed on the table.'}
        </Interpretation>
      </Card>

      {/* Fatigue */}
      <Card title="Driver Fatigue" subtitle="Jerk Decay Analysis" icon={Timer} color="amber">
        <div className="grid grid-cols-2 gap-2 py-2">
          <div className="bg-slate-800/50 rounded-lg p-2 text-center">
            <div className="text-xs text-slate-500 mb-0.5">Focus</div>
            <span className={`text-xl font-black font-mono ${results.fatigue.score > 70 ? 'text-emerald-400' : results.fatigue.score > 40 ? 'text-amber-400' : 'text-red-400'}`}>
              {Math.round(results.fatigue.score)}%
            </span>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-2 text-center">
            <div className="text-xs text-slate-500 mb-0.5">Trend</div>
            <span className={`text-xl font-black font-mono ${
              results.fatigue.trend === 'improving' ? 'text-emerald-400' :
              results.fatigue.trend === 'fatiguing' ? 'text-red-400' : 'text-slate-400'
            }`}>
              {results.fatigue.trend === 'improving' ? '↑' : results.fatigue.trend === 'fatiguing' ? '↓' : '→'}
            </span>
          </div>
        </div>
        {results.fatigue.timeline.length > 0 && (
          <div className="flex items-end gap-0.5 h-12 mb-2">
            {results.fatigue.timeline.map((b, i) => (
              <div key={i} className="flex-1 flex flex-col items-center" title={`${b.segment}: ${b.smoothness.toFixed(0)}%`}>
                <div className="w-full rounded-t transition-all"
                  style={{
                    height: `${b.smoothness}%`,
                    backgroundColor: b.smoothness > 70 ? '#22c55e' : b.smoothness > 40 ? '#f59e0b' : '#ef4444',
                  }} />
              </div>
            ))}
          </div>
        )}
        {/* Per-session fatigue breakdown */}
        {results.fatigue.perSession && results.fatigue.perSession.length > 1 && (
          <div className="mt-1 text-[10px] text-slate-500">
            <span className="font-semibold">Per session: </span>
            {results.fatigue.perSession.map((s) => (
              <span key={s.sessionId} className="ml-2 font-mono">S{s.sessionId + 1}: {Math.round(s.score)}%</span>
            ))}
          </div>
        )}
      </Card>

      {/* Corner Exit Forecast */}
      <Card title="Corner Exit Forecast" subtitle="Ridge Regression Model" icon={TrendingUp} color="green">
        {exitData && exitData.length > 0 ? (
          <>
            <div className="h-36">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                  <XAxis type="number" dataKey="actual" name="Actual Exit Speed" stroke="#475569" fontSize={10} />
                  <YAxis type="number" dataKey="predicted" name="Predicted Exit Speed" stroke="#475569" fontSize={10} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }} />
                  <Scatter data={exitData} fill="#22c55e" opacity={0.6} />
                  {/* Perfect prediction reference line */}
                  <ReferenceLine x={0} y={0} stroke="#334155" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 mt-1">
              <span>Speed coeff: {results.exitForecast.speedCoeff.toFixed(3)}</span>
              <span>Throttle coeff: {results.exitForecast.throttleCoeff.toFixed(3)}</span>
            </div>
          </>
        ) : (
          <div className="text-center py-6 text-xs text-slate-600">Not enough exit events to model.</div>
        )}
      </Card>
    </div>
  );
}

// ─── Wear ──────────────────────────────────────────────────────────────────

function WearTab({ results }: { results: MLResults }) {
  return (
    <div className="grid grid-cols-1 gap-4 max-w-3xl">
      <Card title="Predictive Tire Degradation" subtitle="Random Forest / Heuristic" icon={Activity} color="pink">
        <div className="grid grid-cols-3 gap-3 mb-4 text-center">
          <div className="bg-slate-800/50 rounded-xl p-3">
            <div className="text-[10px] text-slate-500 mb-0.5">Start</div>
            <div className="text-lg font-black text-white font-mono">100%</div>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-3">
            <div className="text-[10px] text-slate-500 mb-0.5">Wear Rate</div>
            <div className="text-lg font-black text-orange-400 font-mono">{(100 - results.rfWear.endLife).toFixed(1)}%</div>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-3">
            <div className="text-[10px] text-slate-500 mb-0.5">Remaining</div>
            <div className={`text-lg font-black font-mono ${results.rfWear.endLife > 80 ? 'text-emerald-400' : results.rfWear.endLife > 50 ? 'text-amber-400' : 'text-red-400'}`}>
              {results.rfWear.endLife.toFixed(1)}%
            </div>
          </div>
        </div>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={downsample(results.rfWear.data, ML_CONFIG.MAX_CHART_POINTS)} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="timestamp" stroke="#475569" tick={false} />
              <YAxis stroke="#475569" domain={[0, 100]} fontSize={10} />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }} />
              {/* Reference lines */}
              <ReferenceLine y={80} stroke="#22c55e" strokeDasharray="3 3" label={{ value: 'Healthy', fill: '#22c55e', fontSize: 10 }} />
              <ReferenceLine y={50} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'Warning', fill: '#f59e0b', fontSize: 10 }} />
              <Line type="monotone" dataKey="life" stroke="#ec4899" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <Interpretation>
          {results.rfWear.endLife > 80
            ? 'Minimal tire degradation. Inputs within mechanical grip limits.'
            : results.rfWear.endLife > 50
              ? 'Moderate tire wear — episodic overloading during cornering or braking.'
              : 'Critical degradation — sustained high-load events. Tire change recommended.'}
        </Interpretation>
      </Card>
    </div>
  );
}

// ─── Model Quality ─────────────────────────────────────────────────────────

function QualityTab({
  results,
  selectedMetric,
  onSelectMetric,
}: {
  results: MLResults;
  selectedMetric: string | null;
  onSelectMetric: (id: string | null) => void;
}) {
  const q = results.qualityMetrics;

  const allMetrics: Array<{ id: string; title: string; score: string; label: string; color: string }> = [
    { id: 'clusteringSilhouette', title: 'State Clustering', score: q.clusteringSilhouette.score.toFixed(2), label: 'Silhouette', color: 'emerald' },
    { id: 'pcaVariance', title: 'Feature Map', score: `${(q.pcaVariance.score * 100).toFixed(1)}%`, label: 'PCA Variance', color: 'indigo' },
    { id: 'randomForestOOB', title: 'Wear Model', score: q.randomForestOOB.score.toFixed(2), label: 'RF R²', color: 'pink' },
    { id: 'anomalySkewness', title: 'Anomaly Skew', score: q.anomalySkewness.score.toFixed(2), label: 'Outlier', color: 'red' },
    { id: 'svmMargin', title: 'SVM Boundary', score: q.svmMargin.score.toFixed(2), label: 'Margin', color: 'orange' },
    { id: 'regressionFit', title: 'Safety Fit', score: q.regressionFit.score.toFixed(2), label: 'R² Fit', color: 'green' },
    { id: 'knnConfidence', title: 'Driver Match', score: `${(q.knnConfidence.score * 100).toFixed(1)}%`, label: 'KNN', color: 'blue' },
  ];

  if (q.dtwConsistency) allMetrics.push({ id: 'dtwConsistency', title: 'Brake Consistency', score: q.dtwConsistency.score.toFixed(2), label: 'DTW', color: 'teal' });
  if (q.dtPurity) allMetrics.push({ id: 'dtPurity', title: 'Grip Tree', score: q.dtPurity.score.toFixed(2), label: 'Purity', color: 'amber' });
  if (q.nbAccuracy) allMetrics.push({ id: 'nbAccuracy', title: 'Shift Accuracy', score: `${(q.nbAccuracy.score * 100).toFixed(1)}%`, label: 'NB Acc', color: 'sky' });

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Settings className="w-5 h-5 text-slate-400" />
        <h3 className="text-lg font-bold text-white">Model Confidence & Quality Metrics</h3>
        <span className="text-xs text-slate-500">Click a card for details</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3 mb-6">
        {allMetrics.map((m) => (
          <button
            key={m.id}
            onClick={() => onSelectMetric(selectedMetric === m.id ? null : m.id)}
            className={`flex flex-col items-center p-4 rounded-2xl border transition-all duration-200 ${
              selectedMetric === m.id
                ? 'bg-slate-800 border-slate-600 shadow-lg scale-105'
                : 'bg-slate-900/50 border-slate-800 hover:bg-slate-800 hover:border-slate-700'
            }`}
          >
            <span className="text-[10px] text-slate-500 font-bold tracking-widest uppercase mb-2 text-center h-8 flex items-center">
              {m.title}
            </span>
            <span className={`text-2xl font-black font-mono ${colorMap[m.color] || 'text-slate-400'}`}>
              {m.score}
            </span>
            <span className="text-[10px] text-slate-600 mt-1 font-semibold">{m.label}</span>
          </button>
        ))}
      </div>

      {/* Expanded detail */}
      {selectedMetric && (() => {
        const metric = q[selectedMetric as keyof typeof q];
        if (!metric || !('analysis' in metric)) return null;

        const meta: Record<string, { purpose: string; ranges: string; tip: string }> = {
          clusteringSilhouette: {
            purpose: 'Evaluates K-Means cluster separation for the four driving states.',
            ranges: '< 0.25: Poor | 0.25–0.5: Moderate | > 0.5: Well-defined | > 0.7: Excellent',
            tip: 'Low scores indicate fluid transitions between states without sharp boundaries.',
          },
          pcaVariance: {
            purpose: 'How much driving variability is captured by the top 2 PCA components.',
            ranges: '< 50%: Low | 50–75%: Moderate | > 75%: High | > 90%: Excellent',
            tip: 'Low variance means behavior is multidimensional — hard to reduce to 2D.',
          },
          randomForestOOB: {
            purpose: 'Ensemble convergence for tire wear predictions.',
            ranges: '0.4–0.6: High variance | 0.6–0.75: Moderate | 0.75–0.9: Strong | > 0.9: Excellent',
            tip: 'High variance occurs when sessions contain extreme events unseen during training.',
          },
          anomalySkewness: {
            purpose: 'Rarity and isolation of detected anomalies.',
            ranges: '> 0.8: Strong | 0.5–0.8: Moderate | 0.3–0.5: Low | < 0.3: Poor',
            tip: 'Works best when anomalies are truly sparse.',
          },
          svmMargin: {
            purpose: 'Width of SVM decision boundary for pedal overlap detection.',
            ranges: '> 0.8: Clean | 0.5–0.8: Moderate | < 0.5: Narrow | < 0.3: Degenerate',
            tip: 'Trail braking intentionally overlaps pedals — lowers margin scores despite being skill.',
          },
          regressionFit: {
            purpose: 'R² of safety score regression model.',
            ranges: '< 0.3: Poor | 0.3–0.6: Moderate | 0.6–0.8: Good | > 0.8: Excellent',
            tip: 'Low R² may mean relationship is non-linear, which heuristic still captures.',
          },
          knnConfidence: {
            purpose: 'Distance to nearest driving style archetype.',
            ranges: '> 80%: Clear identity | 50–80%: Moderate | 30–50%: Weak | < 30%: Idiosyncratic',
            tip: 'Adaptive drivers score lower — not negative, just complex.',
          },
          dtwConsistency: {
            purpose: 'Reproducibility of brake zone pressure profiles via DTW.',
            ranges: '> 0.7: Elite | 0.4–0.7: Moderate | < 0.4: Poor',
            tip: 'DTW handles timing offsets — 0.1s delay in brake application doesn\'t penalize.',
          },
          dtPurity: {
            purpose: 'Gini purity of grip classification tree leaves.',
            ranges: '> 0.7: Clean | 0.4–0.7: Mixed | < 0.4: Low',
            tip: 'Low purity can indicate a smooth driver who never reaches traction limits.',
          },
          nbAccuracy: {
            purpose: 'Naive Bayes classification accuracy for shift timing.',
            ranges: '> 80%: Excellent | 60–80%: Good | 40–60%: Moderate | < 40%: Poor',
            tip: 'NB assumes independence between RPM and throttle — slightly overconfident.',
          },
        };

        const info = meta[selectedMetric] || { purpose: 'Quality metric.', ranges: 'Higher is better.', tip: '' };

        return (
          <div className="bg-slate-900 rounded-2xl p-6 border border-slate-700 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex justify-between items-start mb-4">
              <h4 className="text-base font-bold text-white capitalize">
                {selectedMetric.replace(/([A-Z])/g, ' $1').trim()}
              </h4>
              <button onClick={() => onSelectMetric(null)} className="text-slate-500 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Purpose</div>
                  <p className="text-xs text-slate-300 leading-relaxed">{info.purpose}</p>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Formula</div>
                  <div className="font-mono text-xs px-3 py-2 bg-slate-950 rounded-lg text-emerald-400 inline-block border border-slate-800">
                    {metric.formula}
                  </div>
                </div>
                {info.tip && (
                  <div className="bg-indigo-950/40 border border-indigo-800/50 rounded-lg p-3">
                    <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1">Expert Note</div>
                    <p className="text-[11px] text-indigo-200 leading-relaxed">{info.tip}</p>
                  </div>
                )}
              </div>
              <div className="space-y-3">
                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Score Interpretation</div>
                  <div className="text-xs text-slate-400 space-y-1">
                    {info.ranges.split('|').map((r, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="text-slate-600 mt-0.5">▸</span>
                        <span>{r.trim()}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Session Analysis</div>
                  <p className="text-xs text-slate-300 leading-relaxed">{metric.analysis}</p>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
//  REUSABLE SUB-COMPONENTS
// ══════════════════════════════════════════════════════════════════════════

function Card({
  title, subtitle, icon: Icon, color, children, className,
}: {
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  children: React.ReactNode;
  className?: string;
  interpretation?: string;
}) {
  return (
    <div className={`bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col gap-3 ${className || ''}`}>
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Icon className={`w-4 h-4 ${colorMap[color] || 'text-slate-400'}`} />
            {title}
          </h3>
          <p className="text-[10px] text-slate-500 mt-0.5">{subtitle}</p>
        </div>
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function Interpretation({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-3 pt-3 border-t border-slate-800">
      <p className="text-[11px] text-slate-400 leading-relaxed">{children}</p>
    </div>
  );
}

function Quadrant({ color, label, value }: { color: string; value: number; label: string }) {
  return (
    <div className={`${bgColorMap[color] || 'bg-slate-800/50'} rounded-xl p-3 text-center border`}>
      <div className={`text-[10px] font-bold ${colorMap[color] || 'text-slate-400'} uppercase tracking-wider`}>{label}</div>
      <div className={`text-xl font-black font-mono mt-1 ${colorMap[color] || 'text-slate-400'}`}>{value}%</div>
    </div>
  );
}

export default MLAnalysis;
