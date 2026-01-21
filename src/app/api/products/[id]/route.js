
import { promises as fs } from 'fs';
import path from 'path';

const dataFilePath = path.join(process.cwd(), 'products.json');

export async function PUT(request, { params }) {
    try {
        const id = parseInt(params.id);
        const body = await request.json();

        const fileContent = await fs.readFile(dataFilePath, 'utf8');
        let products = JSON.parse(fileContent);

        const index = products.findIndex(p => p.id === id);
        if (index === -1) {
            return Response.json({ success: false, error: 'Product not found' }, { status: 404 });
        }

        products[index] = { ...products[index], ...body };
        await fs.writeFile(dataFilePath, JSON.stringify(products, null, 2));

        return Response.json({ success: true, data: products[index] });
    } catch (error) {
        return Response.json({ success: false, error: 'Failed to update product' }, { status: 500 });
    }
}

export async function DELETE(request, { params }) {
    try {
        const id = parseInt(params.id);

        const fileContent = await fs.readFile(dataFilePath, 'utf8');
        let products = JSON.parse(fileContent);

        const filteredProducts = products.filter(p => p.id !== id);
        await fs.writeFile(dataFilePath, JSON.stringify(filteredProducts, null, 2));

        return Response.json({ success: true, message: 'Deleted successfully' });
    } catch (error) {
        return Response.json({ success: false, error: 'Failed to delete product' }, { status: 500 });
    }
}
