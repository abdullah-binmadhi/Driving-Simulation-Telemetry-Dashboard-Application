export function safeMean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

export function safeStd(arr: number[]): number {
  if (arr.length < 2) return 0;
  const mean = safeMean(arr);
  const variance = arr.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

export function jerkMagnitude(row: Record<string, unknown>): number {
  const x = Number(row.jerkX) || 0;
  const y = Number(row.jerkY) || 0;
  return Math.sqrt(x * x + y * y);
}

export function extractFeatures(
  row: Record<string, unknown>,
  featureList: readonly string[],
): number[] {
  return featureList.map((f) => {
    const v = row[f];
    return typeof v === 'number' && isFinite(v) ? v : 0;
  });
}

export function downsample<T>(arr: T[], maxPoints = 2000): T[] {
  if (arr.length <= maxPoints) return arr;
  const step = Math.ceil(arr.length / maxPoints);
  return arr.filter((_, i) => i % step === 0);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function medianDt(data: Record<string, unknown>[]): number {
  if (data.length < 2) return 16;
  const dts: number[] = [];
  for (let i = 1; i < Math.min(data.length, 100); i++) {
    const a = Number(data[i - 1].timestamp) || 0;
    const b = Number(data[i].timestamp) || 0;
    if (b > a) dts.push(b - a);
  }
  if (dts.length === 0) return 16;
  dts.sort((a, b) => a - b);
  return dts[Math.floor(dts.length / 2)];
}

export function mergeSessions(allSessions: Record<string, unknown>[][]): Record<string, unknown>[] {
  const merged: Record<string, unknown>[] = [];
  let globalOffset = 0;

  for (let s = 0; s < allSessions.length; s++) {
    const session = allSessions[s];
    const sessionTs = session.map((r) => Number(r.timestamp) || 0);
    const maxTs = Math.max(...sessionTs);
    const minTs = Math.min(...sessionTs);
    const range = maxTs - minTs || (session.length * 16);

    const offset = s === 0 ? 0 : globalOffset + medianDt(allSessions[s - 1]);

    for (let i = 0; i < session.length; i++) {
      const row = { ...session[i] };
      const ts = Number(row.timestamp) || i * 16;
      row.timestamp = ts + offset;
      row._sessionId = s;
      row._sessionBoundary = s > 0 && i === 0;
      merged.push(row);
    }

    globalOffset = offset + range;
  }

  return merged;
}

export function colorForState(state: string, isBg = false): string {
  const map: Record<string, string> = {
    Cruising: isBg ? 'bg-emerald-500' : 'bg-emerald-500',
    'Slow / Cautious': isBg ? 'bg-blue-500' : 'bg-blue-500',
    Cornering: isBg ? 'bg-amber-500' : 'bg-amber-500',
    Erratic: isBg ? 'bg-red-500' : 'bg-red-500',
  };
  return map[state] || (isBg ? 'bg-slate-500' : 'bg-slate-500');
}

export function splitBySession<T extends { _sessionId?: number }>(
  data: T[],
): T[][] {
  const sessions: T[][] = [];
  for (const row of data) {
    const id = row._sessionId ?? 0;
    if (!sessions[id]) sessions[id] = [];
    sessions[id].push(row);
  }
  return sessions;
}
