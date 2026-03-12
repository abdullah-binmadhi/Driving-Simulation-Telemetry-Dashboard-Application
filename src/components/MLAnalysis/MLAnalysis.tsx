import React from 'react';
import { Play, FileText, AlertTriangle, Brain, Target, Activity, Settings, GitCommit, Zap, Timer, TrendingUp, GitFork, Gauge, ArrowRightLeft, ShieldCheck, Layers } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter, ZAxis } from 'recharts';
import { useState, useRef, useEffect } from 'react';
import Papa from 'papaparse';

// Types for ML Output
interface MLResults {
    safetyScore: {
        score: number;
        deductions: string[];
    };
    pca: {
        data: Array<{
            x: number; // Component 1 (e.g. Aggression)
            y: number; // Component 2 (e.g. Erraticism)
            intensity: number;
            timestamp: number;
        }>;
        profile: string;
    };
    anomalies: {
        data: Array<{
            timestamp: number;
            speed: number;
            isAnomaly: boolean;
            jerk: number;
            type: string;
        }>;
        anomalyCount: number;
    };
    svm: {
        overlapPercentage: number;
        overlapEvents: number;
    };
    rfWear: {
        data: Array<{
            timestamp: number;
            life: number;
            wearRate: number;
        }>;
        endLife: number;
        analysisText?: string;
    };
    hmm: {
        data: Array<{
            timestamp: number;
            state: string; // Cruising, Braking, Cornering, Erratic
        }>;
        statePercentages: Record<string, number>;
    };
    // 8 new ML model results
    fatigue: { score: number; decay: number; };
    grip: { score: number; understeer: number; oversteer: number; };
    shifts: { early: number; optimal: number; late: number; };
    exitForecast: { speedCoeff: number; throttleCoeff: number; };
    consistency: { dtwScore: number; };
    brakingTech: { trailPercent: number; };
    markov: Record<string, Record<string, number>>;
    aggression: { safeFast: number; safeSlow: number; riskyFast: number; riskySlow: number; };
    qualityMetrics: {
        clusteringSilhouette: { score: number, analysis: string, formula: string };
        pcaVariance: { score: number, analysis: string, formula: string };
        randomForestOOB: { score: number, analysis: string, formula: string };
        anomalySkewness: { score: number, analysis: string, formula: string };
        svmMargin: { score: number, analysis: string, formula: string };
        regressionFit: { score: number, analysis: string, formula: string };
        knnConfidence: { score: number, analysis: string, formula: string };
    };
    isProcessing: boolean;
    progress: number;
    error: string | null;
}

const INITIAL_RESULTS: MLResults = {
    safetyScore: { score: 0, deductions: [] },
    pca: { data: [], profile: 'Unknown' },
    anomalies: { data: [], anomalyCount: 0 },
    svm: { overlapPercentage: 0, overlapEvents: 0 },
    rfWear: { data: [], endLife: 100, analysisText: "Awaiting analysis..." },
    hmm: { data: [], statePercentages: {} },
    fatigue: { score: 100, decay: 0 },
    grip: { score: 100, understeer: 0, oversteer: 0 },
    shifts: { early: 0, optimal: 0, late: 0 },
    exitForecast: { speedCoeff: 0.5, throttleCoeff: 0.2 },
    consistency: { dtwScore: 85 },
    brakingTech: { trailPercent: 50 },
    markov: {},
    aggression: { safeFast: 25, safeSlow: 25, riskyFast: 25, riskySlow: 25 },
    qualityMetrics: {
        clusteringSilhouette: { score: 0, analysis: "", formula: "" },
        pcaVariance: { score: 0, analysis: "", formula: "" },
        randomForestOOB: { score: 0, analysis: "", formula: "" },
        anomalySkewness: { score: 0, analysis: "", formula: "" },
        svmMargin: { score: 0, analysis: "", formula: "" },
        regressionFit: { score: 0, analysis: "", formula: "" },
        knnConfidence: { score: 0, analysis: "", formula: "" }
    },
    isProcessing: false,
    progress: 0,
    error: null
};


