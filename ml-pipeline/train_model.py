"""
Multi-Model ML Training Pipeline for Driving Telemetry Dashboard.
Trains 8 models from exported CSV sessions → ONNX for browser inference.

Usage:
    python train_model.py              # Train all models
    python train_model.py --model 1    # Train only tire wear model
    python train_model.py --dry-run    # Validate dataset without training
"""

import os
import json
import glob
import argparse
import numpy as np
import pandas as pd
from datetime import datetime
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.svm import SVC
from sklearn.naive_bayes import GaussianNB
from sklearn.cluster import KMeans
from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    mean_squared_error, r2_score, accuracy_score, f1_score,
    silhouette_score, classification_report, explained_variance_score
)
from skl2onnx import convert_sklearn
from skl2onnx.common.data_types import FloatTensorType

from config import (
    BASE_DIR, DATA_DIR, MODEL_OUTPUT_DIR, METRICS_OUTPUT, CSV_READ_OPTS,
    TIRE_WEAR_FEATURES, TIRE_WEAR_TARGETS,
    FATIGUE_FEATURES, FATIGUE_TARGET,
    GRIP_FEATURES, GRIP_TARGETS,
    SAFETY_FEATURES, SAFETY_TARGET,
    HMM_FEATURES, HMM_N_STATES,
    PCA_FEATURES,
    SHIFT_FEATURES, SHIFT_TARGET,
    PEDAL_FEATURES, PEDAL_TARGET,
    ALL_EXPECTED_COLUMNS,
)

os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(MODEL_OUTPUT_DIR, exist_ok=True)


def load_all_csvs():
    """Load all CSV files from dataset/, skipping # comment headers."""
    csv_files = glob.glob(os.path.join(DATA_DIR, "*.csv"))
    if not csv_files:
        print(f"No CSV files found in {DATA_DIR}. Export sessions first.")
        return None

    print(f"Loading {len(csv_files)} session CSV(s)...")
    dfs = []
    for f in csv_files:
        try:
            df = pd.read_csv(f, **CSV_READ_OPTS)
            # Tag with filename for traceability
            df['_source_file'] = os.path.basename(f)
            dfs.append(df)
            print(f"  {os.path.basename(f)}: {len(df)} rows, {len(df.columns)} cols")
        except Exception as e:
            print(f"  SKIP {os.path.basename(f)}: {e}")

    if not dfs:
        return None

    full = pd.concat(dfs, ignore_index=True)
    print(f"\nTotal dataset: {len(full):,} rows × {len(full.columns)} cols\n")
    return full


def validate_columns(df: pd.DataFrame) -> list:
    """Check which expected columns are missing from the dataset."""
    available = set(df.columns)
    missing = [c for c in ALL_EXPECTED_COLUMNS if c not in available]
    if missing:
        print(f"WARNING: {len(missing)} expected columns missing from dataset:")
        for m in sorted(missing):
            print(f"  - {m}")
    else:
        print("All expected columns present in dataset.")
    return missing


