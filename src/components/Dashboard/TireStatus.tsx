import React from 'react';

interface TireStatusProps {
    temps?: [number, number, number, number];        // Core temperatures
    surfaceTemps?: [number, number, number, number]; // Surface temperatures
    wear?: [number, number, number, number];         // 1.0 = New
    pressures?: [number, number, number, number];    // PSI
}

const TireData = ({ label, temp, sTemp, wear, press, side }: { 
    label: string, temp: number, sTemp: number, wear: number, press: number, side: 'left' | 'right' 
}) => {
    const normWear = wear > 1 ? wear / 100 : wear;
    let wearColor = 'bg-emerald-500';
    if (normWear < 0.7) wearColor = 'bg-yellow-500';
    if (normWear < 0.4) wearColor = 'bg-red-500';

    const isHot = sTemp > 100 || temp > 100;
    const isCold = sTemp < 60 && sTemp > 0;

    return (
        <div className={`flex flex-col ${side === 'right' ? 'items-end text-right' : 'items-start text-left'} space-y-1`}>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</div>
            <div className={`text-xl font-mono font-bold leading-none ${isHot ? 'text-red-400' : isCold ? 'text-blue-400' : 'text-emerald-400'}`}>
                {temp.toFixed(0)}<span className="text-xs ml-0.5">°C</span>
            </div>
            <div className="text-xs font-mono text-slate-400">
                {sTemp.toFixed(0)}<span className="text-[10px] opacity-60 ml-0.5">surf</span>
            </div>
            <div className="text-sm font-mono font-semibold text-sky-400">
                {press.toFixed(1)}<span className="text-[10px] ml-0.5">PSI</span>
            </div>
            <div className="w-16 h-1 bg-slate-800 rounded-full mt-1 overflow-hidden">
                <div className={`h-full ${wearColor} transition-all duration-500`} style={{ width: `${normWear * 100}%` }} />
            </div>
        </div>
    );
};

const TireStatus: React.FC<TireStatusProps> = ({ 
    temps = [0, 0, 0, 0], 
    surfaceTemps = [0, 0, 0, 0],
    wear = [1, 1, 1, 1],
    pressures = [0, 0, 0, 0]
}) => {
    return (
        <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl p-4 border border-slate-800 shadow-xl relative overflow-hidden group">
            {/* Background Decorative Element */}
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-colors" />
            
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <div className="w-1.5 h-4 bg-emerald-500 rounded-full" />
                    Tire PVT Monitor
                </h2>
                <div className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-bold text-slate-500 uppercase">
                    BeamNG.drive
                </div>
            </div>

            <div className="relative flex justify-center items-center h-48">
                {/* Simplified Car Silhouette */}
                <div className="absolute inset-0 flex justify-center items-center pointer-events-none opacity-20">
                    <div className="w-24 h-40 border-2 border-slate-600 rounded-xl relative">
                        <div className="absolute top-4 left-[-4px] right-[-4px] h-12 border-y border-slate-600" /> {/* Cockpit area */}
                    </div>
                </div>

                {/* Tires Layout */}
                <div className="w-full h-full grid grid-cols-2 gap-x-24 relative z-10">
                    {/* Front Row */}
                    <TireData label="FL" temp={temps[0]} sTemp={surfaceTemps[0]} wear={wear[0]} press={pressures[0]} side="left" />
                    <TireData label="FR" temp={temps[1]} sTemp={surfaceTemps[1]} wear={wear[1]} press={pressures[1]} side="right" />
                    
                    {/* Rear Row */}
                    <TireData label="RL" temp={temps[2]} sTemp={surfaceTemps[2]} wear={wear[2]} press={pressures[2]} side="left" />
                    <TireData label="RR" temp={temps[3]} sTemp={surfaceTemps[3]} wear={wear[3]} press={pressures[3]} side="right" />
                </div>
            </div>

            <div className="mt-4 flex justify-around text-[10px] text-slate-600 font-bold border-t border-slate-800 pt-3">
                <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-blue-400" /> COLD
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-emerald-400" /> OPTIMAL
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-red-400" /> OVERHEAT
                </div>
            </div>
        </div>
    );
};

export default TireStatus;
