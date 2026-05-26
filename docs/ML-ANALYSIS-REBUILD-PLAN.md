# MLAnalysis — Full Rebuild Plan

## Why Rebuild?

### Current Bugs (no results with 3+ sessions)

| # | Bug | Root Cause | Impact |
|---|---|---|---|
| 1 | **Negative dt at session boundaries** | Timestamps are raw concatenated (S1: 0–60k, S2: 0–45k). The dt at boundary is (0 - 60000) / 1000 = **-60**, which is falsy-checked but `-60` is truthy → garbage jerk/accel values → corrupts ALL downstream analysis | CRITICAL |
| 2 | **22 columns silently default to 0** | `normalizeRow` only has snake_case variants (e.g. `['jerk_x']`) but CSV has camelCase (`jerkX`). ONNX models and heuristics receive zero-filled feature vectors | HIGH |
| 3 | **Timestamp fallback collisions** | `i * 16` fallback uses per-file row index, so multiple sessions have identical timestamps for corresponding row positions | HIGH |
| 4 | **ONNX loops sequential O(n)** | 4 separate `for ... await session.run()` loops iterating every row of merged dataset → 4–5 minutes wall time, browser may terminate worker | HIGH |
| 5 | **Heuristic tire wear accumulates** | `cumulativeWear` never resets across sessions → 3 short sessions show 3x wear, misleading `endLife` | HIGH |
| 6 | **False Markov transitions at boundaries** | `buildMarkovChain` counts transition from last state of S1 to first state of S2 — fake transition | MEDIUM |
| 7 | **Fatigue quarters split across sessions** | Q1 in S1, Q2 spans S1→S2, Q3 spans S2→S3, Q4 in S3. Plus garbage jerk from boundaries pollutes Q2/Q3 | MEDIUM |
| 8 | **False gear changes at boundaries** | `(gear[i] !== gear[i-1])` detects S1's last gear ≠ S2's first gear as a shift | MEDIUM |
| 9 | **60K+ objects in single postMessage** | anomaly + pca + hmm + rfWear arrays each ~15000 objects → main thread freeze on deserialize | MEDIUM |
| 10 | **No timeout / stall detection** | Worker crash or hang leaves UI in "Processing..." forever, user must hard reload | MEDIUM |

### Current Design Issues

| # | Issue | Details |
|---|---|---|
| A | **"6 models" says 15+ shown** | Description text is outdated, misleading |
| B | **No visual hierarchy** | 15 equally-weighted cards, no hero summary, no categorization |
| C | **Tailwind JIT `text-${color}-400`** | Dynamic class construction is purged in production → scores render in default color |
| D | **No cancel button** | Once processing starts, user has no escape |
| E | **Color-only indicators** | HMM timeline, fatigue bars, anomaly dots rely purely on color (accessibility) |
| F | **Exit Forecast computed but hidden** | Worker lines 713–782 compute it, UI never displays it |
| G | **Native `alert()` dialog** | Disruptive, unstyled |
| H | **No drag-and-drop upload** | Hidden `<input>` only |
| I | **Hidden Quality Metric affordance** | No visual cue that MetricCards are clickable |
| J | **Single-column on laptops** | Grid goes 1→3 columns with no `lg:grid-cols-2` intermediate |

---

## Architecture Decisions

### Multi-Session Strategy: True Combined Analysis

Not per-session tabs. Sessions are merged into one continuous timeline but **all computations respect session boundaries**:

1. Timestamps are offset: `S2.ts = S2.ts + (lastTimestamp(S1) + medianDt)`
2. `_sessionBoundary` flag marks transition rows
3. Every analysis function reads this flag and adjusts behavior
4. Charts show session boundaries as vertical markers
5. Cards show combined value + per-session mini breakdown

### Worker Architecture

- Chunked ONNX inference: `await new Promise(r => setTimeout(r, 0))` every 100 rows
- Progress sent from within loops (not only at checkpoints)
- Downsample output arrays to max 2000 points before postMessage
- Cancelable via AbortController or worker.terminate()

### File Structure

```
src/components/MLAnalysis/
  MLAnalysis.tsx    ← completely rebuilt
  mlWorker.ts       ← completely rebuilt
  types.ts          ← shared types (extracted from current inline interfaces)
  utils.ts          ← helpers (safeMean, safeStd, jerkMagnitude, etc.)
```

---

