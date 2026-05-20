import React from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend
} from 'recharts';

interface SessionGraphsProps {
    data: any[];
}

const SessionGraphs: React.FC<SessionGraphsProps> = ({ data }) => {
    if (!data || data.length === 0) {
        return <div className="text-slate-500 text-center py-10">No detailed telemetry data available for this session.</div>;
    }

    // Downsample for performance if needed, but Recharts handles ~1000 points okay.
    // If sessions are long (e.g. 10 mins @ 60Hz = 36000 points), we MUST downsample.
    // Let's take every Nth point to keep total under 2000.
    const step = Math.ceil(data.length / 2000);
    const chartData = step > 1 ? data.filter((_, i) => i % step === 0) : data;

    // Helper to format time (ms from start)
    // Assuming data[0].timestamp is start.
    const startTime = chartData[0]?.timestamp || 0;
    const formattedData = chartData.map(d => ({
        ...d,
        nodes: undefined, // cleanup
        relativeTime: ((d.timestamp - startTime) / 1000).toFixed(1) // seconds
    }));

    return (
        <div className="space-y-6">
            {/* Speed & RPM */}
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                <h3 className="text-slate-300 font-semibold mb-4">Speed & RPM</h3>
                <div className="h-64">
                    <ResponsiveContainer width="99%" height={250}>
                        <LineChart data={formattedData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                            <XAxis dataKey="relativeTime" label={{ value: 'Time (s)', position: 'insideBottomRight', offset: -5 }} stroke="#94a3b8" />
                            <YAxis yAxisId="left" stroke="#3b82f6" label={{ value: 'Speed (km/h)', angle: -90, position: 'insideLeft' }} />
                            <YAxis yAxisId="right" orientation="right" stroke="#f59e0b" label={{ value: 'RPM', angle: 90, position: 'insideRight' }} />
                            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none' }} />
                            <Legend />
                            <Line yAxisId="left" type="monotone" dataKey="speed" stroke="#3b82f6" dot={false} name="Speed" />
                            <Line yAxisId="right" type="monotone" dataKey="rpm" stroke="#f59e0b" dot={false} name="RPM" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Pedals */}
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                <h3 className="text-slate-300 font-semibold mb-4">Pedal Inputs</h3>
                <div className="h-64">
                    <ResponsiveContainer width="99%" height={250}>
                        <LineChart data={formattedData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                            <XAxis dataKey="relativeTime" stroke="#94a3b8" />
                            <YAxis domain={[0, 1]} stroke="#94a3b8" />
                            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none' }} />
                            <Legend />
                            <Line type="monotone" dataKey="throttle" stroke="#22c55e" dot={false} name="Throttle" />
                            <Line type="monotone" dataKey="brake" stroke="#ef4444" dot={false} name="Brake" />
                            <Line type="monotone" dataKey="clutch" stroke="#3b82f6" dot={false} name="Clutch" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* G-Force */}
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                <h3 className="text-slate-300 font-semibold mb-4">G-Forces</h3>
                <div className="h-64">
                    <ResponsiveContainer width="99%" height={250}>
                        <LineChart data={formattedData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                            <XAxis dataKey="relativeTime" stroke="#94a3b8" />
                            <YAxis domain={['auto', 'auto']} stroke="#94a3b8" />
                            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none' }} />
                            <Legend />
                            <Line type="monotone" dataKey="gForceX" stroke="#8b5cf6" dot={false} name="Lateral G" />
                            <Line type="monotone" dataKey="gForceY" stroke="#ec4899" dot={false} name="Longitudinal G" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default SessionGraphs;
