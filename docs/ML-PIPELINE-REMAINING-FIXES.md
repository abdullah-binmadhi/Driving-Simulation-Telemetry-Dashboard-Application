# Remaining ML Pipeline Fixes

Six known algorithmic bugs remain after the Phase 0–5 refactoring. This document details the root cause, exact location, and corrective action for each.

---

## Fix 1: State Clustering Normalization Mismatch

### Root Cause
- **Python** (`train_model.py` lines 306–307): K-Means training applies `StandardScaler` (Z-score: `(x - μ) / σ`) before clustering.
- **TypeScript** (`mlWorker.ts` line 245): Inference uses L2-magnitude normalization (`v / ‖v‖₂`).
- The centroids in `state_clusters.json` are Z-score-scaled, but TS never loads `scaler_mean`/`scaler_scale` from the JSON.

### Location
`mlWorker.ts:239–259` — `clusterStates()` centroid path

### Fix

**a) Load scaler params alongside centroids**

In `mlWorker.ts`, update the `state_clusters` JSON loader to also capture scaler parameters:

```typescript
// Around line 466-473, change from:
jsonPromises.push(
  fetch(base + 'state_clusters.json')
    .then(r => r.json())
    .then(j => {
      clusterCentroids = j.centroids || null;
      modelStatus.state_clusters = 'loaded';
    })
    .catch(...)
);

// To:
let clusterScalerMean: number[] | null = null;
let clusterScalerScale: number[] | null = null;

jsonPromises.push(
  fetch(base + 'state_clusters.json')
    .then(r => r.json())
    .then(j => {
      clusterCentroids = j.centroids || null;
      clusterScalerMean = j.scaler_mean || null;
      clusterScalerScale = j.scaler_scale || null;
      modelStatus.state_clusters = 'loaded';
    })
    .catch(...)
);
```

**b) Replace L2 normalization with Z-score normalization**

In `mlWorker.ts:239–259`, replace the L2-magnitude path with a proper Z-score transform using the loaded scaler params:

```typescript
if (centroids && centroids.length === 4 && clusterScalerMean && clusterScalerScale) {
  for (const row of data) {
    const features = extractFeatures(row, HMM_FEATURES);
    // Z-score normalization matching Python's StandardScaler
    const normalized = features.map((v, i) => {
      const mean = clusterScalerMean![i] || 0;
      const scale = clusterScalerScale![i] || 1;
      return scale > 0 ? (v - mean) / scale : 0;
    });

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
    // ...
  }
}
```

**c) Fallback guard** — if `clusterScalerMean`/`clusterScalerScale` are null, fall through to the heuristic path (existing behavior on lines 260–276).

### Verification
- After fix, a frame with `speed=80, throttle=0.5, gear=2` should assign the same cluster in both Python (`train_model.py`) and TypeScript (`mlWorker.ts`).

---

## Fix 2: PCA Normalization Mismatch

### Root Cause
- **Python** (`train_model.py` lines 340–342): PCA is fit on `StandardScaler`-transformed data (Z-score).
- **TypeScript** (`mlWorker.ts` line 297): Only mean-centering is done: `centered = features - pcaMean`. The `pca_mean` in `pca_profile.json` is PCA's internal `mean_`, which is the mean of the *Z-scored* data (≈ 0 for all features, see `pca_profile.json` lines 43–60 — all ~1e-16). This means the TS code is effectively projecting **raw (unscaled) data** through components trained on scaled data.
- The saved `scaler_mean` and `scaler_scale` arrays (lines 84–121) are never loaded or used.

### Location
`mlWorker.ts:288–322` — `projectPCA()`

### Fix

**a) Load PCA scaler params alongside components**

In the `pca_profile.json` loader (around line 474–483), add:

```typescript
let pcaScalerMean: number[] | null = null;
let pcaScalerScale: number[] | null = null;

jsonPromises.push(
  fetch(base + 'pca_profile.json')
    .then(r => r.json())
    .then(j => {
      pcaComponents = j.components || null;
      pcaMean = j.mean || null;
      pcaScalerMean = j.scaler_mean || null;
      pcaScalerScale = j.scaler_scale || null;
      modelStatus.pca_profile = 'loaded';
    })
    .catch(...)
);
```