## Phase 1 — Data Layer

### 1.1 Fix `normalizeRow` ({MLAnalysis.tsx})

Add camelCase variants to every field:

```ts
jerkX:  getExact(['jerk_x', 'jerkX']),
throttleDelta: getExact(['throttle_delta', 'throttleDelta']),
// ... all 22 fields
```

Also add `_sessionId` and `_sessionBoundary` to normalized rows.

### 1.2 Timestamp-aware merging ({MLAnalysis.tsx})

```ts
function mergeSessions(allSessions: any[][]): any[] {
  const merged: any[] = [];
  let globalOffset = 0;
  for (let s = 0; s < allSessions.length; s++) {
    const session = allSessions[s];
    const sessionTs = session.map(r => r.timestamp || 0);
    const minTs = Math.min(...sessionTs);
    const maxTs = Math.max(...sessionTs);
    // Offset so this session starts after previous ends
    const offset = s === 0 ? 0 : globalOffset + medianDt(allSessions[s-1]);
    for (let i = 0; i < session.length; i++) {
      const row = { ...session[i] };
      row.timestamp = (row.timestamp || (i * 16)) + offset;
      row._sessionId = s;
      row._sessionBoundary = i === 0 && s > 0;
      merged.push(row);
    }
    globalOffset = maxTs + offset;
  }
  return merged;
}
```

### 1.3 Column name cross-reference

Source of truth for the column name mapping:

| CSV Column (camelCase) | Python Config (snake_case) | normalizeRow |
|---|---|---|
| `jerkX` | `jerk_x` | `['jerk_x', 'jerkX']` |
| `jerkY` | `jerk_y` | `['jerk_y', 'jerkY']` |
| `throttleDelta` | `throttle_delta` | `['throttle_delta', 'throttleDelta']` |
| `brakeDelta` | `brake_delta` | `['brake_delta', 'brakeDelta']` |
| `steeringDelta` | `steering_delta` | `['steering_delta', 'steeringDelta']` |
| `speedDelta` | `speed_delta` | `['speed_delta', 'speedDelta']` |
| `pedalOverlap` | `pedal_overlap` | `['pedal_overlap', 'pedalOverlap']` |
| `gforceCombined` | `gforce_combined` | `['gforce_combined', 'gforceCombined']` |
| `posX` / `posY` / `posZ` | `pos_x` / `pos_y` / `pos_z` | `['pos_x', 'posX']` etc |
| `yawRate` | `yaw_rate` | `['yaw_rate', 'yawRate']` |
| `slipAngleEstimate` | `slip_angle_estimate` | `['slip_angle_estimate', 'slipAngleEstimate']` |
| `isTrailBraking` | `is_trail_braking` | `['is_trail_braking', 'isTrailBraking']` |
| `isCoasting` | `is_coasting` | `['is_coasting', 'isCoasting']` |
| `isWots` | `is_wots` | `['is_wots', 'isWots']` |
| `isBraking` | `is_braking` | `['is_braking', 'isBraking']` |
| `isTurning` | `is_turning` | `['is_turning', 'isTurning']` |
| `oversteerCorrection` | `oversteer_correction` | `['oversteer_correction', 'oversteerCorrection']` |
| `understeerPlough` | `understeer_plough` | `['understeer_plough', 'understeerPlough']` |
| `brakeBiasUtilization` | `brake_bias_utilization` | `['brake_bias_utilization', 'brakeBiasUtilization']` |
| `coastingTimePct` | `coasting_time_pct` | `['coasting_time_pct', 'coastingTimePct']` |
| `tireTempFL` / `FR` / `RL` / `RR` | `tire_temp_fl` etc | `['tire_temp_fl', 'tireTempFL']` etc |
| `tirePressureFL` / `FR` / `RL` / `RR` | `tire_pressure_fl` etc | `['tire_pressure_fl', 'tirePressureFL']` etc |

---

## Phase 2 — Worker Computations

### 2.1 Boundary-aware jerk/accel

```ts
for (let i = 1; i < speeds.length; i++) {
  if (validData[i]._sessionBoundary) {
    accelerations.push(0);
    jerks.push(0);
    continue; // skip boundary dt
  }
  const dt = (timestamps[i] - timestamps[i - 1]) / 1000 || ML_CONFIG.DEFAULT_DT;
  // ... normal computation
}
```

### 2.2 Boundary-aware fatigue

