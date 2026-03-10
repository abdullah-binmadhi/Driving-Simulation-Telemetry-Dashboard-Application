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

interface MultiTraceDataPoint {
    timestamp: number;
    speed: number;
    rpm: number;
    throttle: number; // 0-100%
    brake: number;    // 0-100%
}

interface LiveMultiGraphProps {
    data: MultiTraceDataPoint[];
    title: string;
}

const LiveMultiGraph = ({ data, title }: LiveMultiGraphProps) => {
    // Format timestamp for X-axis (e.g., "12.3s")
    const formatTime = (timeMs: number) => {
        if (!data || data.length === 0) return '0s';
        const start = data[0].timestamp;
        return `${((timeMs - start) / 1000).toFixed(1)}s`;
    };

    return (
        <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 min-h-[24rem] flex-grow flex flex-col">
            <h2 className="text-lg font-semibold mb-2 text-slate-300">{title}</h2>
            <div style={{ width: '100%', height: '100%', minHeight: '300px' }} className="flex-grow">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                        data={data}
                        margin={{ top: 10, right: 30, left: 10, bottom: 5 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                        <XAxis
                            dataKey="timestamp"
                            stroke="#64748b"
                            tickFormatter={formatTime}
                            minTickGap={30}
                            style={{ fontSize: '12px' }}
                        />

                        {/* Primary Axis: Speed (km/h) */}
                        <YAxis
                            yAxisId="speed"
                            stroke="#38bdf8"
                            style={{ fontSize: '12px' }}
                            domain={[0, 'auto']}
                        />

                        {/* Secondary Axis: RPM */}
                        <YAxis
                            yAxisId="rpm"
                            stroke="#818cf8"
                            orientation="right"
                            style={{ fontSize: '12px' }}
                            domain={[0, 9000]} // Adjust max RPM globally or dynamically if possible
                        />

                        {/* Tertiary Axis: Inputs 0-100% (Throttle/Brake) */}
                        <YAxis
                            yAxisId="inputs"
                            stroke="#94a3b8"
                            orientation="right"
                            style={{ fontSize: '12px', display: 'none' }} // Hide tick marks for less clutter, but bind domain
                            domain={[0, 100]}
                        />

                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#0f172a',
                                border: '1px solid #1e293b',
                                borderRadius: '0.5rem',
                                color: '#f1f5f9'
                            }}
                            labelFormatter={(label: any) => formatTime(label as number)}
                        />
                        <Legend verticalAlign="top" height={36} iconType="circle" />

                        {/* Traces */}
                        <Line yAxisId="speed" type="monotone" dataKey="speed" name="Speed (km/h)" stroke="#38bdf8" strokeWidth={2} dot={false} isAnimationActive={false} />
                        <Line yAxisId="rpm" type="monotone" dataKey="rpm" name="RPM" stroke="#818cf8" strokeWidth={2} dot={false} isAnimationActive={false} opacity={0.6} />
                        <Line yAxisId="inputs" type="step" dataKey="throttle" name="Throttle (%)" stroke="#22c55e" strokeWidth={2} dot={false} isAnimationActive={false} opacity={0.8} />
                        <Line yAxisId="inputs" type="step" dataKey="brake" name="Brake (%)" stroke="#ef4444" strokeWidth={2} dot={false} isAnimationActive={false} opacity={0.8} />

                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default LiveMultiGraph;