**b) Apply Z-score normalization before PCA projection**

Replace lines 296–300:

```typescript
if (components && components.length >= 2 && mean && pcaScalerMean && pcaScalerScale) {
  for (const row of data) {
    const features = extractFeatures(row, PCA_FEATURES);
    // Z-score normalize to match Python training
    const normalized = features.map((v, i) => {
      const m = mean[i] || 0;
      const s = (pcaScalerScale![i] || 1);
      const z = (v - (pcaScalerMean![i] || 0)) / (s > 0 ? s : 1);
      return z;
    });
    const pc1 = components[0].reduce((s, c, i) => s + c * normalized[i], 0);
    const pc2 = components[1].reduce((s, c, i) => s + c * normalized[i], 0);
    result.push({
      x: pc1,
      y: pc2,
      intensity: Math.sqrt(pc1 ** 2 + pc2 ** 2),
      timestamp: row.timestamp || 0,
    });
  }
}
```

Note: The `mean` from the JSON (`pca.mean_`) is no longer used directly — the Z-score normalization replaces it. Keep `mean` in the loader for backward compatibility but the projection no longer needs it.

### Verification
- A Python-trained PCA on a dataset should produce the exact same PC1/PC2 for the same input row as the fixed TypeScript path.

---

## Fix 3: Pedal Overlap ONNX Never Used

### Root Cause
- **Python** (`train_model.py` lines 393–419): The SVM for pedal overlap is trained but `save_onnx()` is never called. The SVM is not exportable via `skl2onnx` directly; SVC with RBF kernel requires ONNX conversion via `convert_sklearn` but `skl2onnx` support for `SVC` with RBF kernel is limited.
- **TypeScript** (`mlWorker.ts` line 662): `classifyPedalOverlap(validData, null)` — `null` is always passed as the session parameter.

### Location
- `train_model.py:392–419` — missing ONNX export
- `mlWorker.ts:372–405` — `classifyPedalOverlap()` dead code path
- `mlWorker.ts:409–411` — no pedal session variable

### Fix

Three possible approaches, listed in order of preference:

#### Option A (Recommended): Export Pedal SVM → ONNX

Replace the SVC with a scikit-learn pipeline that is ONNX-exportable. `skl2onnx` supports `SVC` with RBF kernel, but the SVM output type handling requires care.

In `train_model.py:407`, change:

```python
svm = SVC(kernel='rbf', C=1.0, random_state=42, probability=True)
svm.fit(X_tr_s, y_tr)
```

Then add after line 415:

```python
# Convert to ONNX — use probability output for thresholding
try:
    from skl2onnx.common.data_types import FloatTensorType
    initial_type = [('float_input', FloatTensorType([None, len(available_pedal_features)]))]
    onnx_model = convert_sklearn(svm, initial_types=initial_type)
    out_path = os.path.join(MODEL_OUTPUT_DIR, 'pedal_overlap_model.onnx')
    with open(out_path, "wb") as f:
        f.write(onnx_model.SerializeToString())
    print(f"  ✓ Saved pedal_overlap_model.onnx")
except Exception as e:
    print(f"  ✗ Pedal ONNX conversion failed (heuristic fallback will be used): {e}")
```

In `mlWorker.ts`, add a pedal session variable and model loader:

```typescript
// Around line 411
let pedalSession: ort.InferenceSession | null = null;

// In loadModels(), add:
onnxPromises.push(
  ort.InferenceSession.create(base + 'pedal_overlap_model.onnx')
    .then(s => { pedalSession = s; modelStatus.pedal_overlap = 'loaded'; })
    .catch((err) => { modelStatus.pedal_overlap = 'error'; console.warn('Pedal overlap model load failed:', err.message); })
);

// Add to modelStatus (line 420):
// pedal_overlap: 'not_found',

// Change line 662 from:
const svm = await classifyPedalOverlap(validData, null);
// To:
const svm = await classifyPedalOverlap(validData, pedalSession);
```

#### Option B (Simpler): Remove the `session` parameter entirely

If ONNX conversion of the SVM is unreliable, remove the `session` parameter from `classifyPedalOverlap()` and the ONNX inference block, keeping only the heuristic (which uses `row.pedalOverlap > 0.03`). The function signature becomes `classifyPedalOverlap(data)`.

