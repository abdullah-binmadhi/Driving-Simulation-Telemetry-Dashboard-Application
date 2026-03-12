import React from 'react';

interface TireStatusProps {
    temps?: [number, number, number, number]; // FL, FR, RL, RR
    wear?: [number, number, number, number];  // 0.0 - 1.0 (1.0 = New)
}

const Tire = ({ label, temp, wear }: { label: string, temp: number, wear: number }) => {
    // Color logic for Temp
    let tempColor = 'text-slate-400';
    if (temp < 60) tempColor = 'text-blue-400'; // Cold
    else if (temp < 100) tempColor = 'text-green-400'; // Optimal
    else tempColor = 'text-red-400'; // Hot

    // Wear Color
    const normWear = wear > 1 ? wear / 100 : wear;
    let wearColor = 'bg-green-500';
    if (normWear < 0.5) wearColor = 'bg-yellow-500';
    if (normWear < 0.2) wearColor = 'bg-red-500';

    return (
        <div className="flex flex-col items-center bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
            <span className="text-xs font-bold text-slate-500 mb-1">{label}</span>
            <div className={`text-lg font-mono font-bold ${tempColor}`}>
                {temp.toFixed(0)}°C
            </div>
            <div className="w-full h-1.5 bg-slate-700 rounded-full mt-2 overflow-hidden">
                <div
                    className={`h-full ${wearColor} transition-all duration-500`}
                    style={{ width: `${Math.max(0, normWear * 100)}%` }}
                />
            </div>
            <span className="text-[10px] text-slate-500 mt-1">{(normWear * 100).toFixed(0)}%</span>
        </div>
    );
};

const TireStatus: React.FC<TireStatusProps> = ({ temps = [0, 0, 0, 0], wear = [1, 1, 1, 1] }) => {
    return (
        <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800">
            <h2 className="text-lg font-semibold mb-3 text-slate-300 flex items-center gap-2">
                <span>Tires</span>
                <span className="text-xs font-normal text-slate-500 bg-slate-800 px-2 py-0.5 rounded">
                    Temp & Wear
                </span>
            </h2>
            <div className="grid grid-cols-2 gap-3">
                {/* Front Left */}
                <Tire label="FL" temp={temps[0]} wear={wear[0]} />
                {/* Front Right */}
                <Tire label="FR" temp={temps[1]} wear={wear[1]} />
                {/* Rear Left */}
                <Tire label="RL" temp={temps[2]} wear={wear[2]} />
                {/* Rear Right */}
                <Tire label="RR" temp={temps[3]} wear={wear[3]} />
            </div>
        </div>
    );
};

export default TireStatus;
