#!/usr/bin/env node

/**
 * Verify Feature Order Alignment between:
 *   - ml-pipeline/config.py (Python, snake_case)
 *   - src/ml-features.ts     (TypeScript, camelCase)
 *
 * Fails with non-zero exit code if features are out of sync.
 * Run: npm run verify:features
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// ── Parse Python config.py ─────────────────────────────────────────────────
function parsePythonList(content, listName) {
  const re = new RegExp(`${listName}\\s*=\\s*\\[([\\s\\S]*?)\\]`, 'm');
  const match = content.match(re);
  if (!match) {
    console.error(`  ERROR: Could not find ${listName} in config.py`);
    return null;
  }
  const items = match[1]
    .split(',')
    .map(s => s.trim().replace(/^['"]|['"]$/g, ''))
    .filter(s => s.length > 0);
  return items;
}

// ── Parse TypeScript ml-features.ts ────────────────────────────────────────
function parseTSList(content, listName) {
  const re = new RegExp(`export\\s+const\\s+${listName}\\s*=\\s*\\[([\\s\\S]*?)\\]\\s*as\\s+const`, 'm');
  const match = content.match(re);
  if (!match) {
    console.error(`  ERROR: Could not find ${listName} in ml-features.ts`);
    return null;
  }
  const items = match[1]
    .split(',')
    .map(s => s.trim().replace(/^['"]|['"]$/g, ''))
    .filter(s => s.length > 0 && !s.startsWith('//'));
  return items;
}

// ── CamelCase ↔ snake_case mapping ────────────────────────────────────────
const CAMEL_TO_SNAKE = {
  'jerkX': 'jerk_x', 'jerkY': 'jerk_y',
  'pedalOverlap': 'pedal_overlap',
  'tireTempFL': 'tire_temp_fl', 'tireTempFR': 'tire_temp_fr',
  'tireTempRL': 'tire_temp_rl', 'tireTempRR': 'tire_temp_rr',
  'tirePressureFL': 'tire_pressure_fl', 'tirePressureFR': 'tire_pressure_fr',
  'tirePressureRL': 'tire_pressure_rl', 'tirePressureRR': 'tire_pressure_rr',
  'slipAngleEstimate': 'slip_angle_estimate',
  'turnRadius': 'turn_radius',
  'isCoasting': 'is_coasting', 'isBraking': 'is_braking',
  'isTurning': 'is_turning', 'isWots': 'is_wots',
  'isTrailBraking': 'is_trail_braking',
  'gforceCombined': 'gforce_combined',
  'steeringDelta': 'steering_delta',
  'throttleDelta': 'throttle_delta',
  'brakeDelta': 'brake_delta',
  'speedDelta': 'speed_delta',
  'yawRate': 'yaw_rate',
};

const SNAKE_TO_CAMEL = Object.fromEntries(
  Object.entries(CAMEL_TO_SNAKE).map(([k, v]) => [v, k])
);

function toSnake(name) {
  return CAMEL_TO_SNAKE[name] || name;
}

function toCamel(name) {
  return SNAKE_TO_CAMEL[name] || name;
}

// ── Main ───────────────────────────────────────────────────────────────────
const configPath = path.join(ROOT, 'ml-pipeline', 'config.py');
const tsPath = path.join(ROOT, 'src', 'ml-features.ts');

if (!fs.existsSync(configPath)) {
  console.error(`FATAL: ${configPath} not found`);
  process.exit(1);
}
if (!fs.existsSync(tsPath)) {
  console.error(`FATAL: ${tsPath} not found`);
  process.exit(1);
}

const pyContent = fs.readFileSync(configPath, 'utf-8');
const tsContent = fs.readFileSync(tsPath, 'utf-8');

const FEATURE_LISTS = [
  'TIRE_WEAR_FEATURES',
  'GRIP_FEATURES',
  'HMM_FEATURES',
  'PCA_FEATURES',
  'SHIFT_FEATURES',
  'PEDAL_FEATURES',
];

let allPassed = true;

for (const listName of FEATURE_LISTS) {
  const pyItems = parsePythonList(pyContent, listName);
  const tsItems = parseTSList(tsContent, listName);

  if (!pyItems || !tsItems) {
    allPassed = false;
    continue;
  }

  // Normalize to camelCase for TS, snake_case for Python, then compare length and order
  const pyNormalized = pyItems.map(toCamel);
  const tsNormalized = tsItems.map(toSnake);

  if (pyItems.length !== tsItems.length) {
    console.error(`  FAIL: ${listName} length mismatch — Python ${pyItems.length} vs TS ${tsItems.length}`);
    allPassed = false;
    continue;
  }

  // Check order: compare Python items to snake_case of TS items
  let listOk = true;
  for (let i = 0; i < pyItems.length; i++) {
    if (pyItems[i] !== tsNormalized[i]) {
      console.error(`  FAIL: ${listName}[${i}] — Python "${pyItems[i]}" vs TS "${tsItems[i]}" (expected snake_case "${tsNormalized[i]}")`);
      listOk = false;
    }
  }

  if (listOk) {
    console.log(`  OK: ${listName} — ${pyItems.length} features, order matches`);
  } else {
    allPassed = false;
  }
}

if (allPassed) {
  console.log('\n✓ All feature lists match between config.py and ml-features.ts');
  process.exit(0);
} else {
  console.error('\n✗ Feature list mismatch detected — fix order before training/inference');
  process.exit(1);
}
