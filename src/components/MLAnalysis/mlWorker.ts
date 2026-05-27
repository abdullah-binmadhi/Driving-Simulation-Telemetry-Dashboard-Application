import {
  TIRE_WEAR_FEATURES,
  GRIP_FEATURES,
  HMM_FEATURES,
  PCA_FEATURES,
  SHIFT_FEATURES,
  PEDAL_FEATURES,
} from '../../ml-features';
import { ML_CONFIG } from '../../ml-config';
import {
  safeMean,
  safeStd,
  jerkMagnitude,
  extractFeatures,
  downsample,
  sleep,
  splitBySession,
} from './utils';
import type {
  NormalizedRow,
  FatigueResult,
  GripResult,
  ShiftResult,
  SVMResult,
  RFWearResult,
  HMMResult,
  PCAProjection,
  SafetyScoreResult,
  AnomalyResult,
  ExitForecastResult,
  QualityMetrics,
  QualityMetric,
  MLResults,
  IncomingMessage,
  PenaltyCategory,
  ModelStatusMap,
} from './types';

self.addEventListener('error', (e) => {
  console.error('ML Worker init error:', e.error || e.message);
  self.postMessage({ type: 'ERROR', message: `Worker initialization failed: ${e.error?.message || e.message || 'Unknown error'}` });
});

// ─── Module-level model state ────────────────────────────────────────────

let tireWearSession: any = null;
let gripSession: any = null;
let shiftSession: any = null;
let pedalSession: any = null;
let clusterCentroids: number[][] | null = null;
let clusterScalerMean: number[] | null = null;
let clusterScalerScale: number[] | null = null;
let pcaComponents: number[][] | null = null;
let pcaScalerMean: number[] | null = null;
let pcaScalerScale: number[] | null = null;
let modelMetrics: Record<string, Record<string, number>> | null = null;
let modelsLoaded = false;
let ortModule: { InferenceSession: any; Tensor: any; env: any } | null = null;

const modelStatus: ModelStatusMap = {
  tire_wear: 'not_found',
  grip: 'not_found',
  shift: 'not_found',
  pedal_overlap: 'not_found',
  state_clusters: 'not_found',
  pca_profile: 'not_found',
  model_metrics: 'not_found',
};

// ─── Base URL resolver ──────────────────────────────────────────────────

function resolveBaseUrl(basePath: string): string {
  const loc = self.location;
  return loc.protocol === 'file:'
    ? new URL(basePath, loc.href).href
    : new URL(basePath, loc.origin).href;
}

// ─── Model loading ──────────────────────────────────────────────────────

async function loadModels(): Promise<void> {
  if (modelsLoaded) return;

  const MODEL_TIMEOUT = 10000;
  const timeout = sleep(MODEL_TIMEOUT).then(() => {
    console.warn(`Model loading timed out after ${MODEL_TIMEOUT}ms, using fallbacks`);
  });

  await Promise.race([_initModels(), timeout]);
  modelsLoaded = Object.values(modelStatus).some((s) => s === 'loaded');
}

async function _initModels(): Promise<void> {
  try {
    ortModule = await import('onnxruntime-web');
    ortModule.env.wasm.wasmPaths = resolveBaseUrl('../assets/');
    ortModule.env.wasm.numThreads = 1;
  } catch (err) {
    console.warn('ONNX runtime failed to load, using heuristic fallbacks:', err);
  }

  const base = resolveBaseUrl('../models/');

  const onnxPromises: Promise<void>[] = [];
  if (ortModule) {
    const create = (name: string, key: keyof ModelStatusMap, ref: (s: any) => void) =>
      ortModule!.InferenceSession.create(base + name)
        .then((s: any) => { ref(s); modelStatus[key] = 'loaded'; })
        .catch((err: any) => { modelStatus[key] = 'error'; console.warn(`${name}:`, err.message); });

    onnxPromises.push(
      create('tire_wear_model.onnx', 'tire_wear', (s) => { tireWearSession = s; }),
      create('grip_model.onnx', 'grip', (s) => { gripSession = s; }),
      create('shift_model.onnx', 'shift', (s) => { shiftSession = s; }),
      create('pedal_overlap_model.onnx', 'pedal_overlap', (s) => { pedalSession = s; }),
    );
  }

  const jsonPromises: Promise<void>[] = [
    fetch(base + 'state_clusters.json')
      .then((r) => r.json())
      .then((j) => {
        clusterCentroids = j.centroids ?? null;
        clusterScalerMean = j.scaler_mean ?? null;
        clusterScalerScale = j.scaler_scale ?? null;
        modelStatus.state_clusters = 'loaded';
      })
      .catch((err) => { modelStatus.state_clusters = 'error'; console.warn('State clusters:', err.message); }),

    fetch(base + 'pca_profile.json')
      .then((r) => r.json())
      .then((j) => {
        pcaComponents = j.components ?? null;
        pcaScalerMean = j.scaler_mean ?? null;
        pcaScalerScale = j.scaler_scale ?? null;
        modelStatus.pca_profile = 'loaded';
      })
      .catch((err) => { modelStatus.pca_profile = 'error'; console.warn('PCA profile:', err.message); }),

    fetch(base + 'model_metrics.json')
      .then((r) => r.json())
      .then((j) => { modelMetrics = j.models ?? null; modelStatus.model_metrics = 'loaded'; })
      .catch((err) => { modelStatus.model_metrics = 'error'; console.warn('Model metrics:', err.message); }),
  ];

  await Promise.all([...onnxPromises, ...jsonPromises]);
}

// ─── Safety Score (heuristic, boundary-safe) ────────────────────────────

