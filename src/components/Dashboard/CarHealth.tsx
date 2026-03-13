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

const HealthIndicator = ({ label, value, icon: Icon, position }: { 
    label: string, value: number, icon: any, position: string 
}) => {
    const normValue = value > 1 ? value / 100 : value;
    let color = 'text-emerald-400';
    let borderColor = 'border-emerald-500/30';
    let bgColor = 'bg-emerald-500/10';

    if (normValue < 0.7) { 
        color = 'text-yellow-400'; 
        borderColor = 'border-yellow-500/30'; 
        bgColor = 'bg-yellow-500/10'; 
    }
    if (normValue < 0.4) { 
        color = 'text-red-400'; 
        borderColor = 'border-red-500/30'; 
        bgColor = 'bg-red-500/10'; 
    }

    return (
        <div className={`absolute ${position} flex flex-col items-center group`}>
            <div className={`p-2 rounded-lg ${bgColor} border ${borderColor} ${color} transition-all duration-300 group-hover:scale-110 shadow-lg backdrop-blur-sm`}>
                <Icon size={18} />
            </div>
            <div className="mt-1 flex flex-col items-center">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter leading-tight">{label}</span>
                <span className={`text-xs font-mono font-bold ${color}`}>{(normValue * 100).toFixed(0)}%</span>
            </div>
        </div>
    );
};

const CarHealth: React.FC<CarHealthProps> = ({ damage }) => {
    const d = damage || { engine: 1, transmission: 1, suspension: 1, brakes: 1, aero: 1 };

    return (
        <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl p-4 border border-slate-800 shadow-xl flex-grow flex flex-col relative overflow-hidden group">
            <div className="absolute -left-4 -bottom-4 w-24 h-24 bg-red-500/5 rounded-full blur-2xl group-hover:bg-red-500/10 transition-colors" />
            
            <div className="flex justify-between items-center mb-2">
                <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <div className="w-1.5 h-4 bg-red-500 rounded-full" />
                    Damage Monitor
                </h2>
                <div className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-bold text-slate-500 uppercase">
                    JBeam Analytics
                </div>
            </div>

            <div className="relative flex-grow flex justify-center items-center h-64">
                {/* Visual Car Silhouette */}
                <div className="w-28 h-52 border-2 border-slate-700/50 rounded-2xl relative opacity-40">
                    <div className="absolute top-1/4 left-0 right-0 h-0.5 bg-slate-800" />
                    <div className="absolute top-3/4 left-0 right-0 h-0.5 bg-slate-800" />
                    <div className="absolute inset-4 border border-slate-800 rounded-xl" /> {/* Interior */}
                </div>

                {/* Damage Hotspots - Positioned spatially */}
                <HealthIndicator label="Engine" value={d.engine} icon={Zap} position="top-4" />
                <HealthIndicator label="Transmission" value={d.transmission} icon={Settings} position="top-[35%]" />
                <HealthIndicator label="Aero" value={d.aero} icon={Wind} position="top-2 right-4" />
                <HealthIndicator label="Brakes" value={d.brakes} icon={Disc} position="bottom-12" />
                <HealthIndicator label="Suspension" value={d.suspension} icon={Activity} position="bottom-2 left-4" />
            </div>

            <div className="mt-2 text-center">
                <p className="text-[10px] text-slate-600 font-bold uppercase tracking-tight italic">
                    {Object.values(d).every(v => v >= 0.95) 
                        ? "Systems nominal - Maximum structural integrity" 
                        : "Structural degradation detected - Proceed with caution"}
                </p>
            </div>
        </div>
    );
};

export default CarHealth;
