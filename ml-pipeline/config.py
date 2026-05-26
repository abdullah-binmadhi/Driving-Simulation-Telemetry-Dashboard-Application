"""
Comprehensive ML Pipeline Configuration for Driving Telemetry
All feature sets, targets, and model hyperparameters in one place.
"""

import os

# --- Paths ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'dataset')
MODEL_OUTPUT_DIR = os.path.join(BASE_DIR, '../public/models')
METRICS_OUTPUT = os.path.join(MODEL_OUTPUT_DIR, 'model_metrics.json')

# --- Dataset Loading ---
# Our CSV exports have # comment headers with session metadata.
# pandas read_csv with comment='#' skips these automatically.
CSV_READ_OPTS = {
    'comment': '#',
    'na_values': ['', ' '],
}

# =============================================================================
# MODEL 1: Tire Wear Prediction (Random Forest Regressor)
# Ground Truth: true_tire_wear_fl from BeamNG physics engine
# =============================================================================
# NOTE: Feature ORDER must match ml-features.ts TIRE_WEAR_FEATURES exactly
TIRE_WEAR_FEATURES = [
    'speed', 'throttle', 'brake', 'steering',
    'gForceX', 'gForceY', 'jerk_x', 'jerk_y', 'pedal_overlap',
    'tire_temp_fl', 'tire_temp_fr', 'tire_temp_rl', 'tire_temp_rr',
    'tire_pressure_fl', 'tire_pressure_fr',
    'slip_angle_estimate', 'turn_radius',
    'is_coasting', 'is_braking', 'is_turning',
]

TIRE_WEAR_TARGETS = [
    'true_tire_wear_fl', 'true_tire_wear_fr',
    'true_tire_wear_rl', 'true_tire_wear_rr',
]

# =============================================================================
# MODEL 2: Driver Fatigue Detection (Logistic Regression)
# Ground Truth: Inferred from session duration + input smoothness decay
# =============================================================================
FATIGUE_FEATURES = [
    'jerk_x', 'jerk_y', 'steering_delta', 'throttle_delta', 'brake_delta',
    'speed', 'oversteer_correction', 'understeer_plough',
    'pedal_overlap', 'brake_bias_utilization',
]

FATIGUE_TARGET = 'fatigue_label'

# =============================================================================
# MODEL 3: Grip/Traction Classification (Decision Tree)
# Ground Truth: understeer_plough flag from physics model
# =============================================================================
# NOTE: Feature ORDER must match ml-features.ts GRIP_FEATURES exactly
GRIP_FEATURES = [
    'speed', 'steering', 'throttle', 'brake',
    'gForceX', 'gForceY', 'gforce_combined',
    'steering_delta', 'slip_angle_estimate',
    'tire_temp_fl', 'tire_temp_fr',
    'turn_radius', 'yaw_rate',
]

GRIP_TARGETS = ['understeer_plough', 'oversteer_correction']

# =============================================================================
# MODEL 4: Driving Style / Safety Score (Multivariate Regression)
# Ground Truth: Manual session score (1-100) or derived from penalty counts
# =============================================================================
SAFETY_FEATURES = [
    'jerk_x', 'jerk_y', 'throttle_delta', 'brake_delta', 'steering_delta',
    'speed_delta', 'pedal_overlap', 'gforce_combined',
    'oversteer_correction', 'understeer_plough',
    'is_coasting', 'is_wots', 'is_braking', 'is_turning', 'is_trail_braking',
    'brake_bias_utilization', 'coasting_time_pct',
]

SAFETY_TARGET = 'safety_score'

# =============================================================================
# MODEL 5: Driving State Detection (K-Means Clustering)
# Unsupervised — no ground truth needed
# =============================================================================
# NOTE: Feature ORDER must match ml-features.ts HMM_FEATURES exactly
HMM_FEATURES = [
    'speed', 'throttle', 'brake', 'steering',
    'gForceX', 'gForceY', 'rpm', 'gear',
    'throttle_delta', 'brake_delta', 'jerk_x',
]

HMM_N_STATES = 4  # Cruising, Cornering, Slow/Cautious, Erratic

# =============================================================================
# MODEL 6: Driver Profiling (PCA)
# Unsupervised — dimensionality reduction for visualization
# =============================================================================
# NOTE: Feature ORDER must match ml-features.ts PCA_FEATURES exactly
PCA_FEATURES = [
    'speed', 'throttle', 'brake', 'steering',
    'gForceX', 'gForceY', 'jerk_x', 'jerk_y',
    'throttle_delta', 'brake_delta', 'steering_delta',
    'pedal_overlap', 'slip_angle_estimate',
    'is_coasting', 'is_wots', 'is_braking', 'is_turning',
]

# =============================================================================
# MODEL 7: Shift Point Classification (Naive Bayes)
# Ground Truth: Optimal RPM band (5500-6500 for most sports cars)
# =============================================================================
# NOTE: Feature ORDER must match ml-features.ts SHIFT_FEATURES exactly
SHIFT_FEATURES = ['rpm', 'speed', 'throttle', 'gear', 'speed_delta']

SHIFT_TARGET = 'shift_quality'

# =============================================================================
# MODEL 8: Pedal Overlap / Confusion Detection (SVM)
# =============================================================================
# NOTE: Feature ORDER must match ml-features.ts PEDAL_FEATURES exactly
PEDAL_FEATURES = ['throttle', 'brake', 'speed', 'gear', 'is_turning', 'is_trail_braking']

PEDAL_TARGET = 'pedal_overlap_flag'

# =============================================================================
# ALL features (for dataset validation)
# =============================================================================
ALL_EXPECTED_COLUMNS = list(set(
    TIRE_WEAR_FEATURES + TIRE_WEAR_TARGETS +
    FATIGUE_FEATURES + [FATIGUE_TARGET] +
    GRIP_FEATURES + GRIP_TARGETS +
    SAFETY_FEATURES + [SAFETY_TARGET] +
    HMM_FEATURES +
    PCA_FEATURES +
    SHIFT_FEATURES + [SHIFT_TARGET] +
    PEDAL_FEATURES + [PEDAL_TARGET] +
    ['timestamp', 'game', 'track', 'vehicle']
))