function computeSafetyScore(data: NormalizedRow[]): SafetyScoreResult {
  const PENALTY_DEDUP = 10;
  const lastFrame: Record<string, number> = {};

  const penalties: PenaltyCategory[] = [
    { label: 'Jerk Spike', count: 0, color: '#ef4444' },
    { label: 'Pedal Overlap', count: 0, color: '#f97316' },
    { label: 'Oversteer', count: 0, color: '#a855f7' },
    { label: 'Harsh Brake', count: 0, color: '#3b82f6' },
  ];

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (row._sessionBoundary) continue;

    const checks: Array<{ label: string; active: boolean }> = [
      { label: 'Jerk Spike', active: Math.abs(row.jerkX) > ML_CONFIG.SAFETY_JERK_X_THRESH || Math.abs(row.jerkY) > ML_CONFIG.SAFETY_JERK_Y_THRESH },
      { label: 'Pedal Overlap', active: row.pedalOverlap > ML_CONFIG.SAFETY_PEDAL_OVERLAP_THRESH },
      { label: 'Oversteer', active: row.oversteerCorrection > ML_CONFIG.SAFETY_OVERSTEER_THRESH },
      { label: 'Harsh Brake', active: row.brakeDelta < ML_CONFIG.SAFETY_BRAKE_DELTA_THRESH },
    ];

    for (const check of checks) {
      if (check.active && (lastFrame[check.label] ?? -Infinity) < i - PENALTY_DEDUP) {
        const idx = penalties.findIndex((p) => p.label === check.label);
        if (idx !== -1) {
          penalties[idx].count++;
          lastFrame[check.label] = i;
        }
      }
    }
  }

  const totalPenalties = penalties.reduce((s, p) => s + p.count, 0);
  const penaltyRate = totalPenalties / data.length;
  const score = Math.max(0, Math.round(100 - penaltyRate * 400));

  const breakdown = penalties.map((p) => ({
    ...p,
    pct: totalPenalties > 0 ? (p.count / totalPenalties) * 100 : 0,
  }));

  const deductions = penalties.filter((p) => p.count > 0).map((p) => `${p.label}: ${p.count} events`);

  return { score, deductions, penaltyBreakdown: breakdown };
}

// ─── Anomaly Detection (boundary-safe) ──────────────────────────────────

function detectAnomalies(
  data: NormalizedRow[],
  jerks: number[],
  accelerations: number[],
  speeds: number[],
  gForcesCombined: number[],
  timestamps: number[],
): AnomalyResult {
  const meanJerk = safeMean(jerks);
  const stdJerk = safeStd(jerks);
  const anomalyThreshold = meanJerk + stdJerk * ML_CONFIG.ANOMALY_SIGMA_MULTIPLIER;
  const meanGCombined = safeMean(gForcesCombined);
  const gAnomalyThresh = Math.max(
    ML_CONFIG.ANOMALY_G_FORCE_FLOOR,
    meanGCombined + ML_CONFIG.ANOMALY_G_FORCE_OFFSET,
  );

  const anomalyData: AnomalyResult['data'] = [];
  let anomalyCount = 0;

  for (let i = 0; i < speeds.length; i += ML_CONFIG.ANOMALY_DOWNSAMPLE_STEP) {
    const isHighJerk = jerks[i] > anomalyThreshold;
    const isHighG = gForcesCombined[i] > gAnomalyThresh;
    const isAnomaly = isHighJerk || isHighG;
    let type = 'Smooth Context';
    if (isAnomaly) {
      anomalyCount++;
      if (isHighG && Math.abs(data[i].gForceX) > Math.abs(data[i].gForceY)) type = 'High Lateral G';
      else if (isHighG) type = 'High Braking/Accel G';
      else if (speeds[i] > ML_CONFIG.ANOMALY_SPEED_THRESH) type = 'Extreme Speed';
      else if (accelerations[i] < ML_CONFIG.ANOMALY_HARSH_BRAKE_ACCEL) type = 'Harsh Braking';
      else if (accelerations[i] > ML_CONFIG.ANOMALY_HARSH_ACCEL_ACCEL) type = 'Harsh Acceleration';
      else type = 'Severe Jerk';
    }
    anomalyData.push({ timestamp: timestamps[i], speed: speeds[i], jerk: jerks[i], isAnomaly, type });
  }

  return { data: anomalyData, anomalyCount };
}

// ─── PCA projection (boundary-safe via data values, no dt dependency) ───

function projectPCA(data: NormalizedRow[]): PCAProjection & { meanX: number; meanY: number } {
  const result: PCAProjection['data'] = [];

  if (pcaComponents && pcaComponents.length >= 2 && pcaScalerMean && pcaScalerScale) {
    for (const row of data) {
      const features = extractFeatures(row, PCA_FEATURES);
      const normalized = features.map((v, i) => {
        const mu = pcaScalerMean![i] || 0;
        const sigma = pcaScalerScale![i] || 1;
        return sigma > 0 ? (v - mu) / sigma : 0;
      });
      const pc1 = pcaComponents![0].reduce((s, c, i) => s + c * normalized[i], 0);
      const pc2 = pcaComponents![1].reduce((s, c, i) => s + c * normalized[i], 0);
      result.push({
        x: pc1,
        y: pc2,
        intensity: Math.sqrt(pc1 ** 2 + pc2 ** 2),
        timestamp: row.timestamp,
      });
    }
  } else {
    for (const row of data) {
      const jerkMag = Math.abs(row.jerkX) + Math.abs(row.jerkY);
      const gMag = Math.abs(row.gForceX) + Math.abs(row.gForceY);
      result.push({
        x: jerkMag * ML_CONFIG.PCA_HEURISTIC_JERK_SCALE + ML_CONFIG.PCA_HEURISTIC_JERK_OFFSET,
        y: gMag * ML_CONFIG.PCA_HEURISTIC_G_SCALE + ML_CONFIG.PCA_HEURISTIC_G_OFFSET,
        intensity: jerkMag + gMag,
        timestamp: row.timestamp,
      });
    }
  }

  const meanX = safeMean(result.map((d) => d.x));
  const meanY = safeMean(result.map((d) => d.y));
  return { data: result, meanX, meanY };
}

