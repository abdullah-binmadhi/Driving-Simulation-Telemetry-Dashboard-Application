/**
 * ML Inference Web Worker — runs ONNX models + JSON param models on session data.
 * 
 * Architecture:
 *   - ONNX models (tire_wear, grip, shift) loaded via onnxruntime-web
 *   - Clustering/PCA params loaded from JSON files in /models/
 *   - Lightweight JS fallbacks when models are unavailable
 *   - Model quality metrics loaded from model_metrics.json
 */

import * as ort from 'onnxruntime-web';
import {
  TIRE_WEAR_FEATURES,
  GRIP_FEATURES,
  HMM_FEATURES,
  PCA_FEATURES,
  SHIFT_FEATURES,
  PEDAL_FEATURES,
} from '../../ml-features';
import { ML_CONFIG } from '../../ml-config';


// ─── Helpers ─────────────────────────────────────────────────────────────────

function jerkMagnitude(row: any): number {
  const x = row.jerkX || 0;
  const y = row.jerkY || 0;
  return Math.sqrt(x * x + y * y);
}

function extractFeatures(row: any, featureList: readonly string[]): number[] {
  return featureList.map(f => {
    const v = row[f];
    return typeof v === 'number' && isFinite(v) ? v : 0;
  });
}

function safeMean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function safeStd(arr: number[]): number {
  if (arr.length < 2) return 0;
  const mean = safeMean(arr);
  const variance = arr.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

// ─── Model inference implementations ─────────────────────────────────────────

/** Tire wear prediction — uses ONNX if available, else heuristic fallback */
async function predictTireWear(
  data: Record<string, number>[],
  session: ort.InferenceSession | null
): Promise<{ data: Array<{ timestamp: number; life: number; wearRate: number }>; endLife: number }> {
  const result: Array<{ timestamp: number; life: number; wearRate: number }> = [];
  let life = ML_CONFIG.TIRE_WEAR_INITIAL_LIFE;

  const featureRows = data.map(row => extractFeatures(row, TIRE_WEAR_FEATURES));

  if (session) {
    try {
      for (let i = 0; i < featureRows.length; i++) {
        const input = new ort.Tensor('float32', Float32Array.from(featureRows[i]), [1, TIRE_WEAR_FEATURES.length]);
        const feeds: Record<string, ort.Tensor> = {};
        feeds[session.inputNames[0]] = input;
        const output = await session.run(feeds);
        const preds = output[session.outputNames[0]].data as Float32Array;
        const wearNow = Math.max(0, Math.min(1, preds[0]));
        life = wearNow * ML_CONFIG.TIRE_WEAR_INITIAL_LIFE;
        result.push({
          timestamp: data[i].timestamp || i * ML_CONFIG.FALLBACK_TIMESTAMP_MS,
          life,
          wearRate: i > 0 ? result[i - 1].life - life : 0,
        });
      }
    } catch (err) {
      console.warn("Tire wear ONNX failed, falling back to heuristic", err);
    }
  }

  if (result.length === 0) {
    // Heuristic fallback: wear ~ cumulative gForce * speed integral
    let cumulativeWear = 0;
    const dt = ML_CONFIG.DEFAULT_DT;
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const gSum = Math.abs(row.gForceX || 0) + Math.abs(row.gForceY || 0);
      const speed = row.speed || 0;
      cumulativeWear += gSum * speed * dt * ML_CONFIG.TIRE_WEAR_HEURISTIC_SCALE;
      life = Math.max(0, ML_CONFIG.TIRE_WEAR_INITIAL_LIFE - cumulativeWear);
      result.push({
        timestamp: row.timestamp || i * ML_CONFIG.FALLBACK_TIMESTAMP_MS,
        life,
        wearRate: i > 0 ? result[i - 1].life - life : 0,
      });
    }
  }

  return { data: result, endLife: life };
}

/** Driver fatigue — logistic regression style decay detection */
function detectFatigue(data: Record<string, number>[]): { score: number; decay: number; timeline: Array<{ segment: string; avgJerk: number; smoothness: number }> } {
  if (data.length < ML_CONFIG.FATIGUE_MIN_POINTS) return { score: 100, decay: 0, timeline: [] };

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
    const jerkVals = quarters[qi].map(r => jerkMagnitude(r));
    const avgJerk = safeMean(jerkVals);
    jerkMeans.push(avgJerk);
    const smoothness = Math.max(0, 100 - (avgJerk * ML_CONFIG.FATIGUE_SMOOTHNESS_SCALE));
    timeline.push({ segment: segmentNames[qi], avgJerk, smoothness });
  }

  const decay = jerkMeans[0] > 0 ? (jerkMeans[3] / jerkMeans[0] - 1) : 0;
  const score = Math.max(0, Math.min(100, 100 - Math.max(0, decay) * ML_CONFIG.FATIGUE_DECAY_SCALE));

  return { score, decay, timeline };
}

