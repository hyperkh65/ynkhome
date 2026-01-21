
import { promises as fs } from 'fs';
import path from 'path';

const dataFilePath = path.join(process.cwd(), 'products.json');

export async function GET() {
    try {
        const fileContent = await fs.readFile(dataFilePath, 'utf8');
        const products = JSON.parse(fileContent);
        return Response.json({ success: true, data: products });
    } catch (error) {
        // If file doesn't exist, return empty array
        return Response.json({ success: true, data: [] });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const fileContent = await fs.readFile(dataFilePath, 'utf8');
        const products = JSON.parse(fileContent);

        const newId = products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1;
        const newProduct = {
            id: newId,
            ...body,
            // Default image if not provided
            image: body.image || `https://picsum.photos/seed/${newId + 40}/400/300`
        };

        products.push(newProduct);
        await fs.writeFile(dataFilePath, JSON.stringify(products, null, 2));

        return Response.json({ success: true, data: newProduct });
    } catch (error) {
        return Response.json({ success: false, error: 'Failed to add product' }, { status: 500 });
    }
}
