# Graph Report - Driving-Simulation-Telemetry-Dashboard-Application  (2026-05-24)

## Corpus Check
- 67 files · ~54,356 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 331 nodes · 341 edges · 19 communities (14 shown, 5 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `55181480`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 18|Community 18]]

## God Nodes (most connected - your core abstractions)
1. `scripts` - 10 edges
2. `SessionManager` - 9 edges
3. `models` - 9 edges
4. `build` - 8 edges
5. `MockConnector` - 7 edges
6. `extractFeatures()` - 6 edges
7. `tire_wear_rf` - 6 edges
8. `train_all()` - 5 edges
9. `main()` - 5 edges
10. `grip_dt` - 5 edges

## Surprising Connections (you probably didn't know these)
- `train_all()` --calls--> `pca`  [INFERRED]
  ml-pipeline/train_model.py → src/components/MLAnalysis/mlWorker.ts

## Communities (19 total, 5 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.02
Nodes (123): accelerations, aggGrid, aggMatrix, anomalyData, ans, bCounts, bDists, bdt (+115 more)

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (40): dataset_files, dataset_rows, components, explained_variance, feature_count, pca_variance_pct, error, accuracy (+32 more)

### Community 2 - "Community 2"
Cohesion: 0.13
Nodes (11): db, __dirname, initDatabase(), __dirname, id, now, require, windows (+3 more)

### Community 3 - "Community 3"
Cohesion: 0.20
Nodes (13): derive_labels(), load_all_csvs(), main(), Multi-Model ML Training Pipeline for Driving Telemetry Dashboard. Trains 8 model, Convert sklearn model to ONNX and save., Train all 8 models and return metrics., Load all CSV files from dataset/, skipping # comment headers., Check which expected columns are missing from the dataset. (+5 more)

### Community 4 - "Community 4"
Cohesion: 0.29
Nodes (6): components, explained_variance_ratio, features, mean, scaler_mean, scaler_scale

### Community 6 - "Community 6"
Cohesion: 0.33
Nodes (6): classifyGrip(), classifyPedalOverlap(), classifyShifts(), clusterStates(), extractFeatures(), projectPCA()

### Community 7 - "Community 7"
Cohesion: 0.33
Nodes (5): centroids, features, n_clusters, scaler_mean, scaler_scale

### Community 9 - "Community 9"
Cohesion: 0.50
Nodes (4): detectFatigue(), safeMean(), safeStd(), slice

### Community 13 - "Community 13"
Cohesion: 0.07
Nodes (26): build, appId, directories, extraResources, files, mac, productName, win (+18 more)

### Community 14 - "Community 14"
Cohesion: 0.08
Nodes (25): devDependencies, autoprefixer, concurrently, cross-env, electron, electron-builder, eslint, @eslint/js (+17 more)

### Community 15 - "Community 15"
Cohesion: 0.09
Nodes (22): dependencies, better-sqlite3, clsx, express, lucide-react, ml-kmeans, ml-knn, ml-logistic-regression (+14 more)

## Knowledge Gaps
- **242 isolated node(s):** `name`, `private`, `version`, `type`, `main` (+237 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `pca` connect `Community 3` to `Community 0`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `Community 14` to `Community 13`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _249 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.015503875968992248 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.04878048780487805 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.12987012987012986 - nodes in this community are weakly interconnected._
- **Should `Community 13` be split into smaller, more focused modules?**
  _Cohesion score 0.07407407407407407 - nodes in this community are weakly interconnected._