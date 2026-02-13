import { useState, useEffect } from 'react';
import { useTelemetryStore } from '../../stores/telemetryStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useTelemetryListener } from '../../hooks/useTelemetry';
import Speedometer from './Speedometer';
import RPMGauge from './RPMGauge';
import LiveGraph from './LiveGraph';
import TireStatus from './TireStatus';
import LapTiming from './LapTiming';
import CarHealth from './CarHealth';
import DriverProfile from './DriverProfile';
import SessionInfo from './SessionInfo';
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
                <div className="animate-pulse text-xl">Waiting for Game Connection...</div>
                <div className="text-sm mt-2">Launch BeamNG.drive or Assetto Corsa</div>
            </div>
        );
    }

    return (
        <div className="p-4 h-full flex flex-col gap-4">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Live Dashboard</h1>
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    <span className="text-green-500 font-medium">{activeGame} Connected</span>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">

                {/* LEFT COLUMN: Driver & Session Info (3 cols) */}
                <div className="xl:col-span-3 flex flex-col gap-6 order-2 xl:order-1">
                    <DriverProfile />
                    <SessionInfo />
                </div>

                {/* CENTER COLUMN: Main Gauges (6 cols) */}
                <div className="xl:col-span-6 flex flex-col gap-6 order-1 xl:order-2">


                    <RPMGauge rpm={data.rpm} gear={data.gear} />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <CarHealth damage={data.carDamage} />
                        <div className="flex flex-col gap-4 justify-between h-full">
                            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex-grow flex flex-col justify-center">
                                <span className="text-slate-400 text-xs uppercase mb-2">Throttle</span>
                                <div className="h-4 bg-slate-900 rounded-full overflow-hidden w-full">
                                    <div className="h-full bg-green-500 transition-all duration-75" style={{ width: `${data.throttle * 100}%` }}></div>
                                </div>
                                <span className="text-right text-xs font-mono text-green-400 mt-1">{(data.throttle * 100).toFixed(0)}%</span>
                            </div>
                            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex-grow flex flex-col justify-center">
                                <span className="text-slate-400 text-xs uppercase mb-2">Brake</span>
                                <div className="h-4 bg-slate-900 rounded-full overflow-hidden w-full">
                                    <div className="h-full bg-red-500 transition-all duration-75" style={{ width: `${data.brake * 100}%` }}></div>
                                </div>
                                <span className="text-right text-xs font-mono text-red-400 mt-1">{(data.brake * 100).toFixed(0)}%</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN: Telemetry Metrics (3 cols) */}
                <div className="xl:col-span-3 flex flex-col gap-6 order-3">
                    <LapTiming current={data.lapTime || 0} last={data.lastLap} best={data.bestLap} />
                    <TireStatus temps={data.tireTemp} wear={data.tireWear} />
                    <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 flex-grow">
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
                            <div className="flex justify-between border-b border-slate-800 pb-2">
                                <span className="text-slate-500">Engine Temp</span>
                                <span className="font-mono">{(data.engineTemp || 0).toFixed(0)} °C</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Live Graph covers full width at bottom */}
                <div className="col-span-1 xl:col-span-12 order-4">
                    <LiveGraph data={speedHistory} title="Speed Over Time" />
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
