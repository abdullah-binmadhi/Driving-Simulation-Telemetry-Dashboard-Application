import { useState, useEffect, useRef } from 'react';
import { useTelemetryStore } from '../../stores/telemetryStore';
import { Timer, AlertTriangle, RotateCcw } from 'lucide-react';

const ReactionTest = () => {
    const { data } = useTelemetryStore();
    const [gameState, setGameState] = useState<'idle' | 'waiting' | 'active' | 'finished'>('idle');
    const [message, setMessage] = useState('Press Start to Begin');
    const [reactionTime, setReactionTime] = useState<number | null>(null);
    const [bestTime, setBestTime] = useState<number | null>(null);

    const startTimeRef = useRef<number>(0);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Monitor brake input
    useEffect(() => {
        if (gameState === 'active' && data && data.brake > 0.1) {
            endTest();
        } else if (gameState === 'waiting' && data && data.brake > 0.1) {
            // False start
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            setGameState('finished');
            setMessage('False Start! You braked too early.');
            setReactionTime(null);
        }
    }, [data, gameState]);

    const startTest = () => {
        setGameState('waiting');
        setMessage('Wait for RED screen...');
        setReactionTime(null);

        // Random delay 2-5 seconds
        const delay = 2000 + Math.random() * 3000;

        timeoutRef.current = setTimeout(() => {
            setGameState('active');
            setMessage('BRAKE NOW!');
            startTimeRef.current = Date.now();
        }, delay);
    };

    const endTest = () => {
        const endTime = Date.now();
        const time = endTime - startTimeRef.current;
        setGameState('finished');
        setReactionTime(time);
        setMessage(`Reaction Time: ${time} ms`);

        if (!bestTime || time < bestTime) {
            setBestTime(time);
        }
    };

    // Cleanup
    useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    const getBgColor = () => {
        switch (gameState) {
            case 'waiting': return 'bg-yellow-600';
            case 'active': return 'bg-red-600';
            case 'finished': return reactionTime ? 'bg-green-600' : 'bg-slate-800'; // Green for success, Slate for false start
            default: return 'bg-slate-800';
        }
    };

    return (
        <div className="p-8 h-full flex flex-col gap-6">
            <h1 className="text-3xl font-bold flex items-center gap-2">
                <Timer className="w-8 h-8 text-blue-500" />
                Driver Reaction Test
            </h1>

            <div className="flex-1 flex flex-col items-center justify-center">
                <div
                    className={`w-full max-w-2xl aspect-video rounded-3xl flex flex-col items-center justify-center p-8 transition-colors duration-200 shadow-2xl ${getBgColor()}`}
                >
                    <div className="text-4xl font-bold text-white mb-4 text-center">{message}</div>

                    {gameState === 'idle' && (
                        <button
                            onClick={startTest}
                            className="px-8 py-4 bg-white text-slate-900 rounded-full font-bold text-xl hover:scale-105 transition-transform"
                        >
                            START TEST
                        </button>
                    )}

                    {gameState === 'finished' && (
                        <button
                            onClick={startTest}
                            className="flex items-center gap-2 px-8 py-4 bg-white/20 hover:bg-white/30 text-white rounded-full font-bold text-xl backdrop-blur-sm transition-all"
                        >
                            <RotateCcw className="w-6 h-6" />
                            TRY AGAIN
                        </button>
                    )}
                </div>

                <div className="mt-8 grid grid-cols-2 gap-8 w-full max-w-xl">
                    <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 text-center">
                        <div className="text-slate-400 mb-1">Last Result</div>
                        <div className="text-3xl font-mono font-bold text-white">
                            {reactionTime ? `${reactionTime} ms` : '--'}
                        </div>
                    </div>
                    <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 text-center">
                        <div className="text-slate-400 mb-1">Best Time</div>
                        <div className="text-3xl font-mono font-bold text-green-400">
                            {bestTime ? `${bestTime} ms` : '--'}
                        </div>
                    </div>
                </div>

                <div className="mt-8 flex items-start gap-2 text-slate-500 max-w-lg">
                    <AlertTriangle className="w-5 h-5 shrink-0" />
                    <p className="text-sm">
                        Instructions: Press START. Wait for the box to turn RED. Immediately press your brake pedal.
                        <br />(Ensure your game and connector are running!)
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ReactionTest;