// ─── KNN archetype classification ───────────────────────────────────────

function classifyKNN(meanX: number, meanY: number): { knnProfile: string; knnConfidence: number } {
  let minArchetypeDist = Infinity;
  let knnProfile = 'Balanced';
  for (const a of ML_CONFIG.KNN_ARCHETYPES) {
    const d = Math.sqrt((meanX - a.x) ** 2 + (meanY - a.y) ** 2);
    if (d < minArchetypeDist) { minArchetypeDist = d; knnProfile = a.label; }
  }
  const distances = ML_CONFIG.KNN_ARCHETYPES.map((a) =>
    Math.sqrt((meanX - a.x) ** 2 + (meanY - a.y) ** 2),
  );
  const maxDist = Math.max(...distances);
  const knnConfidence = maxDist > 0 ? Math.max(0, 1 - minArchetypeDist / maxDist) : 1;
  return { knnProfile, knnConfidence };
}

// ─── Fatigue (per-session, then aggregate) ──────────────────────────────

function computeFatigueForSession(
  data: NormalizedRow[],
  sessionId: number,
): NonNullable<FatigueResult['perSession']>[0] | null {
  if (data.length < ML_CONFIG.FATIGUE_MIN_POINTS) return null;

  const n = data.length;
  const segSize = Math.floor(n / ML_CONFIG.FATIGUE_SEGMENTS);
  const quarters = [
    data.slice(0, segSize),
    data.slice(segSize, 2 * segSize),
    data.slice(2 * segSize, 3 * segSize),
    data.slice(3 * segSize),
  ];

  const segmentNames = ['Q1: Start', 'Q2: Early-Mid', 'Q3: Mid-Late', 'Q4: End'];
  const timeline: Array<{ segment: string; avgJerk: number; smoothness: number }> = [];
  const jerkMeans: number[] = [];

  for (let qi = 0; qi < quarters.length; qi++) {
    const jerkVals = quarters[qi].map((r) => jerkMagnitude(r));
    const avgJerk = safeMean(jerkVals);
    jerkMeans.push(avgJerk);
    const smoothness = Math.max(0, 100 - avgJerk * ML_CONFIG.FATIGUE_SMOOTHNESS_SCALE);
    timeline.push({ segment: segmentNames[qi], avgJerk, smoothness });
  }

  const rawDecay = jerkMeans[0] > 0 ? jerkMeans[3] / jerkMeans[0] - 1 : 0;
  const decay = Math.max(-0.99, Math.min(0.99, rawDecay));
  const score = Math.max(0, Math.min(100, 100 - Math.max(0, decay) * ML_CONFIG.FATIGUE_DECAY_SCALE));

  return { sessionId, score, decay, timeline };
}

function detectFatigue(data: NormalizedRow[]): FatigueResult {
  const sessions = splitBySession(data);
  const perSession: FatigueResult['perSession'] = [];

  for (const sess of sessions) {
    const result = computeFatigueForSession(sess, sess[0]?._sessionId ?? 0);
    if (result) perSession.push(result);
  }

  if (perSession.length === 0) {
    return { score: 100, decay: 0, decayLabel: '0.0%', trend: 'stable', timeline: [] };
  }

  const avgScore = safeMean(perSession.map((s) => s.score));
  const avgDecay = safeMean(perSession.map((s) => s.decay));
  const avgDecayLabel =
    avgDecay >= 0 ? `+${(avgDecay * 100).toFixed(1)}%` : `${(avgDecay * 100).toFixed(1)}%`;
  const avgTrend =
    Math.abs(avgDecay) < ML_CONFIG.FATIGUE_IMPROVEMENT_THRESH
      ? 'stable'
      : avgDecay >= 0
        ? 'fatiguing'
        : 'improving';

  return {
    score: Math.round(avgScore),
    decay: avgDecay,
    decayLabel: avgDecayLabel,
    trend: avgTrend,
    timeline: perSession.flatMap((s) => s.timeline),
    perSession,
  };
}

// ─── Grip (ONNX or physics, boundary-safe) ──────────────────────────────

async function classifyGrip(data: NormalizedRow[]): Promise<GripResult> {
  let understeerCount = 0;
  let oversteerCount = 0;

  if (gripSession) {
    try {
      const CHUNK = ML_CONFIG.ONNX_CHUNK_SIZE;
      for (let i = 0; i < data.length; i += CHUNK) {
        const chunk = data.slice(i, i + CHUNK);
        for (const row of chunk) {
          if (row._sessionBoundary) continue;
          const features = extractFeatures(row, GRIP_FEATURES);
          const input = new ortModule!.Tensor('float32', Float32Array.from(features), [1, GRIP_FEATURES.length]);
          const feeds: Record<string, any> = {};
          feeds[gripSession.inputNames[0]] = input;
          const output = await gripSession.run(feeds);
          const preds = output[gripSession.outputNames[0]].data as Float32Array;
          if (preds[0] > 0.5) understeerCount++;
          if (preds.length > 1 && preds[1] > 0.5) oversteerCount++;
        }
        await sleep(0);
      }
    } catch {
      console.warn('Grip ONNX failed, falling back to heuristic');
    }
  }

  if (!gripSession || (understeerCount === 0 && oversteerCount === 0 && data.length > 10)) {
    for (const row of data) {
      if (row._sessionBoundary) continue;
      if (row.understeerPlough > 0.5) understeerCount++;
      if (row.oversteerCorrection > 0.5) oversteerCount++;
    }
  }

  const gripScore = Math.max(0, 100 - ((understeerCount + oversteerCount) / data.length) * 500);
  return { score: Math.min(100, gripScore), understeer: understeerCount, oversteer: oversteerCount };
}

