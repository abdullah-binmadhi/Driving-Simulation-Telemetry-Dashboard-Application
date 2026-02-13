import { useState, useEffect } from 'react';
import { useTelemetryStore } from '../../stores/telemetryStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useTelemetryListener } from '../../hooks/useTelemetry';
import Speedometer from './Speedometer';
import RPMGauge from './RPMGauge';
import LiveGraph from './LiveGraph';

const MAX_HISTORY = 100; // Keep last 100 points for graphing

const Dashboard = () => {
    // Activate listener
    useTelemetryListener();

    const { data, isConnected, activeGame } = useTelemetryStore();
    const [speedHistory, setSpeedHistory] = useState<{ timestamp: number, value: number }[]>([]);

    // Update history when new data arrives
    useEffect(() => {
        if (data) {
            setSpeedHistory(prev => {
                const newHistory = [...prev, { timestamp: data.timestamp, value: data.speed }];
                if (newHistory.length > MAX_HISTORY) {
                    return newHistory.slice(newHistory.length - MAX_HISTORY);
                }
                return newHistory;
            });
        }
    }, [data]);

    const { game } = useSettingsStore();
    const isSimMode = game?.simulationEnabled;

    if ((!isConnected && !isSimMode) || !data) {
        if (isSimMode && !data) {
            return (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                    <div className="animate-pulse text-xl">Starting Simulation...</div>
                </div>
            );
        }

        return (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <div className="animate-pulse text-xl">Waiting for game connection...</div>
                <div className="text-sm mt-2">Launch BeamNG.drive or Assetto Corsa</div>
            </div>
        );
    }

    return (
        <div className="p-8 h-full flex flex-col gap-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Live Dashboard</h1>
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    <span className="text-green-500 font-medium">{activeGame} Connected</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Gagues */}
                <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-slate-900 rounded-2xl p-6 flex items-center justify-center border border-slate-800">
                        {/* SVG Speedometer takes props */}
                        {/* Passing a key to force re-render if needed, but react handles props */}
                        <svg viewBox="0 0 200 200" className="w-full h-full max-w-[300px]">
                            <Speedometer speed={data.speed} />
                        </svg>
                    </div>
                    <div className="flex flex-col gap-6">
                        <RPMGauge rpm={data.rpm} gear={data.gear} />

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                                <span className="text-slate-400 text-xs uppercase">Throttle</span>
                                <div className="h-2 bg-slate-900 rounded-full mt-2 overflow-hidden">
                                    <div className="h-full bg-green-500 transition-all duration-75" style={{ width: `${data.throttle * 100}%` }}></div>
                                </div>
                            </div>
                            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                                <span className="text-slate-400 text-xs uppercase">Brake</span>
                                <div className="h-2 bg-slate-900 rounded-full mt-2 overflow-hidden">
                                    <div className="h-full bg-red-500 transition-all duration-75" style={{ width: `${data.brake * 100}%` }}></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Side Metrics */}
                <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
                    <h2 className="text-lg font-semibold mb-4 text-slate-300">Vehicle Dynamics</h2>
                    <div className="space-y-4">
                        <div className="flex justify-between border-b border-slate-800 pb-2">
                            <span className="text-slate-500">G-Force X (Lat)</span>
                            <span className="font-mono">{data.gForceX.toFixed(2)} G</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-800 pb-2">
                            <span className="text-slate-500">G-Force Y (Long)</span>
                            <span className="font-mono">{data.gForceY.toFixed(2)} G</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-800 pb-2">
                            <span className="text-slate-500">Fuel</span>
                            <span className="font-mono">{(data.fuel || 0).toFixed(1)} %</span>
                        </div>
                    </div>
                </div>

                {/* Graph */}
                <div className="lg:col-span-3">
                    <LiveGraph data={speedHistory} title="Speed Over Time" />
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
