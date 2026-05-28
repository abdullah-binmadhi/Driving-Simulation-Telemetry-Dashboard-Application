# Graph Report - Driving-Simulation-Telemetry-Dashboard-Application  (2026-05-28)

## Corpus Check
- 75 files · ~206,636 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 854 nodes · 1190 edges · 59 communities (54 shown, 5 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `dccb0217`
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
- [[_COMMUNITY_Community 16|Community 16]]
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
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Validation & Testing|Validation & Testing]]
- [[_COMMUNITY_Deployment Guide|Deployment Guide]]
- [[_COMMUNITY_Magic Number Extraction|Magic Number Extraction]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_UI Label Fixes|UI Label Fixes]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Layout & Sidebar|Layout & Sidebar]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Car Health UI|Car Health UI]]
- [[_COMMUNITY_Lap Timing|Lap Timing]]
- [[_COMMUNITY_Live Graph|Live Graph]]
- [[_COMMUNITY_Live Multi Graph|Live Multi Graph]]
- [[_COMMUNITY_Tire Status UI|Tire Status UI]]
- [[_COMMUNITY_Friction Circle|Friction Circle]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Root TSConfig|Root TSConfig]]
- [[_COMMUNITY_ESLint Config|ESLint Config]]
- [[_COMMUNITY_Vite Config|Vite Config]]

## God Nodes (most connected - your core abstractions)
1. `MLAnalysis()` - 25 edges
2. `Fix` - 21 edges
3. `compilerOptions` - 20 edges
4. `compilerOptions` - 18 edges
5. `TelemetryData` - 18 edges
6. `scripts` - 16 edges
7. `useSettingsStore` - 16 edges
8. `ML Pipeline Restructure Plan` - 15 edges
9. `BeamNGConnector` - 14 edges
10. `useTelemetryStore` - 14 edges

## Surprising Connections (you probably didn't know these)
- `ortWasmThreaded()` --calls--> `require`  [INFERRED]
  public/assets/ort-wasm-simd-threaded.asyncify.mjs → electron/main.ts
- `ortWasmThreaded()` --calls--> `require`  [INFERRED]
  public/assets/ort-wasm-simd-threaded.jsep.mjs → electron/main.ts
- `SessionManager` --references--> `TelemetryData`  [EXTRACTED]
  electron/session-manager.ts → src/types/telemetry.ts
- `BeamNGConnector` --references--> `TelemetryData`  [EXTRACTED]
  electron/game-connectors/beamng.ts → src/types/telemetry.ts
- `TelemetryData` --references--> `TelemetryState`  [EXTRACTED]
  src/types/telemetry.ts → src/stores/telemetryStore.ts

## Communities (59 total, 5 thin omitted)

### Community 0 - "ML Worker Core"
Cohesion: 0.06
Nodes (29): accelerations, aggressionMatrix, anomalies, brakes, { dtwScore, trailPercent }, exitForecast, fatigue, gForcesCombined (+21 more)

### Community 1 - "Model Metrics"
Cohesion: 0.09
Nodes (14): GameConnector, AssettoCorsaConnector, BeamNGConnector, clamp(), normalizeArray(), normalizeHealth(), normalizeSteering(), numberOrUndefined() (+6 more)

### Community 2 - "Electron & ONNX Runtime"
Cohesion: 0.08
Nodes (26): devDependencies, autoprefixer, concurrently, cross-env, electron, electron-builder, eslint, @eslint/js (+18 more)

### Community 3 - "ML Training Pipeline"
Cohesion: 0.05
Nodes (46): dataset_files, dataset_rows, components, explained_variance, feature_count, pca_variance_pct, error, accuracy (+38 more)

### Community 4 - "PCA Profile"
Cohesion: 0.10
Nodes (19): ortWasmThreaded(), ortWasmThreaded(), db, __dirname, initDatabase(), buildMlCsvRows(), CsvRow, CsvValue (+11 more)

### Community 5 - "ML Analysis UI"
Cohesion: 0.09
Nodes (22): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection, moduleResolution (+14 more)

