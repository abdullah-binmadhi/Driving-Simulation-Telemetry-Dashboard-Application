# ML Pipeline Restructure Plan

> Complete restructuring of the Driving Telemetry ML analysis pipeline.
> Current state: two competing `self.onmessage` handlers, dead code, synthetic training data, no persistent learning.
> Target state: clean unified pipeline with proper offline training → ONNX inference flow.

---

## Table of Contents

1. [Current Architecture Problems](#1-current-architecture-problems)
2. [Target Architecture](#2-target-architecture)
3. [Phase 1: Codebase Cleanup](#3-phase-1-codebase-cleanup)
4. [Phase 2: Feature Alignment](#4-phase-2-feature-alignment)
5. [Phase 3: Offline Training Pipeline Fix](#5-phase-3-offline-training-pipeline-fix)
6. [Phase 4: Worker Restructure](#6-phase-4-worker-restructure)
7. [Phase 5: UI Feedback](#7-phase-5-ui-feedback)
8. [Phase 6: Validation & Testing](#8-phase-6-validation--testing)
9. [Implementation Timeline](#9-implementation-timeline)
10. [Risk Register](#10-risk-register)

---

## 1. Current Architecture Problems

### 1.1 Dead Code: Two Competing `self.onmessage` Handlers

**File:** `src/components/MLAnalysis/mlWorker.ts`

| Handler | Lines | Status | What It Does |
|---|---|---|---|
| `self.onmessage` #1 | 476–631 | **Dead code** — overwritten immediately | Uses pre-trained ONNX models from `loadModels()` |
| `self.onmessage` #2 | 695–1448 | **Actually runs** | Trains models from scratch on every CSV upload |

**Impact:** ~160 lines of unreachable code, confusing maintenance, duplicated logic.

**JavaScript hoisting note:** `import` statements at lines 672–679 ARE properly hoisted so the second handler can use them — but the coding style (imports at the bottom of the file) is misleading.

### 1.2 Dead Functions & Variables

These are defined at module scope but **never used** because handler #1 never runs:

| Symbol | Line | Purpose |
|---|---|---|
| `tireWearSession` | 403 | ONNX inference session (tire wear) |
| `gripSession` | 404 | ONNX inference session (grip) |
| `shiftSession` | 405 | ONNX inference session (shift) |
| `clusterCentroids` | 406 | Pre-trained K-Means centroids |
| `pcaComponents` | 407 | Pre-trained PCA components |
| `pcaMean` | 408 | Pre-trained PCA mean vector |
| `modelMetrics` | 409 | Training quality metrics JSON |
| `modelsLoaded` | 410 | Flag to avoid duplicate model loading |
| `resolveBaseUrl()` | 412–418 | URL resolution helper |
| `loadModels()` | 420–474 | Loads pre-trained artifacts |
| `predictTireWear()` | ~480 | ONNX tire wear inference |
| `detectFatigue()` | ~510 | Fatigue detection logic |
| `classifyGrip()` | ~530 | ONNX grip classification |
| `classifyShifts()` | ~550 | ONNX shift classification |
| `buildMarkovChain()` | 635 | Markov state transitions |
| `buildAggressionMatrix()` | 653 | Aggression quadrant analysis |

### 1.3 Feature Column Name Mismatch

**Problem:** Training (Python `config.py`) uses snake_case, runtime (`mlWorker.ts`) uses camelCase. The same features have different names across the two environments.

**`config.py` (Python — offline training):**
```python
TIRE_WEAR_FEATURES = [
    'speed', 'throttle', 'brake', 'steering',
    'gForceX', 'gForceY', 'jerk_x', 'jerk_y', 'pedal_overlap',
    'tire_temp_fl', 'tire_temp_fr', 'tire_temp_rl', 'tire_temp_rr',
    'tire_pressure_fl', 'tire_pressure_fr',
    'slip_angle_estimate', 'turn_radius',
    'is_coasting', 'is_braking', 'is_turning',
]
```

**`mlWorker.ts` (TypeScript — browser runtime):**
```ts
const TIRE_WEAR_FEATURES = [
  'speed', 'throttle', 'brake', 'steering',
  'gForceX', 'gForceY', 'jerkX', 'jerkY', 'pedalOverlap',
  'tireTempFL', 'tireTempFR', 'tireTempRL', 'tireTempRR',
  'tirePressureFL', 'tirePressureFR',
  'slipAngleEstimate', 'turnRadius',
  'isCoasting', 'isBraking', 'isTurning',
];
```

**Impact:** ONNX models are position-based (tensor dimensions), so column NAME mismatch doesn't break inference — but feature ORDER mismatch between training and inference would produce **silently garbage predictions**.

### 1.4 Empty Training Dataset

**Path:** `ml-pipeline/dataset/`

**Contents:** Empty. The original 5000-row CSV file(s) used to train the models in `public/models/` are missing.

**Impact:** The offline pipeline (`train_model.py`) cannot be re-run. Models cannot be retrained, improved, or extended.

### 1.5 Synthetic/Fake Training Data at Runtime

Several browser-trained models use artificial data, producing results that look plausible but have no real predictive value:

| Model | File:Line | Fake Data Source |
|---|---|---|
| KNN Driver Matching | `mlWorker.ts:1109–1118` | 8 hand-crafted synthetic "known driver" data points |
| Naive Bayes Shifts | `mlWorker.ts:1183` | Fake RPM formula: `4000 + ((speed * 10) % 3000)` |
| Safety Score MLR | `mlWorker.ts:803` | Circular — predicts penalties computed from the same input features |

### 1.6 Silent Fallbacks

ONNX model loading and npm ml-* operations use empty `catch` blocks. When models fail, the system silently falls back to heuristics with **no user notification**.

**Example patterns throughout `mlWorker.ts`:**
```ts
.catch(() => { /* model not trained yet */ })
.catch(() => {})
.catch(() => { console.warn("..."); })
```

### 1.7 `resolveBaseUrl()` Defined Twice

- Line 412: Module-level helper used by `loadModels()`
- Line 1060: Inline usage in the legacy handler's ONNX loading block

Only the second definition matters (handler #2 runs), but the first definition is dead code.

---

## 2. Target Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        PHASE A: OFFLINE TRAINING                          │
│                    (run once per dataset, developer-triggered)             │
│                                                                          │
│  ml-pipeline/dataset/                                                    │
│  ├── session_001.csv ◄──── Real telemetry CSV exports                    │
│  ├── session_002.csv        (exported from the app's CSV export)         │
│  └── session_003.csv                                                     │
│         │                                                                │
│         ▼                                                                │
│  train_model.py ◄────────── python ml-pipeline/train_model.py            │
│  │                                                                       │
│  ├── Trains 6 sklearn models on aggregated dataset                       │
│  ├── Exports to ONNX via skl2onnx                                        │
│  ├── Computes feature scalers (StandardScaler)                           │
│  └── Validates with train/test split                                     │
│         │                                                                │
│         ▼                                                                │
│  public/models/                                                          │
│  ├── tire_wear_model.onnx        (Random Forest Regressor)               │
│  ├── grip_model.onnx             (Decision Tree Classifier)              │
│  ├── shift_model.onnx            (Naive Bayes)                           │
│  ├── pca_profile.json            (PCA components + mean)                 │
│  ├── state_clusters.json         (K-Means centroids + scaler)            │
│  └── model_metrics.json          (All training metrics + timestamps)     │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
                              │
                              │ (served by web server via public/)
                              ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                    PHASE B: BROWSER INFERENCE                              │
│                  (runs per user CSV upload, user-triggered)               │
│                                                                          │
│  User CSV ──► Papa Parse ──► normalizeRow() ──► mlWorker.ts              │
│                                                                          │
│  mlWorker.ts (single self.onmessage handler)                              │
│  ┌──────────────────────────────────────────────────────────┐            │
│  │  1. loadModels() — load all ONNX models + JSON params    │            │
│  │  2. Feature extraction — map normalized columns to        │            │
│  │     training-order feature tensors using shared config    │            │
│  │  3. ONNX inference — tire_wear, grip, shift               │            │
│  │  4. PCA projection — apply pre-trained PCA to new data    │            │
│  │  5. K-Means assignment — nearest centroid per point       │            │
│  │  6. Heuristic calculations — anomalies, fatigue, DTW      │            │
│  │  7. Quality metrics — report pre-trained model scores      │            │
│  │     + per-run statistics                                   │            │
│  │  8. Post results back to main thread                      │            │
│  └──────────────────────────────────────────────────────────┘            │
│         │                                                                │
│         ▼                                                                │
│  MLAnalysis.tsx renders 15 visualization cards                           │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### 2.1 Key Architectural Changes

| Current | Target |
|---|---|
| Two competing `self.onmessage` handlers | Single clean handler |
| Dead code (~160 lines) | Zero dead code |
| Models trained from scratch per CSV | All models pre-trained, browser does inference only |
| Synthetic training data (KNN, Naive Bayes) | Real data from offline training pipeline |
| Feature names duplicated in two places | Single source of truth in `config.py` |
| Silent fallbacks with empty catches | User-visible model status indicators |

---

## 3. Phase 1: Codebase Cleanup

### 3.1 Remove All Dead Code from `mlWorker.ts`

**Action:** Delete the first `self.onmessage` handler and all associated dead code.

**Lines to delete:**
- Lines 401–410: Dead module-level variables (`tireWearSession`, `gripSession`, `shiftSession`, `clusterCentroids`, `pcaComponents`, `pcaMean`, `modelMetrics`, `modelsLoaded`) — these are unused because handler #1 never runs
- Lines 412–418: First `resolveBaseUrl()` definition (kept, move to top of file before imports — actually it can't be before imports, move it to just before the new single handler or keep it as a utility function)
- Lines 420–474: `loadModels()` function — replace with a new version that works for the single handler
- Lines 476–631: First `self.onmessage` handler — entire block
- Lines 633–690: `buildMarkovChain()`, `buildAggressionMatrix()`, `import` block — move imports to top of file

**After deletion, the file should have this structure:**

```ts
import * as ort from 'onnxruntime-web';
import ... from 'ml-*';  // Keep only what the inference path needs

// ─── Feature maps (single source, match config.py order exactly) ─────────

const TIRE_WEAR_FEATURES = [ ... ];   // Order MUST match train_model.py
const GRIP_FEATURES = [ ... ];         // Order MUST match train_model.py
const SHIFT_FEATURES = [ ... ];        // Order MUST match train_model.py
const CLUSTER_FEATURES = [ ... ];      // K-Means feature order
const PCA_FEATURES = [ ... ];          // PCA feature order

// ─── Utility ────────────────────────────────────────────────────────────

function resolveBaseUrl(basePath: string): string { ... }
function safeMean(arr: number[]): number { ... }
function safeStd(arr: number[]): number { ... }
function zNormalize(arr: number[]): number[] { ... }

// ─── Pre-trained model store ────────────────────────────────────────────

let tireWearSession: ort.InferenceSession | null = null;
let gripSession: ort.InferenceSession | null = null;
let shiftSession: ort.InferenceSession | null = null;
let pcaComponents: number[][] | null = null;
let pcaMean: number[] | null = null;
let clusterCentroids: number[][] | null = null;
let clusterScalerMean: number[] | null = null;
let clusterScalerStd: number[] | null = null;
let modelQuality: Record<string, any> | null = null;
let modelsLoaded = false;

// ─── Model loading ──────────────────────────────────────────────────────

async function loadModels(): Promise<void> { ... }

// ─── Inference functions ────────────────────────────────────────────────

function extractFeatures(row: any, featureNames: string[]): number[] { ... }
async function predictTireWear(features: number[][]): Promise<number[]> { ... }
async function classifyGrip(features: number[][]): Promise<string[]> { ... }
async function classifyShifts(features: number[][]): Promise<string[]> { ... }
function projectPCA(row: number[]): number[] { ... }
function assignCluster(row: number[]): number { ... }

// ─── Heuristic analysis ─────────────────────────────────────────────────

function detectAnomalies(data: any[]): AnomalyResult { ... }
function calcFatigue(data: any[]): FatigueResult { ... }
function calcDTWSimilarity(a: number[], b: number[]): number { ... }
function buildMarkovChain(states: number[]): number[][] { ... }

// ─── Main handler ───────────────────────────────────────────────────────

self.onmessage = async (e: MessageEvent) => {
  // Single handler — orchestrates all analysis
};
```

### 3.2 Remove Unused npm Dependencies

**Action:** Check which `ml-*` packages are no longer needed after switching to pure inference (no live training).

**Packages to evaluate:**

| Package | Currently Used For | Keep After Restructure? |
|---|---|---|
| `ml-kmeans` | Live K-Means training | ❌ Remove — use pre-trained centroids |
| `ml-pca` | Live PCA training | ❌ Remove — use pre-trained components |
| `ml-svm` | Live SVM training | ❌ Remove — use ONNX or remove feature |
| `ml-knn` | Live KNN on synthetic data | ❌ Remove — fake feature, remove entirely |
| `ml-random-forest` | Not used (ONNX handles RF) | ❌ Remove |
| `ml-logistic-regression` | Not used (ONNX handles it) | ❌ Remove |
| `ml-naivebayes` | Live Naive Bayes training | ❌ Remove — use ONNX |
| `ml-regression-multivariate-linear` | Live MLR training | ❌ Remove — use ONNX or heuristics |
| `ml-cart` | Live Decision Tree training | ❌ Remove — use ONNX |

**Remaining dependencies after cleanup:**
- `onnxruntime-web` — stays, primary inference engine
- `papaparse` — stays, CSV parsing (used in `MLAnalysis.tsx`, not in worker)

**Edit:** `package.json` — remove the 8 `ml-*` packages.

### 3.3 Delete Dead `resolveBaseUrl()` Duplicate

**Action:** Keep only the module-level `resolveBaseUrl()` and remove the inline redefinition.

**File:** `mlWorker.ts`

- Line 412–418: Keep this definition
- Line 1060: Change from `ort.env.wasm.wasmPaths = resolveBaseUrl('../assets/');` — this is still valid, just ensure it calls the module-level function

---

## 4. Phase 2: Feature Alignment

### 4.1 Normalize All Feature Names to snake_case

**Decision:** Use **camelCase** in the canonical schema (what `normalizeRow()` produces), and add a **feature mapping layer** that converts from canonical camelCase to the snake_case order expected by the ONNX models.

**`config.py` — Add feature order constants:**

```python
# These are the canonical camelCase column names that normalizeRow() produces.
# They are listed in the EXACT ORDER expected by the ONNX model tensors.

TIRE_WEAR_FEATURES = [
    'speed', 'throttle', 'brake', 'steering',
    'gForceX', 'gForceY', 'jerkX', 'jerkY', 'pedalOverlap',
    'tireTempFL', 'tireTempFR', 'tireTempRL', 'tireTempRR',
    'tirePressureFL', 'tirePressureFR',
    'slipAngleEstimate', 'turnRadius',
    'isCoasting', 'isBraking', 'isTurning',
]
```

**`mlWorker.ts` — Use matching order:**

```ts
const TIRE_WEAR_FEATURES = [
  'speed', 'throttle', 'brake', 'steering',
  'gForceX', 'gForceY', 'jerkX', 'jerkY', 'pedalOverlap',
  'tireTempFL', 'tireTempFR', 'tireTempRL', 'tireTempRR',
  'tirePressureFL', 'tirePressureFR',
  'slipAngleEstimate', 'turnRadius',
  'isCoasting', 'isBraking', 'isTurning',
];
```

**ONNX-aware feature extraction function:**

```ts
function extractFeatures(row: Record<string, number>, featureNames: string[], defaultValue = 0): Float32Array {
  return Float32Array.from(featureNames.map(name => row[name] ?? defaultValue));
}
```

### 4.2 Add Feature Order Validation

**`train_model.py` — At export time, embed the feature order into the model:**

```python
# Before ONNX export, save the exact feature order
feature_order = {name: idx for idx, name in enumerate(TIRE_WEAR_FEATURES)}
```

**`public/models/model_metadata.json` — New file to store feature order + scaler params:**

```json
{
  "models": {
    "tire_wear": {
      "features": ["speed", "throttle", "brake", ...],
      "input_shape": [1, 20],
      "output_type": "regression"
    },
    "grip": {
      "features": ["speed", "steering", ...],
      "input_shape": [1, 13]
    }
  },
  "feature_scalers": {
    "mean": [...],
    "std": [...]
  }
}
```

### 4.3 Update `MLAnalysis.tsx` `normalizeRow()` 

**File:** `src/components/MLAnalysis/MLAnalysis.tsx`, lines 122–177.

**Current:** Fuzzy-matches incoming CSV columns to a fixed camelCase schema.

**Action:** Add missing aliases for snake_case column names from `config.py`:

```ts
// Add these aliases to the existing map:
['jerkX', 'jerk_x',   'jerkX'],
['jerkY', 'jerk_y',   'jerkY'],
['tireTempFL', 'tire_temp_fl', 'tireTempFL'],
['tireTempFR', 'tire_temp_fr', 'tireTempFR'],
['tireTempRL', 'tire_temp_rl', 'tireTempRL'],
['tireTempRR', 'tire_temp_rr', 'tireTempRR'],
['tirePressureFL', 'tire_pressure_fl', 'tirePressureFL'],
['tirePressureFR', 'tire_pressure_fr', 'tirePressureFR'],
['slipAngleEstimate', 'slip_angle_estimate', 'slipAngleEstimate'],
['turnRadius', 'turn_radius', 'turnRadius'],
['pedalOverlap', 'pedal_overlap', 'pedalOverlap'],
```

---

## 5. Phase 3: Offline Training Pipeline Fix

### 5.1 Locate or Generate Training Data

**Option A (preferred):** Locate the original CSV files used to train the current models. Check:
- `ml-pipeline/dataset/` (currently empty — maybe in git history or backup)
- Search for `.csv` files exported from the app that contain all required feature columns
- Ask the user if they have exported sessions

**Option B (fallback):** Generate synthetic training data from the existing model metrics:
- `public/models/model_metrics.json` contains training statistics
- Use these to generate realistic synthetic data that reproduces the model behavior
- Script: `ml-pipeline/generate_synthetic_data.py`

**Option C (last resort):** Manually collect telemetry data:
- Run the driving simulator (BeamNG/Assetto Corsa) with the connection manager
- Export 5–10 sessions via the app's CSV export feature
- Place them in `ml-pipeline/dataset/`

### 5.2 Fix `train_model.py` to Export Feature Order

**File:** `ml-pipeline/train_model.py`

**Changes needed:**

```python
# After training each model, before ONNX export:
# 1. Save the exact feature list used in training order
with open(os.path.join(MODEL_OUTPUT_DIR, 'model_metadata.json'), 'w') as f:
    json.dump({
        'models': {
            'tire_wear': {
                'features': TIRE_WEAR_FEATURES,  # Already the canonical list
                'input_shape': ['N', len(TIRE_WEAR_FEATURES)],
                'type': 'regression',
            },
            # ... same for grip, shift, pca, cluster
        },
        'feature_scalers': {
            'mean': scaler.mean_.tolist() if hasattr(scaler, 'mean_') else None,
            'std': scaler.scale_.tolist() if hasattr(scaler, 'scale_') else None,
        }
    }, f, indent=2)

# 2. Fix save_onnx() to pass feature names in the initial_types
#    so the ONNX model encodes the expected input order
from skl2onnx import convert_sklearn
from skl2onnx.common.data_types import FloatTensorType

initial_type = [('float_input', FloatTensorType([None, len(features)]))]
onx = convert_sklearn(model, initial_types=initial_type, ...)
```

### 5.3 Add Train/Test Split to `train_model.py`

**Current:** `train_model.py` trains on all data (no validation split).

**Change:** Add proper train/test split:

```python
from sklearn.model_selection import train_test_split

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)
model.fit(X_train, y_train)

# Score on held-out test set
test_score = model.score(X_test, y_test)
```

### 5.4 Export Scaler Parameters

**Action:** Add `StandardScaler` parameters to the model export so the browser can apply the same normalization at inference time.

**`train_model.py`:**
```python
from sklearn.preprocessing import StandardScaler

scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)
# Save scaler
np.save(os.path.join(MODEL_OUTPUT_DIR, 'scaler_mean.npy'), scaler.mean_)
np.save(os.path.join(MODEL_OUTPUT_DIR, 'scaler_scale.npy'), scaler.scale_)
```

**Browser inference must apply the same scaling:**
```ts
function applyScaler(features: Float32Array): Float32Array {
  // Load mean and scale from the pretrained scaler
  const scaled = new Float32Array(features.length);
  for (let i = 0; i < features.length; i++) {
    scaled[i] = (features[i] - scalerMean[i]) / scalerScale[i];
  }
  return scaled;
}
```

---

## 6. Phase 4: Worker Restructure

### 6.1 New `mlWorker.ts` Architecture

**Complete new structure:**

```ts
// ─── 1. Imports ─────────────────────────────────────────────────────────
import * as ort from 'onnxruntime-web';

// ─── 2. Feature maps (order MUST match train_model.py) ──────────────────
const TIRE_WEAR_FEATURES = [ ... ];  // 20 features
const GRIP_FEATURES = [ ... ];        // 13 features
const SHIFT_FEATURES = [ ... ];       // 5 features
const PCA_FEATURES = [ ... ];         // 17 features
const CLUSTER_FEATURES = [ ... ];     // 11 features

// ─── 3. Model state (singleton, cached across runAnalysis calls) ────────
let modelsReady = false;
let modelLoadError: string | null = null;
const sessions: Map<string, ort.InferenceSession> = new Map();
let scalerMean: Float32Array | null = null;
let scalerScale: Float32Array | null = null;
let pcaData: { components: number[][]; mean: number[] } | null = null;
let clusterData: { centroids: number[][]; scalerMean: number[]; scalerScale: number[] } | null = null;
let modelMetrics: Record<string, any> | null = null;

// ─── 4. Model loading ───────────────────────────────────────────────────
async function loadModels(base: string): Promise<void> {
  if (modelsReady) return;
  modelLoadError = null;

  const wasmBase = resolveBaseUrl('../assets/');
  ort.env.wasm.wasmPaths = wasmBase;
  ort.env.wasm.numThreads = 1;

  const modelBase = resolveBaseUrl('../models/');

  const modelNames = ['tire_wear_model.onnx', 'grip_model.onnx', 'shift_model.onnx'];
  const loadPromises = modelNames.map(async (name) => {
    try {
      const session = await ort.InferenceSession.create(modelBase + name);
      sessions.set(name, session);
    } catch (e) {
      console.warn(`Failed to load ${name}:`, e);
    }
  });

  // Load JSON params
  const jsonFiles = ['state_clusters.json', 'pca_profile.json', 'model_metrics.json'];
  const jsonPromises = jsonFiles.map(async (name) => {
    try {
      const resp = await fetch(modelBase + name);
      const data = await resp.json();
      if (name === 'state_clusters.json') {
        clusterData = {
          centroids: data.centroids,
          scalerMean: data.scaler_mean || null,
          scalerScale: data.scaler_scale || null,
        };
      } else if (name === 'pca_profile.json') {
        pcaData = { components: data.components, mean: data.mean };
      } else if (name === 'model_metrics.json') {
        modelMetrics = data;
      }
    } catch (e) {
      console.warn(`Failed to load ${name}:`, e);
    }
  });

  await Promise.all([...loadPromises, ...jsonPromises]);
  modelsReady = true;
}

// ─── 5. Inference helpers ───────────────────────────────────────────────
function extractFeatureVector(row: Record<string, any>, features: string[]): Float32Array {
  return Float32Array.from(features.map(f => row[f] ?? 0));
}

function applyScaler(vec: Float32Array, mean: Float32Array | null, scale: Float32Array | null): Float32Array {
  if (!mean || !scale) return vec;
  const out = new Float32Array(vec.length);
  for (let i = 0; i < vec.length; i++) {
    out[i] = scale[i] !== 0 ? (vec[i] - mean[i]) / scale[i] : 0;
  }
  return out;
}

async function inferONNX(
  name: string,
  inputTensor: ort.Tensor,
): Promise<Float32Array | null> {
  const session = sessions.get(name);
  if (!session) return null;
  try {
    const feeds: Record<string, ort.Tensor> = {};
    feeds[session.inputNames[0]] = inputTensor;
    const output = await session.run(feeds);
    const outputName = session.outputNames[0];
    return output[outputName].data as Float32Array;
  } catch (e) {
    console.warn(`ONNX inference error for ${name}:`, e);
    return null;
  }
}

function projectPCA(row: number[]): { x: number; y: number } {
  if (!pcaData || !pcaData.components) return { x: 0, y: 0 };
  const centered = row.map((v, i) => v - (pcaData!.mean[i] || 0));
  const pc1 = centered.reduce((sum, v, i) => sum + v * (pcaData!.components[0]?.[i] || 0), 0);
  const pc2 = centered.reduce((sum, v, i) => sum + v * (pcaData!.components[1]?.[i] || 0), 0);
  return { x: pc1, y: pc2 };
}

function nearestCluster(row: number[]): { cluster: number; distance: number } {
  if (!clusterData) return { cluster: 0, distance: 0 };
  const scaled = applyScaler(
    Float32Array.from(row),
    clusterData.scalerMean ? Float32Array.from(clusterData.scalerMean) : null,
    clusterData.scalerScale ? Float32Array.from(clusterData.scalerScale) : null,
  );
  let minDist = Infinity;
  let bestCluster = 0;
  for (let c = 0; c < clusterData.centroids.length; c++) {
    const centroid = clusterData.centroids[c];
    let dist = 0;
    for (let i = 0; i < scaled.length && i < centroid.length; i++) {
      const diff = scaled[i] - centroid[i];
      dist += diff * diff;
    }
    if (dist < minDist) {
      minDist = dist;
      bestCluster = c;
    }
  }
  return { cluster: bestCluster, distance: Math.sqrt(minDist) };
}

// ─── 6. Heuristic analysis functions ────────────────────────────────────
function detectAnomalies(data: any[]): AnomalyResult { ... }
function calcFatigue(speeds: number[], durations: number[]): FatigueResult { ... }
function calcDTW(a: number[], b: number[]): number { ... }
function buildMarkovChain(states: number[]): number[][] { ... }
function computeAggression(speeds: number[], gforces: number[]): AggressionResult { ... }

// ─── 7. Safety and driving metrics ──────────────────────────────────────
function computeSafetyScore(data: any[]): { score: number; penalties: PenaltyBreakdown } { ... }
function calcBrakingTechnique(data: any[]): { trailBrakePct: number; stabBrakePct: number } { ... }
function calcConsistency(data: any[]): number { ... }

// ─── 8. Single main handler ─────────────────────────────────────────────
self.onmessage = async (e: MessageEvent) => {
  if (e.data.type !== 'ANALYZE_SESSION') return;

  const sessionArray: any[] = e.data.payload?.sessionArray || [];
  if (sessionArray.length < 50) {
    self.postMessage({ type: 'ERROR', message: 'Need at least 50 data points.' });
    return;
  }

  try {
    await loadModels(resolveBaseUrl('../models/'));
    
    const report = (pct: number) => self.postMessage({ type: 'PROGRESS', progress: pct });

    // Step 1: Extract feature matrices for each model
    report(5);
    const wearFeatures = sessionArray.map(r => extractFeatureVector(r, TIRE_WEAR_FEATURES));
    const gripFeatures = sessionArray.map(r => extractFeatureVector(r, GRIP_FEATURES));
    const shiftFeatures = sessionArray.map(r => extractFeatureVector(r, SHIFT_FEATURES));
    const pcaFeatures = sessionArray.map(r => extractFeatureVector(r, PCA_FEATURES));
    const clusterFeatures = sessionArray.map(r => extractFeatureVector(r, CLUSTER_FEATURES));

    // Step 2: ONNX inference (parallel where possible)
    report(15);
    
    // Tire wear inference
    let tireWearResults: Float32Array | null = null;
    if (wearFeatures.length > 0 && sessions.has('tire_wear_model.onnx')) {
      const flatTensor = new ort.Tensor('float32', flatten(wearFeatures), [wearFeatures.length, TIRE_WEAR_FEATURES.length]);
      tireWearResults = await inferONNX('tire_wear_model.onnx', flatTensor);
    }

    report(30);

    // Grip classification
    let gripResults: Float32Array | null = null;
    if (gripFeatures.length > 0 && sessions.has('grip_model.onnx')) {
      const flatTensor = new ort.Tensor('float32', flatten(gripFeatures), [gripFeatures.length, GRIP_FEATURES.length]);
      gripResults = await inferONNX('grip_model.onnx', flatTensor);
    }

    report(45);

    // Shift classification
    let shiftResults: Float32Array | null = null;
    if (shiftFeatures.length > 0 && sessions.has('shift_model.onnx')) {
      const flatTensor = new ort.Tensor('float32', flatten(shiftFeatures), [shiftFeatures.length, SHIFT_FEATURES.length]);
      shiftResults = await inferONNX('shift_model.onnx', flatTensor);
    }

    report(55);

    // Step 3: Analytical projections
    report(65);
    const pcaProjections = sessionArray.map(r => projectPCA(Object.values(r)));
    const clusterAssignments = sessionArray.map(r => nearestCluster(Object.values(r)));

    // Step 4: Heuristic analyses
    report(75);
    const anomalies = detectAnomalies(sessionArray);
    const fatigue = calcFatigue(...);
    const consistency = calcConsistency(sessionArray);
    const brakingTech = calcBrakingTechnique(sessionArray);
    const markovChain = buildMarkovChain(clusterAssignments.map(c => c.cluster));
    const aggression = computeAggression(...);
    const safety = computeSafetyScore(sessionArray);

    report(90);

    // Step 5: Compile results
    const results: MLResults = {
      safetyScore: { score: safety.score, penalties: safety.penalties },
      anomalies,
      fatigue,
      consistency,
      brakingTech,
      grip: {
        understeerCount: countOccurrences(gripResults, 0),
        oversteerCount: countOccurrences(gripResults, 1),
        gripPercentage: gripResults ? /* compute from counts */ : null,
      },
      shifts: {
        early: countOccurrences(shiftResults, 0),
        optimal: countOccurrences(shiftResults, 1),
        late: countOccurrences(shiftResults, 2),
      },
      rfWear: {
        predictions: tireWearResults ? Array.from(tireWearResults) : [],
        tireLife: computeTireLife(tireWearResults),
      },
      pca: { points: pcaProjections, profileLabel: classifyProfile(pcaProjections) },
      hmm: {
        states: clusterAssignments,
        statePercentages: computeStatePercentages(clusterAssignments),
      },
      markov: markovChain,
      aggression,
      qualityMetrics: {
        modelsLoaded: sessions.size,
        modelsAttempted: 3,
        pcaVariance: modelMetrics?.pca_variance ?? null,
        silhouetteScore: modelMetrics?.silhouette ?? null,
        rfTrainingR2: modelMetrics?.tire_wear_r2 ?? null,
        gripAccuracy: modelMetrics?.grip_accuracy ?? null,
        shiftAccuracy: modelMetrics?.shift_accuracy ?? null,
      },
    };

    self.postMessage({ type: 'COMPLETE', results });

  } catch (error: any) {
    self.postMessage({ type: 'ERROR', message: error.message });
  }
};

// ─── 9. Helper utilities ────────────────────────────────────────────────
function flatten(arrays: Float32Array[]): number[] {
  const result: number[] = [];
  for (const arr of arrays) result.push(...Array.from(arr));
  return result;
}

function countOccurrences(data: Float32Array | null, value: number): number {
  if (!data) return 0;
  return Array.from(data).filter(v => Math.round(v) === value).length;
}
```

### 6.2 Remove Live Training Imports

**Action:** Strip all npm `ml-*` library imports from the worker.

**Lines 672–679 to remove:**
```ts
import KMeans from 'ml-kmeans';
import { PCA } from 'ml-pca';
import MultivariateLinearRegression from 'ml-regression-multivariate-linear';
import SVM from 'ml-svm';
import KNN from 'ml-knn';
import GaussianNB from 'ml-naivebayes';
import DecisionTreeClassifier from 'ml-cart';
```

### 6.3 Remove Synthetic Training Code Blocks

**Lines to delete from the legacy handler:**

| Lines | What | Why |
|---|---|---|
| 795–830 | MLR safety score training | Replace with heuristic + pre-trained ONNX |
| 832–870 | PCA training | Replace with pre-trained PCA projection |
| 899–920 | SVM pedal overlap training | Replace with heuristic ratio calculation |
| 921–960 | K-Means training | Replace with pre-trained centroid assignment |
| 1095–1140 | KNN driver matching | **Remove entirely** — fake feature |
| 1145–1180 | Decision tree grip training | Replace with ONNX grip inference |
| 1180–1210 | Naive Bayes shift training | Replace with ONNX shift inference |
| 1210–1230 | MLR corner exit | Replace with heuristic |
| 1240–1270 | Decision tree braking | Replace with rule-based heuristic |

### 6.4 Update `package.json` Dependencies

**Edit:** `package.json`

**Remove these dependencies:**
```json
"ml-kmeans": "^7.0.0",
"ml-knn": "^3.0.0",
"ml-logistic-regression": "^2.0.0",
"ml-naivebayes": "^4.0.0",
"ml-pca": "^4.1.1",
"ml-random-forest": "^2.1.0",
"ml-regression-multivariate-linear": "^2.0.4",
"ml-svm": "^2.1.2",
```

**Result:** Only `onnxruntime-web`, `papaparse`, `react`, `recharts`, `zustand`, `better-sqlite3`, `clsx`, `lucide-react`, `express`, `ws` remain.

---

## 7. Phase 5: UI Feedback

### 7.1 Add Model Status Indicator to `MLAnalysis.tsx`

**Current:** The user has no way to know which models loaded successfully and which fell back.

**Add to the `MLResults` type:**
```ts
interface MLResults {
  // ... existing fields
  modelStatus: {
    tireWear: 'loaded' | 'fallback' | 'error';
    grip: 'loaded' | 'fallback' | 'error';
    shift: 'loaded' | 'fallback' | 'error';
    pca: 'loaded' | 'fallback' | 'error';
    cluster: 'loaded' | 'fallback' | 'error';
  };
}
```

**Add a "Model Status" card in the results UI:**
```tsx
{results.modelStatus && (
  <ModelStatusCard status={results.modelStatus} quality={results.qualityMetrics} />
)}
```

### 7.2 Add Worker Status Messages

**Current:** Worker sends `{ type: 'PROGRESS', progress }` — a single number from 0–100.

**Enhance to include a status label:**
```ts
self.postMessage({
  type: 'PROGRESS',
  progress: 15,
  status: 'Loading ONNX models...',
});

self.postMessage({
  type: 'PROGRESS',
  progress: 30,
  status: 'Running tire wear inference...',
});
```

**In `MLAnalysis.tsx`, display the status text next to the progress bar:**
```tsx
{progress > 0 && (
  <div className="space-y-2">
    <ProgressBar value={progress} />
    <p className="text-sm text-muted-foreground">{statusText}</p>
  </div>
)}
```

### 7.3 Add Model Quality Panel

**Add a collapsible panel showing training quality metrics from `model_metrics.json`:**

```tsx
<details>
  <summary>Model Quality Metrics</summary>
  <table>
    <tr><td>Tire Wear (R²)</td><td>{metrics.rfTrainingR2 ?? 'N/A'}</td></tr>
    <tr><td>Grip (Accuracy)</td><td>{metrics.gripAccuracy ?? 'N/A'}</td></tr>
    <tr><td>Shifts (Accuracy)</td><td>{metrics.shiftAccuracy ?? 'N/A'}</td></tr>
    <tr><td>PCA Variance</td><td>{metrics.pcaVariance ?? 'N/A'}</td></tr>
    <tr><td>Clustering (Silhouette)</td><td>{metrics.silhouetteScore ?? 'N/A'}</td></tr>
  </table>
</details>
```

---

## 8. Phase 6: Validation & Testing

### 8.1 TypeScript Compilation

After all changes, run:
```bash
npx tsc --noEmit
```

Expected: zero errors. If any type errors arise from the new `Results` interface, fix them.

### 8.2 Vite Build

```bash
npx vite build
```

Expected: worker bundle size should **decrease** significantly (removing 8 ml-* packages).
Target: from ~584 KB to under ~300 KB.

### 8.3 ONNX Model Validation

Create a validation script that:
1. Loads each ONNX model
2. Runs it with a known input
3. Checks that output shape and type are as expected

```bash
python ml-pipeline/validate_models.py
```

### 8.4 Browser Smoke Test

1. Start dev server: `npm run dev:ui`
2. Upload a known CSV with ~100 rows
3. Verify all 15 result cards render
4. Check the console for any errors or warnings
5. Verify that model status shows "loaded" for available ONNX models
6. Verify that tire wear, grip, and shift predictions produce realistic values

### 8.5 Edge Case Tests

| Test Case | Expected Behavior |
|---|---|
| Upload CSV with < 50 rows | Error message: "Need at least 50 data points" |
| Upload CSV with missing columns | Missing features filled with 0, fallback heuristics used |
| Upload CSV with extra columns | Extra columns ignored |
| Upload CSV with all zero values | Predictions should not crash (handle NaN/Infinity) |
| Run without any ONNX models in `public/models/` | All models show "fallback" status, heuristic results used |
| Run twice with same CSV | Results should be identical (deterministic) |

### 8.6 Cross-Session Consistency Test

Upload the same CSV file 3 times. Results should be:
- **Identical** for ONNX-based predictions (tire wear, grip, shift) — deterministic
- **Identical** for PCA projections — pre-trained, no randomness
- **Identical** for cluster assignments — nearest-centroid, deterministic
- **Same distribution** for heuristics (anomalies, fatigue) — should be consistent

---

## 9. Implementation Timeline

| Phase | Task | Effort | Dependencies |
|---|---|---|---|
| **1** | Remove dead code from mlWorker.ts | 1 hour | None |
| **1** | Remove unused npm packages | 15 min | Phase 1 code cleanup |
| **2** | Align feature names (config.py + mlWorker.ts) | 1 hour | Phase 1 |
| **2** | Add feature extraction helper | 30 min | Phase 2 |
| **3** | Find/add training data to dataset/ | 2 hours | User input |
| **3** | Fix train_model.py (scaler, test split, metadata) | 2 hours | Phase 3 training data |
| **3** | Re-train and export all models | 30 min | Phase 3 fixes |
| **4** | Write new mlWorker.ts (single handler) | 4 hours | Phase 1–3 |
| **4** | Remove live training code blocks | 2 hours | Phase 4 |
| **5** | Add model status to MLAnalysis.tsx | 1 hour | Phase 4 |
| **5** | Add progress status text | 30 min | Phase 4 |
| **5** | Add quality metrics panel | 1 hour | Phase 4 |
| **6** | TypeScript and Vite build verification | 30 min | Phase 4–5 |
| **6** | ONNX model validation | 1 hour | Phase 3 |
| **6** | Browser smoke tests | 1 hour | Phase 4–5 |
| **6** | Edge case tests | 1 hour | Phase 6 |

**Estimated total: ~18 hours**

---

## 10. Risk Register

| Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|
| Missing training data | High — cannot retrain models | High | Search git history, generate synthetic data, collect fresh sessions |
| ONNX model input order mismatch | High — silent garbage predictions | Medium | Add feature order validation + `model_metadata.json` |
| Removing ml-* packages breaks code not fully analyzed | Medium | Medium | After removal, run tsc — `noUnusedLocals` will catch |
| PCA/clustering components from old training don't match new data | Medium — poor driver profiles | Medium | Periodic retraining as more data is collected |
| Electron file:// protocol breaks model loading again | High — app shows no ML results | Low | `resolveBaseUrl()` already handles this |
| Large ONNX models cause slow page load | Medium — poor UX | Low | 26MB wasm is already loaded; ONNX models are ~1.4MB total |
| Heuristic fallbacks produce different results than ONNX | Medium — inconsistent UX | Medium | Document the difference in the model status panel |

---

## Appendix A: Files Changed Summary

| File | Change Type | Description |
|---|---|---|
| `src/components/MLAnalysis/mlWorker.ts` | **Rewrite** | Single handler, no live training, ONNX-only inference |
| `src/components/MLAnalysis/MLAnalysis.tsx` | **Edit** | Add model status indicator, progress text |
| `ml-pipeline/train_model.py` | **Edit** | Add train/test split, scaler export, metadata |
| `ml-pipeline/config.py` | **Edit** | Standardize camelCase feature names |
| `ml-pipeline/dataset/` | **Add files** | Training CSV data |
| `public/models/model_metadata.json` | **New file** | Feature order + scaler params |
| `ml-pipeline/validate_models.py` | **New file** | ONNX model validation script |
| `package.json` | **Edit** | Remove 8 ml-* packages |
| `docs/ML-PIPELINE-RESTRUCTURE-PLAN.md` | **New file** | This document |

## Appendix B: `MLResults` Type Definition (Full)

```ts
interface MLResults {
  safetyScore: {
    score: number;
    penalties: {
      harshBraking: number;
      harshAcceleration: number;
      oversteer: number;
      speeding: number;
    };
  };
  anomalies: Array<{
    timestamp: number;
    speed: number;
    isAnomaly: boolean;
    jerk: number;
    type: string;
  }>;
  pca: {
    points: Array<{ x: number; y: number }>;
    profileLabel: string;
  };
  svm: { overlapPercentage: number; overlapEvents: number };
  rfWear: {
    predictions: number[];
    tireLife: Array<{ t: number; life: number }>;
  };
  hmm: {
    states: Array<{ cluster: number; distance: number }>;
    statePercentages: Record<string, number>;
  };
  fatigue: { score: number; coefficient: number; timeline: number[] };
  grip: { understeerCount: number; oversteerCount: number; gripPercentage: number | null };
  shifts: { early: number; optimal: number; late: number };
  exitForecast: { coefficients: number[] };
  consistency: number;
  brakingTech: { trailBrakePct: number; stabBrakePct: number };
  markov: number[][];
  aggression: Array<{ speed: number; gForce: number; quadrant: string }>;
  qualityMetrics: {
    modelsLoaded: number;
    modelsAttempted: number;
    pcaVariance: number | null;
    silhouetteScore: number | null;
    rfTrainingR2: number | null;
    gripAccuracy: number | null;
    shiftAccuracy: number | null;
  };
  modelStatus: {
    tireWear: 'loaded' | 'fallback' | 'error';
    grip: 'loaded' | 'fallback' | 'error';
    shift: 'loaded' | 'fallback' | 'error';
    pca: 'loaded' | 'fallback' | 'error';
    cluster: 'loaded' | 'fallback' | 'error';
  };
}
```

## Appendix C: Feature Map Cross-Reference

| canonical (camelCase) | config.py (snake_case) | CSV aliases | Used By |
|---|---|---|---|
| `speed` | `speed` | speed, velocity, kph, kmh | All models |
| `throttle` | `throttle` | throttle, gas, accelerator | All models |
| `brake` | `brake` | brake, brake_position | All models |
| `steering` | `steering` | steering, steer, wheel | All models |
| `gForceX` | `gForceX` | gForceX, g_force_x, accel_x | Tire, Grip, PCA |
| `gForceY` | `gForceY` | gForceY, g_force_y, accel_y | Tire, Grip, PCA |
| `jerkX` | `jerk_x` | jerkX, jerk_x, jerkX_mps3 | Tire |
| `jerkY` | `jerk_y` | jerkY, jerk_y, jerkY_mps3 | Tire |
| `pedalOverlap` | `pedal_overlap` | pedalOverlap, pedal_overlap, overlap | Tire, SVM |
| `tireTempFL` | `tire_temp_fl` | tireTempFL, tire_temp_fl, temp_fl | Tire, Grip |
| `tireTempFR` | `tire_temp_fr` | tireTempFR, tire_temp_fr, temp_fr | Tire, Grip |
| `tireTempRL` | `tire_temp_rl` | tireTempRL, tire_temp_rl, temp_rl | Tire |
| `tireTempRR` | `tire_temp_rr` | tireTempRR, tire_temp_rr, temp_rr | Tire |
| `tirePressureFL` | `tire_pressure_fl` | tirePressureFL, tire_pressure_fl, pressure_fl | Tire |
| `tirePressureFR` | `tire_pressure_fr` | tirePressureFR, tire_pressure_fr, pressure_fr | Tire |
| `slipAngleEstimate` | `slip_angle_estimate` | slipAngleEstimate, slip_angle, slipAngle | Tire, Grip |
| `turnRadius` | `turn_radius` | turnRadius, turn_radius, radius | Tire, Grip |
| `isCoasting` | `is_coasting` | isCoasting, coasting, is_coasting | Tire |
| `isBraking` | `is_braking` | isBraking, braking, is_braking | Tire |
| `isTurning` | `is_turning` | isTurning, turning, is_turning | Tire, Grip |
| `yawRate` | `yaw_rate` | yawRate, yaw_rate, yaw | Grip |
| `gforceCombined` | `gforce_combined` | gforceCombined, gforce_combined, combined_g | Grip |
| `steeringDelta` | `steering_delta` | steeringDelta, steering_delta, steer_delta | Grip |
| `rpm` | `rpm` | rpm, engine_rpm, RPM | Shifts |
| `gear` | `gear` | gear, current_gear | Shifts |
| `clutch` | `clutch` | clutch, clutch_position | Shifts |
| `timestamp` | `timestamp` | timestamp, time, t, ts | All (index) |

---

*Plan generated: May 2026*
*Target commit: single atomic PR with phases 1–6*
