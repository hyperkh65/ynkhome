'use client';

import { useState, useMemo, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function MarketChart({
    marketData,
    selectedMetal,
    setSelectedMetal,
    selectedCurrency,
    setSelectedCurrency
}) {
    const [viewType, setViewType] = useState('metal'); // 'metal' | 'currency'

    const currentItem = useMemo(() => {
        if (viewType === 'metal') return selectedMetal;
        return selectedCurrency;
    }, [viewType, selectedMetal, selectedCurrency]);

    const getCurrentValue = () => {
        if (!marketData) return 1000;
        if (viewType === 'metal') {
            return marketData.metals?.[selectedMetal] || 2000;
        } else {
            return marketData[selectedCurrency] || 1300;
        }
    };

    const currentValue = getCurrentValue();

    // Generate mock history data based on the current value
    const chartData = useMemo(() => {
        const data = [];
        let base = currentValue;
        // Generate reverse from today
        const today = new Date();

        // Create a realistic looking trend
        // We start from some past value and walk towards current value
        // Or walk backwards from current

        let val = base;
        const volatility = viewType === 'currency' ? 0.005 : 0.015; // Metals more volatile

        for (let i = 0; i < 30; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);

            data.unshift({
                date: date.toISOString().slice(5, 10), // MM-DD
                value: val
            });

            // Random walk
            const change = val * (Math.random() * (volatility * 2) - volatility);
            val -= change; // going backwards
        }
        return data;
    }, [currentValue, viewType, selectedMetal, selectedCurrency]);

    const handleTypeChange = (e) => {
        setViewType(e.target.value);
    };

    const handleItemChange = (e) => {
        if (viewType === 'metal') {
            setSelectedMetal(e.target.value);
        } else {
            setSelectedCurrency(e.target.value);
        }
    };

    const isProfit = chartData[chartData.length - 1].value >= chartData[0].value;
    const chartColor = isProfit ? '#10b981' : '#ef4444'; // Green or Red based on 30-day trend

    return (
        <div style={{ width: '100%', height: '100%', minHeight: '320px', display: 'flex', flexDirection: 'column' }}>
            {/* Controls Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <select
                        value={viewType}
                        onChange={handleTypeChange}
                        style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.9rem', fontWeight: 600, background: '#f8fafc' }}
                    >
                        <option value="metal">Raw Materials</option>
                        <option value="currency">Currency</option>
                    </select>

                    <select
                        value={currentItem}
                        onChange={handleItemChange}
                        style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.9rem', fontWeight: 600, background: 'white' }}
                    >
                        {viewType === 'metal' ? (
                            <>
                                <option value="aluminum">Aluminum</option>
                                <option value="copper">Copper</option>
                                <option value="steel">Steel</option>
                                <option value="nickel">Nickel</option>
                                <option value="zinc">Zinc</option>
                            </>
                        ) : (
                            <>
                                <option value="usd">USD/KRW</option>
                                <option value="cny">CNY/KRW</option>
                            </>
                        )}
                    </select>
                </div>

                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 700, fontFamily: 'monospace' }}>
                        {viewType === 'currency' ? '' : '$'}
                        {currentValue.toLocaleString()}
                        {viewType === 'currency' ? ' KRW' : ''}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: isProfit ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                        {isProfit ? '▲' : '▼'} 30 Day Trend
                    </div>
                </div>
            </div>

            {/* Chart */}
            <div style={{ width: '100%', height: '300px', marginTop: 'auto' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                        <defs>
                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={chartColor} stopOpacity={0.2} />
                                <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis
                            dataKey="date"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 11, fill: '#94a3b8' }}
                            dy={10}
                            minTickGap={30}
                        />
                        <YAxis
                            hide
                            domain={['auto', 'auto']}
                        />
                        <Tooltip
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px', padding: '12px' }}
                            formatter={(value) => [
                                (viewType === 'metal' ? '$' : '') + value.toLocaleString() + (viewType === 'currency' ? ' KRW' : ''),
                                'Price'
                            ]}
                        />
                        <Area
                            type="monotone"
                            dataKey="value"
                            stroke={chartColor}
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorValue)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