### Community 6 - "ML Inference Helpers"
Cohesion: 0.09
Nodes (22): 1. Slash Commands (`/agent-name`), 2. Automatic Delegation, 3. Named Mention, Agent Catalog, code:block1 (/explorer find where resolveBaseUrl is defined), code:block2 ("Find where database migrations are defined"), code:block3 ("Use the security-auditor to scan the Electron IPC handlers"), db-architect (+14 more)

### Community 7 - "State Clusters"
Cohesion: 0.10
Nodes (19): 1. The Dashboard (`/`), 2. Telemetry Analysis (`/analysis`), 3. Reaction Test (`/reaction`), 4. Settings Configuration (`/settings`), Assetto Corsa, BeamNG.drive (High-Fidelity), code:bash (git clone https://github.com/abdullah-binmadhi/Driving-Simul), code:bash (# Install all required dependencies) (+11 more)

### Community 8 - "Game Connectors"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, moduleResolution, noEmit (+11 more)

### Community 9 - "Statistical Helpers"
Cohesion: 0.12
Nodes (21): DataFrame, int, derive_labels(), load_all_csvs(), main(), Multi-Model ML Training Pipeline for Driving Telemetry Dashboard. Trains 8 model, Check which expected columns are missing from the dataset., Check which expected columns are missing from the dataset. (+13 more)

### Community 10 - "Electron Types"
Cohesion: 0.14
Nodes (10): DriverProfile(), SessionInfo(), Layout(), Settings(), AppSettings, DriverSettings, GameSettings, SessionSettings (+2 more)

### Community 11 - "Feature Config"
Cohesion: 0.13
Nodes (14): A. Core Physics and Kinematic Variables, A. Procedural Driver Modeling and Synthetic Data, A. The Live Dashboard Interface: A Pilot’s Perspective, B. Derived Behavioral and Efficiency Metrics: The "Why" Behind the Data, B. Impairment, Aggression, and Human-Factor Simulation, B. Vehicle Systems and Tire Thermal Dynamics, I. Introduction: The Intersection of Simulation and Data Science, II. Real-Time Telemetry and Visual Analytics (+6 more)

### Community 12 - "Settings & Logger"
Cohesion: 0.06
Nodes (55): code:typescript (// Around line 466-473, change from:), code:typescript (const decay = jerkMeans[0] > 0 ? (jerkMeans[3] / jerkMeans[0), code:typescript (const rawDecay = jerkMeans[0] > 0 ? (jerkMeans[3] / jerkMean), code:typescript (return {), code:tsx (// Instead of raw number, use:), code:typescript (FATIGUE_IMPROVEMENT_THRESH: -0.02, // decay below this = mea), code:typescript (for (let i = 0; i < speeds.length; i += ML_CONFIG.ANOMALY_DO), code:typescript (// In ml-config.ts:) (+47 more)

### Community 13 - "ML Restructure Plan"
Cohesion: 0.15
Nodes (13): 4a — Fix Safety Score Session-Length Dependency, 4b — Fix Safety Double-Counting of Understeer, 4c — Add Dedup Window to All Penalty Categories, 4d — Fix Jerk Magnitude Throughout, 4e — Fix KNN Confidence Normalization, 4f — Fix OLS Numerical Stability (Exit Forecast), code:typescript (const penaltyRate = totalPenalties / data.length;), code:typescript (// Before: 5 penalty categories including Understeer) (+5 more)

### Community 14 - "Package Build Config"
Cohesion: 0.15
Nodes (12): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, module, moduleResolution, outDir, rootDir, skipLibCheck (+4 more)

### Community 15 - "Dependencies"
Cohesion: 0.36
Nodes (7): Analysis(), SessionGraphs(), SessionGraphsProps, SessionList(), mockSessions, Session, useSessionStore

### Community 16 - "Community 16"
Cohesion: 0.04
Nodes (47): build, appId, directories, extraResources, files, mac, productName, win (+39 more)

### Community 17 - "Agent Catalog"
Cohesion: 0.15
Nodes (15): 0.1 — Add order-enforcement comments to `config.py`, 0.2 — Move TS feature lists to shared constants file, 0.3 — Add camelCase→snake_case conversion in `train_model.py`, 0.4 — Add CI verification script, 2.1 — Create `src/ml-config.ts`, 2.2 — Import and use in `mlWorker.ts`, 2.3 — Fix cross-file RPM inconsistency, Actions (+7 more)

### Community 18 - "Model Loader"
Cohesion: 0.29
Nodes (7): 1.3 Feature Column Name Mismatch, 4.1 Normalize All Feature Names to snake_case, code:python (TIRE_WEAR_FEATURES = [), code:ts (const TIRE_WEAR_FEATURES = [), code:python (# These are the canonical camelCase column names that normal), code:ts (const TIRE_WEAR_FEATURES = [), code:ts (function extractFeatures(row: Record<string, number>, featur)

### Community 19 - "NPM Scripts"
Cohesion: 0.04
Nodes (48): 1.1 Fix `normalizeRow` ({MLAnalysis.tsx}), 1.2 Timestamp-aware merging ({MLAnalysis.tsx}), 1.3 Column name cross-reference, 3.1 Timeout + Cancel, 3.2 Smooth progress, 3.3 Replace `alert()`, 3.4 Fix Tailwind JIT dynamic class, 4.10 Accessibility (+40 more)

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
Cohesion: 0.19
Nodes (14): DataLogger(), SessionStats, TrackMap(), TrackPoint, HistoryItem, ReactionTest(), TestMode, SessionState (+6 more)

### Community 24 - "Technical Report"
Cohesion: 0.20
Nodes (7): client, htmlUrl, htmlUrl2, outDir, outPath, pid, sid

### Community 25 - "Community 25"
Cohesion: 0.22
Nodes (7): 7.1 Add Model Status Indicator to `MLAnalysis.tsx`, 7.2 Add Worker Status Messages, 7.3 Add Model Quality Panel, 7. Phase 5: UI Feedback, code:ts (interface MLResults {), code:ts (self.postMessage({), code:tsx (<details>)

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

### Community 31 - "Dashboard & Stats"
Cohesion: 0.25
Nodes (7): Comprehensive ML Pipeline Configuration for Driving Telemetry All feature sets,, # NOTE: Feature ORDER must match ml-features.ts SHIFT_FEATURES exactly, # NOTE: Feature ORDER must match ml-features.ts PEDAL_FEATURES exactly, # NOTE: Feature ORDER must match ml-features.ts TIRE_WEAR_FEATURES exactly, # NOTE: Feature ORDER must match ml-features.ts GRIP_FEATURES exactly, # NOTE: Feature ORDER must match ml-features.ts HMM_FEATURES exactly, # NOTE: Feature ORDER must match ml-features.ts PCA_FEATURES exactly

### Community 33 - "Community 33"
Cohesion: 0.31
Nodes (10): Effort Summary, ML Pipeline Fix Plan, Phase 0: Feature Name Alignment, Phase 1: UI Label Accuracy, Phase 2: Magic Number Extraction, Problem, Problem, Problem (+2 more)

### Community 34 - "Validation & Testing"
Cohesion: 0.27
Nodes (11): classifyGrip(), classifyPedalOverlap(), classifyShifts(), _initModels(), loadModels(), predictTireWear(), projectPCA(), resolveBaseUrl() (+3 more)

### Community 35 - "Deployment Guide"
Cohesion: 0.20
Nodes (10): 3a — Batch ONNX Inference, 3b — Fix Silent Catch Blocks, 3c — Add `modelsLoaded` Retry, 3d — Differentiate Error Types, code:typescript (.catch((err) => {), code:typescript (// Before: per-row loop with [1, 20] tensor), code:typescript (if (session) {), code:typescript (const anyLoaded = Object.values(modelStatus).some(s => s ===) (+2 more)

### Community 36 - "Magic Number Extraction"
Cohesion: 0.16
Nodes (22): bgColorMap, Card(), colorMap, DynamicsTab(), INITIAL_RESULTS, Interpretation(), MLAnalysis(), OverviewTab() (+14 more)

### Community 37 - "Community 37"
Cohesion: 0.25
Nodes (7): After making React code changes:, code:bash (curl --fail --silent --show-error \), code:bash (npx react-doctor@latest --verbose --diff), Command, /doctor — full local triage workflow, For general cleanup or code improvement:, React Doctor

### Community 38 - "Community 38"
Cohesion: 0.33
Nodes (6): 5a — Remove `any` Casts, 5b — Fix `MLResults` Interface, 5c — Add Worker Output Validation, code:typescript (interface MLResults {), code:typescript (workerRef.current.onmessage = (e) => {), Phase 5: Type Safety

### Community 40 - "Community 40"
Cohesion: 0.33
Nodes (6): 4.2 Add Feature Order Validation, 4.3 Update `MLAnalysis.tsx` `normalizeRow()`, 4. Phase 2: Feature Alignment, code:json ({), code:ts (// Add these aliases to the existing map:), code:python (# Before ONNX export, save the exact feature order)

### Community 41 - "Layout & Sidebar"
Cohesion: 0.33
Nodes (5): centroids, features, n_clusters, scaler_mean, scaler_scale

### Community 42 - "Community 42"
Cohesion: 0.50
Nodes (4): 1.1 — Card subtitle labels, 1.2 — Interpretation text fixes, 1.3 — Quality Metric Card subtitles, Changes to `MLAnalysis.tsx`

### Community 43 - "Community 43"
Cohesion: 0.67
Nodes (3): code:bash (npx tsc -b          # TypeScript type check), code:bash (cd ml-pipeline && python train_model.py), Verification

### Community 44 - "Car Health UI"
Cohesion: 0.20
Nodes (11): CarHealth(), CarHealthProps, HealthIndicator(), Dashboard(), FrictionCircle, FrictionCircleProps, InputVisualizer, InputVisualizerProps (+3 more)

### Community 45 - "Lap Timing"
Cohesion: 0.67
Nodes (3): formatTime(), LapTiming(), LapTimingProps

### Community 47 - "Live Multi Graph"
Cohesion: 0.50
Nodes (3): LiveMultiGraph, LiveMultiGraphProps, MultiTraceDataPoint

### Community 49 - "Friction Circle"
Cohesion: 0.27
Nodes (11): 10. Risk Register, 2.1 Key Architectural Changes, 2. Target Architecture, 9. Implementation Timeline, Appendix A: Files Changed Summary, Appendix B: `MLResults` Type Definition (Full), Appendix C: Feature Map Cross-Reference, code:ts (interface MLResults {) (+3 more)

### Community 50 - "Community 50"
Cohesion: 0.67
Nodes (3): BehaviorAnalysis, BehaviorAnalysisProps, ProgressBar

### Community 51 - "Community 51"
Cohesion: 0.51
Nodes (9): clamp(), estimateTireTemperature(), firstNumber(), firstPowertrainDevice(), getDeviceHealth(), getPosition(), getPressurePsi(), getWheelData() (+1 more)

### Community 54 - "ESLint Config"
Cohesion: 0.29
Nodes (10): clusterStates(), computeFatigueForSession(), detectAnomalies(), detectFatigue(), jerkMagnitude(), medianDt(), mergeSessions(), safeMean() (+2 more)

## Knowledge Gaps
- **378 isolated node(s):** `tsBuildInfoFile`, `target`, `lib`, `module`, `types` (+373 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `TelemetryData` connect `Model Metrics` to `PCA Profile`, `UI Label Fixes`, `Node TSConfig`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **Why does `MLAnalysis()` connect `Magic Number Extraction` to `ONNX Batching Fix`, `ESLint Config`, `ML Config`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **What connects `tsBuildInfoFile`, `target`, `lib` to the rest of the system?**
  _397 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `ML Worker Core` be split into smaller, more focused modules?**
  _Cohesion score 0.059379217273954114 - nodes in this community are weakly interconnected._
- **Should `Model Metrics` be split into smaller, more focused modules?**
  _Cohesion score 0.0858843537414966 - nodes in this community are weakly interconnected._
- **Should `Electron & ONNX Runtime` be split into smaller, more focused modules?**
  _Cohesion score 0.07692307692307693 - nodes in this community are weakly interconnected._
- **Should `ML Training Pipeline` be split into smaller, more focused modules?**
  _Cohesion score 0.05230496453900709 - nodes in this community are weakly interconnected._