import React, { useEffect } from 'react';
import { useSessionStore } from '../../stores/sessionStore';
import { Car, Calendar, Clock } from 'lucide-react';

const SessionList: React.FC = () => {
    const { sessions, isLoading, loadSessions, selectSession, selectedSession } = useSessionStore();

    useEffect(() => {
        loadSessions();
    }, [loadSessions]);

    if (isLoading) {
        return <div className="text-slate-400 p-4">Loading sessions...</div>;
    }

    if (sessions.length === 0) {
        return <div className="text-slate-500 p-4">No sessions recorded yet.</div>;
    }

    return (
        <div className="flex flex-col gap-2 h-full overflow-y-auto pr-2">
            {sessions.map((session) => (
                <div
                    key={session.id}
                    onClick={() => selectSession(session)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all hover:bg-slate-800 ${selectedSession?.id === session.id
                        ? 'bg-slate-800 border-blue-500'
                        : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                        }`}
                >
                    <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-white flex items-center gap-2">
                            <Car className="w-4 h-4 text-blue-400" />
                            {session.vehicle || 'Unknown Vehicle'}
                        </h3>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${session.score >= 90 ? 'bg-green-500/20 text-green-400' :
                            session.score >= 70 ? 'bg-yellow-500/20 text-yellow-400' :
                                'bg-red-500/20 text-red-400'
                            }`}>
                            {session.score} Score
                        </span>
                    </div>

                    <div className="flex justify-between text-xs text-slate-400">
                        <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(session.start_time).toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {Math.round(session.duration / 1000 / 60)} min
                        </div>
                        <div className="text-slate-500">
                            {session.game}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default SessionList;
