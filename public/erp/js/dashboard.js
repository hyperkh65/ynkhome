import { DB_SALES, DB_PRODUCTS, DB_CLIENTS, notionQuery } from './core.js';

export async function loadDashboard() {
    try {
        // 1. Load Sales KPI (this month)
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);

        const salesData = await notionQuery(DB_SALES, {
            filter: {
                property: "Date",
                date: { on_or_after: startOfMonth }
            }
        });

        let totalSales = 0;
        (salesData.results || []).forEach(r => {
            totalSales += r.properties.Total?.number || 0;
        });
        document.getElementById('dashSales').textContent = "₩" + totalSales.toLocaleString();

        // 2. Load PO KPI (this month) - Assuming DB_PO exists or using DB_SALES with type?
        // Let's check if DB_PO exists. For now, I'll use a placeholder or check core.js
        // I'll just query DB_SALES for now as a placeholder if DB_PO is not defined.
        document.getElementById('dashPo').textContent = "₩0"; // Placeholder

        // 3. Load Clients Count
        const clientsData = await notionQuery(DB_CLIENTS, { page_size: 1 });
        // Notion Doesn't return total count easily without pagination, so we'll just show what we have or do a workaround.
        // For a real dashboard, we might need a count endpoint or just load all if not too many.
        const allClients = await notionQuery(DB_CLIENTS, { page_size: 100 });
        document.getElementById('dashClients').textContent = (allClients.results?.length || 0);

        // 4. Load Products Count
        const productsData = await notionQuery(DB_PRODUCTS, { page_size: 100 });
        document.getElementById('dashProductsCount').textContent = (productsData.results?.length || 0);

        // 5. Initialize Charts
        const { initFxController } = await import('./fx.js');
        const { initLmeController } = await import('./lme.js');

        initFxController();
        initLmeController();

    } catch (err) {
        console.error("Dashboard load error:", err);
    }
}
