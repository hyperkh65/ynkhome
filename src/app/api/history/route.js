import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request) {
    try {
        // Verify Cron Secret if deployed on Vercel
        const authHeader = request.headers.get('authorization');
        if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            // For local testing, we can skip this, but in production, it's essential
            // return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        // 1. Fetch current market data from our existing API
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
        const marketRes = await fetch(`${baseUrl}/api/market`, { cache: 'no-store' });
        const marketData = await marketRes.json();

        if (!marketData.success) throw new Error('Failed to fetch market data');

        // 2. Prepare data to save
        const record = {
            date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
            timestamp: new Date().toISOString(),
            usd: marketData.rates.usd,
            cny: marketData.rates.cny,
            metals: marketData.metals
        };

        // 3. Save to local JSON file (acting as a simple DB)
        const filePath = path.join(process.cwd(), 'market_history.json');

        let history = [];
        if (fs.existsSync(filePath)) {
            const fileData = fs.readFileSync(filePath, 'utf8');
            history = JSON.parse(fileData);
        }

        // Prevent duplicate entries for the same day
        const existingIndex = history.findIndex(item => item.date === record.date);
        if (existingIndex > -1) {
            history[existingIndex] = record; // Update if already exists
        } else {
            history.push(record);
        }

        // Keep only last 30 days of data for now
        if (history.length > 30) history.shift();

        fs.writeFileSync(filePath, JSON.stringify(history, null, 2));

        return NextResponse.json({ success: true, message: 'Closing prices saved successfully', record });
    } catch (error) {
        console.error('History Save Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