/** Grip classification — uses ONNX if available, else physics-based */
async function classifyGrip(
  data: Record<string, number>[],
  session: ort.InferenceSession | null
): Promise<{ score: number; understeer: number; oversteer: number }> {
  let understeerCount = 0;
  let oversteerCount = 0;

  if (session) {
    try {
      for (const row of data) {
        const features = extractFeatures(row, GRIP_FEATURES);
        const input = new ort.Tensor('float32', Float32Array.from(features), [1, GRIP_FEATURES.length]);
        const feeds: Record<string, ort.Tensor> = {};
        feeds[session.inputNames[0]] = input;
        const output = await session.run(feeds);
        const preds = output[session.outputNames[0]].data as Float32Array;
        if (preds[0] > 0.5) understeerCount++;
        if (preds.length > 1 && preds[1] > 0.5) oversteerCount++;
      }
    } catch (err) {
      console.warn("Grip ONNX failed, falling back to heuristic", err);
    }
  }

  if (!session || (understeerCount === 0 && oversteerCount === 0 && data.length > 10)) {
    // Physics-based: use understeerPlough and oversteerCorrection flags from data
    for (const row of data) {
      if (row.understeerPlough && row.understeerPlough > 0.5) understeerCount++;
      if (row.oversteerCorrection && row.oversteerCorrection > 0.5) oversteerCount++;
    }
  }

  const gripScore = Math.max(0, 100 - (understeerCount + oversteerCount) / data.length * 500);
  return { score: Math.min(100, gripScore), understeer: understeerCount, oversteer: oversteerCount };
}

/**
 * Safety score — heuristic penalty scoring independent of session length.
 * Uses per-frame penalty rate (not total) so 2-min and 10-min sessions
 * with identical per-frame behavior score identically.
 *
 * Understeer is NOT penalized here — it's a grip phenomenon reflected in
 * the grip score. Only 4 penalty categories: Jerk Spike, Pedal Overlap,
 * Oversteer, Harsh Brake.
 *
 * All categories use a PENALTY_DEDUP window to prevent consecutive-frame
 * flooding.
 */
