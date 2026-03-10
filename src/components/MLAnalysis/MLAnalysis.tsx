import React from 'react';
import { Play, FileText, AlertTriangle, Brain, Target, Activity, Settings, GitCommit, Zap } from 'lucide-react';
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
        }>;
        anomalyCount: number;
    };
    svm: {
        overlapPercentage: number;
        overlapEvents: number;
    };
    lstm: {
        data: Array<{
            timestamp: number;
            error: number; // High error means erratic behavior
        }>;
        maxError: number;
        analysisText?: string;
    };
    hmm: {
        data: Array<{
            timestamp: number;
            state: string; // Cruising, Braking, Cornering, Erratic
        }>;
        statePercentages: Record<string, number>;
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
    lstm: { data: [], maxError: 0, analysisText: "Awaiting analysis..." },
    hmm: { data: [], statePercentages: {} },
    isProcessing: false,
    progress: 0,
    error: null
};


const MLAnalysis = () => {
    const [results, setResults] = useState<MLResults>(INITIAL_RESULTS);
    const [hasData, setHasData] = useState(false);
    const [sessionData, setSessionData] = useState<any[] | null>(null);
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
                        const getVal = (key: string) => {
                            const foundKey = Object.keys(row).find(k => k.toLowerCase().includes(key));
                            return foundKey ? Number(row[foundKey]) || 0 : 0;
                        };
                        return {
                            timestamp: getVal('timestamp') || getVal('time') || (i * 16),
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
                            <span className="text-indigo-300 text-sm font-bold uppercase tracking-widest">{results.pca.profile}</span>
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


                    {/* 5. LSTM Autoencoder */}
                    <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl flex flex-col">
                        <div>
                            <h3 className="text-xl font-bold flex items-center gap-2 text-white mb-1">
                                <Activity className="w-5 h-5 text-cyan-500" />
                                Erratic Behavior Tracking
                            </h3>
                            <p className="text-sm text-slate-400 mb-3">LSTM Autoencoders (Reconstruction Error)</p>
                            {results.lstm.analysisText && results.lstm.analysisText !== "Awaiting analysis..." && (
                                <div className="bg-cyan-950/30 border border-cyan-900/50 rounded-xl p-3 text-sm text-cyan-300">
                                    {results.lstm.analysisText}
                                </div>
                            )}
                        </div>

                        <div className="flex-1 w-full min-h-[200px] mt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={results.lstm.data} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                    <XAxis dataKey="timestamp" stroke="#475569" tick={false} />
                                    <YAxis stroke="#475569" domain={[0, 'auto']} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                                        itemStyle={{ color: '#e2e8f0' }}
                                        labelStyle={{ color: '#cbd5e1' }}
                                        labelFormatter={() => `Loss (Error)`}
                                    />
                                    <Line type="monotone" dataKey="error" stroke="#06b6d4" strokeWidth={2} dot={false} strokeOpacity={0.8} />
                                </LineChart>
                            </ResponsiveContainer>
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
