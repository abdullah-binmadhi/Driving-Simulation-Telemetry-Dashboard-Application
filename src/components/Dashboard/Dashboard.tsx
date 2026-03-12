import { useState, useEffect } from 'react';
import { useTelemetryStore } from '../../stores/telemetryStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useTelemetryListener } from '../../hooks/useTelemetry';

import RPMGauge from './RPMGauge';
import TireStatus from './TireStatus';
import LapTiming from './LapTiming';
import CarHealth from './CarHealth';
import DriverProfile from './DriverProfile';
import SessionInfo from './SessionInfo';

// New Enhancements
import FrictionCircle from './FrictionCircle';
import LiveMultiGraph from './LiveMultiGraph';
import InputVisualizer from './InputVisualizer';

// Research Enhancements
import TrackMap from './TrackMap';
import SessionStats from './SessionStats';
import DataLogger from './DataLogger';
import BehaviorAnalysis from './BehaviorAnalysis';

const MAX_HISTORY = 100; // Keep last 100 points for graphing

const Dashboard = () => {
    // Activate listener
    useTelemetryListener();

    const { data, isConnected, activeGame } = useTelemetryStore();

    // Store history for the multi-trace graph
    const [telemetryHistory, setTelemetryHistory] = useState<{
        timestamp: number, speed: number, rpm: number, throttle: number, brake: number
    }[]>([]);

    // Update history when new data arrives
    useEffect(() => {
        if (data) {
            setTelemetryHistory(prev => {
                const newHistory = [...prev, {
                    timestamp: data.timestamp,
                    speed: data.speed,
                    rpm: data.rpm,
                    throttle: data.throttle * 100, // convert to %
                    brake: data.brake * 100       // convert to %
                }];
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
        <div className="p-2 min-h-full flex flex-col gap-2">
            <div className="flex justify-between items-center bg-slate-900 p-3 rounded-xl border border-slate-800 shadow-sm">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">Research Telemetry</h1>
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    <span className="text-green-500 font-medium">{activeGame} Connected</span>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-2">

                {/* LEFT COLUMN (3 cols) */}
                <div className="xl:col-span-3 flex flex-col gap-2 order-2 xl:order-1">
                    <DriverProfile />
                    <SessionInfo />
                    <FrictionCircle
                        gForceX={data.gForceX}
                        gForceY={data.gForceY}
                        maxG={2.5}
                    />
                    <BehaviorAnalysis />
                    <DataLogger />
                </div>

                {/* CENTER COLUMN (6 cols) */}
                <div className="xl:col-span-6 flex flex-col gap-2 order-1 xl:order-2">
                    <RPMGauge rpm={data.rpm} gear={data.gear} />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <TrackMap />
                        <InputVisualizer
                            steering={data.steering}
                            throttle={data.throttle}
                            brake={data.brake}
                            clutch={data.clutch}
                        />
                    </div>

                    <LiveMultiGraph data={telemetryHistory} title="Real-time Telemetry Traces" />
                </div>

                {/* RIGHT COLUMN (3 cols) */}
                <div className="xl:col-span-3 flex flex-col gap-2 order-3">
                    <SessionStats />
                    <LapTiming current={data.lapTime || 0} last={data.lastLap} best={data.bestLap} />
                    <TireStatus temps={data.tireTemp} wear={data.tireWear} />
                    <CarHealth damage={data.carDamage} />
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