Compute quarters per-session, then average results across sessions:

```ts
function detectFatigue(data) {
  const sessions = splitBySession(data);
  const perSession = sessions.map(sess => computeFatigueForSession(sess));
  return {
    score: avg(perSession.map(s => s.score)),
    decay: avg(perSession.map(s => s.decay)),
    perSession, // for UI breakdown
    timeline: perSession.flatMap(s => s.timeline),
  };
}
```

### 2.3 Boundary-aware Markov chain

```ts
for (let i = 1; i < stateData.length; i++) {
  if (validData[i]._sessionBoundary) continue; // skip
  // ... normal transition counting
}
```

### 2.4 Boundary-aware gear change detection

```ts
for (let i = 1; i < data.length; i++) {
  if (data[i]._sessionBoundary) continue; // skip
  if ((data[i].gear || 0) !== (data[i - 1].gear || 0)) {
    gearChanges.push(i);
  }
}
```

### 2.5 Boundary-aware tire wear (heuristic path)

```ts
for (let i = 0; i < data.length; i++) {
  if (data[i]._sessionBoundary) cumulativeWear = 0; // reset per session
  // ... normal computation
}
```

### 2.6 ONNX inference chunking

```ts
const CHUNK_SIZE = 100;
for (let i = 0; i < featureRows.length; i += CHUNK_SIZE) {
  const chunk = featureRows.slice(i, i + CHUNK_SIZE);
  for (const row of chunk) {
    // ... normal session.run()
  }
  // Yield to event loop every chunk
  await new Promise(r => setTimeout(r, 0));
  // Report fine-grained progress
  reportProgress(10 + (i / featureRows.length) * 10);
}
```

### 2.7 Downsample output arrays

```ts
function downsample(arr, maxPoints = 2000) {
  if (arr.length <= maxPoints) return arr;
  const step = Math.ceil(arr.length / maxPoints);
  return arr.filter((_, i) => i % step === 0);
}
```

Apply to anomalyData, pca.data, hmm.data, rfWear.data before postMessage.

---

## Phase 3 — Performance & UX Safety Nets

### 3.1 Timeout + Cancel

```tsx
const ABORT_TIMEOUT_MS = 120_000; // 2 minutes

const runAnalysis = () => {
  const controller = new AbortController();
  setAbortController(controller);

  const timeout = setTimeout(() => {
    workerRef.current?.terminate();
    setResults(r => ({ ...r, isProcessing: false, error: 'Analysis timed out after 2 minutes.' }));
  }, ABORT_TIMEOUT_MS);

  workerRef.current.onmessage = (e) => {
    clearTimeout(timeout);
    // ... normal handling
  };
};

const cancelAnalysis = () => {
  workerRef.current?.terminate();
  abortController?.abort();
  setResults(INITIAL_RESULTS);
};
```

### 3.2 Smooth progress

Send progress from within loops, not just at milestones:
- 0–10%: model loading
- 10–25%: safety + anomaly computation
- 25–40%: PCA + KNN
- 40–55%: pedal overlap ONNX
- 55–70%: K-Means clustering
- 70–80%: tire wear ONNX
- 80–85%: grip ONNX
- 85–90%: shift ONNX
- 90–95%: fatigue + exit forecast + quality metrics
- 95–100%: assemble results + postMessage

### 3.3 Replace `alert()`

```tsx
const [toast, setToast] = useState<{ message: string; type: 'error' | 'warning' | 'info' } | null>(null);

// In component:
{toast && (
  <div className="...toast style...">
    {toast.message}
    <button onClick={() => setToast(null)}>✕</button>
  </div>
)}
```

### 3.4 Fix Tailwind JIT dynamic class

Instead of:
```tsx
<span className={`text-${color}-400`}>...</span>
```

Use a safe map:
```tsx
const colorMap = { emerald: 'text-emerald-400', indigo: 'text-indigo-400', ... };
<span className={colorMap[color]}>...</span>
```

---

## Phase 4 — Visual Redesign

