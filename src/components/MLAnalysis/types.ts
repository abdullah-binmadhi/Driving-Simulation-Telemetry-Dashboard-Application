export interface NormalizedRow {
  timestamp: number;
  speed: number;
  throttle: number;
  brake: number;
  steering: number;
  rpm: number;
  gear: number;
  clutch: number;
  fuel: number;
  engineTemp: number;
  gForceX: number;
  gForceY: number;
  gForceZ: number;
  gforceCombined: number;
  jerkX: number;
  jerkY: number;
  throttleDelta: number;
  brakeDelta: number;
  steeringDelta: number;
  speedDelta: number;
  tireTempFL: number;
  tireTempFR: number;
  tireTempRL: number;
  tireTempRR: number;
  tirePressureFL: number;
  tirePressureFR: number;
  tirePressureRL: number;
  tirePressureRR: number;
  posX: number;
  posY: number;
  posZ: number;
  yawRate: number;
  pedalOverlap: number;
  turnRadius: number;
  slipAngleEstimate: number;
  isTrailBraking: number;
  isCoasting: number;
  isWots: number;
  isBraking: number;
  isTurning: number;
  oversteerCorrection: number;
  understeerPlough: number;
  brakeBiasUtilization: number;
  coastingTimePct: number;
  _sessionId: number;
  _sessionBoundary: boolean;
  [key: string]: unknown;
}

export interface FatigueResult {
  score: number;
  decay: number;
  decayLabel: string;
  trend: string;
  timeline: Array<{ segment: string; avgJerk: number; smoothness: number }>;
  perSession?: Array<{
    sessionId: number;
    score: number;
    decay: number;
    timeline: Array<{ segment: string; avgJerk: number; smoothness: number }>;
  }>;
}

export interface GripResult {
  score: number;
  understeer: number;
  oversteer: number;
}

export interface ShiftResult {
  early: number;
  optimal: number;
  late: number;
}

export interface SVMResult {
  overlapPercentage: number;
  overlapEvents: number;
}

export interface RFWearResult {
  data: Array<{ timestamp: number; life: number; wearRate: number }>;
  endLife: number;
}

export interface HMMResult {
  data: Array<{ timestamp: number; state: string }>;
  statePercentages: Record<string, number>;
}

export interface PCAProjection {
  data: Array<{ x: number; y: number; intensity: number; timestamp: number }>;
}

export interface SafetyScoreResult {
  score: number;
  deductions: string[];
  penaltyBreakdown: Array<{ label: string; count: number; pct: number; color: string }>;
}

export interface AnomalyResult {
  data: Array<{
    timestamp: number;
    speed: number;
    isAnomaly: boolean;
    jerk: number;
    type: string;
  }>;
  anomalyCount: number;
}

export interface ExitForecastResult {
  speedCoeff: number;
  throttleCoeff: number;
  predicted?: Array<{ apex: number; actual: number; predicted: number }>;
}

export interface QualityMetric {
  score: number;
  analysis: string;
  formula: string;
}

export interface QualityMetrics {
  clusteringSilhouette: QualityMetric;
  pcaVariance: QualityMetric;
  randomForestOOB: QualityMetric;
  anomalySkewness: QualityMetric;
  svmMargin: QualityMetric;
  regressionFit: QualityMetric;
  knnConfidence: QualityMetric;
  dtwConsistency?: QualityMetric;
  dtPurity?: QualityMetric;
  nbAccuracy?: QualityMetric;
}

export interface MLResults {
  progress: number;
  isProcessing: boolean;
  status?: string;
  safetyScore: SafetyScoreResult;
  pca: PCAProjection & { profile: string; knnProfile?: string };
  anomalies: AnomalyResult;
  svm: SVMResult;
  rfWear: RFWearResult;
  hmm: HMMResult;
  fatigue: FatigueResult;
  grip: GripResult;
  shifts: ShiftResult;
  exitForecast: ExitForecastResult;
  consistency: { dtwScore: number };
  brakingTech: { trailPercent: number };
  markov: Record<string, Record<string, number>>;
  aggression: { safeFast: number; safeSlow: number; riskyFast: number; riskySlow: number };
  qualityMetrics: QualityMetrics;
  modelStatus: Record<string, 'loaded' | 'not_found' | 'error'>;
  sessionBoundaries: number[];
  perSession?: Array<{ sessionId: number; labels: Record<string, number | string> }>;
}

export type IncomingMessage =
  | { type: 'INIT'; payload?: { modelsBase?: string; assetsBase?: string } }
  | {
    type: 'ANALYZE_SESSION';
    payload: { sessionArray: NormalizedRow[] };
  };

export type OutgoingMessage =
  | { type: 'READY' }
  | { type: 'PROGRESS'; progress: number; status?: string }
  | { type: 'ERROR'; message: string }
  | { type: 'COMPLETE'; results: MLResults };

export interface PenaltyCategory {
  label: string;
  count: number;
  color: string;
}

export interface ModelStatusMap {
  tire_wear: 'loaded' | 'not_found' | 'error';
  grip: 'loaded' | 'not_found' | 'error';
  shift: 'loaded' | 'not_found' | 'error';
  pedal_overlap: 'loaded' | 'not_found' | 'error';
  state_clusters: 'loaded' | 'not_found' | 'error';
  pca_profile: 'loaded' | 'not_found' | 'error';
  model_metrics: 'loaded' | 'not_found' | 'error';
}
