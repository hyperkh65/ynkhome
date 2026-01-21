
const STORAGE_KEY = 'ynk_products_v1';

const INITIAL_DATA = [
    {
        "id": 1,
        "name": "YNK-Series V1 Lite",
        "description": "Industrial Hardware / Gen 4",
        "image": "https://picsum.photos/seed/41/400/300",
        "specs": {
            "material": "High-Grade Alum",
            "weight": "2.4kg",
            "cert": "CE / RoHS / KC",
            "origin": "Shanghai Hub"
        }
    },
    {
        "id": 2,
        "name": "YNK-Series V2 Pro",
        "description": "High Performance Unit",
        "image": "https://picsum.photos/seed/42/400/300",
        "specs": {
            "material": "Stainless Steel",
            "weight": "3.1kg",
            "cert": "UL / CE",
            "origin": "Incheon Port"
        }
    },
    {
        "id": 3,
        "name": "YNK-Series V3 Max",
        "description": "Heavy Duty Industrial",
        "image": "https://picsum.photos/seed/43/400/300",
        "specs": {
            "material": "Titanium Alloy",
            "weight": "1.8kg",
            "cert": "ISO 9001",
            "origin": "Busan"
        }
    },
    {
        "id": 4,
        "name": "YNK-Series V4 Eco",
        "description": "Energy Efficient Model",
        "image": "https://picsum.photos/seed/44/400/300",
        "specs": {
            "material": "Recycled Comp",
            "weight": "2.0kg",
            "cert": "EcoLabel",
            "origin": "Vietnam"
        }
    },
    {
        "id": 5,
        "name": "YNK-Series V5 Ultra",
        "description": "Next Gen Connectivity",
        "image": "https://picsum.photos/seed/45/400/300",
        "specs": {
            "material": "Carbon Fiber",
            "weight": "1.2kg",
            "cert": "FCC / KC",
            "origin": "Shenzhen"
        }
    },
    {
        "id": 6,
        "name": "YNK-Series V6 Mini",
        "description": "Compact Solution",
        "image": "https://picsum.photos/seed/46/400/300",
        "specs": {
            "material": "Polycarbonate",
            "weight": "0.8kg",
            "cert": "CE / KS",
            "origin": "Seoul HQ"
        }
    }
];

export const getProducts = () => {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_DATA));
        return INITIAL_DATA;
    }
    return JSON.parse(stored);
};

export const saveProduct = (product) => {
    const products = getProducts();
    if (product.id) {
        const index = products.findIndex(p => p.id === product.id);
        if (index !== -1) {
            products[index] = product;
        }
    } else {
        const newId = products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1;
        product.id = newId;
        products.push(product);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
};

export const deleteProduct = (id) => {
    const products = getProducts();
    const filtered = products.filter(p => p.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
};
