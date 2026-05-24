# Graph Report - Driving-Simulation-Telemetry-Dashboard-Application  (2026-05-24)

## Corpus Check
- 65 files · ~51,919 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 251 nodes · 263 edges · 14 communities (10 shown, 4 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `ef8fe39f`
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

## God Nodes (most connected - your core abstractions)
1. `SessionManager` - 9 edges
2. `models` - 9 edges
3. `MockConnector` - 7 edges
4. `tire_wear_rf` - 6 edges
5. `extractFeatures()` - 6 edges
6. `train_all()` - 5 edges
7. `main()` - 5 edges
8. `grip_dt` - 5 edges
9. `states_kmeans` - 5 edges
10. `driver_pca` - 5 edges

## Surprising Connections (you probably didn't know these)
- `train_all()` --calls--> `pca`  [INFERRED]
  ml-pipeline/train_model.py → src/components/MLAnalysis/mlWorker.ts

## Communities (14 total, 4 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.02
Nodes (122): accelerations, aggGrid, aggMatrix, anomalyData, ans, bCounts, bDists, bdt (+114 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (34): dataset_files, dataset_rows, components, explained_variance, feature_count, pca_variance_pct, error, accuracy (+26 more)

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
Cohesion: 0.33
Nodes (6): tire_wear_rf, convergence, feature_count, features, mse, r2

## Knowledge Gaps
- **175 isolated node(s):** `MLResults`, `INITIAL_RESULTS`, `__dirname`, `db`, `require` (+170 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `pca` connect `Community 3` to `Community 0`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._
- **Why does `models` connect `Community 1` to `Community 13`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **What connects `MLResults`, `INITIAL_RESULTS`, `__dirname` to the rest of the system?**
  _182 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.015503875968992248 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.05714285714285714 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.12987012987012986 - nodes in this community are weakly interconnected._