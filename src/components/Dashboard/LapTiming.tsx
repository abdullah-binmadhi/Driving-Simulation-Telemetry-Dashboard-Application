import React from 'react';

interface LapTimingProps {
    current: number; // ms
    last?: number;
    best?: number;
}

const formatTime = (ms: number) => {
    if (!ms) return '--:--.---';
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const millis = Math.floor(ms % 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}.${millis.toString().padStart(3, '0')}`;
};

const LapTiming: React.FC<LapTimingProps> = ({ current, last, best }) => {
    return (
        <div className="bg-slate-900 rounded-2xl p-3 border border-slate-800 flex flex-col justify-between">
            <h2 className="text-lg font-semibold mb-2 text-slate-300">Timing</h2>

            <div className="space-y-4">
                <div>
                    <div className="text-slate-500 text-xs uppercase tracking-wider mb-1">Current Lap</div>
                    <div className="text-3xl font-mono font-bold text-white tracking-tight">
                        {formatTime(current)}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                    <div>
                        <div className="text-slate-500 text-[10px] uppercase">Last Lap</div>
                        <div className="text-lg font-mono text-slate-300">
                            {formatTime(last || 0)}
                        </div>
                    </div>
                    <div>
                        <div className="text-slate-500 text-[10px] uppercase">Best Lap</div>
                        <div className="text-lg font-mono text-purple-400">
                            {formatTime(best || 0)}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LapTiming;
