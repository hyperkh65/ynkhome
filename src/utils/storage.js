import { supabase } from './supabase';
import productsFallback from '../../products.json';
import historyFallback from '../../market_history.json';
import catalogsFallback from '../../catalogs_fallback.json';

// Mock notices for fallback
const noticesFallback = [
    { id: 1, content: "YNK Terminal V2 시스템 점검 안내 (02/05)", created_at: new Date().toISOString() },
    { id: 2, content: "인천항 물동량 증가에 따른 정체 주의", created_at: new Date().toISOString() },
    { id: 3, content: "신규 파트너사 협업 모듈 업데이트 완료", created_at: new Date().toISOString() }
];

export const getProducts = async () => {
    if (!supabase) {
        console.log("Using local products fallback");
        return productsFallback || [];
    }

    const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('id', { ascending: true });

    if (error) {
        console.error('Error fetching products:', error);
        return productsFallback || [];
    }
    return data && data.length > 0 ? data : productsFallback;
};

export const saveProduct = async (product) => {
    if (!supabase) {
        console.warn("Save ignored: Database not connected");
        return null;
    }

    const payload = { ...product };
    if (!payload.id) delete payload.id;

    const { data, error } = await supabase
        .from('products')
        .upsert(payload)
        .select();

    if (error) {
        console.error('Error saving product:', error);
        throw error;
    }
    return data;
};

export const deleteProduct = async (id) => {
    if (!supabase) return;

    const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting product:', error);
        throw error;
    }
};

export const resetProducts = async () => {
    console.warn("Reset not fully implemented for DB safety.");
};

// --- Notices ---
export const getNotices = async () => {
    if (!supabase) return noticesFallback;

    const { data, error } = await supabase
        .from('notices')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error('Error fetching notices:', error);
        return noticesFallback;
    }
    return data && data.length > 0 ? data : noticesFallback;
};

export const saveNotice = async (notice) => {
    if (!supabase) return null;

    const { data, error } = await supabase
        .from('notices')
        .insert([notice])
        .select();

    if (error) throw error;
    return data;
};

export const deleteNotice = async (id) => {
    if (!supabase) return;

    const { error } = await supabase
        .from('notices')
        .delete()
        .eq('id', id);

    if (error) throw error;
};

// --- Market History ---
export const getMarketHistory = async () => {
    if (!supabase) {
        console.log("Using local market history fallback");
        return historyFallback || [];
    }

    const { data, error } = await supabase
        .from('market_history')
        .select('*')
        .order('date', { ascending: true });

    if (error) {
        console.error('Error fetching market history:', error);
        return historyFallback || [];
    }
    return data && data.length > 0 ? data : historyFallback;
};

export const saveMarketHistory = async (record) => {
    if (!supabase) return null;

    const { data, error } = await supabase
        .from('market_history')
        .upsert(record, { onConflict: 'date' })
        .select();

    if (error) {
        console.error('Error saving market history:', error);
        throw error;
    }
    return data;
};

// --- Electronic Catalogs ---
export const getCatalogs = async () => {
    if (!supabase) {
        console.log("Using local catalogs fallback");
        return catalogsFallback || [];
    }

    const { data, error } = await supabase
        .from('catalogs')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching catalogs:', error);
        return catalogsFallback || [];
    }
    return data && data.length > 0 ? data : catalogsFallback;
};

export const saveCatalog = async (catalog) => {
    if (!supabase) return null;

    const payload = { ...catalog };
    if (!payload.id) delete payload.id;

    const { data, error } = await supabase
        .from('catalogs')
        .upsert(payload)
        .select();
    if (error) throw error;
    return data;
};

export const deleteCatalog = async (id) => {
    if (!supabase) return;
    const { error } = await supabase
        .from('catalogs')
        .delete()
        .eq('id', id);
    if (error) throw error;
};