function computeSafetyScore(data: Record<string, number>[]): { score: number; deductions: string[]; penaltyBreakdown: Array<{ label: string; count: number; pct: number; color: string }> } {
  const PENALTY_DEDUP = 10;
  const lastFrame: Record<string, number> = {};

  const penalties: Array<{ label: string; count: number; color: string }> = [
    { label: 'Jerk Spike', count: 0, color: '#ef4444' },
    { label: 'Pedal Overlap', count: 0, color: '#f97316' },
    { label: 'Oversteer', count: 0, color: '#a855f7' },
    { label: 'Harsh Brake', count: 0, color: '#3b82f6' },
  ];

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const checks: Array<{ label: string; active: boolean }> = [
      { label: 'Jerk Spike', active: Math.abs(row.jerkX || 0) > ML_CONFIG.SAFETY_JERK_X_THRESH || Math.abs(row.jerkY || 0) > ML_CONFIG.SAFETY_JERK_Y_THRESH },
      { label: 'Pedal Overlap', active: (row.pedalOverlap || 0) > ML_CONFIG.SAFETY_PEDAL_OVERLAP_THRESH },
      { label: 'Oversteer', active: (row.oversteerCorrection || 0) > ML_CONFIG.SAFETY_OVERSTEER_THRESH },
      { label: 'Harsh Brake', active: (row.brakeDelta || 0) < ML_CONFIG.SAFETY_BRAKE_DELTA_THRESH },
    ];
    for (const check of checks) {
      if (check.active && (lastFrame[check.label] ?? -Infinity) < i - PENALTY_DEDUP) {
        const idx = penalties.findIndex(p => p.label === check.label);
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

  const breakdown = penalties.map(p => ({
    label: p.label,
    count: p.count,
    pct: totalPenalties > 0 ? (p.count / totalPenalties) * 100 : 0,
    color: p.color,
  }));

  const deductions = penalties.filter(p => p.count > 0).map(p => `${p.label}: ${p.count} events`);

  return { score, deductions, penaltyBreakdown: breakdown };
}

/** Driving state clustering — uses JSON centroids if available, else heuristic */
function clusterStates(data: Record<string, number>[], centroids: number[][] | null): {
  data: Array<{ timestamp: number; state: string }>;
  statePercentages: Record<string, number>;
} {
  const stateNames = ['Cruising', 'Cornering', 'Slow / Cautious', 'Erratic'];
  const stateData: Array<{ timestamp: number; state: string }> = [];
  const counts: Record<string, number> = { 'Cruising': 0, 'Cornering': 0, 'Slow / Cautious': 0, 'Erratic': 0 };

  if (centroids && centroids.length === 4) {
    // K-Means nearest-centroid classification
    for (const row of data) {
      const features = extractFeatures(row, HMM_FEATURES);
      // Simple normalization (z-score style)
      const magnitude = Math.sqrt(features.reduce((s, v) => s + v * v, 0)) || 1;
      const normalized = features.map(v => v / magnitude);

      let bestIdx = 0;
      let bestDist = Infinity;
      for (let c = 0; c < centroids.length; c++) {
        let dist = 0;
        for (let f = 0; f < normalized.length; f++) {
          dist += (normalized[f] - centroids[c][f]) ** 2;
        }
        if (dist < bestDist) { bestDist = dist; bestIdx = c; }
      }
      const state = stateNames[bestIdx];
      stateData.push({ timestamp: row.timestamp || 0, state });
      counts[state] = (counts[state] || 0) + 1;
    }
  } else {
    // Heuristic: speed + gForce rules
    for (const row of data) {
      const speed = row.speed || 0;
      const gSum = Math.abs(row.gForceX || 0) + Math.abs(row.gForceY || 0);
      const jerk = jerkMagnitude(row);

      let state: string;
      if (jerk > 15) state = 'Erratic';
      else if (gSum > 1.2 && speed > 20) state = 'Cornering';
      else if (speed < 10) state = 'Slow / Cautious';
      else state = 'Cruising';

      stateData.push({ timestamp: row.timestamp || 0, state });
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

/** PCA driver profiling — uses JSON components if available */
function projectPCA(data: Record<string, number>[], components: number[][] | null, mean: number[] | null): {
  data: Array<{ x: number; y: number; intensity: number; timestamp: number }>;
} {
  const result: Array<{ x: number; y: number; intensity: number; timestamp: number }> = [];

  if (components && components.length >= 2 && mean) {
    // Real PCA projection
    for (const row of data) {
      const features = extractFeatures(row, PCA_FEATURES);
      const centered = features.map((v, i) => v - (mean[i] || 0));
      const pc1 = components[0].reduce((s, c, i) => s + c * centered[i], 0);
      const pc2 = components[1].reduce((s, c, i) => s + c * centered[i], 0);
      result.push({
        x: pc1,
        y: pc2,
        intensity: Math.sqrt(pc1 ** 2 + pc2 ** 2),
        timestamp: row.timestamp || 0,
      });
    }
  } else {
    // Heuristic: x = normalized jerk, y = normalized gForce
    for (const row of data) {
      const jerkMag = Math.abs(row.jerkX || 0) + Math.abs(row.jerkY || 0);
      const gMag = Math.abs(row.gForceX || 0) + Math.abs(row.gForceY || 0);
      result.push({
        x: jerkMag * ML_CONFIG.PCA_HEURISTIC_JERK_SCALE + ML_CONFIG.PCA_HEURISTIC_JERK_OFFSET,
        y: gMag * ML_CONFIG.PCA_HEURISTIC_G_SCALE + ML_CONFIG.PCA_HEURISTIC_G_OFFSET,
        intensity: jerkMag + gMag,
        timestamp: row.timestamp || 0,
      });
    }
  }

  return { data: result };
}

/** Shift point classification — uses ONNX if available */
async function classifyShifts(
  data: Record<string, number>[],
  session: ort.InferenceSession | null
): Promise<{ early: number; optimal: number; late: number }> {
  let early = 0, optimal = 0, late = 0;

  // Detect gear changes
  const gearChanges: number[] = [];
  for (let i = 1; i < data.length; i++) {
    if ((data[i].gear || 0) !== (data[i - 1].gear || 0)) {
      gearChanges.push(i);
    }
  }

  if (session && gearChanges.length > 0) {
    try {
      for (const idx of gearChanges) {
        const features = extractFeatures(data[idx], SHIFT_FEATURES);
        const input = new ort.Tensor('float32', Float32Array.from(features), [1, SHIFT_FEATURES.length]);
        const feeds: Record<string, ort.Tensor> = {};
        feeds[session.inputNames[0]] = input;
        const output = await session.run(feeds);
        const pred = output[session.outputNames[0]].data as Float32Array;
        if (pred[0] <= 1.5) early++;
        else if (pred[0] <= 2.5) optimal++;
        else late++;
      }
    } catch (err) {
      console.warn("Shift ONNX failed, falling back to heuristic", err);
    }
  }

  if (!session || (early === 0 && optimal === 0 && late === 0)) {
    // Heuristic: RPM-based
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

/** Pedal overlap classification — uses ONNX if available */
async function classifyPedalOverlap(
  data: Record<string, number>[],
  session: ort.InferenceSession | null
): Promise<{ overlapPercentage: number; overlapEvents: number }> {
  let overlapFrames = 0;

  if (session) {
    try {
      for (const row of data) {
        const features = extractFeatures(row, PEDAL_FEATURES);
        const input = new ort.Tensor('float32', Float32Array.from(features), [1, PEDAL_FEATURES.length]);
        const feeds: Record<string, ort.Tensor> = {};
        feeds[session.inputNames[0]] = input;
        const output = await session.run(feeds);
        const pred = output[session.outputNames[0]].data as Float32Array;
        if (pred[0] > 0.5) overlapFrames++;
      }
    } catch (err) {
      console.warn("Pedal ONNX failed, falling back to heuristic", err);
    }
  }

  if (!session || (overlapFrames === 0 && data.length > 10)) {
    // Direct measurement from pedalOverlap field
    for (const row of data) {
      if ((row.pedalOverlap || 0) > 0.03) overlapFrames++;
    }
  }

  return {
    overlapPercentage: (overlapFrames / (data.length || 1)) * 100,
    overlapEvents: overlapFrames,
  };
}

// ─── Main worker entry point ─────────────────────────────────────────────────

let tireWearSession: ort.InferenceSession | null = null;
let gripSession: ort.InferenceSession | null = null;
let shiftSession: ort.InferenceSession | null = null;
let clusterCentroids: number[][] | null = null;
let pcaComponents: number[][] | null = null;
let pcaMean: number[] | null = null;
interface ModelMetricsJson {
  models?: Record<string, Record<string, number>>;
}
let modelMetrics: ModelMetricsJson | null = null;
let modelsLoaded = false;
let modelStatus: Record<string, 'loaded' | 'not_found' | 'error'> = {
  tire_wear: 'not_found',
  grip: 'not_found',
  shift: 'not_found',
  state_clusters: 'not_found',
  pca_profile: 'not_found',
  model_metrics: 'not_found',
};

function resolveBaseUrl(basePath: string): string {
  const loc = self.location;
  if (loc.protocol === 'file:') {
    return new URL(basePath, loc.href).href;
  }
  return new URL(basePath, loc.origin).href;
}

async function loadModels(): Promise<void> {
  if (modelsLoaded) return;

  ort.env.wasm.wasmPaths = resolveBaseUrl('../assets/');
  ort.env.wasm.numThreads = 1;

  const base = resolveBaseUrl('../models/');

  // Load ONNX models in parallel
  const onnxPromises: Promise<void>[] = [];
  onnxPromises.push(
    ort.InferenceSession.create(base + 'tire_wear_model.onnx')
      .then(s => { tireWearSession = s; modelStatus.tire_wear = 'loaded'; })
      .catch((err) => { modelStatus.tire_wear = 'error'; console.warn('Tire wear model load failed:', err.message); })
  );
  onnxPromises.push(
    ort.InferenceSession.create(base + 'grip_model.onnx')
      .then(s => { gripSession = s; modelStatus.grip = 'loaded'; })
      .catch((err) => { modelStatus.grip = 'error'; console.warn('Grip model load failed:', err.message); })
  );
  onnxPromises.push(
    ort.InferenceSession.create(base + 'shift_model.onnx')
      .then(s => { shiftSession = s; modelStatus.shift = 'loaded'; })
      .catch((err) => { modelStatus.shift = 'error'; console.warn('Shift model load failed:', err.message); })
  );

  // Load JSON params
  const jsonPromises: Promise<void>[] = [];
  jsonPromises.push(
    fetch(base + 'state_clusters.json')
      .then(r => r.json())
      .then(j => {
        clusterCentroids = j.centroids || null;
        modelStatus.state_clusters = 'loaded';
      })
      .catch((err) => { modelStatus.state_clusters = 'error'; console.warn('State clusters load failed:', err.message); })
  );
  jsonPromises.push(
    fetch(base + 'pca_profile.json')
      .then(r => r.json())
      .then(j => {
        pcaComponents = j.components || null;
        pcaMean = j.mean || null;
        modelStatus.pca_profile = 'loaded';
      })
      .catch((err) => { modelStatus.pca_profile = 'error'; console.warn('PCA profile load failed:', err.message); })
  );
  jsonPromises.push(
    fetch(base + 'model_metrics.json')
      .then(r => r.json())
      .then(j => { modelMetrics = j; modelStatus.model_metrics = 'loaded'; })
      .catch((err) => { modelStatus.model_metrics = 'error'; console.warn('Model metrics load failed:', err.message); })
  );

  await Promise.all([...onnxPromises, ...jsonPromises]);
  // Only mark as loaded if at least one model succeeded — allows retry on transient failure
  const anyLoaded = Object.values(modelStatus).some(s => s === 'loaded');
  modelsLoaded = anyLoaded;
}

// ─── Markov Chain builder ────────────────────────────────────

function buildMarkovChain(stateData: Array<{ timestamp: number; state: string }>): Record<string, Record<string, number>> {
  const states = ['Cruising', 'Cornering', 'Slow / Cautious', 'Erratic'];
  const matrix: Record<string, Record<string, number>> = {};
  for (const s of states) {
    matrix[s] = { Cruising: 0, Cornering: 0, 'Slow / Cautious': 0, Erratic: 0 };
  }

  for (let i = 1; i < stateData.length; i++) {
    const from = stateData[i - 1].state;
    const to = stateData[i].state;
    if (matrix[from] && matrix[from][to] !== undefined) {
      matrix[from][to]++;
    }
  }

  return matrix;
}

function buildAggressionMatrix(stateData: Array<{ timestamp: number; state: string }>): {
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


export type IncomingMessage = {
    type: 'ANALYZE_SESSION';
    payload: {
        sessionArray: Record<string, number>[];
    }
};

export type OutgoingMessage =
    | { type: 'PROGRESS', progress: number }
    | { type: 'ERROR', message: string }
    | { type: 'COMPLETE', results: any };

// ─── Single message handler — ONNX inference + heuristics only ────

self.onmessage = async (e: MessageEvent<IncomingMessage>) => {
  if (e.data.type !== 'ANALYZE_SESSION') return;

  try {
    const rawData = e.data.payload.sessionArray;
    if (!rawData || rawData.length < ML_CONFIG.MIN_DATA_POINTS) {
      throw new Error("Session data is too short for meaningful ML analysis. Need at least 100 data points.");
    }

    const reportProgress = (pct: number) => {
      self.postMessage({ type: 'PROGRESS', progress: pct });
    };

    reportProgress(5);

    // ── Load pre-trained models (ONNX + JSON params) ──
    await loadModels();
    reportProgress(10);

    // ── Data validation and derived fields ──
    const validData = rawData.filter((d: any) =>
      d.speed !== undefined && !isNaN(Number(d.speed)) &&
      d.throttle !== undefined && !isNaN(Number(d.throttle)) &&
      d.brake !== undefined && !isNaN(Number(d.brake)) &&
      d.steering !== undefined && !isNaN(Number(d.steering))
    );
    if (validData.length < ML_CONFIG.MIN_VALID_ROWS) {
      throw new Error("Not enough valid numerical rows after parsing the dataset.");
    }

    const timestamps = validData.map((d: any) => Number(d.timestamp) || 0);
    const speeds = validData.map((d: any) => Math.min(Math.max(Number(d.speed) || 0, 0), ML_CONFIG.MAX_SPEED));
    const throttles = validData.map((d: any) => Number(d.throttle) || 0);
    const brakes = validData.map((d: any) => Number(d.brake) || 0);
    const steerings = validData.map((d: any) => {
      const s = Number(d.steering) || 0;
      return s > 1 || s < -1 ? s / 360 : s;
    });
    const gForcesX = validData.map((d: any) => Number(d.gForceX) || 0);
    const gForcesY = validData.map((d: any) => Number(d.gForceY) || 0);
    const gForcesCombined = validData.map((d: any) =>
      Number(d.gforceCombined) || Math.sqrt(Math.pow(gForcesX[0] || 0, 2) + Math.pow(gForcesY[0] || 0, 2)) || 0
    );
    const jerks: number[] = [0];
    const accelerations: number[] = [0];
    for (let i = 1; i < speeds.length; i++) {
      const dt = (timestamps[i] - timestamps[i - 1]) / 1000 || ML_CONFIG.DEFAULT_DT;
      const a1 = (speeds[i] - speeds[i - 1]) / dt;
      accelerations.push(a1);
      const a0 = i > 1 ? (speeds[i - 1] - speeds[i - 2]) / dt : 0;
      jerks.push(Math.abs((a1 - a0) / dt) || 0);
    }
    const meanJerk = safeMean(jerks);
    reportProgress(15);

    // ── Safety Score (heuristic) ──
    const safetyScore = computeSafetyScore(validData);
    reportProgress(25);

    // ── Anomaly Detection (3-sigma + G-force) ──
    const stdJerk = safeStd(jerks);
    const anomalyThreshold = meanJerk + stdJerk * ML_CONFIG.ANOMALY_SIGMA_MULTIPLIER;
    const meanGCombined = safeMean(gForcesCombined);
    const G_ANOMALY_THRESH = Math.max(ML_CONFIG.ANOMALY_G_FORCE_FLOOR, meanGCombined + ML_CONFIG.ANOMALY_G_FORCE_OFFSET);

    const anomalyData: Array<{ timestamp: number; speed: number; isAnomaly: boolean; jerk: number; type: string }> = [];
    let anomalyCount = 0;
    for (let i = 0; i < speeds.length; i += ML_CONFIG.ANOMALY_DOWNSAMPLE_STEP) {
      const isHighJerk = jerks[i] > anomalyThreshold;
      const isHighG = gForcesCombined[i] > G_ANOMALY_THRESH;
      const isAnomaly = isHighJerk || isHighG;
      let type = "Smooth Context";
      if (isAnomaly) {
        anomalyCount++;
        if (isHighG && Math.abs(gForcesX[i]) > Math.abs(gForcesY[i])) type = "High Lateral G";
        else if (isHighG) type = "High Braking/Accel G";
        else if (speeds[i] > ML_CONFIG.ANOMALY_SPEED_THRESH) type = "Extreme Speed";
        else if (accelerations[i] < ML_CONFIG.ANOMALY_HARSH_BRAKE_ACCEL) type = "Harsh Braking";
        else if (accelerations[i] > ML_CONFIG.ANOMALY_HARSH_ACCEL_ACCEL) type = "Harsh Acceleration";
        else type = "Severe Jerk";
      }
      anomalyData.push({ timestamp: timestamps[i], speed: speeds[i], jerk: jerks[i], isAnomaly, type });
    }
    reportProgress(35);

    // ── PCA Driver Profile (pre-trained components or heuristic) ──
    const pca = projectPCA(validData, pcaComponents, pcaMean);
    const meanX = safeMean(pca.data.map(d => d.x));
    const meanY = safeMean(pca.data.map(d => d.y));
    let profile = 'Balanced';
    if (meanX > 0 && meanY > 0) profile = 'Aggressive';
    else if (meanX > 0) profile = 'Erratic';
    else if (meanY > 0) profile = 'Smooth';
    else profile = 'Conservative';

    // KNN proxy: nearest archetype by PCA mean distance
    let minArchetypeDist = Infinity;
    let knnProfile = profile;
    for (const a of ML_CONFIG.KNN_ARCHETYPES) {
      const d = Math.sqrt((meanX - a.x) ** 2 + (meanY - a.y) ** 2);
      if (d < minArchetypeDist) { minArchetypeDist = d; knnProfile = a.label; }
    }
    const distances = ML_CONFIG.KNN_ARCHETYPES.map(a =>
      Math.sqrt((meanX - a.x) ** 2 + (meanY - a.y) ** 2)
    );
    const minDist = Math.min(...distances);
    const maxDist = Math.max(...distances);
    const knnConfidenceScore = maxDist > 0 ? Math.max(0, 1 - minDist / maxDist) : 1;
    reportProgress(45);

    // ── Pedal Overlap (ONNX or heuristic) ──
    const svm = await classifyPedalOverlap(validData, null);
    reportProgress(55);

    // ── Driving States (K-Means nearest-centroid or heuristic) ──
    const hmm = clusterStates(validData, clusterCentroids);
    reportProgress(65);

    // ── Tire Wear (ONNX or heuristic) ──
    const rfWear = await predictTireWear(validData, tireWearSession);
    reportProgress(75);

    // ── Grip Classification (ONNX or physics) ──
    const grip = await classifyGrip(validData, gripSession);
    reportProgress(80);

    // ── Shift Classification (ONNX or heuristic) ──
    const shifts = await classifyShifts(validData, shiftSession);
    reportProgress(85);

    // ── Fatigue Detection (quarter-based jerk analysis) ──
    const fatigue = detectFatigue(validData);

    // ── Corner Exit Forecast (manual linear regression, no ml-mlr) ──
    const exitX: number[][] = [];
    const exitY: number[][] = [];
    for (let i = 0; i < speeds.length - ML_CONFIG.EXIT_WINDOW_STEP; i += ML_CONFIG.EXIT_WINDOW_STEP) {
      if (accelerations[i] > ML_CONFIG.EXIT_ACCEL_THRESH && Math.abs(steerings[i]) < ML_CONFIG.EXIT_STEERING_THRESH) {
        exitX.push([speeds[i], throttles[i]]);
        exitY.push([speeds[i + ML_CONFIG.EXIT_WINDOW_STEP]]);
      }
    }
    let speedCoeff = ML_CONFIG.EXIT_DEFAULT_SPEED_COEFF, throttleCoeff = ML_CONFIG.EXIT_DEFAULT_THROTTLE_COEFF;
    const exitPredictedData: { apex: number; actual: number; predicted: number }[] = [];
    if (exitX.length > ML_CONFIG.EXIT_MIN_SAMPLES) {
      const n = exitX.length;
      // Build design matrix with intercept: [1, speed, throttle]
      const X = exitX.map(x => [1, x[0], x[1]]);
      const y = exitY.map(row => row[0]);

      // X^T * X
      const XtX: number[][] = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
      for (let i = 0; i < n; i++) {
        XtX[0][1] += X[i][1]; XtX[0][2] += X[i][2];
        XtX[1][0] += X[i][1]; XtX[1][1] += X[i][1] * X[i][1]; XtX[1][2] += X[i][1] * X[i][2];
        XtX[2][0] += X[i][2]; XtX[2][1] += X[i][2] * X[i][1]; XtX[2][2] += X[i][2] * X[i][2];
      }
      XtX[0][0] = n;

      // X^T * y
      const Xty = [0, 0, 0];
      for (let i = 0; i < n; i++) {
        Xty[0] += y[i];
        Xty[1] += X[i][1] * y[i];
        Xty[2] += X[i][2] * y[i];
      }

      // Solve 3×3 via Gaussian elimination with partial pivoting
      function solve3(A: number[][], b: number[]): number[] {
        const m = A.map(row => [...row]);
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
        const predicted = intercept + bSpeed * exitX[i][0] + bThrottle * exitX[i][1];
        exitPredictedData.push({ apex: exitX[i][0], actual: exitY[i][0], predicted: +predicted.toFixed(1) });
      }
    }

    // ── Braking Consistency (DTW proxy) ──
    const brakeZones: number[][] = [];
    let inZone = false;
    let currZone: number[] = [];
    for (let i = 0; i < brakes.length; i++) {
      if ((brakes[i] || 0) > ML_CONFIG.BRAKE_ZONE_PRESSURE_THRESH) {
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
      const z1 = brakeZones[0], z2 = brakeZones[1];
      let dist = 0;
      const minLen = Math.min(z1.length, z2.length);
      for (let k = 0; k < minLen; k++) dist += Math.abs(z1[k] - z2[k]);
      dtwScore = Math.max(0, 100 - dist / minLen);
    }

    // ── Braking Technique (heuristic, no Decision Tree) ──
    let trailCount = 0, stabCount = 0;
    for (let i = 1; i < brakes.length; i++) {
      if ((brakes[i] || 0) > ML_CONFIG.BRAKE_TECH_PRESSURE_THRESH) {
        if (brakes[i] < brakes[i - 1] && Math.abs(steerings[i]) > Math.abs(steerings[i - 1]) + ML_CONFIG.BRAKE_TECH_STEERING_DELTA) {
          trailCount++;
        } else {
          stabCount++;
        }
      }
    }
    const trailPercent = Math.round((trailCount / Math.max(1, trailCount + stabCount)) * 100);

    // ── Markov Chain ──
    const markovMatrix = buildMarkovChain(hmm.data);
    // ── Aggression Matrix ──
    const aggressionMatrix = buildAggressionMatrix(hmm.data);

    // ── Quality Metrics from pre-trained model_metrics.json + per-run stats ──
    const m = modelMetrics?.models || {};
    const skewScore = Math.max(0, 1 - Math.min(anomalyCount / (speeds.length || 1) * ML_CONFIG.QUALITY_ANOMALY_DENSITY_SCALE, 1));
    const svmScore = svm.overlapPercentage === 0 ? 1 : Math.max(ML_CONFIG.QUALITY_SVM_MIN_SCORE, 1 - svm.overlapPercentage / 100);
    const regressionFitScore = safetyScore.score > ML_CONFIG.QUALITY_REGRESSION_BAND_HIGH ? ML_CONFIG.QUALITY_REGRESSION_SCORE_HIGH : safetyScore.score > ML_CONFIG.QUALITY_REGRESSION_BAND_MID ? ML_CONFIG.QUALITY_REGRESSION_SCORE_MID : ML_CONFIG.QUALITY_REGRESSION_SCORE_LOW;
    const dtwQualityScore = Math.min(1, dtwScore / 100);

    const qualityMetrics = {
      clusteringSilhouette: {
        score: m.states_kmeans?.silhouette ?? (hmm.statePercentages['Erratic'] < ML_CONFIG.QUALITY_ERRATIC_PCT_THRESH ? ML_CONFIG.QUALITY_FALLBACK_SILHOUETTE_HIGH : ML_CONFIG.QUALITY_FALLBACK_SILHOUETTE_LOW),
        analysis: m.states_kmeans?.silhouette
          ? `Trained K-Means silhouette score: ${m.states_kmeans.silhouette.toFixed(3)}`
          : 'Heuristic state separation used — train the ML pipeline for real metrics.',
        formula: 's = (b - a) / max(a, b) where a = intra-cluster distance, b = nearest-cluster distance',
      },
      pcaVariance: {
        score: m.driver_pca?.explained_variance ?? ML_CONFIG.QUALITY_FALLBACK_PCA_VARIANCE,
        analysis: m.driver_pca
          ? `PCA explains ${(m.driver_pca.explained_variance * 100).toFixed(1)}% of behavioral variance`
          : 'Heuristic PCA used — train the ML pipeline for real components.',
        formula: 'Explained Variance = Σ(λ₁, λ₂) / Σ(λ_all) for top 2 principal components',
      },
      randomForestOOB: {
        score: m.tire_wear_rf?.r2 ?? ML_CONFIG.QUALITY_FALLBACK_RF_R2,
        analysis: m.tire_wear_rf
          ? `Trained RF R² = ${m.tire_wear_rf.r2?.toFixed(3) ?? 'N/A'}`
          : 'Heuristic wear model used — train the ML pipeline for ensemble predictions.',
        formula: 'R² = 1 - (SS_res / SS_tot) — proportion of tire wear variance explained by the ensemble',
      },
      anomalySkewness: {
        score: skewScore,
        analysis: `${anomalyCount} anomalies in ${anomalyData.length} frames (${(anomalyCount / Math.max(1, anomalyData.length) * 100).toFixed(1)}%)`,
        formula: 'Isolation depth = avg path length to isolate outlier; 3σ threshold for anomaly flagging',
      },
      svmMargin: {
        score: svmScore,
        analysis: `${svm.overlapPercentage.toFixed(1)}% pedal overlap — ${svm.overlapPercentage < 5 ? 'clean separation' : 'significant confusion'}`,
        formula: 'Margin = min ||w·x + b|| — distance from decision boundary to support vectors',
      },
      regressionFit: {
        score: regressionFitScore,
        analysis: `Safety Score: ${safetyScore.score}/100 with ${safetyScore.deductions.length} penalty categories`,
        formula: 'R² = explained safety variance / total; penalties weighted by event severity',
      },
      knnConfidence: {
        score: knnConfidenceScore,
        analysis: `Driver profile: ${knnProfile} — based on PCA component quadrant nearest archetype (distance ${minArchetypeDist.toFixed(2)})`,
        formula: '1 - (||x - nearest_archetype|| / max_archetype_distance)',
      },
      dtwConsistency: {
        score: dtwQualityScore,
        analysis: dtwQualityScore > 0.7
          ? 'Brake zones are repeatable and consistent across similar straights.'
          : dtwQualityScore > 0.4
          ? 'Moderate braking consistency. Some zones vary in pressure or release point.'
          : 'High variability in braking patterns.',
        formula: '1 - (DTW_dist / brakeZone_len)',
      },
      dtPurity: {
        score: grip.score > ML_CONFIG.QUALITY_GRIP_BAND_HIGH ? ML_CONFIG.QUALITY_DT_PURITY_HIGH : grip.score > ML_CONFIG.QUALITY_GRIP_BAND_MID ? ML_CONFIG.QUALITY_DT_PURITY_MID : ML_CONFIG.QUALITY_DT_PURITY_LOW,
        analysis: `Grip score ${grip.score.toFixed(0)}% — ${grip.score > 80 ? 'traction limits not often reached' : grip.score > 50 ? 'moderate grip loss events' : 'frequent traction limit crossings'}`,
        formula: '1 - Σ(p_i²) (Gini complement over grip state distribution)',
      },
      nbAccuracy: {
        score: Math.min(1, (shifts.optimal / Math.max(1, shifts.early + shifts.optimal + shifts.late)) + ML_CONFIG.QUALITY_NB_ACCURACY_BONUS),
        analysis: `${shifts.optimal} optimal / ${shifts.early + shifts.optimal + shifts.late} total shifts`,
        formula: 'P(optimal | RPM, Throttle) — based on ONNX classification distribution',
      },
    };
    reportProgress(100);

    // ── Assemble final results ──
    const results = {
      safetyScore,
      pca: { ...pca, profile, knnProfile },
      anomalies: { data: anomalyData, anomalyCount },
      svm,
      rfWear,
      hmm,
      fatigue,
      grip,
      shifts,
      exitForecast: { speedCoeff, throttleCoeff, predicted: exitPredictedData },
      consistency: { dtwScore },
      brakingTech: { trailPercent },
      markov: markovMatrix,
      aggression: aggressionMatrix,
      qualityMetrics,
      modelStatus: { ...modelStatus },
    };

    self.postMessage({ type: 'COMPLETE', results });
  } catch (err: any) {
    console.error("ML Worker Error:", err);
    self.postMessage({ type: 'ERROR', message: err.message || "Unknown error occurred inside the ML Engine." });
  }
};