// ─── Pedal Overlap (ONNX or heuristic) ──────────────────────────────────

async function classifyPedalOverlap(data: NormalizedRow[]): Promise<SVMResult> {
  let overlapFrames = 0;

  if (pedalSession) {
    try {
      const CHUNK = ML_CONFIG.ONNX_CHUNK_SIZE;
      for (let i = 0; i < data.length; i += CHUNK) {
        const chunk = data.slice(i, i + CHUNK);
        for (const row of chunk) {
          if (row._sessionBoundary) continue;
          const features = extractFeatures(row, PEDAL_FEATURES);
          const input = new ortModule!.Tensor('float32', Float32Array.from(features), [1, PEDAL_FEATURES.length]);
          const feeds: Record<string, any> = {};
          feeds[pedalSession.inputNames[0]] = input;
          const output = await pedalSession.run(feeds);
          const pred = output[pedalSession.outputNames[0]].data as Float32Array;
          if (pred[0] > 0.5) overlapFrames++;
        }
        await sleep(0);
      }
    } catch {
      console.warn('Pedal ONNX failed, falling back to heuristic');
    }
  }

  if (!pedalSession || (overlapFrames === 0 && data.length > 10)) {
    for (const row of data) {
      if (row._sessionBoundary) continue;
      if (row.pedalOverlap > 0.03) overlapFrames++;
    }
  }

  return {
    overlapPercentage: (overlapFrames / (data.length || 1)) * 100,
    overlapEvents: overlapFrames,
  };
}

// ─── State clustering (K-Means or heuristic) ────────────────────────────

function clusterStates(data: NormalizedRow[]): HMMResult {
  const stateNames = ['Cruising', 'Cornering', 'Slow / Cautious', 'Erratic'];
  const stateData: HMMResult['data'] = [];
  const counts: Record<string, number> = { Cruising: 0, Cornering: 0, 'Slow / Cautious': 0, Erratic: 0 };

  if (clusterCentroids && clusterCentroids.length === 4 && clusterScalerMean && clusterScalerScale) {
    for (const row of data) {
      const features = extractFeatures(row, HMM_FEATURES);
      const normalized = features.map((v, i) => {
        const mu = clusterScalerMean![i] || 0;
        const sigma = clusterScalerScale![i] || 1;
        return sigma > 0 ? (v - mu) / sigma : 0;
      });
      let bestIdx = 0;
      let bestDist = Infinity;
      for (let c = 0; c < clusterCentroids.length; c++) {
        let dist = 0;
        for (let f = 0; f < normalized.length; f++) {
          dist += (normalized[f] - clusterCentroids[c][f]) ** 2;
        }
        if (dist < bestDist) { bestDist = dist; bestIdx = c; }
      }
      const state = stateNames[bestIdx];
      stateData.push({ timestamp: row.timestamp, state });
      counts[state] = (counts[state] || 0) + 1;
    }
  } else {
    for (const row of data) {
      const speed = row.speed || 0;
      const gSum = Math.abs(row.gForceX) + Math.abs(row.gForceY);
      const jerk = jerkMagnitude(row);
      let state: string;
      if (jerk > 15) state = 'Erratic';
      else if (gSum > 1.2 && speed > 20) state = 'Cornering';
      else if (speed < 10) state = 'Slow / Cautious';
      else state = 'Cruising';
      stateData.push({ timestamp: row.timestamp, state });
      counts[state] = (counts[state] || 0) + 1;
    }
  }

  const total = data.length || 1;
  const statePercentages: Record<string, number> = {};
  for (const [k, v] of Object.entries(counts)) {
    statePercentages[k] = (v / total) * 100;
  }

  return { data: stateData, statePercentages };
}

// ─── Markov Chain (boundary-safe) ───────────────────────────────────────

function buildMarkovChain(stateData: HMMResult['data'], sourceData: NormalizedRow[]): Record<string, Record<string, number>> {
  const states = ['Cruising', 'Cornering', 'Slow / Cautious', 'Erratic'];
  const matrix: Record<string, Record<string, number>> = {};
  for (const s of states) {
    matrix[s] = { Cruising: 0, Cornering: 0, 'Slow / Cautious': 0, Erratic: 0 };
  }

  for (let i = 1; i < stateData.length; i++) {
    if (sourceData[i]?._sessionBoundary) continue;
    const from = stateData[i - 1].state;
    const to = stateData[i].state;
    if (matrix[from] && matrix[from][to] !== undefined) {
      matrix[from][to]++;
    }
  }

  return matrix;
}

// ─── Aggression Matrix ──────────────────────────────────────────────────

function buildAggressionMatrix(stateData: HMMResult['data']): {
  safeFast: number; safeSlow: number; riskyFast: number; riskySlow: number;
} {
  let cruising = 0, cornering = 0, cautious = 0, erratic = 0;
  for (const d of stateData) {
    if (d.state === 'Cruising') cruising++;
    else if (d.state === 'Cornering') cornering++;
    else if (d.state === 'Slow / Cautious') cautious++;
    else erratic++;
  }
  const total = stateData.length || 1;
  return {
    safeFast: Math.round((cornering / total) * 100),
    safeSlow: Math.round((cruising / total) * 100),
    riskyFast: Math.round((erratic / total) * 100),
    riskySlow: Math.round((cautious / total) * 100),
  };
}

