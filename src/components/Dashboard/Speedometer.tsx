import React, { useMemo } from 'react';
import { GaugeCircle } from 'lucide-react';

interface SpeedometerProps {
    speed: number;
    unit?: 'km/h' | 'mph';
    maxSpeed?: number;
}

const Speedometer: React.FC<SpeedometerProps> = ({ speed, unit = 'km/h', maxSpeed = 240 }) => {
    const percentage = Math.min(Math.max(speed / maxSpeed, 0), 1);
    const angle = percentage * 240 - 120; // -120 to 120 degrees

    return (
        <div className="relative w-64 h-64 flex flex-col items-center justify-center">
            {/* Background Arc */}
            <svg className="absolute w-full h-full" viewBox="0 0 100 100">
                <path
                    d="M 20 80 A 40 40 0 1 1 80 80"
                    fill="none"
                    stroke="#1e293b"
                    strokeWidth="8"
                    strokeLinecap="round"
                />
                {/* Fill Arc */}
                <path
                    d="M 20 80 A 40 40 0 1 1 80 80"
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray="251.2"
                    strokeDashoffset={251.2 * (1 - percentage)}
                    className="transition-all duration-100 ease-out"
                />
            </svg>

            <div className="flex flex-col items-center z-10">
                <span className="text-5xl font-mono font-bold text-white tracking-tighter">
                    {Math.round(speed)}
                </span>
                <span className="text-sm text-slate-400 font-medium uppercase mt-1">{unit}</span>
            </div>
        </div>
    );
};

export default Speedometer;
