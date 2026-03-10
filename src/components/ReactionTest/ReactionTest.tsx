import { useState, useEffect, useRef, useCallback } from 'react';
import { useTelemetryStore } from '../../stores/telemetryStore';
import { Timer, AlertTriangle, RotateCcw, Save, Trash2, Activity, Play, Volume2, Target, Zap } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

type TestMode = 'simple' | 'realistic' | 'cognitive' | 'auditory';

interface HistoryItem {
    id: string;
    timestamp: number;
    mode: TestMode;
    reactionTime: number; // Time to 10% brake
    peakTime: number | null; // Time to 80% brake
    isPenalty: boolean;
}

const ReactionTest = () => {
    const { data } = useTelemetryStore();

    // State
    const [selectedMode, setSelectedMode] = useState<TestMode>('simple');
    const [gameState, setGameState] = useState<'idle' | 'waiting' | 'active' | 'finished' | 'penalty'>('idle');
    const [message, setMessage] = useState('Select Mode & Press Start');
    const [reactionTime, setReactionTime] = useState<number | null>(null);
    const [peakTime, setPeakTime] = useState<number | null>(null);
    const [history, setHistory] = useState<HistoryItem[]>(() => {
        const saved = localStorage.getItem('reactionTestHistory');
        return saved ? JSON.parse(saved) : [];
    });
    const [cognitiveTarget, setCognitiveTarget] = useState<'brake' | 'throttle'>('brake');

    // Refs for precision timing
    const startTimeRef = useRef<number>(0);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const hasReactedRef = useRef<boolean>(false);
    const audioContextRef = useRef<AudioContext | null>(null);

    // Save history to local storage
    useEffect(() => {
        localStorage.setItem('reactionTestHistory', JSON.stringify(history));
    }, [history]);

    // Initialize AudioContext on first interaction
    const initAudio = () => {
        if (!audioContextRef.current) {
            const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
            if (AudioCtx) audioContextRef.current = new AudioCtx();
        }
    };

    const playBeep = () => {
        if (!audioContextRef.current) return;
        const oscillator = audioContextRef.current.createOscillator();
        const gainNode = audioContextRef.current.createGain();
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(800, audioContextRef.current.currentTime);
        gainNode.gain.setValueAtTime(1, audioContextRef.current.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContextRef.current.currentTime + 0.1);
        oscillator.connect(gainNode);
        gainNode.connect(audioContextRef.current.destination);
        oscillator.start();
        oscillator.stop(audioContextRef.current.currentTime + 0.1);
    };

    const saveHistory = useCallback((rTime: number | null, pTime: number | null, penalty: boolean = false) => {
        const newItem: HistoryItem = {
            id: Math.random().toString(36).substr(2, 9),
            timestamp: Date.now(),
            mode: selectedMode,
            reactionTime: rTime || 0,
            peakTime: pTime,
            isPenalty: penalty
        };
        setHistory(prev => [newItem, ...prev].slice(0, 50)); // Keep last 50
    }, [selectedMode]);

    const endTest = useCallback((rTime: number, pTime: number | null) => {
        setGameState('finished');
        setMessage(`Reaction: ${rTime}ms${pTime ? ` | 80% Brake: ${pTime}ms` : ''}`);
        saveHistory(rTime, pTime, false);
    }, [saveHistory]);

    // Telemetry monitoring logic
    useEffect(() => {
        if (!data) return;

        const handlePenalty = (msg: string) => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            setGameState('penalty');
            setMessage(msg);
            setReactionTime(null);
            setPeakTime(null);
            hasReactedRef.current = false;
        };

        if (gameState === 'waiting') {
            // Check for false starts based on mode
            if (selectedMode === 'simple' && data.brake > 0.1) {
                handlePenalty('False Start! You braked too early.');
            } else if (selectedMode === 'realistic' && data.throttle < 0.5) {
                handlePenalty('Failed! Throttle dropped below 50% early.');
            } else if (selectedMode === 'cognitive' && (data.brake > 0.1 || data.throttle > 0.1)) {
                handlePenalty('False Start! Keep off pedals until prompted.');
            } else if (selectedMode === 'auditory' && data.brake > 0.1) {
                handlePenalty('False Start! You braked before the beep.');
            }
        } else if (gameState === 'active') {
            const now = Date.now();

            // 1. Check for initial reaction (10% threshold)
            if (!hasReactedRef.current) {
                if (selectedMode === 'cognitive') {
                    if (cognitiveTarget === 'brake' && data.brake > 0.1) {
                        setReactionTime(now - startTimeRef.current);
                        hasReactedRef.current = true;
                    } else if (cognitiveTarget === 'brake' && data.throttle > 0.1) {
                        handlePenalty('Wrong Pedal! You hit throttle instead of brake.');
                        saveHistory(null, null, true);
                        return;
                    } else if (cognitiveTarget === 'throttle' && data.throttle > 0.1) {
                        setReactionTime(now - startTimeRef.current);
                        hasReactedRef.current = true;
                        endTest(now - startTimeRef.current, null); // Throttle cognitive mode ends here
                        return;
                    } else if (cognitiveTarget === 'throttle' && data.brake > 0.1) {
                        handlePenalty('Wrong Pedal! You hit brake instead of throttle.');
                        saveHistory(null, null, true);
                        return;
                    }
                } else if (selectedMode === 'realistic') {
                    // For realistic, reaction is when they start braking
                    if (data.brake > 0.1) {
                        setReactionTime(now - startTimeRef.current);
                        hasReactedRef.current = true;
                    }
                } else {
                    // Simple & Auditory
                    if (data.brake > 0.1) {
                        setReactionTime(now - startTimeRef.current);
                        hasReactedRef.current = true;
                    }
                }
            }

            // 2. Check for peak braking (80% threshold) - if applicable to mode
            if (hasReactedRef.current && (selectedMode !== 'cognitive' || cognitiveTarget === 'brake')) {
                if (data.brake > 0.8) {
                    const reactT = reactionTime || (now - startTimeRef.current); // Use updated state or fallback
                    const peakT = now - startTimeRef.current;
                    setPeakTime(peakT);
                    endTest(reactT, peakT);
                }
            }
        }
    }, [data, gameState, selectedMode, cognitiveTarget, reactionTime, endTest, saveHistory]);

    const startTest = () => {
        initAudio();
        // Reset states
        setGameState('waiting');
        setReactionTime(null);
        setPeakTime(null);
        hasReactedRef.current = false;

        // Mode specific setup instructions
        if (selectedMode === 'realistic') {
            setMessage('Hold Throttle > 50%. Wait for RED...');
        } else if (selectedMode === 'cognitive') {
            setMessage('Wait for COLOR...');
        } else if (selectedMode === 'auditory') {
            setMessage('Wait for BEEP...');
        } else {
            setMessage('Wait for RED screen...');
        }

        const delay = 2000 + Math.random() * 4000;

        timeoutRef.current = setTimeout(() => {
            setGameState('active');
            startTimeRef.current = Date.now();

            if (selectedMode === 'cognitive') {
                const isBrake = Math.random() > 0.5;
                setCognitiveTarget(isBrake ? 'brake' : 'throttle');
                setMessage(isBrake ? 'BRAKE NOW! (RED)' : 'THROTTLE NOW! (GREEN)');
            } else if (selectedMode === 'auditory') {
                setMessage('PRESS BRAKE!');
                playBeep();
            } else {
                setMessage('BRAKE NOW!');
            }
        }, delay);
    };

    // Cleanup
    useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    const clearHistory = () => {
        if (confirm('Clear all reaction test history?')) {
            setHistory([]);
        }
    };

    const getBgColor = () => {
        switch (gameState) {
            case 'waiting': return 'bg-yellow-600';
            case 'active':
                if (selectedMode === 'cognitive') return cognitiveTarget === 'brake' ? 'bg-red-600' : 'bg-green-600';
                if (selectedMode === 'auditory') return 'bg-slate-800'; // No visual cue
                return 'bg-red-600';
            case 'finished': return 'bg-green-600';
            case 'penalty': return 'bg-orange-700';
            default: return 'bg-slate-800';
        }
    };

    const getRank = (time: number | null) => {
        if (!time) return { label: '---', color: 'text-slate-500' };
        if (time < 150) return { label: 'Alien 👽', color: 'text-purple-400' };
        if (time < 200) return { label: 'F1 Driver 🏎️', color: 'text-blue-400' };
        if (time < 250) return { label: 'Pro Sim Racer 🎮', color: 'text-green-400' };
        if (time < 350) return { label: 'Daily Driver 🚗', color: 'text-yellow-400' };
        return { label: 'Needs Coffee ☕', color: 'text-red-400' };
    };

    // Chart Data formatting building only non-penalty data for selected mode
    const chartData = history
        .filter(h => h.mode === selectedMode && !h.isPenalty)
        .reverse()
        .map((h, i) => ({
            attempt: i + 1,
            Reaction: h.reactionTime,
            PeakBrake: h.peakTime || h.reactionTime, // Line fallback 
        }));

    const bestTimeThisMode = history
        .filter(h => h.mode === selectedMode && !h.isPenalty)
        .reduce((min, cur) => cur.reactionTime < min ? cur.reactionTime : min, 9999);

    const displayBest = bestTimeThisMode === 9999 ? null : bestTimeThisMode;

    const rank = getRank(reactionTime);

    // Live Indicators
    const throttlePercent = data ? Math.round(data.throttle * 100) : 0;
    const brakePercent = data ? Math.round(data.brake * 100) : 0;

    return (
        <div className="p-8 h-full flex flex-col gap-6 overflow-y-auto w-full">
            <h1 className="text-3xl font-bold flex items-center gap-2">
                <Timer className="w-8 h-8 text-blue-500" />
                Advanced Reaction Test
            </h1>

            {/* Mode Selector */}
            <div className="flex flex-wrap gap-2 w-full">
                <button
                    onClick={() => { if (gameState === 'idle' || gameState === 'finished' || gameState === 'penalty') setSelectedMode('simple') }}
                    className={`px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors ${selectedMode === 'simple' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                >
                    <Zap className="w-4 h-4" /> Simple
                </button>
                <button
                    onClick={() => { if (gameState === 'idle' || gameState === 'finished' || gameState === 'penalty') setSelectedMode('realistic') }}
                    className={`px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors ${selectedMode === 'realistic' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                >
                    <Activity className="w-4 h-4" /> Throttle-to-Brake
                </button>
                <button
                    onClick={() => { if (gameState === 'idle' || gameState === 'finished' || gameState === 'penalty') setSelectedMode('cognitive') }}
                    className={`px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors ${selectedMode === 'cognitive' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                >
                    <Target className="w-4 h-4" /> Go / No-Go
                </button>
                <button
                    onClick={() => { if (gameState === 'idle' || gameState === 'finished' || gameState === 'penalty') setSelectedMode('auditory') }}
                    className={`px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors ${selectedMode === 'auditory' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                >
                    <Volume2 className="w-4 h-4" /> Auditory
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full flex-1">
                {/* Main Test Area (Takes up 2/3 on large screens) */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                    <div
                        className={`w-full aspect-video rounded-3xl flex flex-col items-center justify-center p-8 transition-colors duration-200 shadow-2xl relative overflow-hidden ${getBgColor()}`}
                    >
                        {/* Live pedal indicators for deadzone check */}
                        <div className="absolute top-4 right-4 flex gap-4 text-xs font-mono opacity-60">
                            <div className="flex flex-col items-center">
                                <span className={throttlePercent > 50 && selectedMode === 'realistic' ? 'text-green-300 font-bold' : 'text-white'}>THR: {throttlePercent}%</span>
                                <div className="w-4 h-24 bg-black/50 rounded-full mt-1 overflow-hidden flex items-end">
                                    <div className="w-full bg-green-500" style={{ height: `${throttlePercent}%` }}></div>
                                </div>
                            </div>
                            <div className="flex flex-col items-center">
                                <span className="text-white">BRK: {brakePercent}%</span>
                                <div className="w-4 h-24 bg-black/50 rounded-full mt-1 overflow-hidden flex items-end">
                                    <div className="w-full bg-red-500" style={{ height: `${brakePercent}%` }}></div>
                                </div>
                            </div>
                        </div>

                        <div className="text-4xl lg:text-5xl font-bold text-white mb-6 text-center z-10">{message}</div>

                        {(gameState === 'idle' || gameState === 'finished' || gameState === 'penalty') && (
                            <button
                                onClick={startTest}
                                className="px-8 py-4 bg-white text-slate-900 rounded-full font-bold text-xl hover:scale-105 transition-transform shadow-xl flex items-center gap-2 z-10"
                            >
                                {gameState === 'idle' ? <Play className="w-6 h-6" /> : <RotateCcw className="w-6 h-6" />}
                                {gameState === 'idle' ? 'START TEST' : 'TRY AGAIN'}
                            </button>
                        )}

                        {gameState === 'finished' && reactionTime && (
                            <div className="absolute bottom-6 left-6 right-6 flex justify-between items-center z-10 bg-black/30 backdrop-blur-md p-4 rounded-2xl">
                                <div className="flex flex-col">
                                    <span className="text-white/70 text-sm font-semibold uppercase tracking-wider">Rank</span>
                                    <span className={`text-2xl font-bold ${rank.color}`}>{rank.label}</span>
                                </div>
                                {peakTime && selectedMode !== 'cognitive' && (
                                    <div className="flex flex-col text-right">
                                        <span className="text-white/70 text-sm font-semibold uppercase tracking-wider">80% Brake Time</span>
                                        <span className="text-2xl font-bold text-white font-mono">{peakTime}ms</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Chart Area */}
                    <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl w-full h-64">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-white">Consistency Chart ({selectedMode})</h3>
                            <span className="text-sm font-mono text-green-400">Best: {displayBest ? `${displayBest}ms` : '--'}</span>
                        </div>
                        {chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                    <XAxis dataKey="attempt" stroke="#64748b" tick={{ fill: '#64748b' }} />
                                    <YAxis stroke="#64748b" tick={{ fill: '#64748b' }} domain={['auto', 'auto']} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                                        itemStyle={{ color: '#e2e8f0' }}
                                    />
                                    <Line type="monotone" name="10% Reaction" dataKey="Reaction" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6' }} activeDot={{ r: 6 }} />
                                    <Line type="monotone" name="80% Brake" dataKey="PeakBrake" stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-500 italic">No valid data for this mode yet.</div>
                        )}
                    </div>
                </div>

                {/* Sidebar (Takes up 1/3) */}
                <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-xl overflow-hidden flex flex-col max-h-[calc(100vh-200px)] lg:max-h-none">
                    <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Save className="w-5 h-5 text-blue-500" />
                            Session History
                        </h2>
                        <button onClick={clearHistory} className="text-slate-500 hover:text-red-400 p-2 rounded-lg hover:bg-slate-800 transition-colors" title="Clear History">
                            <Trash2 className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2">
                        {history.length === 0 ? (
                            <div className="text-center p-8 text-slate-500">History empty. Complete a test!</div>
                        ) : (
                            <div className="flex flex-col gap-2">
                                {history.map((item) => (
                                    <div key={item.id} className="p-4 rounded-xl bg-slate-800/50 border border-slate-700 flex justify-between items-center">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-white font-semibold capitalize text-sm">{item.mode} Mode</span>
                                                <span className="text-xs text-slate-500">
                                                    {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                                </span>
                                            </div>
                                            {item.isPenalty ? (
                                                <span className="text-red-400 font-bold font-mono text-lg mt-1 block">PENALTY / FAIL</span>
                                            ) : (
                                                <div className="flex items-baseline gap-2 mt-1">
                                                    <span className="text-2xl font-bold font-mono text-white">{item.reactionTime}ms</span>
                                                    {item.peakTime && <span className="text-sm font-mono text-slate-400">/ {item.peakTime}ms</span>}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="mt-4 flex items-start gap-2 text-slate-500 max-w-4xl p-6 bg-slate-900/50 rounded-2xl border border-slate-800/50">
                <AlertTriangle className="w-6 h-6 shrink-0 text-yellow-500/70 mt-1" />
                <div className="text-sm flex flex-col gap-2">
                    <strong className="text-slate-300 text-base mb-1 block">Mode Instructions:</strong>
                    <p><span className="text-blue-400 font-semibold">Simple:</span> Wait for the RED screen, then hit the brake immediately.</p>
                    <p><span className="text-blue-400 font-semibold">Throttle-to-Brake:</span> Keep throttle above 50%. When RED appears, release throttle and hit brake.</p>
                    <p><span className="text-blue-400 font-semibold">Go / No-Go:</span> When screen turns RED &gt; Brake. When it turns GREEN &gt; Throttle.</p>
                    <p><span className="text-blue-400 font-semibold">Auditory:</span> Screen stays dark. Listen for the BEEP sound and hit the brake.</p>
                </div>
            </div>
        </div>
    );
};

export default ReactionTest;
