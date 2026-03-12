import { useMemo } from 'react';

interface FrictionCircleProps {
    gForceX: number; // Lateral (-left, +right)
    gForceY: number; // Longitudinal (-accel, +brake)
    maxG?: number;   // Max scale of the circle (e.g., 2G)
}

const FrictionCircle = ({ gForceX, gForceY, maxG = 2.0 }: FrictionCircleProps) => {
    // Clamp the dot to the circle's maximum graphical bounds
    const clampDist = (x: number, y: number, max: number) => {
        const dist = Math.sqrt(x * x + y * y);
        if (dist > max) {
            const scale = max / dist;
            return { x: x * scale, y: y * scale };
        }
        return { x, y };
    };

    const { x, y } = useMemo(() => clampDist(gForceX, gForceY, maxG), [gForceX, gForceY, maxG]);

    // Convert coordinates to percentages (0-100%) for CSS positioning
    // Assuming center is 50%, 50%
    const posX = 50 + (x / maxG) * 50;
    // Invert Y: negative Y in games is usually acceleration (forward), positive is braking (backward)
    // On screen, top is 0%, bottom is 100%. We want acceleration to push the dot up (towards 0%).
    const posY = 50 - (y / maxG) * 50;

    return (
        <div className="bg-slate-900 rounded-2xl p-3 border border-slate-800 flex flex-col items-center justify-center flex-grow">
            <h2 className="text-lg font-semibold mb-3 text-slate-300 w-full text-left">Friction Circle</h2>

            <div className="relative w-48 h-48 sm:w-64 sm:h-64 rounded-full border-2 border-slate-700 bg-slate-800 flex items-center justify-center shadow-inner overflow-hidden">

                {/* Crosshairs */}
                <div className="absolute w-full h-[1px] bg-slate-600/50"></div>
                <div className="absolute h-full w-[1px] bg-slate-600/50"></div>

                {/* 1G Reference Ring */}
                <div className="absolute w-1/2 h-1/2 rounded-full border border-slate-600/30"></div>

                {/* Center dot reference */}
                <div className="absolute w-1 h-1 bg-slate-500 rounded-full"></div>

                {/* The dynamic Live G-Force Dot */}
                <div
                    className="absolute w-4 h-4 bg-green-500 rounded-full shadow-[0_0_10px_rgba(34,197,94,0.8)] transition-all duration-75 ease-out"
                    style={{
                        left: `${posX}%`,
                        top: `${posY}%`,
                        transform: 'translate(-50%, -50%)' // Center the dot on the exact coordinate
                    }}
                ></div>

                {/* Labels */}
                <div className="absolute top-2 text-[10px] text-slate-500 font-mono">ACCEL</div>
                <div className="absolute bottom-2 text-[10px] text-slate-500 font-mono">BRAKE</div>
                <div className="absolute left-2 text-[10px] text-slate-500 font-mono rotate-[-90deg]">LEFT</div>
                <div className="absolute right-2 text-[10px] text-slate-500 font-mono rotate-[-90deg]">RIGHT</div>
            </div>

            {/* Numeric readout below */}
            <div className="mt-4 flex gap-6 text-sm font-mono text-slate-400">
                <div>Lat: <span className="text-white">{gForceX.toFixed(2)}G</span></div>
                <div>Lon: <span className="text-white">{-gForceY.toFixed(2)}G</span></div>
            </div>
        </div>
    );
};

export default FrictionCircle;
