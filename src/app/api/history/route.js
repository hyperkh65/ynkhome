import { NextResponse } from 'next/server';
import { saveMarketHistory } from '@/utils/storage';

export async function GET(request) {
    try {
        // Verify Cron Secret if deployed on Vercel
        const authHeader = request.headers.get('authorization');
        if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            // Authorized session check can go here
        }

        // 1. Fetch current market data from our existing API
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
        const marketRes = await fetch(`${baseUrl}/api/market`, { cache: 'no-store' });
        const marketData = await marketRes.json();

        if (!marketData.success) throw new Error('Failed to fetch market data');

        // 2. Prepare data to save
        // We use the latest price as the 'Closing Price' for the day
        const record = {
            date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
            usd: marketData.rates.usd,
            cny: marketData.rates.cny,
            metals: marketData.metals, // Object containing {alum, copper, etc} with {last, prevClose}
            timestamp: new Date().toISOString()
        };

        // 3. Save to Supabase (using upsert logic in storage.js)
        await saveMarketHistory(record);

        return NextResponse.json({ success: true, message: 'Market closing prices saved to Database successfully', record });
    } catch (error) {
        console.error('History Save Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