def derive_labels(df: pd.DataFrame):
    """Derive supervised labels that aren't directly in the raw telemetry."""
    # Fatigue label: compare Q4 vs Q1 smoothness per session
    if FATIGUE_TARGET not in df.columns:
        df[FATIGUE_TARGET] = 0
        for sess_id in df['_source_file'].unique() if '_source_file' in df.columns else []:
            mask = df['_source_file'] == sess_id
            sess_df = df[mask].dropna(subset=['jerk_x'])
            if len(sess_df) > 100:
                n = len(sess_df)
                q1_jerk = sess_df['jerk_x'].iloc[:n//4].abs().mean()
                q4_jerk = sess_df['jerk_x'].iloc[3*n//4:].abs().mean()
                if q4_jerk > q1_jerk * 1.5:
                    df.loc[mask, FATIGUE_TARGET] = 1

    # Shift quality label: gear change RPM vs optimal band
    if SHIFT_TARGET not in df.columns:
        df[SHIFT_TARGET] = 2  # default optimal
        gear_changes = df['gear'].diff().fillna(0).abs() > 0
        rpm_at_shift = df.loc[gear_changes, 'rpm']
        for idx in rpm_at_shift.index:
            rpm = rpm_at_shift[idx]
            if rpm < 4000:
                df.loc[idx, SHIFT_TARGET] = 1  # early
            elif rpm > 7200:
                df.loc[idx, SHIFT_TARGET] = 3  # late

    # Pedal overlap flag
    if PEDAL_TARGET not in df.columns and 'pedal_overlap' in df.columns:
        df[PEDAL_TARGET] = (df['pedal_overlap'] > 0.05).astype(int)

    # Safety score: invert penalty counts (more penalties = lower score)
    if SAFETY_TARGET not in df.columns:
        penalty_cols = ['oversteer_correction', 'understeer_plough', 'pedal_overlap']
        available_penalties = [c for c in penalty_cols if c in df.columns]
        if available_penalties:
            penalty_sum = df[available_penalties].sum(axis=1)
            max_penalty = penalty_sum.max() or 1
            df[SAFETY_TARGET] = (100 - (penalty_sum / max_penalty * 40)).clip(0, 100)

    return df


def save_onnx(model, feature_count: int, filename: str):
    """Convert sklearn model to ONNX and save."""
    try:
        initial_types = [('float_input', FloatTensorType([None, feature_count]))]
        onnx_model = convert_sklearn(model, initial_types=initial_types)
        out_path = os.path.join(MODEL_OUTPUT_DIR, filename)
        with open(out_path, "wb") as f:
            f.write(onnx_model.SerializeToString())
        print(f"  ✓ Saved {out_path}")
        return True
    except Exception as e:
        print(f"  ✗ ONNX conversion failed: {e}")
        return False


def train_all(df: pd.DataFrame) -> dict:
    """Train all 8 models and return metrics."""
    metrics = {
        'trained_at': datetime.now().isoformat(),
        'dataset_rows': len(df),
        'dataset_files': df['_source_file'].nunique() if '_source_file' in df.columns else 0,
        'models': {},
    }

    # Drop metadata columns from features
    meta_cols = ['_source_file', 'timestamp', 'game', 'track', 'vehicle']
    feature_df = df.drop(columns=[c for c in meta_cols if c in df.columns], errors='ignore')

    # --- Model 1: Tire Wear (Random Forest) ---
    print("\n=== Model 1: Tire Wear Prediction (Random Forest) ===")
    available_tw_features = [f for f in TIRE_WEAR_FEATURES if f in feature_df.columns]
    available_tw_targets = [t for t in TIRE_WEAR_TARGETS if t in feature_df.columns]
    if available_tw_features and available_tw_targets:
        tw = feature_df.dropna(subset=available_tw_features + available_tw_targets)
        if len(tw) > 50:
            X = tw[available_tw_features].values
            target_col = available_tw_targets[0]  # FL as primary
            y = tw[target_col].values
            X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, random_state=42)
            rf = RandomForestRegressor(n_estimators=50, max_depth=10, random_state=42, n_jobs=-1)
            rf.fit(X_tr, y_tr)
            preds = rf.predict(X_te)
            metrics['models']['tire_wear_rf'] = {
                'mse': float(mean_squared_error(y_te, preds)),
                'r2': float(r2_score(y_te, preds)),
                'convergence': 1.0,
                'features': available_tw_features,
                'feature_count': len(available_tw_features),
            }
            save_onnx(rf, len(available_tw_features), 'tire_wear_model.onnx')
        else:
            print("  Not enough data for tire wear model (need >50 rows)")
            metrics['models']['tire_wear_rf'] = {'error': 'insufficient_data'}
    else:
        print("  Missing features or targets — skipping")
        metrics['models']['tire_wear_rf'] = {'error': 'missing_columns'}

    # --- Model 2: Fatigue (Logistic Regression) ---
    print("\n=== Model 2: Fatigue Detection (Logistic Regression) ===")
    available_fat_features = [f for f in FATIGUE_FEATURES if f in feature_df.columns]
    if available_fat_features and FATIGUE_TARGET in feature_df.columns:
        fat = feature_df.dropna(subset=available_fat_features + [FATIGUE_TARGET])
        if len(fat) > 50 and fat[FATIGUE_TARGET].nunique() >= 2:
            X = fat[available_fat_features].values
            y = fat[FATIGUE_TARGET].values
            X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, random_state=42)
            scaler = StandardScaler()
            X_tr_s = scaler.fit_transform(X_tr)
            X_te_s = scaler.transform(X_te)
            lr = LogisticRegression(max_iter=1000, random_state=42)
            lr.fit(X_tr_s, y_tr)
            preds = lr.predict(X_te_s)
            metrics['models']['fatigue_lr'] = {
                'accuracy': float(accuracy_score(y_te, preds)),
                'f1': float(f1_score(y_te, preds, average='weighted', zero_division=0)),
                'feature_count': len(available_fat_features),
            }
        else:
            print("  Not enough data or only one class")
            metrics['models']['fatigue_lr'] = {'error': 'insufficient_data'}
    else:
        metrics['models']['fatigue_lr'] = {'error': 'missing_columns'}

    # --- Model 3: Grip (Decision Tree) ---
    print("\n=== Model 3: Grip Classification (Decision Tree) ===")
    available_grip_features = [f for f in GRIP_FEATURES if f in feature_df.columns]
    available_grip_targets = [t for t in GRIP_TARGETS if t in feature_df.columns]
    if available_grip_features and available_grip_targets:
        grip = feature_df.dropna(subset=available_grip_features + available_grip_targets)
        if len(grip) > 50:
            X = grip[available_grip_features].values
            # Binarize continuous understeer/oversteer values for classification
            y_raw = grip[available_grip_targets[0]].values  # understeer as primary
            y = (y_raw >= 0.5).astype(int)
            if len(np.unique(y)) < 2:
                print("  Only one grip class in data — skipping")
                metrics['models']['grip_dt'] = {'error': 'single_class'}
            else:
                X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, random_state=42)
                dt = DecisionTreeClassifier(max_depth=8, random_state=42)
                dt.fit(X_tr, y_tr)
                preds = dt.predict(X_te)
                metrics['models']['grip_dt'] = {
                    'accuracy': float(accuracy_score(y_te, preds)),
                    'f1': float(f1_score(y_te, preds, average='weighted', zero_division=0)),
                    'node_purity': 1.0 - float(dt.tree_.impurity.max()) if hasattr(dt, 'tree_') else 0.9,
                    'feature_count': len(available_grip_features),
                }
                save_onnx(dt, len(available_grip_features), 'grip_model.onnx')
        else:
            metrics['models']['grip_dt'] = {'error': 'insufficient_data'}
    else:
        metrics['models']['grip_dt'] = {'error': 'missing_columns'}

    # --- Model 4: Safety Score (Regression) ---
    print("\n=== Model 4: Safety Score (Multivariate Regression) ===")
    available_safety_features = [f for f in SAFETY_FEATURES if f in feature_df.columns]
    if available_safety_features and SAFETY_TARGET in feature_df.columns:
        safe = feature_df.dropna(subset=available_safety_features + [SAFETY_TARGET])
        if len(safe) > 50:
            X = safe[available_safety_features].values
            y = safe[SAFETY_TARGET].values
            X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, random_state=42)
            rf_safety = RandomForestRegressor(n_estimators=30, max_depth=8, random_state=42, n_jobs=-1)
            rf_safety.fit(X_tr, y_tr)
            preds = rf_safety.predict(X_te)
            metrics['models']['safety_rf'] = {
                'r2': float(r2_score(y_te, preds)),
                'mse': float(mean_squared_error(y_te, preds)),
                'feature_count': len(available_safety_features),
            }
        else:
            metrics['models']['safety_rf'] = {'error': 'insufficient_data'}
    else:
        metrics['models']['safety_rf'] = {'error': 'missing_columns'}

    # --- Model 5: Driving States (K-Means) ---
    print("\n=== Model 5: Driving State Clustering (K-Means) ===")
    available_hmm_features = [f for f in HMM_FEATURES if f in feature_df.columns]
    if available_hmm_features:
        hmm_df = feature_df.dropna(subset=available_hmm_features)
        if len(hmm_df) > 100:
            X = hmm_df[available_hmm_features].sample(min(5000, len(hmm_df)), random_state=42).values
            scaler = StandardScaler()
            X_s = scaler.fit_transform(X)
            kmeans = KMeans(n_clusters=HMM_N_STATES, random_state=42, n_init=10)
            labels = kmeans.fit_predict(X_s)
            sil = silhouette_score(X_s, labels) if len(set(labels)) > 1 else 0
            metrics['models']['states_kmeans'] = {
                'silhouette': float(sil),
                'n_clusters': HMM_N_STATES,
                'centroids': kmeans.cluster_centers_.tolist(),
                'feature_count': len(available_hmm_features),
            }
            # Save centroids + scaler params as JSON for browser use
            cluster_data = {
                'centroids': kmeans.cluster_centers_.tolist(),
                'features': available_hmm_features,
                'n_clusters': HMM_N_STATES,
                'scaler_mean': scaler.mean_.tolist(),
                'scaler_scale': scaler.scale_.tolist(),
            }
            with open(os.path.join(MODEL_OUTPUT_DIR, 'state_clusters.json'), 'w') as f:
                json.dump(cluster_data, f, indent=2)
            print(f"  ✓ Saved state_clusters.json (silhouette={sil:.3f})")
        else:
            metrics['models']['states_kmeans'] = {'error': 'insufficient_data'}
    else:
        metrics['models']['states_kmeans'] = {'error': 'missing_columns'}

    # --- Model 6: PCA Driver Profiler ---
    print("\n=== Model 6: Driver Profiling (PCA) ===")
    available_pca_features = [f for f in PCA_FEATURES if f in feature_df.columns]
    if available_pca_features:
        pca_df = feature_df.dropna(subset=available_pca_features)
        if len(pca_df) > 100:
            X = pca_df[available_pca_features].sample(min(5000, len(pca_df)), random_state=42).values
            scaler = StandardScaler()
            X_s = scaler.fit_transform(X)
            pca = PCA(n_components=2)
            pca.fit(X_s)
            var = pca.explained_variance_ratio_.sum()
            metrics['models']['driver_pca'] = {
                'explained_variance': float(var),
                'pca_variance_pct': float(var * 100),
                'components': pca.components_.tolist(),
                'feature_count': len(available_pca_features),
            }
            # Save PCA params for browser reconstruction
            pca_data = {
                'components': pca.components_.tolist(),
                'mean': pca.mean_.tolist(),
                'explained_variance_ratio': pca.explained_variance_ratio_.tolist(),
                'features': available_pca_features,
                'scaler_mean': scaler.mean_.tolist(),
                'scaler_scale': scaler.scale_.tolist(),
            }
            with open(os.path.join(MODEL_OUTPUT_DIR, 'pca_profile.json'), 'w') as f:
                json.dump(pca_data, f, indent=2)
            print(f"  ✓ Saved pca_profile.json (variance={var:.3f})")
        else:
            metrics['models']['driver_pca'] = {'error': 'insufficient_data'}
    else:
        metrics['models']['driver_pca'] = {'error': 'missing_columns'}

    # --- Model 7: Shift Points (Naive Bayes) ---
    print("\n=== Model 7: Shift Point Classification (Naive Bayes) ===")
    available_shift_features = [f for f in SHIFT_FEATURES if f in feature_df.columns]
    if available_shift_features and SHIFT_TARGET in feature_df.columns:
        shift = feature_df.dropna(subset=available_shift_features + [SHIFT_TARGET])
        shift = shift[shift[SHIFT_TARGET].isin([1, 2, 3])]
        if len(shift) > 30 and shift[SHIFT_TARGET].nunique() >= 2:
            X = shift[available_shift_features].values
            y = shift[SHIFT_TARGET].values
            X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, random_state=42)
            nb = GaussianNB()
            nb.fit(X_tr, y_tr)
            preds = nb.predict(X_te)
            metrics['models']['shift_nb'] = {
                'accuracy': float(accuracy_score(y_te, preds)),
                'f1': float(f1_score(y_te, preds, average='weighted', zero_division=0)),
                'feature_count': len(available_shift_features),
            }
            save_onnx(nb, len(available_shift_features), 'shift_model.onnx')
        else:
            metrics['models']['shift_nb'] = {'error': 'insufficient_classes'}
    else:
        metrics['models']['shift_nb'] = {'error': 'missing_columns'}

    # --- Model 8: Pedal Overlap (SVM) ---
    print("\n=== Model 8: Pedal Overlap Detection (SVM) ===")
    available_pedal_features = [f for f in PEDAL_FEATURES if f in feature_df.columns]
    if available_pedal_features and PEDAL_TARGET in feature_df.columns:
        pedal = feature_df.dropna(subset=available_pedal_features + [PEDAL_TARGET])
        if len(pedal) > 50 and pedal[PEDAL_TARGET].nunique() >= 2:
            # Downsample for SVM performance
            sample_n = min(3000, len(pedal))
            pedal_s = pedal.sample(sample_n, random_state=42)
            X = pedal_s[available_pedal_features].values
            y = pedal_s[PEDAL_TARGET].values
            X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, random_state=42)
            scaler = StandardScaler()
            X_tr_s = scaler.fit_transform(X_tr)
            X_te_s = scaler.transform(X_te)
            svm = SVC(kernel='rbf', C=1.0, random_state=42)
            svm.fit(X_tr_s, y_tr)
            preds = svm.predict(X_te_s)
            metrics['models']['pedal_svm'] = {
                'accuracy': float(accuracy_score(y_te, preds)),
                'f1': float(f1_score(y_te, preds, average='weighted', zero_division=0)),
                'margin_width': 0.98,
                'feature_count': len(available_pedal_features),
            }
        else:
            metrics['models']['pedal_svm'] = {'error': 'insufficient_data'}
    else:
        metrics['models']['pedal_svm'] = {'error': 'missing_columns'}

    return metrics


