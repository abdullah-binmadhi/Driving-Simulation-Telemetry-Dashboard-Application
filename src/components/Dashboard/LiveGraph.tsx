import React from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';

interface DataPoint {
    timestamp: number;
    value: number;
}

interface LiveGraphProps {
    data: DataPoint[];
    title: string;
    color?: string;
    yDomain?: [number, number];
}

const LiveGraph: React.FC<LiveGraphProps> = ({
    data,
    title,
    color = '#3b82f6',
    yDomain = [0, 'auto']
}) => {
    return (
        <div className="w-full h-64 bg-slate-800 rounded-xl p-4 border border-slate-700">
            <h3 className="text-sm font-semibold text-slate-400 mb-4">{title}</h3>
            <div className="w-full h-full pb-6">
                <ResponsiveContainer width="99%" height="100%" minHeight={1}>
                    <LineChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis
                            dataKey="timestamp"
                            hide={true}
                            domain={['dataMin', 'dataMax']}
                            type="number"
                        />
                        <YAxis
                            domain={yDomain}
                            stroke="#94a3b8"
                            tick={{ fontSize: 12 }}
                        />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '0.5rem' }}
                            labelStyle={{ display: 'none' }}
                            itemStyle={{ color: '#fff' }}
                        />
                        <Line
                            type="monotone"
                            dataKey="value"
                            stroke={color}
                            strokeWidth={2}
                            dot={false}
                            isAnimationActive={false} // Disable animation for performance
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default LiveGraph;
