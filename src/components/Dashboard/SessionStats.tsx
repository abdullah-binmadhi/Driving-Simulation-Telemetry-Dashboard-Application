import { useState, useEffect, useRef, memo } from 'react';
import { useTelemetryStore } from '../../stores/telemetryStore';

const SessionStats = memo(() => {
    const { data, isConnected } = useTelemetryStore();

    // Aggregation states
    const [stats, setStats] = useState({
        maxGForceLat: 0,
        maxGForceLong: 0,
        maxSpeed: 0,
        throttleSum: 0,
        throttleCount: 0
    });

    // Use a ref to store current values for high-frequency updates without re-rendering
    const statsRef = useRef({
        maxGForceLat: 0,
        maxGForceLong: 0,
        maxSpeed: 0,
        throttleSum: 0,
        throttleCount: 0
    });

    const lastUIUpdate = useRef(0);
    const UI_UPDATE_INTERVAL = 500; // Update UI every 500ms for stats

    // Reset stats when connection drops or is manually cleared
    const resetStats = () => {
        const fresh = {
            maxGForceLat: 0,
            maxGForceLong: 0,
            maxSpeed: 0,
            throttleSum: 0,
            throttleCount: 0
        };
        statsRef.current = fresh;
        setStats(fresh);
    };

    // Auto-reset if connection is lost
    useEffect(() => {
        if (!isConnected) resetStats();
    }, [isConnected]);

    // Update aggregations when new data comes in
    useEffect(() => {
        if (data && isConnected) {
            const current = statsRef.current;
            current.maxGForceLat = Math.max(current.maxGForceLat, Math.abs(data.gForceX));
            current.maxGForceLong = Math.max(current.maxGForceLong, Math.abs(data.gForceY));
            current.maxSpeed = Math.max(current.maxSpeed, data.speed);
            current.throttleSum += data.throttle;
            current.throttleCount += 1;

            const now = Date.now();
            if (now - lastUIUpdate.current >= UI_UPDATE_INTERVAL) {
                setStats({ ...current });
                lastUIUpdate.current = now;
            }
        }
    }, [data, isConnected]);

    const avgThrottle = stats.throttleCount > 0 ? (stats.throttleSum / stats.throttleCount) * 100 : 0;

    return (
        <div className="bg-slate-900 rounded-2xl p-2 border border-slate-800 flex-grow shadow-lg">
            <div className="flex justify-between items-center mb-2">
                <h2 className="text-lg font-semibold text-slate-300">Session Extremes</h2>
                <button
                    onClick={resetStats}
                    className="text-xs px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded transition-colors"
                >
                    Reset
                </button>
            </div>

            <div className="grid grid-cols-2 gap-2">

                {/* Max Speed */}
                <div className="bg-slate-800/50 p-2 rounded-xl border border-slate-700/50 flex flex-col items-center justify-center">
                    <span className="text-slate-500 text-[10px] uppercase tracking-wider mb-1">Max Speed</span>
                    <div className="flex items-baseline gap-1">
                        <span className="text-xl font-bold font-mono text-blue-400">{stats.maxSpeed.toFixed(0)}</span>
                        <span className="text-xs text-slate-500 font-mono">km/h</span>
                    </div>
                </div>

                {/* Avg Throttle */}
                <div className="bg-slate-800/50 p-2 rounded-xl border border-slate-700/50 flex flex-col items-center justify-center">
                    <span className="text-slate-500 text-[10px] uppercase tracking-wider mb-1">Avg Throttle</span>
                    <div className="flex items-baseline gap-1">
                        <span className="text-xl font-bold font-mono text-green-400">{avgThrottle.toFixed(1)}</span>
                        <span className="text-xs text-slate-500 font-mono">%</span>
                    </div>
                </div>

                {/* Max Lat G */}
                <div className="bg-slate-800/50 p-2 rounded-xl border border-slate-700/50 flex flex-col items-center justify-center">
                    <span className="text-slate-500 text-[10px] uppercase tracking-wider mb-1">Max Lat G</span>
                    <div className="flex items-baseline gap-1">
                        <span className="text-xl font-bold font-mono text-purple-400">{stats.maxGForceLat.toFixed(2)}</span>
                        <span className="text-xs text-slate-500 font-mono">G</span>
                    </div>
                </div>

                {/* Max Long G */}
                <div className="bg-slate-800/50 p-2 rounded-xl border border-slate-700/50 flex flex-col items-center justify-center">
                    <span className="text-slate-500 text-[10px] uppercase tracking-wider mb-1">Max Long G</span>
                    <div className="flex items-baseline gap-1">
                        <span className="text-xl font-bold font-mono text-orange-400">{stats.maxGForceLong.toFixed(2)}</span>
                        <span className="text-xs text-slate-500 font-mono">G</span>
                    </div>
                </div>

            </div>
        </div>
    );
});

export default SessionStats;
