
import { promises as fs } from 'fs';
import path from 'path';

// Vercel serverless environment requires writing to /tmp
const DATA_FILE = 'products.json';
const TMP_DATA_PATH = path.join('/tmp', DATA_FILE);
const SEED_DATA_PATH = path.join(process.cwd(), DATA_FILE);

async function getData() {
    try {
        // Try reading from /tmp first (persisted during warm lambda)
        const data = await fs.readFile(TMP_DATA_PATH, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        // If not in /tmp, read from seed file in project
        try {
            const seedData = await fs.readFile(SEED_DATA_PATH, 'utf8');
            // Initialize /tmp with seed data
            await fs.writeFile(TMP_DATA_PATH, seedData);
            return JSON.parse(seedData);
        } catch (seedError) {
            return []; // Fallback empty
        }
    }
}

async function saveData(data) {
    await fs.writeFile(TMP_DATA_PATH, JSON.stringify(data, null, 2));
}

export async function GET() {
    const products = await getData();
    return Response.json({ success: true, data: products });
}

export async function POST(request) {
    try {
        const body = await request.json();
        const products = await getData();

        const newId = products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1;
        const newProduct = {
            id: newId,
            ...body,
            image: body.image || `https://picsum.photos/seed/${newId + 40}/400/300`
        };

        products.push(newProduct);
        await saveData(products);

        return Response.json({ success: true, data: newProduct });
    } catch (error) {
        return Response.json({ success: false, error: 'Failed to add product' }, { status: 500 });
    }
}
