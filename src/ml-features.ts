// ─── Feature maps — ORDER must match config.py ─────────────────────────────

export const TIRE_WEAR_FEATURES = [
  'speed', 'throttle', 'brake', 'steering',
  'gForceX', 'gForceY', 'jerkX', 'jerkY', 'pedalOverlap',
  'tireTempFL', 'tireTempFR', 'tireTempRL', 'tireTempRR',
  'tirePressureFL', 'tirePressureFR',
  'slipAngleEstimate', 'turnRadius',
  'isCoasting', 'isBraking', 'isTurning',
] as const;

export const GRIP_FEATURES = [
  'speed', 'steering', 'throttle', 'brake',
  'gForceX', 'gForceY', 'gforceCombined',
  'steeringDelta', 'slipAngleEstimate',
  'tireTempFL', 'tireTempFR',
  'turnRadius', 'yawRate',
] as const;

export const HMM_FEATURES = [
  'speed', 'throttle', 'brake', 'steering',
  'gForceX', 'gForceY', 'rpm', 'gear',
  'throttleDelta', 'brakeDelta', 'jerkX',
] as const;

export const PCA_FEATURES = [
  'speed', 'throttle', 'brake', 'steering',
  'gForceX', 'gForceY', 'jerkX', 'jerkY',
  'throttleDelta', 'brakeDelta', 'steeringDelta',
  'pedalOverlap', 'slipAngleEstimate',
  'isCoasting', 'isWots', 'isBraking', 'isTurning',
] as const;

export const SHIFT_FEATURES = ['rpm', 'speed', 'throttle', 'gear', 'speedDelta'] as const;

export const PEDAL_FEATURES = ['throttle', 'brake', 'speed', 'gear', 'isTurning', 'isTrailBraking'] as const;