// ─── Tire Wear (ONNX or heuristic, boundary-safe) ───────────────────────

async function predictTireWear(data: NormalizedRow[]): Promise<RFWearResult> {
  const result: RFWearResult['data'] = [];

  const featureRows = data.map((row) => extractFeatures(row, TIRE_WEAR_FEATURES));
  let life = ML_CONFIG.TIRE_WEAR_INITIAL_LIFE;

  if (tireWearSession) {
    try {
      const CHUNK = ML_CONFIG.ONNX_CHUNK_SIZE;
      for (let i = 0; i < featureRows.length; i += CHUNK) {
        const chunk = featureRows.slice(i, i + CHUNK);
        for (let j = 0; j < chunk.length; j++) {
          const idx = i + j;
          if (data[idx]._sessionBoundary) {
            life = ML_CONFIG.TIRE_WEAR_INITIAL_LIFE;
          }
          const input = new ortModule!.Tensor('float32', Float32Array.from(chunk[j]), [1, TIRE_WEAR_FEATURES.length]);
          const feeds: Record<string, any> = {};
          feeds[tireWearSession.inputNames[0]] = input;
          const output = await tireWearSession.run(feeds);
          const preds = output[tireWearSession.outputNames[0]].data as Float32Array;
          const wearNow = Math.max(0, Math.min(1, preds[0]));
          life = wearNow * ML_CONFIG.TIRE_WEAR_INITIAL_LIFE;
          result.push({
            timestamp: data[idx].timestamp || idx * ML_CONFIG.FALLBACK_TIMESTAMP_MS,
            life,
            wearRate: result.length > 0 ? result[result.length - 1].life - life : 0,
          });
        }
        await sleep(0);
      }
    } catch {
      console.warn('Tire wear ONNX failed, falling back to heuristic');
    }
  }

  if (result.length === 0) {
    let cumulativeWear = 0;
    const dt = ML_CONFIG.DEFAULT_DT;
    for (let i = 0; i < data.length; i++) {
      if (data[i]._sessionBoundary) cumulativeWear = 0;
      const gSum = Math.abs(data[i].gForceX) + Math.abs(data[i].gForceY);
      cumulativeWear += gSum * (data[i].speed || 0) * dt * ML_CONFIG.TIRE_WEAR_HEURISTIC_SCALE;
      life = Math.max(0, ML_CONFIG.TIRE_WEAR_INITIAL_LIFE - cumulativeWear);
      result.push({
        timestamp: data[i].timestamp || i * ML_CONFIG.FALLBACK_TIMESTAMP_MS,
        life,
        wearRate: i > 0 ? result[i - 1].life - life : 0,
      });
    }
  }

  return { data: result, endLife: life };
}

// ─── Shift Classification (ONNX or heuristic, boundary-safe) ────────────

async function classifyShifts(data: NormalizedRow[]): Promise<ShiftResult> {
  let early = 0, optimal = 0, late = 0;

  const gearChanges: number[] = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i]._sessionBoundary) continue;
    if ((data[i].gear || 0) !== (data[i - 1].gear || 0)) {
      gearChanges.push(i);
    }
  }

  if (shiftSession && gearChanges.length > 0) {
    try {
      const CHUNK = ML_CONFIG.ONNX_CHUNK_SIZE;
      for (let i = 0; i < gearChanges.length; i += CHUNK) {
        const chunk = gearChanges.slice(i, i + CHUNK);
        for (const idx of chunk) {
          const features = extractFeatures(data[idx], SHIFT_FEATURES);
          const input = new ortModule!.Tensor('float32', Float32Array.from(features), [1, SHIFT_FEATURES.length]);
          const feeds: Record<string, any> = {};
          feeds[shiftSession.inputNames[0]] = input;
          const output = await shiftSession.run(feeds);
          const pred = output[shiftSession.outputNames[0]].data as Float32Array;
          if (pred[0] <= 1.5) early++;
          else if (pred[0] <= 2.5) optimal++;
          else late++;
        }
        await sleep(0);
      }
    } catch {
      console.warn('Shift ONNX failed, falling back to heuristic');
    }
  }

  if (!shiftSession || (early === 0 && optimal === 0 && late === 0)) {
    for (const idx of gearChanges) {
      const rpm = data[idx].rpm || 0;
      if (rpm < 4000) early++;
      else if (rpm > 7200) late++;
      else optimal++;
    }
    if (gearChanges.length === 0) optimal = 1;
  }

  return { early, optimal, late };
}

// ─── Corner Exit Forecast (linear regression) ───────────────────────────