const MLAnalysis = () => {
    const [results, setResults] = useState<MLResults>(INITIAL_RESULTS);
    const [hasData, setHasData] = useState(false);
    const [sessionData, setSessionData] = useState<any[] | null>(null);
    const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
    const workerRef = useRef<Worker | null>(null);

    // Mock file input for now
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        Papa.parse(file, {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
            complete: (results) => {
                const data = results.data as any[];
                if (data.length > 50) {
                    // Normalize keys (handle 'Speed' vs 'speed')
                    const normalizedData = data.map((row, i) => {
                        const getVal = (key: string, exact: boolean = false) => {
                            let foundKey: string | undefined;
                            if (exact) {
                                foundKey = Object.keys(row).find(k => k.toLowerCase() === key.toLowerCase() || k.toLowerCase() === `is_${key.toLowerCase()}`);
                            } else {
                                // Strict filter to avoid getting 'speed_delta' when searching for 'speed'
                                foundKey = Object.keys(row).find(k => {
                                    const lowerK = k.toLowerCase();
                                    const lowerKey = key.toLowerCase();
                                    return lowerK === lowerKey || (lowerK.includes(lowerKey) && !lowerK.includes('_delta'));
                                });
                            }
                            return foundKey && row[foundKey] !== null && row[foundKey] !== undefined ? Number(row[foundKey]) || 0 : 0;
                        };
                        return {
                            timestamp: getVal('timestamp', true) || getVal('time', true) || (i * 16),
                            speed: getVal('speed') || getVal('vel'),
                            throttle: getVal('throttle') || getVal('gas'),
                            brake: getVal('brake'),
                            steering: getVal('steering') || getVal('steer')
                        };
                    });

                    if (normalizedData[0].speed !== undefined || normalizedData[0].throttle !== undefined) {
                        setSessionData(normalizedData);
                        setHasData(true);
                    } else {
                        alert('Could not definitively find "speed", "throttle", "brake", and "steering" columns in the CSV headers.');
                    }
                } else {
                    alert('CSV is too short or invalid. Need at least 50 data points for ML analysis.');
                }
            },
            error: (err: any) => {
                alert('Failed to parse CSV file: ' + err.message);
            }
        });
    };

    const runAnalysis = () => {
        if (!hasData || !sessionData) return;

        setResults({ ...INITIAL_RESULTS, isProcessing: true, progress: 5 });

        if (workerRef.current) {
            workerRef.current.terminate();
        }

        workerRef.current = new Worker(new URL('./mlWorker.ts', import.meta.url), { type: 'module' });

        workerRef.current.onmessage = (e) => {
            if (e.data.type === 'PROGRESS') setResults(r => ({ ...r, progress: e.data.progress }));
            if (e.data.type === 'COMPLETE') setResults(r => ({ ...r, ...e.data.results, isProcessing: false, progress: 100, error: null }));
            if (e.data.type === 'ERROR') setResults(r => ({ ...r, isProcessing: false, error: e.data.message }));
        };

        workerRef.current.postMessage({ type: 'ANALYZE_SESSION', payload: { sessionArray: sessionData } });
    };

    // Cleanup worker on unmount
    useEffect(() => {
        return () => {
            if (workerRef.current) {
                workerRef.current.terminate();
            }
        };
    }, []);

    const isDone = results.progress === 100 && !results.isProcessing;

    return (
        <div className="h-full flex flex-col p-8 overflow-y-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <Brain className="w-8 h-8 text-purple-500" />
                        Machine Learning Analysis
                    </h1>
                    <p className="text-slate-400 mt-2">Analyze single-session driving behavior using 6 advanced ML models.</p>
                </div>

                <div className="flex items-center gap-4 bg-slate-900 p-2 rounded-xl border border-slate-800">
                    <label className="flex items-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg cursor-pointer transition-colors border border-slate-700 font-semibold">
                        <FileText className="w-5 h-5 text-blue-400" />
                        <span>Load Session CSV</span>
                        <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
                    </label>

                    <button
                        onClick={runAnalysis}
                        disabled={!hasData || results.isProcessing}
                        className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold text-lg transition-all shadow-lg ${!hasData ? 'bg-slate-800 text-slate-500 cursor-not-allowed' :
                            results.isProcessing ? 'bg-purple-600/50 text-white animate-pulse' :
                                'bg-purple-600 hover:bg-purple-500 text-white hover:scale-105'
                            }`}
                    >
                        {results.isProcessing ? (
                            <>
                                <Settings className="w-6 h-6 animate-spin" />
                                Processing... {results.progress}%
                            </>
                        ) : (
                            <>
                                <Play className="w-6 h-6 fill-current" />
                                Run Analysis
                            </>
                        )}
                    </button>
                </div>
            </div>

            {results.error && (
                <div className="mb-8 p-4 bg-red-900/50 border border-red-500 rounded-xl text-red-200 flex items-center gap-3">
                    <AlertTriangle className="w-6 h-6" />
                    <strong>ML Engine Error:</strong> {results.error}
                </div>
            )}

            {!isDone && !results.isProcessing && !results.error && (
                <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-3xl m-8 text-slate-500">
                    <Brain className="w-24 h-24 text-slate-800 mb-6" />
                    <h2 className="text-2xl font-bold text-slate-400">Awaiting Telemetry Data</h2>
                    <p className="max-w-md text-center mt-2">Upload a recorded CSV session file and click Run Analysis to begin processing.</p>
                </div>
            )}

            {isDone && (
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 animate-in fade-in duration-500">
                    {/* Top Row: Safety Score & PCA */}

                    {/* 1. Multivariate Regression (Safety Score) */}
                    <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl flex flex-col justify-between">
                        <div>
                            <h3 className="text-xl font-bold flex items-center gap-2 text-white mb-2">
                                <Target className="w-5 h-5 text-green-500" />
                                Safety Score
                            </h3>
                            <p className="text-sm text-slate-400">Multivariate Regression Analysis</p>
                        </div>

                        <div className="flex-1 flex items-center justify-center py-6">
                            <div className="relative">
                                {/* SVG Gauge Placeholder */}
                                <svg viewBox="0 0 100 50" className="w-48 h-24 overflow-visible">
                                    <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#1e293b" strokeWidth="12" strokeLinecap="round" />
                                    <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke={`url(#gradient)`} strokeWidth="12" strokeLinecap="round" strokeDasharray={`${(results.safetyScore.score / 100) * 125} 125`} />
                                    <defs>
                                        <linearGradient id="gradient">
                                            <stop offset="0%" stopColor="#ef4444" />
                                            <stop offset="50%" stopColor="#eab308" />
                                            <stop offset="100%" stopColor="#22c55e" />
                                        </linearGradient>
                                    </defs>
                                </svg>
                                <div className="absolute bottom-0 inset-x-0 text-center">
                                    <span className="text-5xl font-black font-mono text-white tracking-tighter">{results.safetyScore.score}</span><span className="text-slate-500 font-bold text-xl">/100</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-950 rounded-xl p-4">
                            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Deductions</div>
                            {results.safetyScore.deductions.map((ded, i) => (
                                <div key={i} className="text-red-400 text-sm font-mono flex items-center gap-2">
                                    <GitCommit className="w-3 h-3" /> {ded}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 2. Isolation Forest Proxy (Smoothness Anomalies) */}
                    <div className="xl:col-span-2 bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl flex flex-col">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-xl font-bold flex items-center gap-2 text-white mb-1">
                                    <Activity className="w-5 h-5 text-red-500" />
                                    Discomfort Anomalies
                                </h3>
                                <p className="text-sm text-slate-400">Isolation Forest (Outlier Detection)</p>
                            </div>
                            <div className="bg-red-950/50 text-red-400 px-3 py-1 rounded-full text-sm font-bold border border-red-900/50">
                                {results.anomalies.anomalyCount} Harsh Events Detected
                            </div>
                        </div>

                        <div className="flex-1 w-full min-h-[200px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={results.anomalies.data} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                    <XAxis dataKey="timestamp" stroke="#475569" tickFormatter={(t) => `${(t / 1000).toFixed(1)}s`} />
                                    <YAxis stroke="#475569" dataKey="speed" domain={['auto', 'auto']} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                                        itemStyle={{ color: '#e2e8f0' }}
                                        labelStyle={{ color: '#cbd5e1' }}
                                        labelFormatter={(t) => `Time: ${(t / 1000).toFixed(1)}s`}
                                        formatter={(value: any, name: string | undefined, props: any) => {
                                            if (name === 'speed' && props.payload.isAnomaly) {
                                                return [value, `${props.payload.type} (Speed)`];
                                            }
                                            return [value, name];
                                        }}
                                    />
                                    {/* Anomalies highlighted using custom dots */}
                                    <Line
                                        type="monotone"
                                        dataKey="speed"
                                        stroke="#3b82f6"
                                        strokeWidth={2}
                                        dot={(props) => {
                                            if (props.payload.isAnomaly) {
                                                return <circle cx={props.cx} cy={props.cy} r={6} fill="#ef4444" stroke="#7f1d1d" strokeWidth={2} />;
                                            }
                                            return <></>;
                                        }}
                                        activeDot={{ r: 4 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* 3. PCA Driver Profile */}
                    <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl flex flex-col">
                        <div>
                            <h3 className="text-xl font-bold flex items-center gap-2 text-white mb-1">
                                <Brain className="w-5 h-5 text-indigo-500" />
                                Driver Profiler
                            </h3>
                            <p className="text-sm text-slate-400">Principal Component Analysis (PCA)</p>
                        </div>

                        <div className="flex-1 w-full min-h-[250px] -ml-6">
                            <ResponsiveContainer width="100%" height="100%">
                                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                    <XAxis type="number" dataKey="x" name="Component 1" stroke="#475569" hide />
                                    <YAxis type="number" dataKey="y" name="Component 2" stroke="#475569" hide />
                                    <ZAxis type="number" dataKey="intensity" range={[10, 50]} />
                                    <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '8px' }} itemStyle={{ color: '#e2e8f0' }} labelStyle={{ color: '#cbd5e1' }} />
                                    <Scatter name="Driving States" data={results.pca.data} fill="#6366f1" opacity={0.6} />

                                    {/* Quadrant Lines */}
                                    <CustomReferenceLines />
                                </ScatterChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="text-center bg-indigo-950/30 border border-indigo-900/50 rounded-xl p-3">
                            <span className="text-indigo-300 text-sm font-bold uppercase tracking-widest">{results.pca.profile || (results.pca as any).knnProfile || "Unknown Style"}</span>
                        </div>
                    </div>

                    {/* 4. SVM Pedal Overlap */}
                    <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl flex flex-col">
                        <div>
                            <h3 className="text-xl font-bold flex items-center gap-2 text-white mb-1">
                                <Zap className="w-5 h-5 text-orange-500" />
                                Pedal Confusion
                            </h3>
                            <p className="text-sm text-slate-400">Support Vector Machine (SVM)</p>
                        </div>

                        <div className="flex-1 flex flex-col items-center justify-center p-4">
                            <div className="text-6xl font-black font-mono text-white mb-2">{results.svm.overlapPercentage.toFixed(1)}<span className="text-3xl text-slate-500">%</span></div>
                            <div className="text-slate-400 text-sm mb-6 text-center">of session driven with overlapping pedeal inputs.</div>

                            <div className="w-full bg-slate-950 rounded-full h-8 border border-slate-800 overflow-hidden relative">
                                <div className="h-full bg-orange-500" style={{ width: `${Math.min(results.svm.overlapPercentage * 2, 100)}%` }}></div>
                            </div>
                            <div className="w-full flex justify-between mt-2 text-xs font-bold text-slate-500">
                                <span>Perfect (0%)</span>
                                <span>Messy ({'>'} 10%)</span>
                            </div>
                        </div>
                    </div>


                    {/* 5. Predictive Tire Degradation (Random Forest) */}
                    <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl flex flex-col">
                        <div>
                            <h3 className="text-xl font-bold flex items-center gap-2 text-white mb-1">
                                <Activity className="w-5 h-5 text-pink-500" />
                                Predictive Tire Degradation
                            </h3>
                            <p className="text-sm text-slate-400 mb-3">Random Forest Wear Projection</p>
                            {results.rfWear.analysisText && results.rfWear.analysisText !== "Awaiting analysis..." && (
                                <div className="bg-pink-950/30 border border-pink-900/50 rounded-xl p-3 text-sm text-pink-300">
                                    {results.rfWear.analysisText}
                                </div>
                            )}
                        </div>

                        <div className="flex-1 w-full min-h-[200px] mt-4 relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={results.rfWear.data} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                    <XAxis dataKey="timestamp" stroke="#475569" tick={false} />
                                    <YAxis stroke="#475569" domain={[0, 100]} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                                        itemStyle={{ color: '#e2e8f0' }}
                                        labelStyle={{ color: '#cbd5e1' }}
                                        labelFormatter={() => `Est. Remaining Tire Life`}
                                        formatter={(val: any) => [`${Number(val).toFixed(2)}%`, `Tire Life`]}
                                    />
                                    <Line type="monotone" dataKey="life" stroke="#ec4899" strokeWidth={3} dot={false} strokeOpacity={0.9} />
                                </LineChart>
                            </ResponsiveContainer>
                            
                            <div className="absolute bottom-6 left-12 text-5xl font-black font-mono tracking-tighter" style={{ color: results.rfWear.endLife > 80 ? '#22c55e' : results.rfWear.endLife > 50 ? '#eab308' : '#ef4444' }}>
                                {results.rfWear.endLife.toFixed(1)}<span className="text-2xl text-slate-500 font-bold">%</span>
                            </div>
                        </div>
                    </div>

                    {/* 6. HMM State Timeline */}
                    <div className="xl:col-span-3 bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl flex flex-col">
                        <div>
                            <h3 className="text-xl font-bold flex items-center gap-2 text-white mb-1">
                                <GitCommit className="w-5 h-5 text-emerald-500" />
                                Contextual Driving States
                            </h3>
                            <p className="text-sm text-slate-400">Hidden Markov Model Approximation (Time Series Clustering)</p>
                        </div>

                        <div className="flex gap-4 mt-6">
                            {Object.entries(results.hmm.statePercentages).map(([state, pct]) => (
                                <div key={state} className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-3 h-3 rounded-full ${getStateColor(state)}`}></div>
                                        <span className="text-slate-300 font-semibold">{state}</span>
                                    </div>
                                    <span className="font-mono text-white text-xl">{pct.toFixed(0)}%</span>
                                </div>
                            ))}
                        </div>

                        <div className="mt-8 h-8 rounded-lg overflow-hidden flex shadow-inner border border-slate-800">
                            {results.hmm.data.map((d, i) => (
                                <div
                                    key={i}
                                    className={`h-full flex-1 ${getStateColor(d.state, true)} hover:opacity-100 transition-opacity opacity-80 cursor-default`}
                                    title={`Time: ${(d.timestamp / 1000).toFixed(1)}s | State: ${d.state}`}
                                ></div>
                            ))}
                        </div>
                    </div>

                    {/* ==== 8 NEW ADVANCED ML MODEL CARDS ==== */}

                    {/* 8. Driver Fatigue Tracker */}
                    <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl flex flex-col gap-4">
                        <div>
                            <h3 className="text-xl font-bold flex items-center gap-2 text-white mb-1">
                                <Timer className="w-5 h-5 text-amber-400" />
                                Driver Fatigue Tracker
                            </h3>
                            <p className="text-xs text-slate-400">Logistic Regression — Focus decay over session</p>
                        </div>
                        <div className="flex-1 flex flex-col justify-center gap-4">
                            <div className="flex items-baseline gap-2">
                                <span className={`text-5xl font-black font-mono ${results.fatigue.score > 70 ? 'text-emerald-400' : results.fatigue.score > 40 ? 'text-amber-400' : 'text-red-400'}`}>{Math.round(results.fatigue.score)}%</span>
                                <span className="text-slate-400">Focus Retained</span>
                            </div>
                            <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full transition-all duration-700 ${results.fatigue.score > 70 ? 'bg-emerald-500' : results.fatigue.score > 40 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${results.fatigue.score}%` }}></div>
                            </div>
                            <p className="text-xs text-slate-400">
                                {results.fatigue.score > 70
                                    ? "✅ Consistent focus maintained throughout the session."
                                    : results.fatigue.score > 40
                                    ? "⚠️ Moderate fatigue detected — input smoothness degraded over time."
                                    : "🔴 Significant fatigue detected. Inputs became notably erratic by session end."}
                            </p>
                        </div>
                    </div>

                    {/* 9. Grip Limits Analyzer */}
                    <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl flex flex-col gap-4">
                        <div>
                            <h3 className="text-xl font-bold flex items-center gap-2 text-white mb-1">
                                <TrendingUp className="w-5 h-5 text-red-400" />
                                Grip Limits Analyzer
                            </h3>
                            <p className="text-xs text-slate-400">Decision Tree — Lateral G-Force traction classification</p>
                        </div>
                        <div className="flex-1 grid grid-cols-3 gap-3 text-center">
                            <div className="bg-slate-800 rounded-2xl p-4 flex flex-col gap-1">
                                <span className="text-2xl font-black text-emerald-400">{Math.round(results.grip.score)}%</span>
                                <span className="text-xs text-slate-400">In Grip</span>
                            </div>
                            <div className="bg-slate-800 rounded-2xl p-4 flex flex-col gap-1">
                                <span className="text-2xl font-black text-amber-400">{results.grip.understeer}</span>
                                <span className="text-xs text-slate-400">Understeer Events</span>
                            </div>
                            <div className="bg-slate-800 rounded-2xl p-4 flex flex-col gap-1">
                                <span className="text-2xl font-black text-red-400">{results.grip.oversteer}</span>
                                <span className="text-xs text-slate-400">Oversteer Events</span>
                            </div>
                        </div>
                    </div>

                    {/* 10. Shift Point Analyzer */}
                    <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl flex flex-col gap-4">
                        <div>
                            <h3 className="text-xl font-bold flex items-center gap-2 text-white mb-1">
                                <GitFork className="w-5 h-5 text-purple-400" />
                                Shift Point Analyzer
                            </h3>
                            <p className="text-xs text-slate-400">Naive Bayes — Gear change timing classification</p>
                        </div>
                        <div className="flex-1 grid grid-cols-3 gap-3 text-center">
                            <div className="bg-slate-800 rounded-2xl p-4 flex flex-col gap-1">
                                <span className="text-2xl font-black text-blue-400">{results.shifts.early}</span>
                                <span className="text-xs text-slate-400">Early Shifts</span>
                            </div>
                            <div className="bg-slate-800 rounded-2xl p-4 flex flex-col gap-1">
                                <span className="text-2xl font-black text-emerald-400">{results.shifts.optimal}</span>
                                <span className="text-xs text-slate-400">Optimal Shifts</span>
                            </div>
                            <div className="bg-slate-800 rounded-2xl p-4 flex flex-col gap-1">
                                <span className="text-2xl font-black text-red-400">{results.shifts.late}</span>
                                <span className="text-xs text-slate-400">Late Shifts</span>
                            </div>
                        </div>
                        <p className="text-xs text-slate-400">Optimal range = 5500–6500 RPM. {results.shifts.optimal > results.shifts.early + results.shifts.late ? "✅ Good timing discipline." : "⚠️ Shift points need refinement."}</p>
                    </div>

                    {/* 11. Corner Exit Forecaster */}
                    <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl flex flex-col gap-4">
                        <div>
                            <h3 className="text-xl font-bold flex items-center gap-2 text-white mb-1">
                                <TrendingUp className="w-5 h-5 text-cyan-400" />
                                Corner Exit Forecaster
                            </h3>
                            <p className="text-xs text-slate-400">Multivariate Linear Regression — Exit speed prediction coefficients</p>
                        </div>
                        <div className="flex-1 flex flex-col justify-center gap-3">
                            <div className="flex justify-between items-center p-3 bg-slate-800 rounded-xl">
                                <span className="text-slate-400 text-sm">Speed Coefficient (β₁)</span>
                                <span className="text-cyan-400 font-mono font-bold">{results.exitForecast.speedCoeff.toFixed(3)}</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-slate-800 rounded-xl">
                                <span className="text-slate-400 text-sm">Throttle Coefficient (β₂)</span>
                                <span className="text-cyan-400 font-mono font-bold">{results.exitForecast.throttleCoeff.toFixed(3)}</span>
                            </div>
                            <p className="text-xs text-slate-500">Higher β₂ = earlier throttle application leads to greater exit velocity gain.</p>
                        </div>
                    </div>

                    {/* 12. Pedal Consistency (DTW) */}
                    <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl flex flex-col gap-4">
                        <div>
                            <h3 className="text-xl font-bold flex items-center gap-2 text-white mb-1">
                                <Gauge className="w-5 h-5 text-indigo-400" />
                                Pedal Consistency
                            </h3>
                            <p className="text-xs text-slate-400">Dynamic Time Warping — Brake zone repeatability score</p>
                        </div>
                        <div className="flex-1 flex flex-col justify-center items-center gap-3">
                            <div className="relative w-28 h-28">
                                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                                    <circle cx="50" cy="50" r="40" fill="none" stroke="#1e293b" strokeWidth="12" />
                                    <circle cx="50" cy="50" r="40" fill="none"
                                        stroke={results.consistency.dtwScore > 70 ? "#818cf8" : results.consistency.dtwScore > 40 ? "#f59e0b" : "#ef4444"}
                                        strokeWidth="12"
                                        strokeDasharray={`${2.51 * results.consistency.dtwScore} 251`}
                                        strokeLinecap="round" />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-2xl font-black text-indigo-400">{Math.round(results.consistency.dtwScore)}</span>
                                </div>
                            </div>
                            <p className="text-xs text-slate-400 text-center">{results.consistency.dtwScore > 70 ? "✅ Highly repeatable braking technique." : "⚠️ Inconsistent braking zones — varies significantly between corners."}</p>
                        </div>
                    </div>

                    {/* 13. Braking Technique */}
                    <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl flex flex-col gap-4">
                        <div>
                            <h3 className="text-xl font-bold flex items-center gap-2 text-white mb-1">
                                <ArrowRightLeft className="w-5 h-5 text-orange-400" />
                                Braking Technique
                            </h3>
                            <p className="text-xs text-slate-400">Decision Tree — Trail vs Stab braking classification</p>
                        </div>
                        <div className="flex-1 flex flex-col justify-center gap-4">
                            <div className="flex justify-between text-sm text-slate-400 font-semibold">
                                <span>Stab Braking</span>
                                <span>Trail Braking</span>
                            </div>
                            <div className="w-full h-4 bg-slate-800 rounded-full overflow-hidden flex">
                                <div className="h-full bg-blue-500 transition-all duration-700" style={{ width: `${100 - results.brakingTech.trailPercent}%` }}></div>
                                <div className="h-full bg-orange-500 transition-all duration-700" style={{ width: `${results.brakingTech.trailPercent}%` }}></div>
                            </div>
                            <div className="flex justify-between font-mono font-bold">
                                <span className="text-blue-400">{100 - results.brakingTech.trailPercent}%</span>
                                <span className="text-orange-400">{results.brakingTech.trailPercent}%</span>
                            </div>
                            <p className="text-xs text-slate-500">{results.brakingTech.trailPercent > 40 ? "🏎️ Trail braking used frequently — advanced technique that rotates the car into corners." : "🔵 Primarily stab braking — safer but leaves corner entry speed on the table."}</p>
                        </div>
                    </div>

                    {/* 14. Transition Probability Flow (Markov) */}
                    <div className="xl:col-span-2 bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl flex flex-col gap-4">
                        <div>
                            <h3 className="text-xl font-bold flex items-center gap-2 text-white mb-1">
                                <ShieldCheck className="w-5 h-5 text-teal-400" />
                                State Transition Flow
                            </h3>
                            <p className="text-xs text-slate-400">Markov Chain — Driving state transition probabilities</p>
                        </div>
                        <div className="flex-1 grid grid-cols-2 gap-3">
                            {(['Cruising', 'Cornering', 'Slow / Cautious', 'Erratic'] as const).map(fromState => {
                                const row = results.markov[fromState] || {};
                                const total = Object.values(row).reduce((a: number, b: any) => a + Number(b), 0) || 1;
                                const topTo = Object.entries(row).sort((a, b) => b[1] - a[1]).slice(0, 2);
                                return (
                                    <div key={fromState} className="bg-slate-800 p-3 rounded-xl">
                                        <div className={`text-xs font-bold mb-2 ${fromState === 'Erratic' ? 'text-red-400' : fromState === 'Cruising' ? 'text-emerald-400' : fromState === 'Cornering' ? 'text-amber-400' : 'text-blue-400'}`}>{fromState} →</div>
                                        {topTo.length === 0
                                            ? <p className="text-xs text-slate-500">No transitions</p>
                                            : topTo.map(([to, count]) => (
                                                <div key={to} className="flex justify-between text-xs text-slate-300 py-0.5">
                                                    <span>{to}</span>
                                                    <span className="font-mono font-bold text-teal-400">{((Number(count) / total) * 100).toFixed(0)}%</span>
                                                </div>
                                            ))}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* 15. Aggression vs Safety Matrix */}
                    <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl flex flex-col gap-4">
                        <div>
                            <h3 className="text-xl font-bold flex items-center gap-2 text-white mb-1">
                                <Layers className="w-5 h-5 text-fuchsia-400" />
                                Aggression Matrix
                            </h3>
                            <p className="text-xs text-slate-400">K-Medoids Proxy — Speed vs Risk quadrant analysis</p>
                        </div>
                        <div className="flex-1 grid grid-cols-2 gap-2">
                            <div className="bg-emerald-900/50 border border-emerald-700/40 rounded-2xl p-3 text-center flex flex-col gap-1">
                                <span className="text-xs text-emerald-400 font-bold">SAFE + FAST</span>
                                <span className="text-2xl font-black text-emerald-300">{Math.round(results.aggression.safeFast)}%</span>
                            </div>
                            <div className="bg-amber-900/50 border border-amber-700/40 rounded-2xl p-3 text-center flex flex-col gap-1">
                                <span className="text-xs text-amber-400 font-bold">RISKY + FAST</span>
                                <span className="text-2xl font-black text-amber-300">{Math.round(results.aggression.riskyFast)}%</span>
                            </div>
                            <div className="bg-blue-900/50 border border-blue-700/40 rounded-2xl p-3 text-center flex flex-col gap-1">
                                <span className="text-xs text-blue-400 font-bold">SAFE + SLOW</span>
                                <span className="text-2xl font-black text-blue-300">{Math.round(results.aggression.safeSlow)}%</span>
                            </div>
                            <div className="bg-red-900/50 border border-red-700/40 rounded-2xl p-3 text-center flex flex-col gap-1">
                                <span className="text-xs text-red-400 font-bold">RISKY + SLOW</span>
                                <span className="text-2xl font-black text-red-300">{Math.round(results.aggression.riskySlow)}%</span>
                            </div>
                        </div>
                    </div>

                    {/* 7. ML Quality Statistics Panel - Interactive */}
                    <div className="xl:col-span-3 bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl mt-4">
                        <div className="mb-6">
                            <h3 className="text-xl font-bold flex items-center gap-2 text-white">
                                <Settings className="w-5 h-5 text-slate-400" />
                                Model Confidence & Quality Metrics
                            </h3>
                            <p className="text-sm text-slate-400 mt-1">Select a metric below to view mathematical reasoning and dataset contexts.</p>
                        </div>

                        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4">
                            <MetricCard
                                id="clusteringSilhouette" title="Clustering Proxy" color="emerald"
                                score={(results.qualityMetrics.clusteringSilhouette.score).toFixed(2)} label="Silhouette Score"
                                selected={selectedMetric} onSelect={setSelectedMetric}
                            />
                            <MetricCard
                                id="pcaVariance" title="Feature Map" color="indigo"
                                score={`${(results.qualityMetrics.pcaVariance.score * 100).toFixed(1)}%`} label="Explained Var."
                                selected={selectedMetric} onSelect={setSelectedMetric}
                            />
                            <MetricCard
                                id="randomForestOOB" title="Wear Prediction" color="pink"
                                score={results.qualityMetrics.randomForestOOB.score.toFixed(2)} label="Tree Convergence"
                                selected={selectedMetric} onSelect={setSelectedMetric}
                            />
                            <MetricCard
                                id="anomalySkewness" title="Isolation Tree" color="red"
                                score={results.qualityMetrics.anomalySkewness.score.toFixed(2)} label="Anomaly Skewness"
                                selected={selectedMetric} onSelect={setSelectedMetric}
                            />
                            <MetricCard
                                id="svmMargin" title="SVM Predictor" color="orange"
                                score={results.qualityMetrics.svmMargin.score.toFixed(2)} label="Boundary Margin"
                                selected={selectedMetric} onSelect={setSelectedMetric}
                            />
                            <MetricCard
                                id="regressionFit" title="Safety Score" color="green"
                                score={results.qualityMetrics.regressionFit.score.toFixed(2)} label="R-Squared Fit"
                                selected={selectedMetric} onSelect={setSelectedMetric}
                            />
                            <MetricCard
                                id="knnConfidence" title="Driver Match" color="blue"
                                score={`${(results.qualityMetrics.knnConfidence.score * 100).toFixed(1)}%`} label="KNN Confidence"
                                selected={selectedMetric} onSelect={setSelectedMetric}
                            />
                        </div>

                        {/* Interactive Expand Pane */}
                        {selectedMetric && (
                            <div className="mt-6 bg-slate-950 rounded-2xl p-6 border border-slate-800 animate-in slide-in-from-top-4 fade-in duration-300">
                                <div className="flex justify-between items-start mb-4">
                                    <h4 className="text-lg font-bold text-white capitalize">
                                        {selectedMetric.replace(/([A-Z])/g, ' $1').trim()} Analysis
                                    </h4>
                                    <button onClick={() => setSelectedMetric(null)} className="text-slate-500 hover:text-white transition-colors">
                                        ✕
                                    </button>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Mathematical Formula Concept</div>
                                        <div className="font-mono text-sm px-3 py-2 bg-slate-900 rounded-lg text-slate-300 inline-block border border-slate-800">
                                            {results.qualityMetrics[selectedMetric as keyof typeof results.qualityMetrics].formula}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Dataset Reasoning</div>
                                        <p className="text-slate-300 leading-relaxed text-sm">
                                            {results.qualityMetrics[selectedMetric as keyof typeof results.qualityMetrics].analysis}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                </div>
            )}
        </div>
    );
};

// Helper components & functions
const CustomReferenceLines = () => (
    <g>
        <line x1="50%" y1="0" x2="50%" y2="100%" stroke="#334155" strokeWidth={2} />
        <line x1="0" y1="50%" x2="100%" y2="50%" stroke="#334155" strokeWidth={2} />
        <text x="5%" y="10%" fill="#475569" fontSize={12} className="uppercase font-bold tracking-wider">Smooth</text>
        <text x="85%" y="10%" fill="#475569" fontSize={12} className="uppercase font-bold tracking-wider">Erratic</text>
        <text x="5%" y="95%" fill="#475569" fontSize={12} className="uppercase font-bold tracking-wider">Cautious</text>
        <text x="85%" y="95%" fill="#475569" fontSize={12} className="uppercase font-bold tracking-wider">Aggressive</text>
    </g>
);

const MetricCard = ({ id, title, score, label, color, selected, onSelect }: any) => {
    const isSelected = selected === id;
    return (
        <button
            onClick={() => onSelect(isSelected ? null : id)}
            className={`flex flex-col items-center p-4 rounded-2xl border transition-all duration-200 text-left w-full
                ${isSelected
                    ? `bg-slate-800 border-slate-600 shadow-lg scale-105`
                    : `bg-slate-900/50 border-slate-800 hover:bg-slate-800 hover:border-slate-700`
                }
            `}
        >
            <span className="text-slate-400 text-[10px] sm:text-xs font-bold tracking-widest uppercase mb-2 text-center h-8 sm:h-auto flex items-center justify-center">{title}</span>
            <span className={`text-2xl sm:text-3xl font-black font-mono text-${color}-400`}>{score}</span>
            <span className="text-[10px] sm:text-xs text-slate-500 mt-1 text-center font-semibold">{label}</span>
        </button>
    );
};

const getStateColor = (state: string, isBg: boolean = false) => {
    switch (state) {
        case 'Cruising': return isBg ? 'bg-emerald-500' : 'bg-emerald-500';
        case 'Slow / Cautious': return isBg ? 'bg-blue-500' : 'bg-blue-500';
        case 'Cornering': return isBg ? 'bg-amber-500' : 'bg-amber-500';
        case 'Erratic': return isBg ? 'bg-red-500' : 'bg-red-500';
        default: return 'bg-slate-500';
    }
}

export default MLAnalysis;
