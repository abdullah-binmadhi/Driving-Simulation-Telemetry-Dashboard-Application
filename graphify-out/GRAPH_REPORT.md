# Graph Report - .  (2026-05-26)

## Corpus Check
- 77 files · ~63,831 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 677 nodes · 807 edges · 63 communities (50 shown, 13 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 7 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

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
- [[_COMMUNITY_Algorithm Fixes|Algorithm Fixes]]
- [[_COMMUNITY_Electron TSConfig|Electron TSConfig]]
- [[_COMMUNITY_Session Analysis|Session Analysis]]
- [[_COMMUNITY_Feature Alignment Phase|Feature Alignment Phase]]
- [[_COMMUNITY_Architecture Problems|Architecture Problems]]
- [[_COMMUNITY_BeamNG Lua Telemetry|BeamNG Lua Telemetry]]
- [[_COMMUNITY_Dashboard & Stats|Dashboard & Stats]]
- [[_COMMUNITY_ONNX Batching Fix|ONNX Batching Fix]]
- [[_COMMUNITY_Feature Alignment v2|Feature Alignment v2]]
- [[_COMMUNITY_Validation & Testing|Validation & Testing]]
- [[_COMMUNITY_Deployment Guide|Deployment Guide]]
- [[_COMMUNITY_Magic Number Extraction|Magic Number Extraction]]
- [[_COMMUNITY_ML Fix Plan Root|ML Fix Plan Root]]
- [[_COMMUNITY_App Shell & Reaction Test|App Shell & Reaction Test]]
- [[_COMMUNITY_UI Label Fixes|UI Label Fixes]]
- [[_COMMUNITY_Type Safety Fixes|Type Safety Fixes]]
- [[_COMMUNITY_Layout & Sidebar|Layout & Sidebar]]
- [[_COMMUNITY_Telemetry Store|Telemetry Store]]
- [[_COMMUNITY_Behavior Analysis|Behavior Analysis]]
- [[_COMMUNITY_Car Health UI|Car Health UI]]
- [[_COMMUNITY_Lap Timing|Lap Timing]]
- [[_COMMUNITY_Live Graph|Live Graph]]
- [[_COMMUNITY_Live Multi Graph|Live Multi Graph]]
- [[_COMMUNITY_Tire Status UI|Tire Status UI]]
- [[_COMMUNITY_Friction Circle|Friction Circle]]
- [[_COMMUNITY_Input Visualizer|Input Visualizer]]
- [[_COMMUNITY_RPM Gauge|RPM Gauge]]
- [[_COMMUNITY_Speedometer|Speedometer]]
- [[_COMMUNITY_Root TSConfig|Root TSConfig]]
- [[_COMMUNITY_ESLint Config|ESLint Config]]
- [[_COMMUNITY_PostCSS Config|PostCSS Config]]
- [[_COMMUNITY_Tailwind Config|Tailwind Config]]
- [[_COMMUNITY_Vite Config|Vite Config]]
- [[_COMMUNITY_Community 58|Community 58]]

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 20 edges
2. `compilerOptions` - 18 edges
3. `TelemetryData` - 18 edges
4. `useSettingsStore` - 16 edges
5. `ML Pipeline Restructure Plan` - 15 edges
6. `BeamNGConnector` - 14 edges
7. `useTelemetryStore` - 13 edges
8. `compilerOptions` - 11 edges
9. `scripts` - 11 edges
10. `ConnectionManager` - 11 edges

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

## Communities (63 total, 13 thin omitted)

### Community 0 - "ML Worker Core"
Cohesion: 0.04
Nodes (47): accelerations, aggressionMatrix, anomalyData, brakes, brakeZones, currZone, d, distances (+39 more)

### Community 1 - "Model Metrics"
Cohesion: 0.07
Nodes (14): GameConnector, AssettoCorsaConnector, BeamNGConnector, clamp(), normalizeArray(), normalizeHealth(), normalizeSteering(), numberOrUndefined() (+6 more)

### Community 2 - "Electron & ONNX Runtime"
Cohesion: 0.05
Nodes (40): build, appId, directories, extraResources, files, mac, productName, win (+32 more)

### Community 3 - "ML Training Pipeline"
Cohesion: 0.05
Nodes (40): dataset_files, dataset_rows, components, explained_variance, feature_count, pca_variance_pct, error, accuracy (+32 more)

### Community 4 - "PCA Profile"
Cohesion: 0.10
Nodes (13): ortWasmThreaded(), ortWasmThreaded(), db, __dirname, initDatabase(), __dirname, id, now (+5 more)

### Community 5 - "ML Analysis UI"
Cohesion: 0.09
Nodes (22): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection, moduleResolution (+14 more)

### Community 6 - "ML Inference Helpers"
Cohesion: 0.09
Nodes (21): 1. Slash Commands (`/agent-name`), 2. Automatic Delegation, 3. Named Mention, Agent Catalog, code:block1 (/explorer find where resolveBaseUrl is defined), code:block2 ("Find where database migrations are defined"), code:block3 ("Use the security-auditor to scan the Electron IPC handlers"), db-architect (+13 more)

### Community 7 - "State Clusters"
Cohesion: 0.10
Nodes (19): 1. The Dashboard (`/`), 2. Telemetry Analysis (`/analysis`), 3. Reaction Test (`/reaction`), 4. Settings Configuration (`/settings`), Assetto Corsa, BeamNG.drive (High-Fidelity), code:bash (git clone https://github.com/abdullah-binmadhi/Driving-Simul), code:bash (# Install all required dependencies) (+11 more)

### Community 8 - "Game Connectors"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, moduleResolution, noEmit (+11 more)

### Community 9 - "Statistical Helpers"
Cohesion: 0.17
Nodes (16): DataFrame, int, derive_labels(), load_all_csvs(), main(), Multi-Model ML Training Pipeline for Driving Telemetry Dashboard. Trains 8 model, Check which expected columns are missing from the dataset., Derive supervised labels that aren't directly in the raw telemetry. (+8 more)

### Community 10 - "Electron Types"
Cohesion: 0.19
Nodes (10): DataLogger(), DriverProfile(), SessionInfo(), Settings(), AppSettings, DriverSettings, GameSettings, SessionSettings (+2 more)

### Community 11 - "Feature Config"
Cohesion: 0.13
Nodes (14): A. Core Physics and Kinematic Variables, A. Procedural Driver Modeling and Synthetic Data, A. The Live Dashboard Interface: A Pilot’s Perspective, B. Derived Behavioral and Efficiency Metrics: The "Why" Behind the Data, B. Impairment, Aggression, and Human-Factor Simulation, B. Vehicle Systems and Tire Thermal Dynamics, I. Introduction: The Intersection of Simulation and Data Science, II. Real-Time Telemetry and Visual Analytics (+6 more)

### Community 12 - "Settings & Logger"
Cohesion: 0.14
Nodes (14): dependencies, better-sqlite3, clsx, express, lucide-react, onnxruntime-web, papaparse, react (+6 more)

### Community 13 - "ML Restructure Plan"
Cohesion: 0.15
Nodes (13): 4a — Fix Safety Score Session-Length Dependency, 4b — Fix Safety Double-Counting of Understeer, 4c — Add Dedup Window to All Penalty Categories, 4d — Fix Jerk Magnitude Throughout, 4e — Fix KNN Confidence Normalization, 4f — Fix OLS Numerical Stability (Exit Forecast), code:typescript (const penaltyRate = totalPenalties / data.length;), code:typescript (// Before: 5 penalty categories including Understeer) (+5 more)

### Community 14 - "Package Build Config"
Cohesion: 0.15
Nodes (12): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, module, moduleResolution, outDir, rootDir, skipLibCheck (+4 more)

### Community 15 - "Dependencies"
Cohesion: 0.24
Nodes (7): Analysis(), SessionGraphsProps, SessionList(), mockSessions, Session, SessionState, useSessionStore

### Community 16 - "App TSConfig"
Cohesion: 0.49
Nodes (10): clamp(), estimateTireTemperature(), firstNumber(), firstPowertrainDevice(), getDeviceHealth(), getPosition(), getPressurePsi(), getWheelData() (+2 more)

### Community 17 - "Agent Catalog"
Cohesion: 0.18
Nodes (11): 0.1 — Add order-enforcement comments to `config.py`, 0.2 — Move TS feature lists to shared constants file, 0.3 — Add camelCase→snake_case conversion in `train_model.py`, 0.4 — Add CI verification script, Actions, code:python (# NOTE: Feature ORDER must match mlWorker.ts TIRE_WEAR_FEATU), code:typescript (// ─── Feature maps — ORDER must match config.py ───────────), code:typescript (import { TIRE_WEAR_FEATURES, GRIP_FEATURES, ... } from '../.) (+3 more)

### Community 18 - "Model Loader"
Cohesion: 0.18
Nodes (11): 1.1 Dead Code: Two Competing `self.onmessage` Handlers, 1.2 Dead Functions & Variables, 1.3 Feature Column Name Mismatch, 1.4 Empty Training Dataset, 1.5 Synthetic/Fake Training Data at Runtime, 1.6 Silent Fallbacks, 1.7 `resolveBaseUrl()` Defined Twice, 1. Current Architecture Problems (+3 more)

### Community 19 - "NPM Scripts"
Cohesion: 0.18
Nodes (11): scripts, build, build:electron, dev, dev:electron, dev:ui, electron:dev, lint (+3 more)

### Community 20 - "Feature Names"
Cohesion: 0.20
Nodes (10): 3a — Batch ONNX Inference, 3b — Fix Silent Catch Blocks, 3c — Add `modelsLoaded` Retry, 3d — Differentiate Error Types, code:typescript (.catch((err) => {), code:typescript (// Before: per-row loop with [1, 20] tensor), code:typescript (if (session) {), code:typescript (const anyLoaded = Object.values(modelStatus).some(s => s ===) (+2 more)

### Community 21 - "Project README"
Cohesion: 0.20
Nodes (10): 8.1 TypeScript Compilation, 8.2 Vite Build, 8.3 ONNX Model Validation, 8.4 Browser Smoke Test, 8.5 Edge Case Tests, 8.6 Cross-Session Consistency Test, 8. Phase 6: Validation & Testing, code:bash (npx tsc --noEmit) (+2 more)

### Community 22 - "ML Config"
Cohesion: 0.20
Nodes (10): 4.1 Normalize All Feature Names to snake_case, 4.2 Add Feature Order Validation, 4.3 Update `MLAnalysis.tsx` `normalizeRow()`, 4. Phase 2: Feature Alignment, code:json ({), code:ts (// Add these aliases to the existing map:), code:python (# These are the canonical camelCase column names that normal), code:ts (const TIRE_WEAR_FEATURES = [) (+2 more)

### Community 23 - "Node TSConfig"
Cohesion: 0.38
Nodes (6): Dashboard(), SessionStats, TrackMap(), TrackPoint, useTelemetryListener(), useTelemetryStore

### Community 24 - "Technical Report"
Cohesion: 0.22
Nodes (7): 7.1 Add Model Status Indicator to `MLAnalysis.tsx`, 7.2 Add Worker Status Messages, 7.3 Add Model Quality Panel, 7. Phase 5: UI Feedback, code:ts (interface MLResults {), code:ts (self.postMessage({), code:tsx (<details>)

### Community 25 - "Algorithm Fixes"
Cohesion: 0.22
Nodes (9): 5.1 Locate or Generate Training Data, 5.2 Fix `train_model.py` to Export Feature Order, 5.3 Add Train/Test Split to `train_model.py`, 5.4 Export Scaler Parameters, 5. Phase 3: Offline Training Pipeline Fix, code:python (# After training each model, before ONNX export:), code:python (from sklearn.model_selection import train_test_split), code:python (from sklearn.preprocessing import StandardScaler) (+1 more)

### Community 26 - "Electron TSConfig"
Cohesion: 0.22
Nodes (8): 10. Risk Register, 9. Implementation Timeline, Appendix A: Files Changed Summary, Appendix B: `MLResults` Type Definition (Full), Appendix C: Feature Map Cross-Reference, code:ts (interface MLResults {), ML Pipeline Restructure Plan, Table of Contents

### Community 27 - "Session Analysis"
Cohesion: 0.25
Nodes (8): 2.1 — Create `src/ml-config.ts`, 2.2 — Import and use in `mlWorker.ts`, 2.3 — Fix cross-file RPM inconsistency, Actions, code:typescript (export const ML_CONFIG = {), code:typescript (import { ML_CONFIG } from '../../ml-config';), Phase 2: Magic Number Extraction, Problem

### Community 28 - "Feature Alignment Phase"
Cohesion: 0.25
Nodes (7): code:bash (npx tsc -b          # TypeScript type check), code:bash (cd ml-pipeline && python train_model.py), Effort Summary, ML Pipeline Fix Plan, Recommended Order, Table of Contents, Verification

### Community 29 - "Architecture Problems"
Cohesion: 0.25
Nodes (8): 6.1 New `mlWorker.ts` Architecture, 6.2 Remove Live Training Imports, 6.3 Remove Synthetic Training Code Blocks, 6.4 Update `package.json` Dependencies, 6. Phase 4: Worker Restructure, code:ts (// ─── 1. Imports ──────────────────────────────────────────), code:ts (import KMeans from 'ml-kmeans';), code:json ("ml-kmeans": "^7.0.0",)

### Community 30 - "BeamNG Lua Telemetry"
Cohesion: 0.25
Nodes (7): Code Signing (Important), code:bash (npm run build), code:bash (dist-app/), Deployment Guide, How to Build / Deploy, Output Location, Why Desktop?

### Community 31 - "Dashboard & Stats"
Cohesion: 0.25
Nodes (7): Comprehensive ML Pipeline Configuration for Driving Telemetry All feature sets,, # NOTE: Feature ORDER must match ml-features.ts SHIFT_FEATURES exactly, # NOTE: Feature ORDER must match ml-features.ts PEDAL_FEATURES exactly, # NOTE: Feature ORDER must match ml-features.ts TIRE_WEAR_FEATURES exactly, # NOTE: Feature ORDER must match ml-features.ts GRIP_FEATURES exactly, # NOTE: Feature ORDER must match ml-features.ts HMM_FEATURES exactly, # NOTE: Feature ORDER must match ml-features.ts PCA_FEATURES exactly

### Community 32 - "ONNX Batching Fix"
Cohesion: 0.29
Nodes (3): HistoryItem, ReactionTest(), TestMode

### Community 33 - "Feature Alignment v2"
Cohesion: 0.29
Nodes (6): components, explained_variance_ratio, features, mean, scaler_mean, scaler_scale

### Community 34 - "Validation & Testing"
Cohesion: 0.29
Nodes (7): classifyGrip(), classifyPedalOverlap(), classifyShifts(), clusterStates(), extractFeatures(), jerkMagnitude(), projectPCA()

### Community 35 - "Deployment Guide"
Cohesion: 0.29
Nodes (6): GRIP_FEATURES, HMM_FEATURES, PCA_FEATURES, PEDAL_FEATURES, SHIFT_FEATURES, TIRE_WEAR_FEATURES

### Community 37 - "ML Fix Plan Root"
Cohesion: 0.33
Nodes (6): 1.1 — Card subtitle labels, 1.2 — Interpretation text fixes, 1.3 — Quality Metric Card subtitles, Changes to `MLAnalysis.tsx`, Phase 1: UI Label Accuracy, Problem

### Community 38 - "App Shell & Reaction Test"
Cohesion: 0.33
Nodes (6): 5a — Remove `any` Casts, 5b — Fix `MLResults` Interface, 5c — Add Worker Output Validation, code:typescript (interface MLResults {), code:typescript (workerRef.current.onmessage = (e) => {), Phase 5: Type Safety

### Community 39 - "UI Label Fixes"
Cohesion: 0.47
Nodes (5): clamp(), enrichTelemetry(), MultiTraceDataPoint, signalSign(), TelemetryState

### Community 41 - "Layout & Sidebar"
Cohesion: 0.33
Nodes (5): centroids, features, n_clusters, scaler_mean, scaler_scale

### Community 42 - "Telemetry Store"
Cohesion: 0.40
Nodes (5): 3.1 Remove All Dead Code from `mlWorker.ts`, 3.2 Remove Unused npm Dependencies, 3.3 Delete Dead `resolveBaseUrl()` Duplicate, 3. Phase 1: Codebase Cleanup, code:ts (import * as ort from 'onnxruntime-web';)

### Community 43 - "Behavior Analysis"
Cohesion: 0.50
Nodes (3): BehaviorAnalysis, BehaviorAnalysisProps, ProgressBar

### Community 45 - "Lap Timing"
Cohesion: 0.67
Nodes (3): formatTime(), LapTiming(), LapTimingProps

### Community 47 - "Live Multi Graph"
Cohesion: 0.50
Nodes (3): LiveMultiGraph, LiveMultiGraphProps, MultiTraceDataPoint

### Community 49 - "Friction Circle"
Cohesion: 0.67
Nodes (3): 2.1 Key Architectural Changes, 2. Target Architecture, code:block4 (┌───────────────────────────────────────────────────────────)

### Community 54 - "ESLint Config"
Cohesion: 0.67
Nodes (3): detectFatigue(), safeMean(), safeStd()

## Knowledge Gaps
- **361 isolated node(s):** `tsBuildInfoFile`, `target`, `lib`, `module`, `types` (+356 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `TelemetryData` connect `Model Metrics` to `PCA Profile`, `Node TSConfig`, `UI Label Fixes`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **Why does `ML Pipeline Restructure Plan` connect `Electron TSConfig` to `Telemetry Store`, `Friction Circle`, `Model Loader`, `Project README`, `ML Config`, `Technical Report`, `Algorithm Fixes`, `Architecture Problems`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **Why does `ML Pipeline Fix Plan` connect `Feature Alignment Phase` to `ML Fix Plan Root`, `App Shell & Reaction Test`, `ML Restructure Plan`, `Agent Catalog`, `Feature Names`, `Session Analysis`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **What connects `tsBuildInfoFile`, `target`, `lib` to the rest of the system?**
  _374 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `ML Worker Core` be split into smaller, more focused modules?**
  _Cohesion score 0.037037037037037035 - nodes in this community are weakly interconnected._
- **Should `Model Metrics` be split into smaller, more focused modules?**
  _Cohesion score 0.07239819004524888 - nodes in this community are weakly interconnected._
- **Should `Electron & ONNX Runtime` be split into smaller, more focused modules?**
  _Cohesion score 0.04878048780487805 - nodes in this community are weakly interconnected._