function computeExitForecast(
  speeds: number[],
  throttles: number[],
  steerings: number[],
  accelerations: number[],
): ExitForecastResult {
  const exitX: number[][] = [];
  const exitY: number[][] = [];

  for (let i = 0; i < speeds.length - ML_CONFIG.EXIT_WINDOW_STEP; i += ML_CONFIG.EXIT_WINDOW_STEP) {
    if (accelerations[i] > ML_CONFIG.EXIT_ACCEL_THRESH && Math.abs(steerings[i]) < ML_CONFIG.EXIT_STEERING_THRESH) {
      exitX.push([speeds[i], throttles[i]]);
      exitY.push([speeds[i + ML_CONFIG.EXIT_WINDOW_STEP]]);
    }
  }

  let speedCoeff = ML_CONFIG.EXIT_DEFAULT_SPEED_COEFF;
  let throttleCoeff = ML_CONFIG.EXIT_DEFAULT_THROTTLE_COEFF;
  const predicted: ExitForecastResult['predicted'] = [];

  if (exitX.length > ML_CONFIG.EXIT_MIN_SAMPLES) {
    const n = exitX.length;
    const X = exitX.map((x) => [1, x[0], x[1]]);
    const y = exitY.map((row) => row[0]);

    const XtX: number[][] = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (let i = 0; i < n; i++) {
      XtX[0][1] += X[i][1]; XtX[0][2] += X[i][2];
      XtX[1][0] += X[i][1]; XtX[1][1] += X[i][1] * X[i][1]; XtX[1][2] += X[i][1] * X[i][2];
      XtX[2][0] += X[i][2]; XtX[2][1] += X[i][2] * X[i][1]; XtX[2][2] += X[i][2] * X[i][2];
    }
    XtX[0][0] = n;

    const Xty = [0, 0, 0];
    for (let i = 0; i < n; i++) {
      Xty[0] += y[i];
      Xty[1] += X[i][1] * y[i];
      Xty[2] += X[i][2] * y[i];
    }

    function solve3(A: number[][], b: number[]): number[] {
      const m = A.map((row) => [...row]);
      const rhs = [...b];
      for (let col = 0; col < 3; col++) {
        let maxRow = col;
        for (let row = col + 1; row < 3; row++) {
          if (Math.abs(m[row][col]) > Math.abs(m[maxRow][col])) maxRow = row;
        }
        [m[col], m[maxRow]] = [m[maxRow], m[col]];
        [rhs[col], rhs[maxRow]] = [rhs[maxRow], rhs[col]];
        if (Math.abs(m[col][col]) < 1e-12) continue;
        for (let row = col + 1; row < 3; row++) {
          const factor = m[row][col] / m[col][col];
          for (let j = col; j < 3; j++) m[row][j] -= factor * m[col][j];
          rhs[row] -= factor * rhs[col];
        }
      }
      const x = [0, 0, 0];
      for (let i = 2; i >= 0; i--) {
        if (Math.abs(m[i][i]) < 1e-12) continue;
        x[i] = rhs[i];
        for (let j = i + 1; j < 3; j++) x[i] -= m[i][j] * x[j];
        x[i] /= m[i][i];
      }
      return x;
    }

    const lambda = ML_CONFIG.EXIT_RIDGE_LAMBDA;
    for (let i = 0; i < 3; i++) XtX[i][i] += lambda;
    const [intercept, bSpeed, bThrottle] = solve3(XtX, Xty);
    speedCoeff = bSpeed;
    throttleCoeff = bThrottle;

    for (let i = 0; i < exitX.length; i++) {
      const p = intercept + bSpeed * exitX[i][0] + bThrottle * exitX[i][1];
      predicted.push({ apex: exitX[i][0], actual: exitY[i][0], predicted: +p.toFixed(1) });
    }
  }

  return { speedCoeff, throttleCoeff, predicted: predicted.length > 0 ? predicted : undefined };
}

// ─── Braking Consistency (DTW proxy) ────────────────────────────────────

function computeDTW(brakes: number[], data: NormalizedRow[]): { dtwScore: number; trailPercent: number } {
  const brakeZones: number[][] = [];
  let inZone = false;
  let currZone: number[] = [];

  for (let i = 0; i < brakes.length; i++) {
    if (data[i]._sessionBoundary) {
      if (inZone && currZone.length > ML_CONFIG.BRAKE_ZONE_MIN_LENGTH) brakeZones.push(currZone);
      currZone = [];
      inZone = false;
      continue;
    }
    if (brakes[i] > ML_CONFIG.BRAKE_ZONE_PRESSURE_THRESH) {
      inZone = true;
      currZone.push(brakes[i]);
    } else if (inZone) {
      if (currZone.length > ML_CONFIG.BRAKE_ZONE_MIN_LENGTH) brakeZones.push(currZone);
      currZone = [];
      inZone = false;
    }
  }

  brakeZones.sort((a, b) => b.length - a.length);
  let dtwScore = ML_CONFIG.BRAKE_ZONE_DEFAULT_DTW;
  if (brakeZones.length >= 2) {
    const z1 = brakeZones[0];
    const z2 = brakeZones[1];
    let dist = 0;
    const minLen = Math.min(z1.length, z2.length);
    for (let k = 0; k < minLen; k++) dist += Math.abs(z1[k] - z2[k]);
    dtwScore = Math.max(0, 100 - dist / minLen);
  }

  let trailCount = 0;
  let stabCount = 0;
  for (let i = 1; i < brakes.length; i++) {
    if (data[i]._sessionBoundary) continue;
    if (brakes[i] > ML_CONFIG.BRAKE_TECH_PRESSURE_THRESH) {
      if (brakes[i] < brakes[i - 1] && Math.abs(data[i].steering) > Math.abs(data[i - 1].steering) + ML_CONFIG.BRAKE_TECH_STEERING_DELTA) {
        trailCount++;
      } else {
        stabCount++;
      }
    }
  }
  const trailPercent = Math.round((trailCount / Math.max(1, trailCount + stabCount)) * 100);

  return { dtwScore, trailPercent };
}

// ─── Quality Metrics ────────────────────────────────────────────────────

