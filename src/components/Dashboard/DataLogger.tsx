import { useState, useRef, useEffect } from 'react';
import { useTelemetryStore } from '../../stores/telemetryStore';
import type { TelemetryData } from '../../types/telemetry';

const DataLogger = () => {
    const { data, isConnected } = useTelemetryStore();
    const [isRecording, setIsRecording] = useState(false);
    const [recordedFrames, setRecordedFrames] = useState<TelemetryData[]>([]);

    // Use a ref to accumulate data without causing constant re-renders just for the array size
    const recordedDataRef = useRef<TelemetryData[]>([]);

    useEffect(() => {
        if (isRecording && data && isConnected) {
            // Push a deep copy of the current data frame to avoid reference mutation issues
            recordedDataRef.current.push(JSON.parse(JSON.stringify(data)));

            // Periodically update state just for the UI counter (e.g., every 60 frames)
            if (recordedDataRef.current.length % 60 === 0) {
                setRecordedFrames([...recordedDataRef.current]);
            }
        }
    }, [data, isRecording, isConnected]);

    const handleStartRecording = () => {
        recordedDataRef.current = []; // Clear previous memory
        setRecordedFrames([]);
        setIsRecording(true);
    };

    const handleStopRecording = () => {
        setIsRecording(false);
        setRecordedFrames([...recordedDataRef.current]); // Final sync to state
    };

    const handleExportCSV = () => {
        if (recordedDataRef.current.length === 0) return;

        const dataToExport = recordedDataRef.current;

        // Define the headers based on the TelemetryData interface
        const headers = [
            'timestamp', 'game', 'speed_kmh', 'rpm', 'gear',
            'throttle_pct', 'brake_pct', 'clutch_pct', 'steering_input',
            'gForce_Lat', 'gForce_Long', 'gForce_Vert',
            'engine_temp', 'fuel_pct', 'lapTime_ms', 'posX', 'posY', 'posZ'
        ];

        // Map data arrays to standard flat rows
        const csvRows = dataToExport.map(frame => {
            return [
                frame.timestamp,
                frame.game,
                frame.speed.toFixed(2),
                frame.rpm.toFixed(0),
                frame.gear,
                frame.throttle.toFixed(3),
                frame.brake.toFixed(3),
                frame.clutch.toFixed(3),
                frame.steering.toFixed(3),
                frame.gForceX.toFixed(3),
                frame.gForceY.toFixed(3),
                frame.gForceZ.toFixed(3),
                frame.engineTemp?.toFixed(1) || '',
                frame.fuel?.toFixed(1) || '',
                frame.lapTime || '',
                frame.posX?.toFixed(3) || '',
                frame.posY?.toFixed(3) || '',
                frame.posZ?.toFixed(3) || '',
            ].join(',');
        });

        const csvContent = [headers.join(','), ...csvRows].join('\n');

        // Create Blob and trigger download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `telemetry_session_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleClearData = () => {
        recordedDataRef.current = [];
        setRecordedFrames([]);
    };

    return (
        <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 flex-grow shadow-lg">
            <h2 className="text-lg font-semibold mb-4 text-slate-300 flex items-center justify-between">
                <span>Data Logger (CSV)</span>
                {isRecording && (
                    <span className="flex items-center gap-2 text-red-500 text-sm animate-pulse">
                        <div className="w-2 h-2 rounded-full bg-red-500"></div> REC
                    </span>
                )}
            </h2>

            <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center text-slate-400 text-sm">
                    <span>Frames Captured:</span>
                    <span className="font-mono text-white">{isRecording ? recordedDataRef.current.length : recordedFrames.length}</span>
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
                        disabled={recordedDataRef.current.length === 0 || isRecording}
                        className={`p-2 rounded-lg font-medium transition-colors ${recordedDataRef.current.length > 0 && !isRecording ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}
                    >
                        Export CSV
                    </button>
                </div>

                {recordedFrames.length > 0 && !isRecording && (
                    <button
                        onClick={handleClearData}
                        className="text-xs text-slate-500 hover:text-slate-300 transition-colors w-full text-center mt-2"
                    >
                        Clear Data
                    </button>
                )}
            </div>
        </div>
    );
};

export default DataLogger;
