interface InputVisualizerProps {
    steering: number; // -1 to 1 (left to right)
    throttle: number; // 0 to 1
    brake: number;    // 0 to 1
    clutch: number;   // 0 to 1
}

const InputVisualizer = ({ steering, throttle, brake, clutch }: InputVisualizerProps) => {
    // Map steering (-1 to 1) to degrees (-180 to 180 for visual purposes max)
    const steeringDeg = steering * 180;

    return (
        <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 flex-grow">
            <h2 className="text-lg font-semibold mb-6 text-slate-300">Driver Inputs</h2>

            <div className="flex flex-col md:flex-row items-center justify-around gap-8">

                {/* Steering Wheel Graphic */}
                <div className="flex flex-col items-center">
                    <div className="relative w-32 h-32 rounded-full border-4 border-slate-600 flex items-center justify-center p-2 mb-2 transition-transform duration-75 ease-linear"
                        style={{ transform: `rotate(${steeringDeg}deg)` }}>
                        {/* Wheel crossbar */}
                        <div className="absolute w-full h-[6px] bg-slate-600 rounded-full"></div>
                        <div className="absolute w-[6px] h-1/2 bottom-0 bg-slate-600 rounded-full"></div>
                        <div className="w-8 h-8 rounded-full border border-slate-700 bg-slate-800 z-10 flex items-center justify-center">
                            <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]"></div>
                        </div>
                    </div>
                    <span className="text-xs font-mono text-slate-400">
                        Steering: {(steering * 100).toFixed(0)}%
                    </span>
                </div>

                {/* Pedals (Clutch, Brake, Throttle) */}
                <div className="flex gap-4 h-32 items-end">
                    {/* CLUTCH */}
                    <div className="flex flex-col items-center gap-2">
                        <div className="w-8 h-24 bg-slate-800 rounded flex items-end overflow-hidden border border-slate-700 relative shadow-inner">
                            <div className="w-full bg-blue-500 transition-all duration-75 rounded-t-sm" style={{ height: `${clutch * 100}%` }}></div>
                            {/* Overlay pedal cap */}
                            <div className="absolute w-full h-2 bg-slate-400 border-t border-slate-300 opacity-20" style={{ bottom: `${clutch * 100}%`, transform: 'translateY(100%)' }}></div>
                        </div>
                        <span className="text-xs font-mono text-slate-500">C</span>
                    </div>

                    {/* BRAKE */}
                    <div className="flex flex-col items-center gap-2">
                        <div className="w-12 h-24 bg-slate-800 rounded flex items-end overflow-hidden border border-slate-700 relative shadow-inner">
                            <div className="w-full bg-red-500 transition-all duration-75 rounded-t-sm" style={{ height: `${brake * 100}%` }}></div>
                            {/* Overlay pedal cap */}
                            <div className="absolute w-full h-3 bg-red-400 border-t border-red-300 opacity-20" style={{ bottom: `${brake * 100}%`, transform: 'translateY(100%)' }}></div>
                        </div>
                        <span className="text-xs font-mono text-slate-500">B</span>
                    </div>

                    {/* THROTTLE */}
                    <div className="flex flex-col items-center gap-2">
                        <div className="w-8 h-32 bg-slate-800 rounded flex items-end overflow-hidden border border-slate-700 relative shadow-inner">
                            <div className="w-full bg-green-500 transition-all duration-75 rounded-t-sm" style={{ height: `${throttle * 100}%` }}></div>
                            {/* Overlay pedal cap */}
                            <div className="absolute w-full h-4 bg-green-400 border-t border-green-300 opacity-20" style={{ bottom: `${throttle * 100}%`, transform: 'translateY(100%)' }}></div>
                        </div>
                        <span className="text-xs font-mono text-slate-500">T</span>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default InputVisualizer;
