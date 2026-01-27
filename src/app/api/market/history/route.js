import { NextResponse } from 'next/server';
import { getMarketHistory } from '@/utils/storage';

export async function GET() {
    try {
        const history = await getMarketHistory();
        return NextResponse.json(history);
    } catch (error) {
        console.error('Fetch History Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
