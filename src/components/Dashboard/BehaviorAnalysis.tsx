import React, { memo } from 'react';

const ProgressBar = memo(({ label, value, color }: { label: string, value: number, color: string }) => (
    <div className="flex flex-col gap-1">
        <div className="flex justify-between text-xs font-semibold text-slate-300">
            <span>{label}</span>
            <span>{value.toFixed(1)}%</span>
        </div>
        <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
            <div
                className={`h-full ${color}`}
                style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
            />
        </div>
    </div>
));

interface BehaviorAnalysisProps {
    jerkX: number;
    jerkY: number;
    coastingTimePct: number;
    brakeBiasUtilization: number;
    isTrailBraking: boolean;
    isOversteer: boolean;
    isUndersteer: boolean;
}

const BehaviorAnalysis = memo(({
    jerkX,
    jerkY,
    coastingTimePct,
    brakeBiasUtilization,
    isTrailBraking,
    isOversteer,
    isUndersteer
}: BehaviorAnalysisProps) => {

    // Derived Visualizations
    const jerkTotal = Math.sqrt(Math.pow(jerkX || 0, 2) + Math.pow(jerkY || 0, 2));
    const smoothnessScore = Math.max(0, 100 - (jerkTotal * 5)); // 100 is perfectly smooth

    const brakeUtil = (brakeBiasUtilization || 0) * 100;

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-sm flex flex-col gap-3">
            <h2 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent flex items-center gap-2">
                <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Behavioral Analysis
            </h2>

            <div className="grid grid-cols-1 gap-3">
                <ProgressBar label="Driver Smoothness" value={smoothnessScore} color="bg-cyan-500" />
                <ProgressBar label="Brake Capacity Utilized" value={brakeUtil} color="bg-red-500" />
                <ProgressBar label="Coasting Time (Off-Pedals)" value={coastingTimePct} color="bg-emerald-500" />

                <div className="flex flex-wrap gap-2 mt-2">
                    <span className={`px-3 py-1 text-xs font-bold rounded-full ${isTrailBraking ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/50' : 'bg-slate-800 text-slate-500 border border-slate-700'}`}>
                        Trail Braking
                    </span>
                    <span className={`px-3 py-1 text-xs font-bold rounded-full ${isOversteer ? 'bg-orange-500/20 text-orange-400 border border-orange-500/50 animate-pulse' : 'bg-slate-800 text-slate-500 border border-slate-700'}`}>
                        Oversteer / Slide
                    </span>
                    <span className={`px-3 py-1 text-xs font-bold rounded-full ${isUndersteer ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50 animate-pulse' : 'bg-slate-800 text-slate-500 border border-slate-700'}`}>
                        Understeer / Plough
                    </span>
                </div>
            </div>
        </div>
    );
});

export default BehaviorAnalysis;
