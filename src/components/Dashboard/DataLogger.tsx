import { useState, useEffect } from 'react';
import { useTelemetryStore } from '../../stores/telemetryStore';

const DataLogger = () => {
    const { data, isConnected } = useTelemetryStore();
    const [isRecording, setIsRecording] = useState(false);

    // UI state
    const [frameCount, setFrameCount] = useState(0);
    const [lastSessionId, setLastSessionId] = useState<number | null>(null);

    useEffect(() => {
        if (isRecording && data && isConnected) {
            setFrameCount(prev => prev + 1);
        }
    }, [data, isRecording, isConnected]);

    const handleStartRecording = async () => {
        if (window.electronAPI) {
            setFrameCount(0);
            setLastSessionId(null);
            const res = await window.electronAPI.startSession();
            if (res.success) {
                setIsRecording(true);
            }
        }
    };

    const handleStopRecording = async () => {
        setIsRecording(false);
        if (window.electronAPI) {
            const res = await window.electronAPI.stopSession();
            if (res.success && res.sessionId) {
                setLastSessionId(res.sessionId);
            }
        }
    };

    const handleExportCSV = async () => {
        if (!lastSessionId || !window.electronAPI) return;
        const result = await window.electronAPI.exportSessionCSV(lastSessionId);
        if (!result.success && result.message !== 'Cancelled') {
            alert('Export failed: ' + result.message);
        } else if (result.success) {
            alert('Export successful!');
        }
    };

    const handleClearData = () => {
        setFrameCount(0);
        setLastSessionId(null);
    };

    return (
        <div className="bg-slate-900 rounded-2xl p-3 border border-slate-800 flex-grow shadow-lg">
            <h2 className="text-lg font-semibold mb-3 text-slate-300 flex items-center justify-between">
                <span>Data Logger (To DB)</span>
                {isRecording && (
                    <span className="flex items-center gap-2 text-red-500 text-sm animate-pulse">
                        <div className="w-2 h-2 rounded-full bg-red-500"></div> REC
                    </span>
                )}
            </h2>

            <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center text-slate-400 text-sm">
                    <span>Frames Captured:</span>
                    <span className="font-mono text-white">{frameCount}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-2">
                    {!isRecording ? (
                        <button
                            onClick={handleStartRecording}
                            disabled={!isConnected}
                            className={`p-2 rounded-lg font-medium transition-colors ${isConnected ? 'bg-green-600 hover:bg-green-500 text-white' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}
                        >
                            Start Rec
                        </button>
                    ) : (
                        <button
                            onClick={handleStopRecording}
                            className="p-2 rounded-lg font-medium bg-red-600 hover:bg-red-500 text-white transition-colors"
                        >
                            Stop Rec
                        </button>
                    )}

                    <button
                        onClick={handleExportCSV}
                        disabled={!lastSessionId || isRecording}
                        className={`p-2 rounded-lg font-medium transition-colors ${lastSessionId && !isRecording ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}
                    >
                        Export CSV
                    </button>
                </div>

                {lastSessionId && !isRecording && (
                    <button
                        onClick={handleClearData}
                        className="text-xs text-slate-500 hover:text-slate-300 transition-colors w-full text-center mt-2"
                    >
                        Clear Session Link
                    </button>
                )}
            </div>
        </div>
    );
};

export default DataLogger;

