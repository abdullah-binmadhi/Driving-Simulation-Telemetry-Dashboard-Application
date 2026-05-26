# Graph Report - Driving-Simulation-Telemetry-Dashboard-Application  (2026-05-26)

## Corpus Check
- 73 files · ~68,317 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 756 nodes · 987 edges · 53 communities (47 shown, 6 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7dfb1aed`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_ML Worker Core|ML Worker Core]]
- [[_COMMUNITY_Model Metrics|Model Metrics]]
- [[_COMMUNITY_Electron & ONNX Runtime|Electron & ONNX Runtime]]
- [[_COMMUNITY_ML Training Pipeline|ML Training Pipeline]]
- [[_COMMUNITY_PCA Profile|PCA Profile]]
- [[_COMMUNITY_ML Analysis UI|ML Analysis UI]]
- [[_COMMUNITY_ML Inference Helpers|ML Inference Helpers]]
- [[_COMMUNITY_State Clusters|State Clusters]]
- [[_COMMUNITY_Game Connectors|Game Connectors]]
- [[_COMMUNITY_Statistical Helpers|Statistical Helpers]]
- [[_COMMUNITY_Electron Types|Electron Types]]
- [[_COMMUNITY_Feature Config|Feature Config]]
- [[_COMMUNITY_Settings & Logger|Settings & Logger]]
- [[_COMMUNITY_ML Restructure Plan|ML Restructure Plan]]
- [[_COMMUNITY_Package Build Config|Package Build Config]]
- [[_COMMUNITY_Dependencies|Dependencies]]
- [[_COMMUNITY_App TSConfig|App TSConfig]]
- [[_COMMUNITY_Agent Catalog|Agent Catalog]]
- [[_COMMUNITY_Model Loader|Model Loader]]
- [[_COMMUNITY_NPM Scripts|NPM Scripts]]
- [[_COMMUNITY_Feature Names|Feature Names]]
- [[_COMMUNITY_Project README|Project README]]
- [[_COMMUNITY_ML Config|ML Config]]
- [[_COMMUNITY_Node TSConfig|Node TSConfig]]
- [[_COMMUNITY_Technical Report|Technical Report]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Feature Alignment Phase|Feature Alignment Phase]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_BeamNG Lua Telemetry|BeamNG Lua Telemetry]]
- [[_COMMUNITY_Dashboard & Stats|Dashboard & Stats]]
- [[_COMMUNITY_ONNX Batching Fix|ONNX Batching Fix]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Validation & Testing|Validation & Testing]]
- [[_COMMUNITY_Deployment Guide|Deployment Guide]]
- [[_COMMUNITY_Magic Number Extraction|Magic Number Extraction]]
- [[_COMMUNITY_UI Label Fixes|UI Label Fixes]]
- [[_COMMUNITY_Layout & Sidebar|Layout & Sidebar]]
- [[_COMMUNITY_Car Health UI|Car Health UI]]
- [[_COMMUNITY_Lap Timing|Lap Timing]]
- [[_COMMUNITY_Live Graph|Live Graph]]
- [[_COMMUNITY_Live Multi Graph|Live Multi Graph]]
- [[_COMMUNITY_Tire Status UI|Tire Status UI]]
- [[_COMMUNITY_Friction Circle|Friction Circle]]
- [[_COMMUNITY_Root TSConfig|Root TSConfig]]
- [[_COMMUNITY_ESLint Config|ESLint Config]]
- [[_COMMUNITY_Vite Config|Vite Config]]
- [[_COMMUNITY_Community 64|Community 64]]

## God Nodes (most connected - your core abstractions)
1. `MLAnalysis()` - 25 edges
2. `Fix` - 21 edges
3. `compilerOptions` - 20 edges
4. `compilerOptions` - 18 edges
5. `TelemetryData` - 17 edges
6. `useSettingsStore` - 15 edges
7. `BeamNGConnector` - 14 edges
8. `scripts` - 13 edges
9. `MLAnalysis — Full Rebuild Plan` - 11 edges
10. `Phase 4 — Visual Redesign` - 11 edges

## Surprising Connections (you probably didn't know these)
- `ortWasmThreaded()` --calls--> `require`  [INFERRED]
  public/assets/ort-wasm-simd-threaded.asyncify.mjs → electron/main.ts
- `ortWasmThreaded()` --calls--> `require`  [INFERRED]
  public/assets/ort-wasm-simd-threaded.jsep.mjs → electron/main.ts
- `BeamNGConnector` --references--> `TelemetryData`  [EXTRACTED]
  electron/game-connectors/beamng.ts → src/types/telemetry.ts
- `useSettingsStore` --calls--> `Layout()`  [EXTRACTED]
  src/stores/settingsStore.ts → src/components/Layout/Layout.tsx
- `projectPCA()` --calls--> `extractFeatures()`  [EXTRACTED]
  src/components/MLAnalysis/mlWorker.ts → src/components/MLAnalysis/utils.ts

## Communities (53 total, 6 thin omitted)

### Community 0 - "ML Worker Core"
Cohesion: 0.06
Nodes (23): accelerations, aggressionMatrix, anomalies, brakes, { dtwScore, trailPercent }, exitForecast, fatigue, gForcesCombined (+15 more)

### Community 1 - "Model Metrics"
Cohesion: 0.07
Nodes (15): GameConnector, clamp(), nearZero(), AssettoCorsaConnector, BeamNGConnector, clamp(), normalizeArray(), normalizeHealth() (+7 more)

### Community 2 - "Electron & ONNX Runtime"
Cohesion: 0.04
Nodes (45): dependencies, better-sqlite3, clsx, express, @google/stitch-sdk, lucide-react, onnxruntime-web, papaparse (+37 more)

### Community 3 - "ML Training Pipeline"
Cohesion: 0.08
Nodes (33): dataset_files, dataset_rows, components, pca_variance_pct, error, accuracy, f1, feature_count (+25 more)

### Community 4 - "PCA Profile"
Cohesion: 0.14
Nodes (10): ortWasmThreaded(), ortWasmThreaded(), db, __dirname, initDatabase(), __dirname, id, now (+2 more)

### Community 5 - "ML Analysis UI"
Cohesion: 0.09
Nodes (22): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection, moduleResolution (+14 more)

### Community 6 - "ML Inference Helpers"
Cohesion: 0.09
Nodes (21): 1. Slash Commands (`/agent-name`), 2. Automatic Delegation, 3. Named Mention, Agent Catalog, code:block1 (/explorer find where resolveBaseUrl is defined), code:block2 ("Find where database migrations are defined"), code:block3 ("Use the security-auditor to scan the Electron IPC handlers"), db-architect (+13 more)

### Community 7 - "State Clusters"
Cohesion: 0.11
Nodes (17): 1. The Dashboard (`/`), 2. Telemetry Analysis (`/analysis`), 3. Reaction Test (`/reaction`), 4. Settings Configuration (`/settings`), BeamNG.drive (High-Fidelity), code:bash (git clone https://github.com/abdullah-binmadhi/Driving-Simul), code:bash (# Install all required dependencies), code:bash (npm install) (+9 more)

### Community 8 - "Game Connectors"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, moduleResolution, noEmit (+11 more)

### Community 9 - "Statistical Helpers"
Cohesion: 0.22
Nodes (12): derive_labels(), load_all_csvs(), main(), Multi-Model ML Training Pipeline for Driving Telemetry Dashboard. Trains 8 model, Check which expected columns are missing from the dataset., Derive supervised labels that aren't directly in the raw telemetry., Convert sklearn model to ONNX and save., Train all 8 models and return metrics. (+4 more)

### Community 10 - "Electron Types"
Cohesion: 0.21
Nodes (9): DriverProfile(), SessionInfo(), Settings(), AppSettings, DriverSettings, GameSettings, SessionSettings, SettingsState (+1 more)

### Community 11 - "Feature Config"
Cohesion: 0.13
Nodes (14): A. Core Physics and Kinematic Variables, A. Procedural Driver Modeling and Synthetic Data, A. The Live Dashboard Interface: A Pilot’s Perspective, B. Derived Behavioral and Efficiency Metrics: The "Why" Behind the Data, B. Impairment, Aggression, and Human-Factor Simulation, B. Vehicle Systems and Tire Thermal Dynamics, I. Introduction: The Intersection of Simulation and Data Science, II. Real-Time Telemetry and Visual Analytics (+6 more)

### Community 12 - "Settings & Logger"
Cohesion: 0.09
Nodes (34): code:typescript (// Around line 466-473, change from:), code:typescript (const decay = jerkMeans[0] > 0 ? (jerkMeans[3] / jerkMeans[0), code:typescript (return {), code:tsx (// Instead of raw number, use:), code:typescript (FATIGUE_IMPROVEMENT_THRESH: -0.02, // decay below this = mea), code:typescript (for (let i = 0; i < speeds.length; i += ML_CONFIG.ANOMALY_DO), code:typescript (// In ml-config.ts:), code:typescript (const anomalyStep = data.length > 10000 ? ML_CONFIG.ANOMALY_) (+26 more)

### Community 13 - "ML Restructure Plan"
Cohesion: 0.15
Nodes (13): 4a — Fix Safety Score Session-Length Dependency, 4b — Fix Safety Double-Counting of Understeer, 4c — Add Dedup Window to All Penalty Categories, 4d — Fix Jerk Magnitude Throughout, 4e — Fix KNN Confidence Normalization, 4f — Fix OLS Numerical Stability (Exit Forecast), code:typescript (const penaltyRate = totalPenalties / data.length;), code:typescript (// Before: 5 penalty categories including Understeer) (+5 more)

### Community 14 - "Package Build Config"
Cohesion: 0.15
Nodes (12): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, module, moduleResolution, outDir, rootDir, skipLibCheck (+4 more)

### Community 15 - "Dependencies"
Cohesion: 0.36
Nodes (7): Analysis(), SessionGraphs(), SessionGraphsProps, SessionList(), mockSessions, Session, useSessionStore

### Community 16 - "App TSConfig"
Cohesion: 0.51
Nodes (9): clamp(), estimateTireTemperature(), firstNumber(), firstPowertrainDevice(), getDeviceHealth(), getPosition(), getPressurePsi(), getWheelData() (+1 more)

### Community 17 - "Agent Catalog"
Cohesion: 0.05
Nodes (44): 0.1 — Add order-enforcement comments to `config.py`, 0.2 — Move TS feature lists to shared constants file, 0.3 — Add camelCase→snake_case conversion in `train_model.py`, 0.4 — Add CI verification script, 1.1 — Card subtitle labels, 1.2 — Interpretation text fixes, 1.3 — Quality Metric Card subtitles, 2.1 — Create `src/ml-config.ts` (+36 more)

### Community 18 - "Model Loader"
Cohesion: 0.17
Nodes (12): 1.3 Feature Column Name Mismatch, 4.1 Normalize All Feature Names to snake_case, 4.2 Add Feature Order Validation, 4.3 Update `MLAnalysis.tsx` `normalizeRow()`, 4. Phase 2: Feature Alignment, code:python (TIRE_WEAR_FEATURES = [), code:json ({), code:ts (// Add these aliases to the existing map:) (+4 more)

### Community 19 - "NPM Scripts"
Cohesion: 0.04
Nodes (46): 1.1 Fix `normalizeRow` ({MLAnalysis.tsx}), 1.2 Timestamp-aware merging ({MLAnalysis.tsx}), 1.3 Column name cross-reference, 3.1 Timeout + Cancel, 3.2 Smooth progress, 3.3 Replace `alert()`, 3.4 Fix Tailwind JIT dynamic class, 4.10 Accessibility (+38 more)

### Community 20 - "Feature Names"
Cohesion: 0.14
Nodes (15): 2.1 Boundary-aware jerk/accel, 2.2 Boundary-aware fatigue, 2.3 Boundary-aware Markov chain, 2.4 Boundary-aware gear change detection, 2.5 Boundary-aware tire wear (heuristic path), 2.6 ONNX inference chunking, 2.7 Downsample output arrays, code:ts (function downsample(arr, maxPoints = 2000) {) (+7 more)

### Community 21 - "Project README"
Cohesion: 0.20
Nodes (10): 8.1 TypeScript Compilation, 8.2 Vite Build, 8.3 ONNX Model Validation, 8.4 Browser Smoke Test, 8.5 Edge Case Tests, 8.6 Cross-Session Consistency Test, 8. Phase 6: Validation & Testing, code:bash (npx tsc --noEmit) (+2 more)

### Community 22 - "ML Config"
Cohesion: 0.12
Nodes (16): AnomalyResult, ExitForecastResult, FatigueResult, GripResult, HMMResult, IncomingMessage, ModelStatusMap, OutgoingMessage (+8 more)

### Community 23 - "Node TSConfig"
Cohesion: 0.17
Nodes (15): BehaviorAnalysis, ProgressBar, Dashboard(), DataLogger(), FrictionCircle, InputVisualizer, InputVisualizerProps, RPMGauge (+7 more)

### Community 24 - "Technical Report"
Cohesion: 0.20
Nodes (7): client, htmlUrl, htmlUrl2, outDir, outPath, pid, sid

### Community 25 - "Community 25"
Cohesion: 0.20
Nodes (8): 7.1 Add Model Status Indicator to `MLAnalysis.tsx`, 7.2 Add Worker Status Messages, 7.3 Add Model Quality Panel, 7. Phase 5: UI Feedback, Appendix B: `MLResults` Type Definition (Full), code:ts (interface MLResults {), code:ts (self.postMessage({), code:tsx (<details>)

### Community 26 - "Community 26"
Cohesion: 0.22
Nodes (9): 5.1 Locate or Generate Training Data, 5.2 Fix `train_model.py` to Export Feature Order, 5.3 Add Train/Test Split to `train_model.py`, 5.4 Export Scaler Parameters, 5. Phase 3: Offline Training Pipeline Fix, code:python (# After training each model, before ONNX export:), code:python (from sklearn.model_selection import train_test_split), code:python (from sklearn.preprocessing import StandardScaler) (+1 more)

### Community 27 - "Community 27"
Cohesion: 0.25
Nodes (8): 1.1 Dead Code: Two Competing `self.onmessage` Handlers, 1.2 Dead Functions & Variables, 1.4 Empty Training Dataset, 1.5 Synthetic/Fake Training Data at Runtime, 1.6 Silent Fallbacks, 1.7 `resolveBaseUrl()` Defined Twice, 1. Current Architecture Problems, code:ts (.catch(() => { /* model not trained yet */ }))

### Community 28 - "Feature Alignment Phase"
Cohesion: 0.25
Nodes (8): 6.1 New `mlWorker.ts` Architecture, 6.2 Remove Live Training Imports, 6.3 Remove Synthetic Training Code Blocks, 6.4 Update `package.json` Dependencies, 6. Phase 4: Worker Restructure, code:ts (// ─── 1. Imports ──────────────────────────────────────────), code:ts (import KMeans from 'ml-kmeans';), code:json ("ml-kmeans": "^7.0.0",)

### Community 29 - "Community 29"
Cohesion: 0.40
Nodes (5): 3.1 Remove All Dead Code from `mlWorker.ts`, 3.2 Remove Unused npm Dependencies, 3.3 Delete Dead `resolveBaseUrl()` Duplicate, 3. Phase 1: Codebase Cleanup, code:ts (import * as ort from 'onnxruntime-web';)

### Community 30 - "BeamNG Lua Telemetry"
Cohesion: 0.25
Nodes (7): Code Signing (Important), code:bash (npm run build), code:bash (dist-app/), Deployment Guide, How to Build / Deploy, Output Location, Why Desktop?

### Community 32 - "ONNX Batching Fix"
Cohesion: 0.17
Nodes (4): Layout(), HistoryItem, ReactionTest(), TestMode

### Community 33 - "Community 33"
Cohesion: 1.00
Nodes (3): _initModels(), loadModels(), resolveBaseUrl()

### Community 34 - "Validation & Testing"
Cohesion: 0.36
Nodes (8): classifyGrip(), classifyPedalOverlap(), classifyShifts(), clusterStates(), predictTireWear(), extractFeatures(), jerkMagnitude(), sleep()

### Community 35 - "Deployment Guide"
Cohesion: 0.29
Nodes (6): GRIP_FEATURES, HMM_FEATURES, PCA_FEATURES, PEDAL_FEATURES, SHIFT_FEATURES, TIRE_WEAR_FEATURES

### Community 36 - "Magic Number Extraction"
Cohesion: 0.16
Nodes (24): bgColorMap, Card(), colorMap, DynamicsTab(), INITIAL_RESULTS, Interpretation(), MLAnalysis(), OverviewTab() (+16 more)

### Community 39 - "UI Label Fixes"
Cohesion: 0.28
Nodes (4): clamp(), enrichTelemetry(), MultiTraceDataPoint, signalSign()

### Community 41 - "Layout & Sidebar"
Cohesion: 0.33
Nodes (5): centroids, features, n_clusters, scaler_mean, scaler_scale

### Community 45 - "Lap Timing"
Cohesion: 0.67
Nodes (3): formatTime(), LapTiming(), LapTimingProps

### Community 47 - "Live Multi Graph"
Cohesion: 0.50
Nodes (3): LiveMultiGraph, LiveMultiGraphProps, MultiTraceDataPoint

### Community 49 - "Friction Circle"
Cohesion: 0.20
Nodes (9): 4.1 Layout Architecture, code:block15 (┌───────────────────────────────────────────────────────────), 10. Risk Register, 2.1 Key Architectural Changes, 2. Target Architecture, 9. Implementation Timeline, Appendix A: Files Changed Summary, Appendix C: Feature Map Cross-Reference (+1 more)

### Community 54 - "ESLint Config"
Cohesion: 0.38
Nodes (7): computeFatigueForSession(), detectAnomalies(), detectFatigue(), projectPCA(), safeMean(), safeStd(), splitBySession()

### Community 64 - "Community 64"
Cohesion: 0.08
Nodes (24): build, appId, directories, extraResources, files, mac, productName, win (+16 more)

## Knowledge Gaps
- **361 isolated node(s):** `modelStatus`, `validData`, `timestamps`, `speeds`, `throttles` (+356 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `MLAnalysis()` connect `Magic Number Extraction` to `ONNX Batching Fix`, `ML Config`?**
  _High betweenness centrality (0.081) - this node is a cross-community bridge._
- **Why does `TelemetryData` connect `Model Metrics` to `Node TSConfig`, `UI Label Fixes`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **What connects `modelStatus`, `validData`, `timestamps` to the rest of the system?**
  _369 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `ML Worker Core` be split into smaller, more focused modules?**
  _Cohesion score 0.0625 - nodes in this community are weakly interconnected._
- **Should `Model Metrics` be split into smaller, more focused modules?**
  _Cohesion score 0.06704260651629072 - nodes in this community are weakly interconnected._
- **Should `Electron & ONNX Runtime` be split into smaller, more focused modules?**
  _Cohesion score 0.043478260869565216 - nodes in this community are weakly interconnected._
- **Should `ML Training Pipeline` be split into smaller, more focused modules?**
  _Cohesion score 0.0773109243697479 - nodes in this community are weakly interconnected._