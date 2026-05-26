# ML Pipeline Fix Plan

> Addresses findings from the CRITICAL audit completed on 2026-05-26.
> Covers: feature name drift, UI label accuracy, magic number extraction,
> ONNX batching, error handling, algorithm integrity, and type safety.

---

## Table of Contents

1. [Phase 0: Feature Name Alignment](#phase-0-feature-name-alignment)
2. [Phase 1: UI Label Accuracy](#phase-1-ui-label-accuracy)
3. [Phase 2: Magic Number Extraction](#phase-2-magic-number-extraction)
4. [Phase 3: ONNX Batching & Error Handling](#phase-3-onnx-batching--error-handling)
5. [Phase 4: Algorithm Integrity Fixes](#phase-4-algorithm-integrity-fixes)
6. [Phase 5: Type Safety](#phase-5-type-safety)
7. [Effort Summary](#effort-summary)

---

## Phase 0: Feature Name Alignment

**Risk Before: CRITICAL — Risk After: LOW**
**Estimate: 1 hour**

### Problem

| Source | Casing | Example |
|---|---|---|
| `ml-pipeline/config.py` | `snake_case` | `jerk_x`, `tire_temp_fl`, `pedal_overlap` |
| `src/components/MLAnalysis/mlWorker.ts` | `camelCase` | `jerkX`, `tireTempFL`, `pedalOverlap` |

ONNX is **position-based** — inference only cares about tensor column order, not names.
Currently all 6 paired feature lists are **identical in order**, so inference technically works.
But the drift is risky: any reordering in one file without updating the other produces
**silently garbage predictions**.

### Actions

#### 0.1 — Add order-enforcement comments to `config.py`

Add a `# NOTE: Feature ORDER must match mlWorker.ts` comment above every feature list:

```python
# NOTE: Feature ORDER must match mlWorker.ts TIRE_WEAR_FEATURES
TIRE_WEAR_FEATURES = [
    'speed', 'throttle', 'brake', 'steering',
    ...
]
```

Applies to: `TIRE_WEAR_FEATURES`, `GRIP_FEATURES`, `HMM_FEATURES`, `PCA_FEATURES`,
`SHIFT_FEATURES`, `PEDAL_FEATURES`.

#### 0.2 — Move TS feature lists to shared constants file

Create `src/ml-features.ts` as the **single source of truth** for the TypeScript side:

```typescript
// ─── Feature maps — ORDER must match config.py ────────────────────

export const TIRE_WEAR_FEATURES = [
  'speed', 'throttle', 'brake', 'steering',
  'gForceX', 'gForceY', 'jerkX', 'jerkY', 'pedalOverlap',
  'tireTempFL', 'tireTempFR', 'tireTempRL', 'tireTempRR',
  'tirePressureFL', 'tirePressureFR',
  'slipAngleEstimate', 'turnRadius',
  'isCoasting', 'isBraking', 'isTurning',
] as const;

export const GRIP_FEATURES = [ ... ] as const;
export const HMM_FEATURES = [ ... ] as const;
export const PCA_FEATURES = [ ... ] as const;
export const SHIFT_FEATURES = [ ... ] as const;
export const PEDAL_FEATURES = [ ... ] as const;
```

Then import into `mlWorker.ts`:

```typescript
import { TIRE_WEAR_FEATURES, GRIP_FEATURES, ... } from '../../ml-features';
```

#### 0.3 — Add camelCase→snake_case conversion in `train_model.py`

The Python training pipeline reads raw CSV files. Some CSVs may have camelCase columns
(e.g., `jerkX`) while `config.py` uses snake_case. Add a renaming step:

```python
CAMEL_TO_SNAKE = {
    'jerkX': 'jerk_x', 'jerkY': 'jerk_y',
    'pedalOverlap': 'pedal_overlap',
    'tireTempFL': 'tire_temp_fl',
    'tireTempFR': 'tire_temp_fr',
    # ... etc
}
df.rename(columns=CAMEL_TO_SNAKE, inplace=True)
```

This ensures the training CSV columns always match `config.py` regardless of export format.

#### 0.4 — Add CI verification script

Create `scripts/verify-feature-order.js` that compares feature lists between
`config.py` and `ml-features.ts` and fails on mismatch. Run via `npm run verify:features`.

---

## Phase 1: UI Label Accuracy

**Risk Before: MAJOR — Risk After: LOW**
**Estimate: 2 hours**

### Problem

7 of 13 ML visualization cards claim algorithms that do not exist in the implementation.
A user familiar with ML will be misled about analytical depth.

### Changes to `MLAnalysis.tsx`

#### 1.1 — Card subtitle labels

| # | Current Title | Current Subtitle | Replace With |
|---|---|---|---|
| 1 | Safety Score | "Multivariate Regression Analysis" | "Heuristic Penalty Score" |
| 2 | Discomfort Anomalies | "Isolation Forest (Outlier Detection)" | "Statistical Anomaly Det. (3σ + G-Force)" |
| 3 | Driver Profiler | "Principal Component Analysis (PCA)" | Keep "PCA" — partially accurate |
| 4 | Pedal Confusion | "Support Vector Machine (SVM)" | "Pedal Overlap Ratio" |
| 5 | Predictive Tire Degradation | "Random Forest Wear Projection" | "Tire Wear Projection (ONNX/Heuristic)" |
| 6 | Contextual Driving States | "Hidden Markov Model Approximation (Time Series Clustering)" | "K-Means State Clustering" |
| 7 | Driver Fatigue Tracker | "Logistic Regression — Input smoothness decay over session" | "Jerk Decay Fatigue Score" |
| 8 | Grip Limits Analyzer | "Decision Tree — Lateral G-Force traction classification" | "Grip Classification (ONNX/Physics)" |
| 9 | Shift Point Analyzer | "Naive Bayes — Gear change timing classification" | "Shift Timing (ONNX/RPM Threshold)" |
| 10 | Pedal Consistency | "Dynamic Time Warping — Brake zone repeatability score" | "Brake Zone Similarity Score" |
| 11 | Braking Technique | "Decision Tree — Trail vs Stab braking classification" | "Trail vs Stab Braking Heuristic" |
| 12 | State Transition Flow | "Markov Chain — Driving state transition probabilities" | Keep — **correct** |
| 13 | Aggression Matrix | "K-Medoids Proxy — Speed vs Risk quadrant analysis" | "Driving Style Quadrants" |

#### 1.2 — Interpretation text fixes

Three cards have interpretation blocks that describe non-existent algorithms:

**Safety Score** (lines ~395–399):
- Before: `"Multivariate regression confirms that speed, jerk, and steering variance remain within low-risk boundaries throughout the session."`
- After: `"Heuristic penalty scoring shows speed, jerk, and steering inputs remain within low-risk boundaries throughout the session."`

**Fatigue Tracker** (lines ~662–666):
- Before: `"Logistic Regression detects no meaningful decay in input smoothness..."` and
  `"The logistic decay coefficient shows a steep negative sigmoid..."`
- After: `"Jerk trend analysis detects no meaningful decay in input smoothness..."` and
  `"The jerk decay score indicates..."`

**Pedal Consistency** (lines ~774–779):
- Before: `"DTW analysis confirms highly repeatable braking commitment patterns..."` and
  `"The warping distance between brake pressure profiles is minimal..."`
- After: `"Brake profile comparison shows highly repeatable braking patterns..."` and
  `"The mean difference between brake zone profiles is minimal..."`

#### 1.3 — Quality Metric Card subtitles

| Current Label | Replace With |
|---|---|
| "Isolation Tree" | "Anomaly Skewness" |
| "Shift Bayes" | "Shift Accuracy" |
| "DTW Brake" | "Brake Consistency" |

---

## Phase 2: Magic Number Extraction

**Risk Before: MAJOR — Risk After: LOW**
**Estimate: 3 hours**

### Problem

79 distinct magic numbers in `mlWorker.ts`, 21 in `MLAnalysis.tsx`.
Zero named constants. One cross-file inconsistency (RPM thresholds).

### Actions

#### 2.1 — Create `src/ml-config.ts`

Single configuration object with all thresholds, defaults, and constants:

<details>
<summary>Full ML_CONFIG object (click to expand)</summary>

```typescript
export const ML_CONFIG = {
  // ── Data validation ──
  MIN_DATA_POINTS: 100,
  MIN_VALID_ROWS: 50,
  MAX_SPEED: 300,

  // ── Timestep ──
  DEFAULT_DT: 0.016,
  FALLBACK_TIMESTAMP_MS: 16,

  // ── Tire Wear ──
  TIRE_WEAR_INITIAL_LIFE: 100,
  TIRE_WEAR_HEURISTIC_SCALE: 0.00002,
  TIRE_WEAR_ONNX_OUTPUT_IDX: 0,

  // ── Fatigue ──
  FATIGUE_MIN_POINTS: 100,
  FATIGUE_SEGMENTS: 4,
  FATIGUE_SMOOTHNESS_SCALE: 50,
  FATIGUE_DECAY_SCALE: 200,

  // ── Safety Score ──
  SAFETY_DEDUP_WINDOW: 3,
  SAFETY_JERK_X_THRESH: 15,
  SAFETY_JERK_Y_THRESH: 10,
  SAFETY_PEDAL_OVERLAP_THRESH: 0.15,
  SAFETY_UNDERSTEER_THRESH: 0.5,
  SAFETY_OVERSTEER_THRESH: 0.5,
  SAFETY_BRAKE_DELTA_THRESH: -0.3,
  SAFETY_PENALTY_NORMALIZE_DIVISOR: 10,
  SAFETY_SCORE_MULTIPLIER: 40,

  // ── State Clustering ──
  NUM_STATES: 4,
  STATE_ERRATIC_JERK_THRESH: 15,
  STATE_CORNERING_G_THRESH: 1.2,
  STATE_CORNERING_SPEED_THRESH: 20,
  STATE_SLOW_SPEED_THRESH: 10,
  STATE_NORMALIZE_EPSILON: 1,

  // ── Anomaly Detection ──
  ANOMALY_SIGMA_MULTIPLIER: 4,
  ANOMALY_G_FORCE_FLOOR: 2.0,
  ANOMALY_G_FORCE_OFFSET: 1.5,
  ANOMALY_DOWNSAMPLE_STEP: 10,
  ANOMALY_SPEED_THRESH: 160,
  ANOMALY_HARSH_BRAKE_ACCEL: -5,
  ANOMALY_HARSH_ACCEL_ACCEL: 5,

  // ── PCA Heuristic ──
  PCA_HEURISTIC_JERK_SCALE: 5,
  PCA_HEURISTIC_JERK_OFFSET: -2,
  PCA_HEURISTIC_G_SCALE: 3,
  PCA_HEURISTIC_G_OFFSET: -1,

  // ── Shifts ──
  SHIFT_EARLY_RPM: 4000,
  SHIFT_LATE_RPM: 7200,
  SHIFT_DEFAULT_OPTIMAL: 1,
  SHIFT_ONNX_EARLY_BOUND: 1.5,
  SHIFT_ONNX_OPTIMAL_BOUND: 2.5,

  // ── Pedal Overlap ──
  PEDAL_OVERLAP_ONNX_THRESH: 0.5,
  PEDAL_OVERLAP_HEURISTIC_THRESH: 0.03,

  // ── Corner Exit Forecast ──
  EXIT_WINDOW_STEP: 20,
  EXIT_ACCEL_THRESH: 2,
  EXIT_STEERING_THRESH: 0.2,
  EXIT_DEFAULT_SPEED_COEFF: 0.5,
  EXIT_DEFAULT_THROTTLE_COEFF: 0.2,
  EXIT_MIN_SAMPLES: 3,
  EXIT_DETERMINANT_EPSILON: 1e-10,
  EXIT_RIDGE_LAMBDA: 0.1,

  // ── Brake Zones ──
  BRAKE_ZONE_PRESSURE_THRESH: 20,
  BRAKE_ZONE_MIN_LENGTH: 10,
  BRAKE_ZONE_DEFAULT_DTW: 85.5,

  // ── Braking Technique ──
  BRAKE_TECH_PRESSURE_THRESH: 10,
  BRAKE_TECH_STEERING_DELTA: 0.05,

  // ── KNN Archetypes ──
  KNN_ARCHETYPES: [
    { x: -14, y: -3, label: 'Smooth Professional' },
    { x: -4, y: 2, label: 'Cautious Amateur' },
    { x: 8, y: -2, label: 'Aggressive Amateur' },
    { x: 18, y: 8, label: 'Erratic Novice' },
  ] as const,

  // ── Quality Metrics Fallbacks ──
  QUALITY_FALLBACK_PCA_VARIANCE: 0.72,
  QUALITY_FALLBACK_RF_R2: 0.78,
  QUALITY_FALLBACK_SILHOUETTE_HIGH: 0.65,
  QUALITY_FALLBACK_SILHOUETTE_LOW: 0.35,
  QUALITY_ERRATIC_PCT_THRESH: 15,
  QUALITY_REGRESSION_BAND_HIGH: 80,
  QUALITY_REGRESSION_BAND_MID: 50,
  QUALITY_REGRESSION_SCORE_HIGH: 0.72,
  QUALITY_REGRESSION_SCORE_MID: 0.55,
  QUALITY_REGRESSION_SCORE_LOW: 0.35,
  QUALITY_GRIP_BAND_HIGH: 80,
  QUALITY_GRIP_BAND_MID: 50,
  QUALITY_DT_PURITY_HIGH: 0.65,
  QUALITY_DT_PURITY_MID: 0.45,
  QUALITY_DT_PURITY_LOW: 0.3,
  QUALITY_SVM_MIN_SCORE: 0.3,
  QUALITY_ANOMALY_DENSITY_SCALE: 10,
  QUALITY_NB_ACCURACY_BONUS: 0.1,
} as const;
```

</details>

#### 2.2 — Import and use in `mlWorker.ts`

```typescript
import { ML_CONFIG } from '../../ml-config';

// Before:
const dt = 0.016;

// After:
const dt = ML_CONFIG.DEFAULT_DT;
```

#### 2.3 — Fix cross-file RPM inconsistency

**File**: `MLAnalysis.tsx` line 719

- Before: `"Optimal range = 5500–6500 RPM"`
- After: `"Optimal range = ${ML_CONFIG.SHIFT_EARLY_RPM}–${ML_CONFIG.SHIFT_LATE_RPM} RPM"`

Or if the UI should display a narrower "optimal" window, add a separate config value:
`SHIFT_OPTIMAL_MIN_RPM` and `SHIFT_OPTIMAL_MAX_RPM`.

---

## Phase 3: ONNX Batching & Error Handling

**Risk Before: MAJOR — Risk After: LOW**
**Estimate: 4 hours**

### 3a — Batch ONNX Inference

**Problem**: Every ONNX model processes rows one-at-a-time.
50,000 rows = 50,000 `session.run()` calls per model.

**Fix**: Change the 4 ONNX-capable functions to run a single batched inference call.

#### `predictTireWear` (lines 74–123)

```typescript
// Before: per-row loop with [1, 20] tensor
// After: single batched call with [N, 20] tensor
async function predictTireWear(
  data: any[],
  session: ort.InferenceSession | null
): Promise<{ data: Array<{...}>; endLife: number }> {
  const featureRows = data.map(row => extractFeatures(row, TIRE_WEAR_FEATURES));

  if (session) {
    try {
      const flat = Float32Array.from(featureRows.flat());
      const tensor = new ort.Tensor('float32', flat, [featureRows.length, TIRE_WEAR_FEATURES.length]);
      const feeds: Record<string, ort.Tensor> = {};
      feeds[session.inputNames[0]] = tensor;
      const output = await session.run(feeds);
      const preds = output[session.outputNames[0]].data as Float32Array;
      // Process all N predictions
      const result: Array<{...}> = [];
      for (let i = 0; i < preds.length; i++) {
        const life = Math.max(0, Math.min(1, preds[i])) * 100;
        result.push({
          timestamp: data[i].timestamp || i * 16,
          life,
          wearRate: i > 0 ? result[i - 1].life - life : 0,
        });
      }
      return { data: result, endLife: result.length > 0 ? result[result.length - 1].life : 100 };
    } catch (err) {
      console.warn("Tire wear ONNX batch failed, using heuristic", err);
    }
  }
  // Heuristic fallback
  ...
}
```

Same pattern for `classifyGrip`, `classifyShifts`, and `classifyPedalOverlap`.

### 3b — Fix Silent Catch Blocks

**Problem**: `predictTireWear` line 100 catches per-row and pushes stale `life` data,
corrupting the entire wear timeline.

**Fix**: Move try/catch to the **function level** (wrapping the entire ONNX path)
rather than per-row. If ONNX fails at any point, fall back to the complete heuristic.

```typescript
if (session) {
  try {
    return await onnxBatchInfer(data, session);
  } catch (err) {
    console.warn("ONNX inference failed, falling back to heuristic", err);
    // Falls through to heuristic below
  }
}
// Heuristic: ...
```

### 3c — Add `modelsLoaded` Retry

**Problem**: `modelsLoaded = true` is sticky. A transient failure disables models forever.

**Fix**: Only set `modelsLoaded = true` if at least one model loaded.

```typescript
const anyLoaded = Object.values(modelStatus).some(s => s === 'loaded');
modelsLoaded = anyLoaded; // false if nothing loaded → can retry next ANALYZE_SESSION
```

### 3d — Differentiate Error Types

**Problem**: `modelStatus` only shows `loaded` / `not_found`.
CORS errors, corrupt files, and 404s all look identical.

**Fix**: Set `'error'` status (already in the type union) and log messages:

```typescript
.catch((err) => {
  modelStatus.grip = 'error';
  console.warn(`Grip model load failed: ${err.message}`);
})
```

Extend the UI to show an `orange` dot for `'error'` status (currently only green/grey).

---

## Phase 4: Algorithm Integrity Fixes

**Risk Before: MAJOR — Risk After: LOW**
**Estimate: 5 hours**

### 4a — Fix Safety Score Session-Length Dependency

**Problem**: `maxPenaltyFactor = max(1, data.length / 10)` makes the score vary with
session length. A 10-minute session at moderate aggression scores differently than
a 2-minute session with the same per-frame penalty rate.

**Fix**: Use per-frame penalty rate:

```typescript
const penaltyRate = totalPenalties / data.length;
const score = Math.max(0, Math.round(100 - penaltyRate * 400));
```

This makes the score independent of session length. The multiplier `400` (was `40 / 0.1`)
preserves the approximate scale.

### 4b — Fix Safety Double-Counting of Understeer

**Problem**: `understeerPlough > 0.5` penalizes both the safety score AND the grip score
for the same driving event.

**Fix**: Remove the understeer penalty from `computeSafetyScore()`. Understeer is a grip
limit phenomenon, not an independent safety violation. The grip score already reflects it.

```typescript
// Before: 5 penalty categories including Understeer
// After: 4 penalty categories (Jerk Spike, Pedal Overlap, Oversteer, Harsh Brake)
```

### 4c — Add Dedup Window to All Penalty Categories

**Problem**: Only "Jerk Spike" has a dedup window (3 frames). Sustained pedal overlap
or understeer flood the penalty counter on every frame.

**Fix**: Apply a `PENALTY_DEDUP = 10` frame window to all categories:

```typescript
const PENALTY_DEDUP = 10;
const lastFrame: Record<string, number> = {};
for (let i = 0; i < data.length; i++) {
  const row = data[i];
  const checks: Array<{ label: string; active: boolean }> = [
    { label: 'Jerk Spike', active: Math.abs(row.jerkX || 0) > 15 || Math.abs(row.jerkY || 0) > 10 },
    { label: 'Pedal Overlap', active: (row.pedalOverlap || 0) > 0.15 },
    // ...
  ];
  for (const check of checks) {
    if (check.active && (lastFrame[check.label] ?? -Infinity) < i - PENALTY_DEDUP) {
      penaltyCounts[check.label]++;
      lastFrame[check.label] = i;
    }
  }
}
```

### 4d — Fix Jerk Magnitude Throughout

**Problem**: `|jerkX| + |jerkY|` (L1 norm) is used instead of `sqrt(jerkX² + jerkY²)`
(Euclidean norm) in multiple places. L1 overweights co-linear events.

**Fix**: Use Euclidean norm everywhere:

```typescript
function jerkMagnitude(row: any): number {
  const x = row.jerkX || 0;
  const y = row.jerkY || 0;
  return Math.sqrt(x * x + y * y);
}
```

Affected locations:
- `detectFatigue` line 142
- Safety score line 203
- Anomaly detection line 610 (jerk comparison)
- `clusterStates` heuristic line 269

### 4e — Fix KNN Confidence Normalization

**Problem**: Hardcoded `25` denominator was chosen for PCA heuristic output range ([-2, 2]).
But when real PCA components are loaded, values can exceed 25 — producing clamped-to-zero
confidence scores.

**Fix**: Normalize by the actual observed distance range:

```typescript
const distances = ML_CONFIG.KNN_ARCHETYPES.map(a =>
  Math.sqrt((meanX - a.x) ** 2 + (meanY - a.y) ** 2)
);
const minDist = Math.min(...distances);
const maxDist = Math.max(...distances);
const knnConfidenceScore = maxDist > 0 ? Math.max(0, 1 - minDist / maxDist) : 1;
```

This bounds the score to [0, 1] regardless of input scale.

### 4f — Fix OLS Numerical Stability (Exit Forecast)

**Problem**: Cramer's rule with explicit determinant is numerically unstable when
`speed` and `throttle` are correlated (which they often are).

**Fix**: Replace with normal equations + ridge regularization (`λ = 0.1`):

```typescript
const n = exitX.length;
// Build design matrix with intercept: [1, speed, throttle]
const X = exitX.map(x => [1, x[0], x[1]]);
const y = exitY.map(y => y[0]);

// X^T * X
let XtX = [
  [n, 0, 0],
  [0, 0, 0],
  [0, 0, 0],
];
for (let i = 0; i < n; i++) {
  XtX[0][1] += X[i][1]; XtX[0][2] += X[i][2];
  XtX[1][0] += X[i][1]; XtX[1][1] += X[i][1] * X[i][1]; XtX[1][2] += X[i][1] * X[i][2];
  XtX[2][0] += X[i][2]; XtX[2][1] += X[i][2] * X[i][1]; XtX[2][2] += X[i][2] * X[i][2];
}

// Add ridge regularization
const lambda = 0.1;
for (let i = 0; i < 3; i++) XtX[i][i] += lambda;

// X^T * y
const Xty = [0, 0, 0];
for (let i = 0; i < n; i++) {
  Xty[0] += y[i];
  Xty[1] += X[i][1] * y[i];
  Xty[2] += X[i][2] * y[i];
}

// Solve 3×3 via Gaussian elimination with partial pivoting
function solve3(A: number[][], b: number[]): number[] { ... }
const [intercept, betaSpeed, betaThrottle] = solve3(XtX, Xty);
```

---

## Phase 5: Type Safety

**Risk Before: MINOR — Risk After: COSMETIC**
**Estimate: 1 hour**

### 5a — Remove `any` Casts

Target the 22 `any` casts in `mlWorker.ts`:

| Location | Current Type | Replace With |
|---|---|---|
| All `data` parameters | `any[]` | `Record<string, number>[]` or `TelemetryData[]` |
| `modelMetrics` | `Record<string, any>` | Typed interface matching `model_metrics.json` |
| `sessionArray` payload | `any[]` | `TelemetryData[]` (import from `telemetry.ts`) |
| `clusterProfiles.map((c: any` | `any` | `(c: { speed: number; steer: number; ... })` |

### 5b — Fix `MLResults` Interface

Add missing field to `MLAnalysis.tsx`:

```typescript
interface MLResults {
  pca: {
    data: Array<{ x: number; y: number; intensity: number; timestamp: number }>;
    profile: string;
    knnProfile?: string;  // ← ADD THIS, remove (results.pca as any).knnProfile
  };
  // ...
}
```

### 5c — Add Worker Output Validation

Add a runtime guard at the top of `runAnalysis` to validate the worker's output shape:

```typescript
workerRef.current.onmessage = (e) => {
  if (e.data.type === 'COMPLETE') {
    const r = e.data.results;
    const required = ['safetyScore', 'pca', 'anomalies', 'svm', 'rfWear', 'hmm',
                      'fatigue', 'grip', 'shifts', 'qualityMetrics'];
    for (const key of required) {
      if (!(key in r)) console.warn(`ML worker missing required field: ${key}`);
    }
    setResults(r => ({ ...r, ...r, isProcessing: false, progress: 100 }));
  }
};
```

---

## Effort Summary

| Phase | Scope | Files Touched | Hours | Risk Before | Risk After |
|---|---|---|---|---|---|
| 0: Feature Alignment | config.py, mlWorker.ts, train_model.py | 4 | 1 | CRITICAL | LOW |
| 1: UI Labels | MLAnalysis.tsx (strings only) | 1 | 2 | MAJOR | LOW |
| 2: Magic Numbers | New `src/ml-config.ts` + 2 files | 3 | 3 | MAJOR | LOW |
| 3: ONNX Batching + Errors | mlWorker.ts (4 functions) | 1 | 4 | MAJOR | LOW |
| 4: Algorithm Fixes | mlWorker.ts (6 fixes) | 1 | 5 | MAJOR | LOW |
| 5: Type Safety | mlWorker.ts + MLAnalysis.tsx | 2 | 1 | MINOR | COSMETIC |
| **Total** | | | **16** | | |

### Recommended Order

1. **Phase 0 first** — feature drift is the most dangerous bug (silent wrong results)
2. **Phase 3b/c/d next** — silent error swallowing masks all ONNX failures
3. **Phase 2 then Phase 1** — extract config first, then rename labels to match
4. **Phase 4 last** — algorithm integrity fixes are correctness improvements but lower risk
5. **Phase 5 any time** — type safety is low effort, low risk, can be done in parallel

### Verification

After each phase, run:
```bash
npx tsc -b          # TypeScript type check
npx vite build      # Frontend bundle
```

For Phase 0, also run the Python training pipeline:
```bash
cd ml-pipeline && python train_model.py
```