function computeQualityMetrics(
  safetyScore: SafetyScoreResult,
  svm: SVMResult,
  hmm: HMMResult,
  grip: GripResult,
  shifts: ShiftResult,
  anomalyCount: number,
  totalFrames: number,
  knnConfidence: number,
  dtwScore: number,
): QualityMetrics {
  const m = modelMetrics ?? {};
  const skewScore = Math.max(0, 1 - Math.min((anomalyCount / (totalFrames || 1)) * ML_CONFIG.QUALITY_ANOMALY_DENSITY_SCALE, 1));
  const svmScore = svm.overlapPercentage === 0 ? 1 : Math.max(ML_CONFIG.QUALITY_SVM_MIN_SCORE, 1 - svm.overlapPercentage / 100);
  const regressionFitScore =
    safetyScore.score > ML_CONFIG.QUALITY_REGRESSION_BAND_HIGH
      ? ML_CONFIG.QUALITY_REGRESSION_SCORE_HIGH
      : safetyScore.score > ML_CONFIG.QUALITY_REGRESSION_BAND_MID
        ? ML_CONFIG.QUALITY_REGRESSION_SCORE_MID
        : ML_CONFIG.QUALITY_REGRESSION_SCORE_LOW;
  const dtwQualityScore = Math.min(1, dtwScore / 100);

  const q = (score: number, analysis: string, formula: string): QualityMetric => ({ score, analysis, formula });

  return {
    clusteringSilhouette: q(
      m.states_kmeans?.silhouette ?? (hmm.statePercentages['Erratic'] < ML_CONFIG.QUALITY_ERRATIC_PCT_THRESH ? ML_CONFIG.QUALITY_FALLBACK_SILHOUETTE_HIGH : ML_CONFIG.QUALITY_FALLBACK_SILHOUETTE_LOW),
      m.states_kmeans?.silhouette
        ? `Trained K-Means silhouette: ${m.states_kmeans.silhouette.toFixed(3)}`
        : 'Heuristic state separation — train ML pipeline for real metrics.',
      's = (b - a) / max(a, b)',
    ),
    pcaVariance: q(
      m.driver_pca?.explained_variance ?? ML_CONFIG.QUALITY_FALLBACK_PCA_VARIANCE,
      m.driver_pca
        ? `PCA explains ${(m.driver_pca.explained_variance * 100).toFixed(1)}% of variance`
        : 'Heuristic PCA — train pipeline for real components.',
      'Explained Variance = Σ(λ₁, λ₂) / Σ(λ_all)',
    ),
    randomForestOOB: q(
      m.tire_wear_rf?.r2 ?? ML_CONFIG.QUALITY_FALLBACK_RF_R2,
      m.tire_wear_rf
        ? `Trained RF R² = ${m.tire_wear_rf.r2?.toFixed(3) ?? 'N/A'}`
        : 'Heuristic wear model — train pipeline for ensemble.',
      'R² = 1 - (SS_res / SS_tot)',
    ),
    anomalySkewness: q(
      skewScore,
      `${anomalyCount} anomalies in ${totalFrames} frames (${((anomalyCount / Math.max(1, totalFrames)) * 100).toFixed(1)}%)`,
      'Isolation depth = avg path length to isolate outlier',
    ),
    svmMargin: q(
      svmScore,
      `${svm.overlapPercentage.toFixed(1)}% pedal overlap — ${svm.overlapPercentage < 5 ? 'clean separation' : 'significant confusion'}`,
      'Margin = min ||w·x + b||',
    ),
    regressionFit: q(
      regressionFitScore,
      `Safety Score: ${safetyScore.score}/100 with ${safetyScore.deductions.length} penalty categories`,
      'R² = explained safety variance / total',
    ),
    knnConfidence: q(
      knnConfidence,
      `Driver match confidence based on archetype distance`,
      '1 - (||x - nearest|| / max_distance)',
    ),
    dtwConsistency: q(
      dtwQualityScore,
      dtwQualityScore > 0.7
        ? 'Brake zones are repeatable and consistent.'
        : dtwQualityScore > 0.4
          ? 'Moderate braking consistency.'
          : 'High variability in braking patterns.',
      '1 - (DTW_dist / brakeZone_len)',
    ),
    dtPurity: q(
      grip.score > ML_CONFIG.QUALITY_GRIP_BAND_HIGH
        ? ML_CONFIG.QUALITY_DT_PURITY_HIGH
        : grip.score > ML_CONFIG.QUALITY_GRIP_BAND_MID
          ? ML_CONFIG.QUALITY_DT_PURITY_MID
          : ML_CONFIG.QUALITY_DT_PURITY_LOW,
      `Grip score ${grip.score.toFixed(0)}% — ${grip.score > 80 ? 'traction limits not often reached' : grip.score > 50 ? 'moderate grip loss' : 'frequent traction limit crossings'}`,
      '1 - Σ(p_i²) (Gini complement)',
    ),
    nbAccuracy: q(
      Math.min(1, (shifts.optimal / Math.max(1, shifts.early + shifts.optimal + shifts.late)) + ML_CONFIG.QUALITY_NB_ACCURACY_BONUS),
      `${shifts.optimal} optimal / ${shifts.early + shifts.optimal + shifts.late} total shifts`,
      'P(optimal | RPM, Throttle)',
    ),
  };
}

// ─── Main entry point ───────────────────────────────────────────────────

