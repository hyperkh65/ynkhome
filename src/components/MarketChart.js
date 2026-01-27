'use client';

import { useState, useMemo, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function MarketChart({
    marketData,
    selectedMetal = 'aluminum',
    selectedCurrency = 'usd',
    historyData = [],
    forcedViewType = null
}) {
    const [isClient, setIsClient] = useState(false);
    const [viewType, setViewType] = useState(forcedViewType || 'currency');

    useEffect(() => {
        setIsClient(true);
    }, []);

    useEffect(() => {
        if (forcedViewType) setViewType(forcedViewType);
    }, [forcedViewType]);

    const currentValue = useMemo(() => {
        if (!marketData) return 0;
        if (viewType === 'metal') {
            const val = marketData.metals?.[selectedMetal];
            const price = (typeof val === 'object' ? val?.last : val);
            return typeof price === 'number' ? price : 0;
        } else {
            const price = marketData[selectedCurrency];
            return typeof price === 'number' ? price : 0;
        }
    }, [marketData, viewType, selectedMetal, selectedCurrency]);

    const chartData = useMemo(() => {
        const data = [];
        const today = new Date();
        const days = 30;

        const getVal = (obj, path) => path.split('.').reduce((o, i) => o?.[i], obj);
        const keyPath = viewType === 'metal' ? `metals.${selectedMetal}.last` : selectedCurrency;

        let lastValidVal = currentValue || 1000;

        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const displayDate = date.toISOString().slice(5, 10);

            const match = historyData.find(h => h.date === dateStr);
            let val = match ? getVal(match, keyPath) : undefined;

            if (typeof val !== 'number' || isNaN(val)) {
                const volatility = viewType === 'currency' ? 0.002 : 0.01;
                const noise = (Math.random() - 0.5) * (lastValidVal * volatility);
                val = lastValidVal + noise;
            }

            data.push({ date: displayDate, value: val });
            lastValidVal = val;
        }

        if (data.length > 0) data[data.length - 1].value = currentValue;
        return data;
    }, [currentValue, viewType, selectedMetal, selectedCurrency, historyData]);

    const isProfit = chartData.length > 1 ? chartData[chartData.length - 1].value >= chartData[0].value : true;
    const chartColor = isProfit ? '#10b981' : '#ef4444';

    if (!isClient) return <div style={{ height: '140px', background: '#f8fafc', borderRadius: '8px' }} />;

    return (
        <div style={{ width: '100%', height: '100%', minHeight: '140px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1d1d1f' }}>
                    {viewType === 'metal' ? selectedMetal.toUpperCase() : selectedCurrency.toUpperCase()}
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'monospace' }}>
                        {viewType === 'metal' ? '$' : '₩'} {currentValue.toLocaleString()}
                    </div>
                </div>
            </div>

            <div style={{ width: '100%', height: '100px', marginTop: 'auto' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                        <defs>
                            <linearGradient id={`colorValue-${viewType}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={chartColor} stopOpacity={0.2} />
                                <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="date" hide />
                        <YAxis hide domain={['auto', 'auto']} />
                        <Tooltip
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '11px', padding: '8px' }}
                            formatter={(val) => [val.toLocaleString(), 'Price']}
                        />
                        <Area
                            type="monotone"
                            dataKey="value"
                            stroke={chartColor}
                            strokeWidth={2}
                            fillOpacity={1}
                            fill={`url(#colorValue-${viewType})`}
                            animationDuration={1000}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