#### Option C (Minimal): Remove the dead code

Strip the `if (session)` block from `classifyPedalOverlap()` (lines 378–392) and simplify the fallback test. This eliminates dead code without changing behavior.

### Verification
- With Option A: a pedal overlap inference produces the same classification as the Python-trained SVM.
- With Options B/C: behavior is unchanged (heuristic-only).

---

## Fix 4: G-Force Fallback Bug

### Root Cause
`mlWorker.ts` line 592:

```typescript
Number(d.gforceCombined) || Math.sqrt(Math.pow(gForcesX[0] || 0, 2) + Math.pow(gForcesY[0] || 0, 2)) || 0
```

When `gforceCombined` is missing from a row, the fallback computes `sqrt(gForcesX[0]² + gForcesY[0]²)` — always using the **first frame's** g-forces for all subsequent frames, because the `.map()` callback parameter `d` is ignored in the fallback expression.

### Location
`mlWorker.ts:591–593`

### Fix

Replace lines 591–593:

```typescript
const gForcesCombined = validData.map((d: any) =>
  Number(d.gforceCombined) || Math.sqrt(
    Math.pow(Number(d.gForceX) || 0, 2) + Math.pow(Number(d.gForceY) || 0, 2)
  ) || 0
);
```

Bug is using `gForcesX[0]`/`gForcesY[0]` instead of `d.gForceX`/`d.gForceY`. The `d` in `.map((d: any) => ...)` is the current row — use it directly.

### Impact
- Before fix: all frames without `gforceCombined` get the same value (first frame's magnitude). This makes anomaly detection, fatigue, and state clustering insensitive to g-force variation throughout the session.
- After fix: each frame correctly computes `sqrt(gForceX_i² + gForceY_i²)`.

### Verification
- A session where `gforceCombined` is absent should show varying `gForcesCombined` values matching per-frame g-force magnitude.

---

## Fix 5: Fatigue Decay Can Be Negative

### Root Cause
`mlWorker.ts` line 129:

```typescript
const decay = jerkMeans[0] > 0 ? (jerkMeans[3] / jerkMeans[0] - 1) : 0;
```

When Q4 mean jerk < Q1 mean jerk (driver improves over session), the ratio is < 1, so `decay` is negative (e.g., `-0.05`). While the score correctly clamps this to 100 (line 130: `Math.max(0, decay) * 200`), the raw `decay` value is sent to the UI and displayed as "Jerk Decay Δ: -0.050" — confusing because negative "fatigue" implies the driver got more alert.

### Location
- `mlWorker.ts:129` — decay calculation
- `src/components/MLAnalysis/MLAnalysis.tsx` — display of `fatigue.decay`

### Fix

**a) Clamp decay for display (in mlWorker.ts)**

Replace line 129:

```typescript
const rawDecay = jerkMeans[0] > 0 ? (jerkMeans[3] / jerkMeans[0] - 1) : 0;
const decay = Math.max(-0.99, Math.min(0.99, rawDecay)); // prevent extreme values
const decayLabel = decay >= 0
  ? `+${(decay * 100).toFixed(1)}%`
  : `${(decay * 100).toFixed(1)}%`;
const score = Math.max(0, Math.min(100, 100 - Math.max(0, decay) * ML_CONFIG.FATIGUE_DECAY_SCALE));
```

**b) Add a human-readable label field**

Include both raw decay and a label in the return:

```typescript
return {
  score,
  decay,           // raw value (e.g., -0.05)
  decayLabel,      // formatted string (e.g., "-5.0%")
  trend: decay >= 0 ? 'fatiguing' : 'improving',
  timeline,
};
```

**c) Update MLSnalysis.tsx display**

Find the display of `fatigue.decay` in `MLAnalysis.tsx` and conditionally format:

```tsx
// Instead of raw number, use:
{fatigue.trend === 'improving'
  ? `↑ Improving (${fatigue.decayLabel} jerk)`
  : `↓ Fatiguing (${fatigue.decayLabel} jerk)`}
```

**d) Add a config constant for min fatigue improvement detection**

In `ml-config.ts`:

```typescript
FATIGUE_IMPROVEMENT_THRESH: -0.02, // decay below this = meaningful improvement
```

