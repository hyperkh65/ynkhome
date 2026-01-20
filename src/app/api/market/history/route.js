import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
    try {
        const filePath = path.join(process.cwd(), 'market_history.json');

        if (!fs.existsSync(filePath)) {
            return NextResponse.json([]);
        }

        const fileData = fs.readFileSync(filePath, 'utf8');
        const history = JSON.parse(fileData);

        return NextResponse.json(history);
    } catch (error) {
        console.error('Fetch History Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
