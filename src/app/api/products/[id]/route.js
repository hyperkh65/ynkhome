
import { promises as fs } from 'fs';
import path from 'path';

// Vercel serverless environment requires writing to /tmp
const DATA_FILE = 'products.json';
const TMP_DATA_PATH = path.join('/tmp', DATA_FILE);
const SEED_DATA_PATH = path.join(process.cwd(), DATA_FILE);

async function getData() {
    try {
        const data = await fs.readFile(TMP_DATA_PATH, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        try {
            const seedData = await fs.readFile(SEED_DATA_PATH, 'utf8');
            await fs.writeFile(TMP_DATA_PATH, seedData);
            return JSON.parse(seedData);
        } catch (seedError) {
            return [];
        }
    }
}

async function saveData(data) {
    await fs.writeFile(TMP_DATA_PATH, JSON.stringify(data, null, 2));
}

export async function PUT(request, { params }) {
    try {
        const id = parseInt(params.id);
        const body = await request.json();

        const products = await getData();

        const index = products.findIndex(p => p.id === id);
        if (index === -1) {
            return Response.json({ success: false, error: 'Product not found' }, { status: 404 });
        }

        products[index] = { ...products[index], ...body };
        await saveData(products);

        return Response.json({ success: true, data: products[index] });
    } catch (error) {
        return Response.json({ success: false, error: 'Failed to update product' }, { status: 500 });
    }
}

export async function DELETE(request, { params }) {
    try {
        const id = parseInt(params.id);
        const products = await getData();

        const filteredProducts = products.filter(p => p.id !== id);
        await saveData(filteredProducts);

        return Response.json({ success: true, message: 'Deleted successfully' });
    } catch (error) {
        return Response.json({ success: false, error: 'Failed to delete product' }, { status: 500 });
    }
}
