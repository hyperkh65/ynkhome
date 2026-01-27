'use client';

import { useState, useMemo, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function MarketChart({
    marketData,
    selectedMetal,
    setSelectedMetal,
    selectedCurrency,
    setSelectedCurrency,
    historyData = [],
    forcedViewType = null // 추가
}) {
    const [viewType, setViewType] = useState(forcedViewType || 'currency'); // 기본값 변경

    useEffect(() => {
        if (forcedViewType) setViewType(forcedViewType);
    }, [forcedViewType]);

    const currentItem = useMemo(() => {
        if (viewType === 'metal') return selectedMetal;
        return selectedCurrency;
    }, [viewType, selectedMetal, selectedCurrency]);

    const getCurrentValue = () => {
        if (!marketData) return 1000;
        if (viewType === 'metal') {
            const val = marketData.metals?.[selectedMetal];
            return (typeof val === 'object' ? val?.last : val) || 2000;
        } else {
            return marketData[selectedCurrency] || 1300;
        }
    };

    const currentValue = getCurrentValue();

    // Combine Real History + Generated Mock Padding
    const chartData = useMemo(() => {
        const data = [];
        const today = new Date();
        const days = 30;

        // Helper to get nested value
        const getVal = (obj, path) => path.split('.').reduce((o, i) => o?.[i], obj);
        const keyPath = viewType === 'metal' ? `metals.${selectedMetal}.last` : selectedCurrency;

        let lastVal = currentValue;

        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const displayDate = date.toISOString().slice(5, 10);

            // 1. Try to find real data in historyData
            const match = historyData.find(h => h.date === dateStr);
            let val;

            if (match) {
                val = getVal(match, keyPath);
            }

            // 2. Fallback to mock padding if no real data
            if (val === undefined || val === null) {
                // Generate a value relative to the base (currentValue) with some noise
                // We want it to "look" like a trend leading to today
                const volatility = viewType === 'currency' ? 0.005 : 0.015;
                const noise = (Math.random() - 0.5) * (currentValue * volatility);
                val = lastVal + noise;
            }

            data.push({
                date: displayDate,
                value: val
            });
            lastVal = val;
        }

        // Final point must be exact current value
        if (data.length > 0) data[data.length - 1].value = currentValue;

        return data;
    }, [currentValue, viewType, selectedMetal, selectedCurrency, historyData]);

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
        <div style={{ width: '100%', height: '100%', minHeight: '140px', display: 'flex', flexDirection: 'column' }}>
            {/* Controls Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <div style={{ display: 'flex', gap: '6px' }}>
                    {!forcedViewType && (
                        <select
                            value={viewType}
                            onChange={handleTypeChange}
                            style={{ padding: '2px 6px', borderRadius: '4px', border: '1px solid #e2e8f0', fontSize: '0.75rem', fontWeight: 600, background: '#f8fafc' }}
                        >
                            <option value="metal">Raw Materials</option>
                            <option value="currency">Currency</option>
                        </select>
                    )}

                    <select
                        value={currentItem}
                        onChange={handleItemChange}
                        style={{ padding: '2px 6px', borderRadius: '4px', border: '1px solid #e2e8f0', fontSize: '0.75rem', fontWeight: 600, background: 'white' }}
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
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, fontFamily: 'monospace' }}>
                        {viewType === 'currency' ? '' : '$'}
                        {currentValue.toLocaleString()}
                        {viewType === 'currency' ? ' ₩' : ''}
                    </div>
                </div>
            </div>

            {/* Chart */}
            <div style={{ width: '100%', height: '100px', marginTop: 'auto' }}>
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
