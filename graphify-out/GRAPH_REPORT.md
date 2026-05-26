# Graph Report - /Users/abdullahbinmadhi/Desktop/Projects/Driving-telemetry/Driving-Simulation-Telemetry-Dashboard-Application  (2026-05-26)

## Corpus Check
- 82 files · ~68,160 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 786 nodes · 1003 edges · 52 communities (46 shown, 6 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 7 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_accelerations|accelerations]]
- [[_COMMUNITY_GameConnector|GameConnector]]
- [[_COMMUNITY_1.1 Fix `normalizeRow` ({MLAnalysis.tsx})|1.1 Fix `normalizeRow` ({MLAnalysis.tsx})]]
- [[_COMMUNITY_0.1 — Add order-enforcement comments to `config.py`|0.1 — Add order-enforcement comments to `config.py`]]
- [[_COMMUNITY_dependencies|dependencies]]
- [[_COMMUNITY_codetypescript ( Around line 466-473, change from)|code:typescript (// Around line 466-473, change from:)]]
- [[_COMMUNITY_dataset_files|dataset_files]]
- [[_COMMUNITY_bgColorMap|bgColorMap]]
- [[_COMMUNITY_build|build]]
- [[_COMMUNITY_compilerOptions|compilerOptions]]
- [[_COMMUNITY_AGENTS|AGENTS.md]]
- [[_COMMUNITY_1.1 Dead Code Two Competing `self.onmessage` Handlers|1.1 Dead Code: Two Competing `self.onmessage` Handlers]]
- [[_COMMUNITY_compilerOptions|compilerOptions]]
- [[_COMMUNITY_1. The Dashboard (``)|1. The Dashboard (`/`)]]
- [[_COMMUNITY_BehaviorAnalysis|BehaviorAnalysis]]
- [[_COMMUNITY_AnomalyResult|AnomalyResult]]
- [[_COMMUNITY_4.10 Accessibility|4.10 Accessibility]]
- [[_COMMUNITY_A. Core Physics and Kinematic Variables|A. Core Physics and Kinematic Variables]]
- [[_COMMUNITY_ortWasmThreaded()|ortWasmThreaded()]]
- [[_COMMUNITY_derive_labels()|derive_labels()]]
- [[_COMMUNITY_DriverProfile()|DriverProfile()]]
- [[_COMMUNITY_4a — Fix Safety Score Session-Length Dependency|4a — Fix Safety Score Session-Length Dependency]]
- [[_COMMUNITY_computeFatigueForSession()|computeFatigueForSession()]]
- [[_COMMUNITY_compilerOptions|compilerOptions]]
- [[_COMMUNITY_Layout()|Layout()]]
- [[_COMMUNITY_clamp()|clamp()]]
- [[_COMMUNITY_7.1 Add Model Status Indicator to `MLAnalysis.tsx`|7.1 Add Model Status Indicator to `MLAnalysis.tsx`]]
- [[_COMMUNITY_8.1 TypeScript Compilation|8.1 TypeScript Compilation]]
- [[_COMMUNITY_client|client]]
- [[_COMMUNITY_classifyGrip()|classifyGrip()]]
- [[_COMMUNITY_5.1 Locate or Generate Training Data|5.1 Locate or Generate Training Data]]
- [[_COMMUNITY_telemetryStore.ts|telemetryStore.ts]]
- [[_COMMUNITY_6.1 New `mlWorker.ts` Architecture|6.1 New `mlWorker.ts` Architecture]]
- [[_COMMUNITY_DEPLOYMENT|DEPLOYMENT.md]]
- [[_COMMUNITY_Analysis()|Analysis()]]
- [[_COMMUNITY_GRIP_FEATURES|GRIP_FEATURES]]
- [[_COMMUNITY_10. Risk Register|10. Risk Register]]
- [[_COMMUNITY_centroids|centroids]]
- [[_COMMUNITY_3.1 Remove All Dead Code from `mlWorker.ts`|3.1 Remove All Dead Code from `mlWorker.ts`]]
- [[_COMMUNITY_4.1 Layout Architecture|4.1 Layout Architecture]]
- [[_COMMUNITY_DataPoint|DataPoint]]
- [[_COMMUNITY_formatTime()|formatTime()]]
- [[_COMMUNITY_LiveMultiGraph|LiveMultiGraph]]
- [[_COMMUNITY_TireData()|TireData()]]
- [[_COMMUNITY_config.py|config.py]]
- [[_COMMUNITY_CarHealth()|CarHealth()]]
- [[_COMMUNITY_files|files]]
- [[_COMMUNITY_Speedometer()|Speedometer()]]

## God Nodes (most connected - your core abstractions)
1. `MLAnalysis()` - 28 edges
2. `Fix` - 21 edges
3. `compilerOptions` - 20 edges
4. `compilerOptions` - 18 edges
5. `TelemetryData` - 17 edges
6. `useSettingsStore` - 15 edges
7. `BeamNGConnector` - 14 edges
8. `compilerOptions` - 11 edges
9. `scripts` - 11 edges
10. `useTelemetryStore` - 11 edges

## Surprising Connections (you probably didn't know these)
- `clamp()` --calls--> `type`  [INFERRED]
  electron/game-connectors/beamng/telemetry.lua → package.json
- `firstNumber()` --calls--> `type`  [INFERRED]
  electron/game-connectors/beamng/telemetry.lua → package.json
- `getPressurePsi()` --calls--> `type`  [INFERRED]
  electron/game-connectors/beamng/telemetry.lua → package.json
- `firstPowertrainDevice()` --calls--> `type`  [INFERRED]
  electron/game-connectors/beamng/telemetry.lua → package.json
- `ortWasmThreaded()` --calls--> `require`  [INFERRED]
  public/assets/ort-wasm-simd-threaded.asyncify.mjs → electron/main.ts

## Communities (52 total, 6 thin omitted)

### Community 0 - "accelerations"
Cohesion: 0.03
Nodes (52): accelerations, aggressionMatrix, anomalies, anomalyData, brakes, brakeZones, currZone, d (+44 more)

### Community 1 - "GameConnector"
Cohesion: 0.07
Nodes (15): GameConnector, clamp(), nearZero(), AssettoCorsaConnector, BeamNGConnector, clamp(), normalizeArray(), normalizeHealth() (+7 more)

### Community 2 - "1.1 Fix `normalizeRow` ({MLAnalysis.tsx})"
Cohesion: 0.05
Nodes (44): 1.1 Fix `normalizeRow` ({MLAnalysis.tsx}), 1.2 Timestamp-aware merging ({MLAnalysis.tsx}), 1.3 Column name cross-reference, 2.1 Boundary-aware jerk/accel, 2.2 Boundary-aware fatigue, 2.3 Boundary-aware Markov chain, 2.4 Boundary-aware gear change detection, 2.5 Boundary-aware tire wear (heuristic path) (+36 more)

### Community 3 - "0.1 — Add order-enforcement comments to `config.py`"
Cohesion: 0.05
Nodes (44): 0.1 — Add order-enforcement comments to `config.py`, 0.2 — Move TS feature lists to shared constants file, 0.3 — Add camelCase→snake_case conversion in `train_model.py`, 0.4 — Add CI verification script, 1.1 — Card subtitle labels, 1.2 — Interpretation text fixes, 1.3 — Quality Metric Card subtitles, 2.1 — Create `src/ml-config.ts` (+36 more)

### Community 4 - "dependencies"
Cohesion: 0.05
Nodes (43): dependencies, better-sqlite3, clsx, express, @google/stitch-sdk, lucide-react, onnxruntime-web, papaparse (+35 more)

### Community 5 - "code:typescript (// Around line 466-473, change from:)"
Cohesion: 0.09
Nodes (34): code:typescript (// Around line 466-473, change from:), code:typescript (const decay = jerkMeans[0] > 0 ? (jerkMeans[3] / jerkMeans[0), code:typescript (return {), code:tsx (// Instead of raw number, use:), code:typescript (FATIGUE_IMPROVEMENT_THRESH: -0.02, // decay below this = mea), code:typescript (for (let i = 0; i < speeds.length; i += ML_CONFIG.ANOMALY_DO), code:typescript (// In ml-config.ts:), code:typescript (const anomalyStep = data.length > 10000 ? ML_CONFIG.ANOMALY_) (+26 more)

### Community 6 - "dataset_files"
Cohesion: 0.08
Nodes (33): dataset_files, dataset_rows, components, pca_variance_pct, error, accuracy, f1, feature_count (+25 more)

### Community 7 - "bgColorMap"
Cohesion: 0.09
Nodes (16): bgColorMap, colorMap, INITIAL_RESULTS, MLAnalysis(), MLResults, OverviewTab(), SafetyTab(), StyleTab() (+8 more)

### Community 8 - "build"
Cohesion: 0.09
Nodes (22): build, appId, directories, extraResources, files, mac, productName, win (+14 more)

### Community 9 - "compilerOptions"
Cohesion: 0.09
Nodes (22): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection, moduleResolution (+14 more)

### Community 10 - "AGENTS.md"
Cohesion: 0.09
Nodes (21): 1. Slash Commands (`/agent-name`), 2. Automatic Delegation, 3. Named Mention, Agent Catalog, code:block1 (/explorer find where resolveBaseUrl is defined), code:block2 ("Find where database migrations are defined"), code:block3 ("Use the security-auditor to scan the Electron IPC handlers"), db-architect (+13 more)

### Community 11 - "1.1 Dead Code: Two Competing `self.onmessage` Handlers"
Cohesion: 0.10
Nodes (20): 1.1 Dead Code: Two Competing `self.onmessage` Handlers, 1.2 Dead Functions & Variables, 1.3 Feature Column Name Mismatch, 1.4 Empty Training Dataset, 1.5 Synthetic/Fake Training Data at Runtime, 1.6 Silent Fallbacks, 1.7 `resolveBaseUrl()` Defined Twice, 1. Current Architecture Problems (+12 more)

### Community 12 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, moduleResolution, noEmit (+11 more)

### Community 13 - "1. The Dashboard (`/`)"
Cohesion: 0.11
Nodes (17): 1. The Dashboard (`/`), 2. Telemetry Analysis (`/analysis`), 3. Reaction Test (`/reaction`), 4. Settings Configuration (`/settings`), BeamNG.drive (High-Fidelity), code:bash (git clone https://github.com/abdullah-binmadhi/Driving-Simul), code:bash (# Install all required dependencies), code:bash (npm install) (+9 more)

### Community 14 - "BehaviorAnalysis"
Cohesion: 0.17
Nodes (15): BehaviorAnalysis, ProgressBar, Dashboard(), DataLogger(), FrictionCircle, InputVisualizer, InputVisualizerProps, RPMGauge (+7 more)

### Community 15 - "AnomalyResult"
Cohesion: 0.12
Nodes (16): AnomalyResult, ExitForecastResult, FatigueResult, GripResult, HMMResult, IncomingMessage, ModelStatusMap, OutgoingMessage (+8 more)

### Community 16 - "4.10 Accessibility"
Cohesion: 0.12
Nodes (16): 4.10 Accessibility, 4.2 Tab Structure, 4.3 Summary Hero Row, 4.4 Per-Session Comparison, 4.5 Session Boundary Markers on Charts, 4.6 Drag-and-Drop Upload Zone, 4.7 Color Palette, 4.8 Card Design Pattern (+8 more)

### Community 17 - "A. Core Physics and Kinematic Variables"
Cohesion: 0.13
Nodes (14): A. Core Physics and Kinematic Variables, A. Procedural Driver Modeling and Synthetic Data, A. The Live Dashboard Interface: A Pilot’s Perspective, B. Derived Behavioral and Efficiency Metrics: The "Why" Behind the Data, B. Impairment, Aggression, and Human-Factor Simulation, B. Vehicle Systems and Tire Thermal Dynamics, I. Introduction: The Intersection of Simulation and Data Science, II. Real-Time Telemetry and Visual Analytics (+6 more)

### Community 18 - "ortWasmThreaded()"
Cohesion: 0.14
Nodes (10): ortWasmThreaded(), ortWasmThreaded(), db, __dirname, initDatabase(), __dirname, id, now (+2 more)

### Community 19 - "derive_labels()"
Cohesion: 0.20
Nodes (13): derive_labels(), load_all_csvs(), main(), Multi-Model ML Training Pipeline for Driving Telemetry Dashboard. Trains 8 model, Check which expected columns are missing from the dataset., Derive supervised labels that aren't directly in the raw telemetry., Convert sklearn model to ONNX and save., Train all 8 models and return metrics. (+5 more)

### Community 20 - "DriverProfile()"
Cohesion: 0.21
Nodes (9): DriverProfile(), SessionInfo(), Settings(), AppSettings, DriverSettings, GameSettings, SessionSettings, SettingsState (+1 more)

### Community 21 - "4a — Fix Safety Score Session-Length Dependency"
Cohesion: 0.15
Nodes (13): 4a — Fix Safety Score Session-Length Dependency, 4b — Fix Safety Double-Counting of Understeer, 4c — Add Dedup Window to All Penalty Categories, 4d — Fix Jerk Magnitude Throughout, 4e — Fix KNN Confidence Normalization, 4f — Fix OLS Numerical Stability (Exit Forecast), code:typescript (const penaltyRate = totalPenalties / data.length;), code:typescript (// Before: 5 penalty categories including Understeer) (+5 more)

### Community 22 - "computeFatigueForSession()"
Cohesion: 0.23
Nodes (12): computeFatigueForSession(), detectAnomalies(), detectFatigue(), safeMean(), safeStd(), colorForState(), jerkMagnitude(), medianDt() (+4 more)

### Community 23 - "compilerOptions"
Cohesion: 0.15
Nodes (12): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, module, moduleResolution, outDir, rootDir, skipLibCheck (+4 more)

### Community 24 - "Layout()"
Cohesion: 0.17
Nodes (4): Layout(), HistoryItem, ReactionTest(), TestMode

### Community 25 - "clamp()"
Cohesion: 0.49
Nodes (10): clamp(), estimateTireTemperature(), firstNumber(), firstPowertrainDevice(), getDeviceHealth(), getPosition(), getPressurePsi(), getWheelData() (+2 more)

### Community 26 - "7.1 Add Model Status Indicator to `MLAnalysis.tsx`"
Cohesion: 0.20
Nodes (8): 7.1 Add Model Status Indicator to `MLAnalysis.tsx`, 7.2 Add Worker Status Messages, 7.3 Add Model Quality Panel, 7. Phase 5: UI Feedback, Appendix B: `MLResults` Type Definition (Full), code:ts (interface MLResults {), code:ts (self.postMessage({), code:tsx (<details>)

### Community 27 - "8.1 TypeScript Compilation"
Cohesion: 0.20
Nodes (10): 8.1 TypeScript Compilation, 8.2 Vite Build, 8.3 ONNX Model Validation, 8.4 Browser Smoke Test, 8.5 Edge Case Tests, 8.6 Cross-Session Consistency Test, 8. Phase 6: Validation & Testing, code:bash (npx tsc --noEmit) (+2 more)

### Community 28 - "client"
Cohesion: 0.20
Nodes (7): client, htmlUrl, htmlUrl2, outDir, outPath, pid, sid

### Community 29 - "classifyGrip()"
Cohesion: 0.36
Nodes (10): classifyGrip(), classifyPedalOverlap(), classifyShifts(), clusterStates(), extractFeatures(), jerkMagnitude(), predictTireWear(), projectPCA() (+2 more)

### Community 30 - "5.1 Locate or Generate Training Data"
Cohesion: 0.22
Nodes (9): 5.1 Locate or Generate Training Data, 5.2 Fix `train_model.py` to Export Feature Order, 5.3 Add Train/Test Split to `train_model.py`, 5.4 Export Scaler Parameters, 5. Phase 3: Offline Training Pipeline Fix, code:python (# After training each model, before ONNX export:), code:python (from sklearn.model_selection import train_test_split), code:python (from sklearn.preprocessing import StandardScaler) (+1 more)

### Community 31 - "telemetryStore.ts"
Cohesion: 0.28
Nodes (4): clamp(), enrichTelemetry(), MultiTraceDataPoint, signalSign()

### Community 32 - "6.1 New `mlWorker.ts` Architecture"
Cohesion: 0.25
Nodes (8): 6.1 New `mlWorker.ts` Architecture, 6.2 Remove Live Training Imports, 6.3 Remove Synthetic Training Code Blocks, 6.4 Update `package.json` Dependencies, 6. Phase 4: Worker Restructure, code:ts (// ─── 1. Imports ──────────────────────────────────────────), code:ts (import KMeans from 'ml-kmeans';), code:json ("ml-kmeans": "^7.0.0",)

### Community 33 - "DEPLOYMENT.md"
Cohesion: 0.25
Nodes (7): Code Signing (Important), code:bash (npm run build), code:bash (dist-app/), Deployment Guide, How to Build / Deploy, Output Location, Why Desktop?

### Community 34 - "Analysis()"
Cohesion: 0.36
Nodes (7): Analysis(), SessionGraphs(), SessionGraphsProps, SessionList(), mockSessions, Session, useSessionStore

### Community 35 - "GRIP_FEATURES"
Cohesion: 0.29
Nodes (6): GRIP_FEATURES, HMM_FEATURES, PCA_FEATURES, PEDAL_FEATURES, SHIFT_FEATURES, TIRE_WEAR_FEATURES

### Community 36 - "10. Risk Register"
Cohesion: 0.33
Nodes (5): 10. Risk Register, 9. Implementation Timeline, Appendix A: Files Changed Summary, Appendix C: Feature Map Cross-Reference, Table of Contents

### Community 37 - "centroids"
Cohesion: 0.33
Nodes (5): centroids, features, n_clusters, scaler_mean, scaler_scale

### Community 38 - "3.1 Remove All Dead Code from `mlWorker.ts`"
Cohesion: 0.40
Nodes (5): 3.1 Remove All Dead Code from `mlWorker.ts`, 3.2 Remove Unused npm Dependencies, 3.3 Delete Dead `resolveBaseUrl()` Duplicate, 3. Phase 1: Codebase Cleanup, code:ts (import * as ort from 'onnxruntime-web';)

### Community 39 - "4.1 Layout Architecture"
Cohesion: 0.50
Nodes (4): 4.1 Layout Architecture, code:block15 (┌───────────────────────────────────────────────────────────), 2.1 Key Architectural Changes, 2. Target Architecture

### Community 41 - "formatTime()"
Cohesion: 0.67
Nodes (3): formatTime(), LapTiming(), LapTimingProps

### Community 42 - "LiveMultiGraph"
Cohesion: 0.50
Nodes (3): LiveMultiGraph, LiveMultiGraphProps, MultiTraceDataPoint

## Knowledge Gaps
- **390 isolated node(s):** `code:typescript (// Around line 466-473, change from:)`, `code:typescript (if (centroids && centroids.length === 4 && clusterScalerMean)`, `code:typescript (let pcaScalerMean: number[] | null = null;)`, `code:typescript (if (components && components.length >= 2 && mean && pcaScale)`, `code:python (svm = SVC(kernel='rbf', C=1.0, random_state=42, probability=)` (+385 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.