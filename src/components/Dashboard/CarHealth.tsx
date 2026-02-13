import React from 'react';
import { Activity, Zap, Disc, Wind, Settings } from 'lucide-react';

interface CarHealthProps {
    damage?: {
        engine: number;
        transmission: number;
        suspension: number;
        brakes: number;
        aero: number;
    };
}

const HealthBar = ({ label, value, icon: Icon }: { label: string, value: number, icon: any }) => {
    // value 0.0 - 1.0 (1.0 = Good)
    let color = 'bg-green-500';
    let textColor = 'text-green-400';
    if (value < 0.7) { color = 'bg-yellow-500'; textColor = 'text-yellow-400'; }
    if (value < 0.4) { color = 'bg-red-500'; textColor = 'text-red-400'; }

    return (
        <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-slate-800 border border-slate-700 ${textColor}`}>
                <Icon size={16} />
            </div>
            <div className="flex-grow">
                <div className="flex justify-between mb-1">
                    <span className="text-xs font-medium text-slate-400 uppercase">{label}</span>
                    <span className={`text-xs font-bold ${textColor}`}>{(value * 100).toFixed(0)}%</span>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                        className={`h-full ${color} transition-all duration-500`}
                        style={{ width: `${value * 100}%` }}
                    />
                </div>
            </div>
        </div>
    );
};

const CarHealth: React.FC<CarHealthProps> = ({ damage }) => {
    const d = damage || { engine: 1, transmission: 1, suspension: 1, brakes: 1, aero: 1 };

    return (
        <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
            <h2 className="text-lg font-semibold mb-4 text-slate-300 flex items-center gap-2">
                <span>Vehicle Health</span>
                <span className="text-xs font-normal text-slate-500 bg-slate-800 px-2 py-0.5 rounded animate-pulse">
                    Live Monitor
                </span>
            </h2>
            <div className="space-y-4">
                <HealthBar label="Engine" value={d.engine} icon={Zap} />
                <HealthBar label="Transmission" value={d.transmission} icon={Settings} />
                <HealthBar label="Suspension" value={d.suspension} icon={Activity} />
                <HealthBar label="Brakes" value={d.brakes} icon={Disc} />
                <HealthBar label="Aerodynamics" value={d.aero} icon={Wind} />
            </div>
        </div>
    );
};

export default CarHealth;