### 4.1 Layout Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  HEADER: "Machine Learning Analysis" | Upload Zone | Run/Cancel│  │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                              │
│  │Safety│ │Style │ │ Grip │ │ Tire │  ← Summary Hero Row          │
│  │ 89   │ │Smooth│ │ 92%  │ │ 78%  │                              │
│  └──────┘ └──────┘ └──────┘ └──────┘                              │
│                                                                     │
│  [Overview] [Safety] [Style] [Vehicle] [Wear] [Quality]  ← Tabs   │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                                                              │   │
│  │  Tab Content: 2–3 column card grid                           │   │
│  │  ┌────────┐ ┌────────┐                                       │   │
│  │  │ Card 1 │ │ Card 2 │                                       │   │
│  │  └────────┘ └────────┘                                       │   │
│  │  ┌────────┐ ┌────────┐                                       │   │
│  │  │ Card 3 │ │ Card 4 │                                       │   │
│  │  └────────┘ └────────┘                                       │   │
│  │                                                              │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.2 Tab Structure

| Tab | Cards |
|---|---|
| **Overview** | Summary Hero (always visible) + Safety Score Gauge + Driver Profile badge + Session Timeline overview with boundary markers |
| **Safety & Risk** | Safety Score (detailed), Discomfort Anomalies, Aggression Matrix, Penalty Breakdown |
| **Driving Style** | PCA Driver Profiler, State Timeline (HMM), Markov Chain, Pedal Consistency (DTW) |
| **Vehicle Dynamics** | Pedal Overlap (SVM), Grip Analyzer, Shift Analyzer, Braking Technique, Corner Exit Forecast |
| **Wear** | Tire Degradation timeline |
| **Quality** | Model Confidence metrics grid with expandable detail |

### 4.3 Summary Hero Row

4 compact KPI cards, always visible above tabs:

```tsx
const HERO_METRICS = [
  { label: 'Safety Score', value: safetyScore.score, unit: '/100', color: 'emerald' },
  { label: 'Driving Profile', value: profile, unit: '', color: 'indigo' },
  { label: 'Grip Retention', value: grip.score, unit: '%', color: 'amber' },
  { label: 'Tire Remaining', value: rfWear.endLife, unit: '%', color: 'pink' },
];
```

Each hero card is compact (no chart), just a big number and a label, styled with a subtle background tint matching the metric's color.

### 4.4 Per-Session Comparison

Within each card (where applicable), show a small per-session breakdown:

```
Safety Score:  89/100
  S1 ████████████████ 92
  S2 █████████████    79
  S3 ████████████████ 94
  Combined ███████████████ 89
```

Using thin horizontal bars with different opacity for each session.

### 4.5 Session Boundary Markers on Charts

For Recharts line/area charts with timestamps on X-axis:

```tsx
// Add ReferenceLine components for each session boundary
{boundaryTimestamps.map((ts, i) => (
  <ReferenceLine key={i} x={ts} stroke="#475569" strokeDasharray="4 4" strokeWidth={1} />
))}
```

### 4.6 Drag-and-Drop Upload Zone

```tsx
const [isDragging, setIsDragging] = useState(false);

<div
  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
  onDragLeave={() => setIsDragging(false)}
  onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
  className={`... ${isDragging ? 'border-purple-500 bg-purple-900/20' : ''}`}
>
  <input type="file" accept=".csv" multiple ref={fileInputRef} className="hidden" />
  <p>Drop CSV files here or click to browse</p>
  {sessionCount > 0 && <p>{sessionCount} sessions loaded</p>}
</div>
```

### 4.7 Color Palette

Professional/sporty telemetry aesthetic:

```
Background:    slate-950 (#020617)
Card bg:       slate-900 (#0f172a)
Card border:   slate-800 (#1e293b)
Card hover:    slate-800/80

Accent colors:
  Safety:      emerald-400 → red-400 gradient
  Anomaly:     red-500
  Profile:     indigo-400
  Pedal:       orange-400
  Tire:        pink-500
  Fatigue:     amber-400
  Grip:        red-400
  Shift:       purple-400
  Braking:     blue-500
  Markov:      teal-400
  Aggression:  fuchsia-400
```

### 4.8 Card Design Pattern

Every card follows a consistent template:

```tsx
<div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
  <div className="flex items-start justify-between mb-4">
    <div>
      <h3 className="text-lg font-bold text-white flex items-center gap-2">
        <Icon className="w-5 h-5 text-{color}-400" />
        {Title}
      </h3>
      <p className="text-xs text-slate-500">{Subtitle}</p>
    </div>
    {perSessionBreakdown && <PerSessionBadge data={perSessionBreakdown} />}
  </div>

  {/* Main visualization or data */}
  {chart || numbers}

  {/* Interpretation footer */}
  <div className="mt-4 pt-3 border-t border-slate-800">
    <p className="text-xs text-slate-400 leading-relaxed">{interpretation}</p>
  </div>
</div>
```