self.onmessage = async (e: MessageEvent<IncomingMessage>) => {
  if (e.data.type !== 'ANALYZE_SESSION') return;

  try {
    const rawData = e.data.payload.sessionArray;
    if (!rawData || rawData.length < ML_CONFIG.MIN_DATA_POINTS) {
      throw new Error('Session data too short. Need at least 100 data points.');
    }

    const reportProgress = (pct: number, status?: string) => {
      self.postMessage({ type: 'PROGRESS', progress: Math.round(pct), status });
    };

    reportProgress(5, 'Loading ML models...');
    await loadModels();
    reportProgress(10, 'Validating telemetry data...');

    // Filter valid rows
    const validData = rawData.filter(
      (d) =>
        d.speed !== undefined && !isNaN(Number(d.speed)) &&
        d.throttle !== undefined && !isNaN(Number(d.throttle)) &&
        d.brake !== undefined && !isNaN(Number(d.brake)) &&
        d.steering !== undefined && !isNaN(Number(d.steering)),
    ) as NormalizedRow[];

    if (validData.length < ML_CONFIG.MIN_VALID_ROWS) {
      throw new Error('Not enough valid numerical rows after parsing.');
    }

    // Extract time-series arrays
    const timestamps = validData.map((d) => d.timestamp);
    const speeds = validData.map((d) => Math.min(Math.max(d.speed, 0), ML_CONFIG.MAX_SPEED));
    const throttles = validData.map((d) => d.throttle);
    const brakes = validData.map((d) => d.brake);
    const steerings = validData.map((d) => {
      const s = d.steering;
      return s > 1 || s < -1 ? s / 360 : s;
    });
    const gForcesCombined = validData.map(
      (d) => d.gforceCombined || Math.sqrt(d.gForceX ** 2 + d.gForceY ** 2) || 0,
    );

    // Boundary-aware jerk/acceleration
    const jerks: number[] = [0];
    const accelerations: number[] = [0];
    for (let i = 1; i < speeds.length; i++) {
      if (validData[i]._sessionBoundary) {
        accelerations.push(0);
        jerks.push(0);
        continue;
      }
      const dt = (timestamps[i] - timestamps[i - 1]) / 1000 || ML_CONFIG.DEFAULT_DT;
      const a1 = (speeds[i] - speeds[i - 1]) / dt;
      accelerations.push(a1);
      const a0 = i > 1 && !validData[i - 1]._sessionBoundary
        ? (speeds[i - 1] - speeds[i - 2]) / dt
        : 0;
      jerks.push(Math.abs((a1 - a0) / dt) || 0);
    }
    reportProgress(15, 'Computing jerk & acceleration...');

    // ── Safety Score ──
    const safetyScore = computeSafetyScore(validData);
    reportProgress(20, 'Evaluating safety score...');

    // ── Anomaly Detection ──
    const anomalies = detectAnomalies(validData, jerks, accelerations, speeds, gForcesCombined, timestamps);
    reportProgress(25, 'Detecting anomalies...');

    // ── PCA Driver Profile ──
    const pca = projectPCA(validData);
    let profile = 'Balanced';
    if (pca.meanX > 0 && pca.meanY > 0) profile = 'Aggressive';
    else if (pca.meanX > 0) profile = 'Erratic';
    else if (pca.meanY > 0) profile = 'Smooth';
    else profile = 'Conservative';
    const { knnProfile, knnConfidence } = classifyKNN(pca.meanX, pca.meanY);
    reportProgress(35, 'Profiling driver style...');

    // ── Pedal Overlap ──
    const svm = await classifyPedalOverlap(validData);
    reportProgress(45, 'Classifying pedal overlap...');

    // ── Driving States ──
    const hmm = clusterStates(validData);
    reportProgress(55, 'Clustering driving states...');

    // ── Tire Wear ──
    const rfWear = await predictTireWear(validData);
    reportProgress(65, 'Predicting tire wear...');

    // ── Grip ──
    const grip = await classifyGrip(validData);
    reportProgress(72, 'Analyzing grip retention...');

    // ── Shifts ──
    const shifts = await classifyShifts(validData);
    reportProgress(78, 'Classifying shift quality...');

    // ── Fatigue ──
    const fatigue = detectFatigue(validData);
    reportProgress(83, 'Detecting fatigue...');

    // ── Corner Exit Forecast ──
    const exitForecast = computeExitForecast(speeds, throttles, steerings, accelerations);
    reportProgress(87, 'Forecasting corner exits...');

    // ── Braking Consistency + Technique ──
    const { dtwScore, trailPercent } = computeDTW(brakes, validData);
    reportProgress(90, 'Measuring braking consistency...');

    // ── Markov + Aggression ──
    const markovMatrix = buildMarkovChain(hmm.data, validData);
    const aggressionMatrix = buildAggressionMatrix(hmm.data);
    reportProgress(93, 'Building transition matrix...');

    // ── Quality Metrics ──
    const qualityMetrics = computeQualityMetrics(
      safetyScore, svm, hmm, grip, shifts,
      anomalies.anomalyCount, anomalies.data.length,
      knnConfidence, dtwScore,
    );
    reportProgress(96, 'Computing quality metrics...');

    // ── Session boundaries for chart markers ──
    const sessionBoundaries = validData
      .filter((d) => d._sessionBoundary)
      .map((d) => d.timestamp);

    // ── Assemble final results ──
    const results: MLResults = {
      progress: 100,
      isProcessing: false,
      safetyScore,
      pca: { data: downsample(pca.data, ML_CONFIG.MAX_CHART_POINTS), profile, knnProfile },
      anomalies: { data: downsample(anomalies.data, ML_CONFIG.MAX_CHART_POINTS), anomalyCount: anomalies.anomalyCount },
      svm,
      rfWear: { data: downsample(rfWear.data, ML_CONFIG.MAX_CHART_POINTS), endLife: rfWear.endLife },
      hmm: { data: downsample(hmm.data, ML_CONFIG.MAX_CHART_POINTS), statePercentages: hmm.statePercentages },
      fatigue,
      grip,
      shifts,
      exitForecast,
      consistency: { dtwScore },
      brakingTech: { trailPercent },
      markov: markovMatrix,
      aggression: aggressionMatrix,
      qualityMetrics,
      modelStatus: { ...modelStatus },
      sessionBoundaries,
      perSession: fatigue.perSession?.map((s) => ({
        sessionId: s.sessionId,
        labels: { fatigueScore: Math.round(s.score) },
      })),
    };

    self.postMessage({ type: 'COMPLETE', results });
  } catch (err: any) {
    console.error('ML Worker Error:', err);
    self.postMessage({ type: 'ERROR', message: err.message || 'Unknown error in ML Engine.' });
  }
};
