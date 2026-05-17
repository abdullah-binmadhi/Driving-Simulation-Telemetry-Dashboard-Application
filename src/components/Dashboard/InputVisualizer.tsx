import { memo } from 'react';

interface InputVisualizerProps {
    steering: number; // -1 to 1 (left to right)
    throttle: number; // 0 to 1
    brake: number;    // 0 to 1
    clutch: number;   // 0 to 1
}

const InputVisualizer = memo(({ steering, throttle, brake, clutch }: InputVisualizerProps) => {
    // Map steering (-1 to 1) to degrees (-180 to 180 for visual purposes max)
    const steeringDeg = steering * 180;

    return (
        <div className="bg-slate-900 rounded-2xl p-3 border border-slate-800 flex-grow min-w-0 overflow-hidden">
            <h2 className="text-lg font-semibold mb-3 text-slate-300">Driver Inputs</h2>

            {/* Scale content to always fit the card at any size */}
            <div className="flex flex-row flex-wrap items-center justify-around gap-3 w-full min-w-0">

                {/* Steering Wheel Graphic */}
                <div className="flex flex-col items-center flex-shrink-0">
                    <div
                        className="relative rounded-full border-4 border-slate-600 flex items-center justify-center p-2 mb-1"
                        style={{
                            width: 'clamp(72px, 8vw, 112px)',
                            height: 'clamp(72px, 8vw, 112px)',
                            transform: `rotate(${steeringDeg}deg)`,
                        }}
                    >
                        {/* Wheel crossbar */}
                        <div className="absolute w-full h-[5px] bg-slate-600 rounded-full" />
                        <div className="absolute w-[5px] h-1/2 bottom-0 bg-slate-600 rounded-full" />
                        <div className="w-7 h-7 rounded-full border border-slate-700 bg-slate-800 z-10 flex items-center justify-center">
                            <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                        </div>
                    </div>
                    <span className="text-xs font-mono text-slate-400 whitespace-nowrap">
                        Steering: {(steering * 100).toFixed(0)}%
                    </span>
                </div>

                {/* Pedals (Clutch, Brake, Throttle) */}
                <div className="flex gap-3 items-end flex-shrink-0" style={{ height: 'clamp(80px, 10vw, 120px)' }}>
                    {/* CLUTCH */}
                    <div className="flex flex-col items-center gap-1">
                        <div
                            className="bg-slate-800 rounded flex items-end overflow-hidden border border-slate-700 relative shadow-inner"
                            style={{ width: 'clamp(22px, 2.5vw, 32px)', height: 'clamp(64px, 8vw, 96px)' }}
                        >
                            <div className="w-full bg-blue-500 rounded-t-sm" style={{ height: `${clutch * 100}%` }} />
                            <div
                                className="absolute w-full h-2 bg-slate-400 border-t border-slate-300 opacity-20"
                                style={{ bottom: `${clutch * 100}%`, transform: 'translateY(100%)' }}
                            />
                        </div>
                        <span className="text-xs font-mono text-slate-500">C</span>
                    </div>

                    {/* BRAKE */}
                    <div className="flex flex-col items-center gap-1">
                        <div
                            className="bg-slate-800 rounded flex items-end overflow-hidden border border-slate-700 relative shadow-inner"
                            style={{ width: 'clamp(28px, 3.5vw, 44px)', height: 'clamp(64px, 8vw, 96px)' }}
                        >
                            <div className="w-full bg-red-500 rounded-t-sm" style={{ height: `${brake * 100}%` }} />
                            <div
                                className="absolute w-full h-3 bg-red-400 border-t border-red-300 opacity-20"
                                style={{ bottom: `${brake * 100}%`, transform: 'translateY(100%)' }}
                            />
                        </div>
                        <span className="text-xs font-mono text-slate-500">B</span>
                    </div>

                    {/* THROTTLE */}
                    <div className="flex flex-col items-center gap-1">
                        <div
                            className="bg-slate-800 rounded flex items-end overflow-hidden border border-slate-700 relative shadow-inner"
                            style={{ width: 'clamp(22px, 2.5vw, 32px)', height: 'clamp(80px, 10vw, 120px)' }}
                        >
                            <div className="w-full bg-green-500 rounded-t-sm" style={{ height: `${throttle * 100}%` }} />
                            <div
                                className="absolute w-full h-4 bg-green-400 border-t border-green-300 opacity-20"
                                style={{ bottom: `${throttle * 100}%`, transform: 'translateY(100%)' }}
                            />
                        </div>
                        <span className="text-xs font-mono text-slate-500">T</span>
                    </div>
                </div>

            </div>
        </div>
    );
});

export default InputVisualizer;
