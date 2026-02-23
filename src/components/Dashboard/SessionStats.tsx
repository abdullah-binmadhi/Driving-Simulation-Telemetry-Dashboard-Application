import { useState, useEffect } from 'react';
import { useTelemetryStore } from '../../stores/telemetryStore';

const SessionStats = () => {
    const { data, isConnected } = useTelemetryStore();

    // Aggregation states
    const [maxGForceLat, setMaxGForceLat] = useState(0);
    const [maxGForceLong, setMaxGForceLong] = useState(0);
    const [maxSpeed, setMaxSpeed] = useState(0);

    // Throttle averaging variables
    const [throttleSum, setThrottleSum] = useState(0);
    const [throttleCount, setThrottleCount] = useState(0);

    // Reset stats when connection drops or is manually cleared
    const resetStats = () => {
        setMaxGForceLat(0);
        setMaxGForceLong(0);
        setMaxSpeed(0);
        setThrottleSum(0);
        setThrottleCount(0);
    };

    // Auto-reset if connection is lost
    useEffect(() => {
        if (!isConnected) resetStats();
    }, [isConnected]);

    // Update aggregations when new data comes in
    useEffect(() => {
        if (data && isConnected) {
            setMaxGForceLat(prev => Math.max(prev, Math.abs(data.gForceX)));
            setMaxGForceLong(prev => Math.max(prev, Math.abs(data.gForceY)));
            setMaxSpeed(prev => Math.max(prev, data.speed));

            setThrottleSum(prev => prev + data.throttle);
            setThrottleCount(prev => prev + 1);
        }
    }, [data, isConnected]);

    const avgThrottle = throttleCount > 0 ? (throttleSum / throttleCount) * 100 : 0;

    return (
        <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 flex-grow shadow-lg">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-slate-300">Session Extremes</h2>
                <button
                    onClick={resetStats}
                    className="text-xs px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded transition-colors"
                >
                    Reset
                </button>
            </div>

            <div className="grid grid-cols-2 gap-4">

                {/* Max Speed */}
                <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50 flex flex-col items-center justify-center">
                    <span className="text-slate-500 text-xs uppercase tracking-wider mb-1">Max Speed</span>
                    <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold font-mono text-blue-400">{maxSpeed.toFixed(0)}</span>
                        <span className="text-xs text-slate-500 font-mono">km/h</span>
                    </div>
                </div>

                {/* Avg Throttle */}
                <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50 flex flex-col items-center justify-center">
                    <span className="text-slate-500 text-xs uppercase tracking-wider mb-1">Avg Throttle</span>
                    <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold font-mono text-green-400">{avgThrottle.toFixed(1)}</span>
                        <span className="text-xs text-slate-500 font-mono">%</span>
                    </div>
                </div>

                {/* Max Lat G */}
                <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50 flex flex-col items-center justify-center">
                    <span className="text-slate-500 text-xs uppercase tracking-wider mb-1">Max Lat G</span>
                    <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold font-mono text-purple-400">{maxGForceLat.toFixed(2)}</span>
                        <span className="text-xs text-slate-500 font-mono">G</span>
                    </div>
                </div>

                {/* Max Long G */}
                <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50 flex flex-col items-center justify-center">
                    <span className="text-slate-500 text-xs uppercase tracking-wider mb-1">Max Long G</span>
                    <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold font-mono text-orange-400">{maxGForceLong.toFixed(2)}</span>
                        <span className="text-xs text-slate-500 font-mono">G</span>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default SessionStats;