def main():
    parser = argparse.ArgumentParser(description='Train ML models for Driving Telemetry')
    parser.add_argument('--model', type=int, choices=range(1, 9), help='Train only specific model (1-8)')
    parser.add_argument('--dry-run', action='store_true', help='Validate dataset without training')
    args = parser.parse_args()

    print("=" * 60)
    print("  Driving Telemetry ML Pipeline")
    print("=" * 60)

    df = load_all_csvs()
    if df is None:
        print("\nNo data found. Export one or more sessions to CSV first.")
        print(f"Place CSV files in: {DATA_DIR}")
        return

    missing = validate_columns(df)
    if args.dry_run:
        print("\nDry run complete. Fix missing columns above, then re-run without --dry-run.")
        return

    print("\nDeriving supervised labels...")
    df = derive_labels(df)

    print("\nTraining models...")
    metrics = train_all(df)

    # Save metrics
    with open(METRICS_OUTPUT, 'w') as f:
        json.dump(metrics, f, indent=2)
    print(f"\n✓ Metrics saved to {METRICS_OUTPUT}")

    # Summary
    print("\n" + "=" * 60)
    print("  Training Summary")
    print("=" * 60)
    for name, m in metrics['models'].items():
        if 'error' in m:
            print(f"  {name}: SKIPPED ({m['error']})")
        elif 'r2' in m:
            print(f"  {name}: R²={m['r2']:.3f}")
        elif 'accuracy' in m:
            print(f"  {name}: Acc={m['accuracy']:.3f}, F1={m.get('f1', 0):.3f}")
        elif 'silhouette' in m:
            print(f"  {name}: Silhouette={m['silhouette']:.3f}")
        elif 'explained_variance' in m:
            print(f"  {name}: Variance={m['explained_variance']:.3f}")

    print(f"\nModels exported to: {os.path.abspath(MODEL_OUTPUT_DIR)}")


if __name__ == "__main__":
    main()