### 4.9 New Elements to Add

| Element | Source | UI Treatment |
|---|---|---|
| **Corner Exit Forecast** | `mlWorker.ts:713-782` (already computed) | Scatter plot: predicted vs actual exit speed with trend line |
| **Session Boundary Markers** | New (from `_sessionBoundary`) | Vertical dashed lines on line charts + per-session mini-bars |
| **Per-Session Breakdown** | New (from `results.perSession`) | Mini comparison bars within each card |

### 4.10 Accessibility

- Add text labels alongside all color indicators
- HMM timeline: add tooltip on each segment showing state name
- Anomaly dots: use shape differentiation (circle = anomaly) plus tooltip
- All interactive elements focusable via keyboard
- Expanded Quality Metric pane: trap focus, Escape to close

---

## Implementation Order

```
Phase 1 ───────────────────────────────────────────────
  1.1 Fix normalizeRow camelCase          [MLAnalysis.tsx]
  1.2 Timestamp-aware merging              [MLAnalysis.tsx]
  1.3 Add _sessionId + _sessionBoundary    [MLAnalysis.tsx + mlWorker.ts]

Phase 2 ───────────────────────────────────────────────
  2.1 Boundary-aware jerk/accel            [mlWorker.ts]
  2.2 Boundary-aware fatigue               [mlWorker.ts]
  2.3 Boundary-aware Markov                [mlWorker.ts]
  2.4 Boundary-aware gear changes          [mlWorker.ts]
  2.5 Boundary-aware tire wear (heuristic) [mlWorker.ts]
  2.6 ONNX chunking + yield                [mlWorker.ts]
  2.7 Downsample output arrays             [mlWorker.ts]

Phase 3 ───────────────────────────────────────────────
  3.1 Timeout + cancel button              [MLAnalysis.tsx + mlWorker.ts]
  3.2 Smooth progress reporting            [mlWorker.ts]
  3.3 Replace alert() with toast           [MLAnalysis.tsx]
  3.4 Fix Tailwind JIT dynamic class       [MLAnalysis.tsx]
  3.5 Add perSession to results            [mlWorker.ts]

Phase 4 ───────────────────────────────────────────────
  4.1 Summary Hero Row                     [MLAnalysis.tsx]
  4.2 Tab navigation + sections            [MLAnalysis.tsx]
  4.3 Per-session comparison bars          [MLAnalysis.tsx]
  4.4 Session boundary markers on charts   [MLAnalysis.tsx]
  4.5 Drag-and-drop upload zone            [MLAnalysis.tsx]
  4.6 Corner Exit Forecast card            [MLAnalysis.tsx]
  4.7 New card design template             [MLAnalysis.tsx]
  4.8 Update description text              [MLAnalysis.tsx]
```

---

## Files to Modify

| File | Action |
|---|---|
| `src/components/MLAnalysis/MLAnalysis.tsx` | **Rewrite** |
| `src/components/MLAnalysis/mlWorker.ts` | **Rewrite** |
| `src/components/MLAnalysis/types.ts` | **Create** (extract interfaces) |
| `src/components/MLAnalysis/utils.ts` | **Create** (extract helpers) |
| `src/ml-config.ts` | Minor changes (add `MAX_CHART_POINTS` config) |
| `src/ml-features.ts` | No changes needed (already camelCase) |

---

## Key Config Additions for `ml-config.ts`

```ts
// ── Performance ──
ONNX_CHUNK_SIZE: 100,         // rows per chunk before yielding
MAX_CHART_POINTS: 2000,        // max data points sent via postMessage
ANALYSIS_TIMEOUT_MS: 120000,   // 2 minutes before auto-abort

// ── Merging ──
SESSION_BOUNDARY_DT_PENALTY: 0, // dt value to use at session boundaries
```

---

## Notes

- The worker stays as a standalone `module` web worker — architecture doesn't change
- ONNX models are loaded once (first analysis), reused on subsequent runs
- The Python training pipeline (`ml-pipeline/`) is untouched — no config changes needed
- Existing model files (`public/models/*.onnx`, `*_clusters.json`, `pca_profile.json`) remain compatible
