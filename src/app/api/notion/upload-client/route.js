import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';

export async function POST(req) {
    try {
        const formData = await req.formData();
        const result = {
            bizRegUrl: null,
            bankbookUrl: null,
            factoryUrls: []
        };

        const uploadDir = path.join(process.cwd(), 'public', 'uploads');
        await fs.mkdir(uploadDir, { recursive: true });

        for (const [key, value] of formData.entries()) {
            if (value instanceof File) {
                const buffer = Buffer.from(await value.arrayBuffer());
                // Use a unique name to avoid collisions
                const fileName = `${Date.now()}-${value.name.replace(/\s+/g, '_')}`;
                const filePath = path.join(uploadDir, fileName);
                await fs.writeFile(filePath, buffer);
                const url = `/uploads/${fileName}`;

                if (key === 'bizReg') result.bizRegUrl = url;
                else if (key === 'bankbook') result.bankbookUrl = url;
                else if (key === 'factoryFiles') result.factoryUrls.push(url);
            }
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error('File upload error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
