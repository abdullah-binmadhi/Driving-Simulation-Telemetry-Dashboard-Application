import { useState } from 'react';
import SessionList from './SessionList';
import SessionGraphs from './SessionGraphs';
import { useSessionStore } from '../../stores/sessionStore';
import { Download } from 'lucide-react';

const Analysis = () => {
    const { selectedSession, telemetryLogs, exportSession } = useSessionStore();
    const [isExporting, setIsExporting] = useState(false);

    const handleExport = async (sessionId: number) => {
        setIsExporting(true);
        await exportSession(sessionId);
        setIsExporting(false);
    };

    return (
        <div className="p-8 h-full flex flex-col gap-6">
            <h1 className="text-3xl font-bold">Session Analysis</h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full min-h-0">
                {/* Sidebar List */}
                <div className="lg:col-span-1 bg-slate-900/50 rounded-2xl p-4 border border-slate-800 flex flex-col min-h-0">
                    <h2 className="text-lg font-semibold mb-4 pl-2">Recent Sessions</h2>
                    <SessionList />
                </div>

                {/* Detail View */}
                <div className="lg:col-span-2 bg-slate-900 rounded-2xl p-6 border border-slate-800 overflow-y-auto flex flex-col h-full">
                    {selectedSession ? (
                        <>
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h2 className="text-2xl font-bold">{selectedSession.vehicle}</h2>
                                    <div className="text-slate-400 text-sm">{new Date(selectedSession.start_time).toLocaleString()}</div>
                                </div>
                                <button
                                    onClick={() => handleExport(selectedSession.id)}
                                    disabled={isExporting}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-colors disabled:opacity-50"
                                >
                                    <Download className="w-4 h-4" />
                                    {isExporting ? 'Exporting...' : 'Export CSV'}
                                </button>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 shrink-0">
                                <div className="bg-slate-800 p-4 rounded-xl">
                                    <div className="text-slate-400 text-sm">Duration</div>
                                    <div className="text-xl font-mono">{(selectedSession.duration / 60000).toFixed(1)} m</div>
                                </div>
                                <div className="bg-slate-800 p-4 rounded-xl">
                                    <div className="text-slate-400 text-sm">Distance</div>
                                    <div className="text-xl font-mono">{(selectedSession.distance_traveled || 0).toFixed(2)} km</div>
                                </div>
                                <div className="bg-slate-800 p-4 rounded-xl">
                                    <div className="text-slate-400 text-sm">Coast Time</div>
                                    <div className="text-xl font-mono">{((selectedSession.coast_time || 0) / 1000).toFixed(1)} s</div>
                                </div>
                                <div className="bg-slate-800 p-4 rounded-xl">
                                    <div className="text-slate-400 text-sm">Efficiency</div>
                                    <div className="text-xl font-mono">{(selectedSession.efficiency || 0).toFixed(2)} km/L</div>
                                </div>
                                <div className="bg-slate-800 p-4 rounded-xl">
                                    <div className="text-slate-400 text-sm">Score</div>
                                    <div className="text-xl font-mono">{selectedSession.score}</div>
                                </div>
                                <div className="bg-slate-800 p-4 rounded-xl">
                                    <div className="text-slate-400 text-sm">Game</div>
                                    <div className="text-xl">{selectedSession.game}</div>
                                </div>
                            </div>

                            {/* Charts */}
                            <div className="flex-1 min-h-0 overflow-y-auto pr-2">
                                <SessionGraphs data={telemetryLogs} />
                            </div>
                        </>
                    ) : (
                        <div className="h-full flex items-center justify-center text-slate-500">
                            Select a session to view details
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Analysis;
