import React from 'react';
import SessionList from './SessionList';
import { useSessionStore } from '../../stores/sessionStore';

const Analysis = () => {
    const { selectedSession } = useSessionStore();

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
                <div className="lg:col-span-2 bg-slate-900 rounded-2xl p-6 border border-slate-800 overflow-y-auto">
                    {selectedSession ? (
                        <div>
                            <h2 className="text-2xl font-bold mb-4">{selectedSession.vehicle} - {new Date(selectedSession.start_time).toLocaleString()}</h2>
                            <div className="grid grid-cols-3 gap-4 mb-6">
                                <div className="bg-slate-800 p-4 rounded-xl">
                                    <div className="text-slate-400 text-sm">Duration</div>
                                    <div className="text-xl font-mono">{(selectedSession.duration / 60000).toFixed(1)} m</div>
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
                            {/* Placeholder for charts/replay */}
                            <div className="h-64 bg-slate-800 rounded-xl flex items-center justify-center text-slate-500">
                                Session Replay & Detailed Charts Coming Soon
                            </div>
                        </div>
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
