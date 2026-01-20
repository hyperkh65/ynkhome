'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function MarketChart({ data, todayValue, title, color, unit }) {
    // Merge historical data with today's real-time value
    const chartData = [...data].reverse().map(item => ({
        date: item.date.slice(5), // Just MM-DD
        value: item.value
    }));

    // Add today's live point if available
    if (todayValue !== undefined) {
        const todayStr = new Date().toISOString().slice(5, 10);
        const lastEntry = chartData[chartData.length - 1];
        if (lastEntry && lastEntry.date === todayStr) {
            lastEntry.value = todayValue;
        } else {
            chartData.push({ date: todayStr, value: todayValue });
        }
    }

    return (
        <div style={{ height: '100%', minHeight: '250px' }}>
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                        dataKey="date"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fill: '#64748b' }}
                        dy={10}
                    />
                    <YAxis
                        hide
                        domain={['auto', 'auto']}
                    />
                    <Tooltip
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                        formatter={(value) => [value.toLocaleString() + (unit || ''), title]}
                    />
                    <Line
                        type="monotone"
                        dataKey="value"
                        stroke={color || '#3b82f6'}
                        strokeWidth={3}
                        dot={false}
                        activeDot={{ r: 6, strokeWidth: 0 }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
