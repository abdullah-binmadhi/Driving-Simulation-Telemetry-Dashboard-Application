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

const Dashboard = () => {
    // Activate listener
    useTelemetryListener();

    const { data, isConnected, activeGame, history } = useTelemetryStore();
    const { game } = useSettingsStore();
    const isSimMode = game?.simulationEnabled;

    // Detailed data comes from the BeamNG Lua bridge or from simulation mode.
    const bridgeActive = !!(
        data?.bridgeActive ||
        data?.game?.includes('Simulation') ||
        data?.carDamage ||
        data?.tirePressure?.some(p => p > 0)
    );

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
                    <BehaviorAnalysis
                        jerkX={data.jerkX || 0}
                        jerkY={data.jerkY || 0}
                        coastingTimePct={data.coastingTimePct || 0}
                        brakeBiasUtilization={data.brakeBiasUtilization || 0}
                        isTrailBraking={data.isTrailBraking === 1}
                        isOversteer={(data.oversteerCorrection || 0) > 0.5}
                        isUndersteer={(data.understeerPlough || 0) > 0.5}
                        oversteerScore={(data.oversteerCorrection || 0) * 100}
                        understeerScore={(data.understeerPlough || 0) * 100}
                        slipAngle={data.slipAngleEstimate || 0}
                    />
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

                    <LiveMultiGraph data={history} title="Real-time Telemetry Traces" />
                </div>

                {/* RIGHT COLUMN (3 cols) */}
                <div className="xl:col-span-3 flex flex-col gap-2 order-3">
                    <SessionStats />
                    <LapTiming current={data.lapTime || 0} last={data.lastLap} best={data.bestLap} />
                    <TireStatus 
                        temps={data.tireTemp} 
                        surfaceTemps={data.tireSurfaceTemp}
                        wear={data.tireWear} 
                        pressures={data.tirePressure}
                        bridgeActive={bridgeActive}
                    />
                    <CarHealth damage={data.carDamage} bridgeActive={bridgeActive} />
                    <DataLogger />
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