If `decay > -FATIGUE_IMPROVEMENT_THRESH`, show "Stable" instead of "Improving".

### Verification
- A session where the driver's jerk decreases from Q1 to Q4 should show "Improving (-5.0%)" instead of a raw negative number.
- Score remains 100 (perfect) when jerk decreases.

---

## Fix 6: Anomaly Detection Over-Downsampling

### Root Cause
`mlWorker.ts` line 618:

```typescript
for (let i = 0; i < speeds.length; i += ML_CONFIG.ANOMALY_DOWNSAMPLE_STEP) {
```

`ML_CONFIG.ANOMALY_DOWNSAMPLE_STEP = 10` means only 10% of frames are inspected. A jerk spike or g-force event lasting 1–2 frames (common in sim telemetry at 60 Hz) has a 90% chance of landing between sampled frames and being missed entirely.

### Location
`mlWorker.ts:610–633` — anomaly detection loop

### Fix

**a) Remove downsampling or reduce step to 1**

Option 1 (Recommended): Change the step to 1 (inspect every frame):

```typescript
// In ml-config.ts:
ANOMALY_DOWNSAMPLE_STEP: 1,
```

Option 2 (Performance-aware): Run full resolution for small sessions, downsample for large:

```typescript
const anomalyStep = data.length > 10000 ? ML_CONFIG.ANOMALY_DOWNSAMPLE_STEP : 1;
for (let i = 0; i < speeds.length; i += anomalyStep) {
```

Option 3 (Sliding window): Use a max-over-window approach — for each window of size N, mark as anomalous if any frame exceeds threshold:

```typescript
const anomalyStep = ML_CONFIG.ANOMALY_DOWNSAMPLE_STEP;
for (let i = 0; i < speeds.length; i += anomalyStep) {
  const windowEnd = Math.min(i + anomalyStep, speeds.length);
  let windowMaxJerk = 0;
  let windowMaxG = 0;
  for (let j = i; j < windowEnd; j++) {
    windowMaxJerk = Math.max(windowMaxJerk, jerks[j]);
    windowMaxG = Math.max(windowMaxG, gForcesCombined[j]);
  }
  const isAnomaly = windowMaxJerk > anomalyThreshold || windowMaxG > G_ANOMALY_THRESH;
  // ...
}
```

This avoids missing spikes while keeping the output size manageable.

**b) Adjust config defaults accordingly**

If changing to step=1, also ensure the output data doesn't flood the UI. The `anomalyData` array will be 10× larger — consider adding a max-output cap or rendering only anomaly points on the chart.

### Verification
- A session with a single-frame jerk spike (`jerkX = 50` for 1 frame) should be detected. Before fix, it would be caught only ~10% of the time. After fix, 100%.
- Performance: a 60k-frame session should complete anomaly detection in < 50 ms with step=1.

---

## Implementation Order

| Order | Fix | Complexity | Risk | Files Touched |
|-------|-----|-----------|------|---------------|
| 1 | Fix 4 — G-force fallback | Trivial (1 line) | Low | `mlWorker.ts` |
| 2 | Fix 6 — Anomaly downsampling | Low (1 config change) | Low | `ml-config.ts`, `mlWorker.ts` |
| 3 | Fix 5 — Fatigue negative decay | Low (worker + display) | Low | `mlWorker.ts`, `MLAnalysis.tsx` |
| 4 | Fix 1 — State clustering Z-score | Medium (loader + normalizer) | Medium | `mlWorker.ts` |
| 5 | Fix 2 — PCA Z-score | Medium (loader + normalizer) | Medium | `mlWorker.ts` |
| 6 | Fix 3 — Pedal ONNX export | High (pipeline + worker) | Medium | `train_model.py`, `mlWorker.ts` |

## Verification Checklist

After each fix:
- [ ] `npx tsc -b` passes with no errors
- [ ] `npx vite build` succeeds
- [ ] `node scripts/verify-feature-order.cjs` passes
- [ ] Live test: load a session CSV and confirm the affected metric produces reasonable values
- [ ] For Fix 1/2: compare TS output against Python inference on the same row
- [ ] For Fix 3: confirm pedal overlap model loads without error in browser console
