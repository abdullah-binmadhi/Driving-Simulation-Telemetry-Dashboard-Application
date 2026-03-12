import React from 'react';

interface RPMGaugeProps {
    rpm: number;
    maxRpm?: number;
    redline?: number;
    gear: number;
}

const RPMGauge: React.FC<RPMGaugeProps> = ({ rpm, maxRpm = 8000, redline = 7000, gear }) => {
    const percentage = Math.min(Math.max(rpm / maxRpm, 0), 1);
    const isRedline = rpm >= redline;

    // Gear mapping
    const gearText = gear === 0 ? 'N' : gear === -1 ? 'R' : gear.toString();

    return (
        <div className="w-full bg-slate-800 rounded-xl p-3 border border-slate-700">
            <div className="flex justify-between items-end mb-2">
                <div className="flex flex-col">
                    <span className="text-sm text-slate-400">RPM</span>
                    <span className={`text-2xl font-mono font-bold ${isRedline ? 'text-red-500' : 'text-white'}`}>
                        {Math.round(rpm)}
                    </span>
                </div>
                <div className="flex flex-col items-end">
                    <span className="text-sm text-slate-400">GEAR</span>
                    <span className="text-4xl font-mono font-bold text-blue-400">{gearText}</span>
                </div>
            </div>

            {/* RPM Bar */}
            <div className="h-4 bg-slate-900 rounded-full overflow-hidden relative">
                <div
                    className={`h-full transition-all duration-75 ease-out ${isRedline ? 'bg-red-500' : 'bg-gradient-to-r from-blue-500 to-cyan-400'}`}
                    style={{ width: `${percentage * 100}%` }}
                />
                {/* Redline Marker */}
                <div
                    className="absolute top-0 bottom-0 w-0.5 bg-red-800 opacity-50"
                    style={{ left: `${(redline / maxRpm) * 100}%` }}
                />
            </div>
        </div>
    );
};

export default RPMGauge;
