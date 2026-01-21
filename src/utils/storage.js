import { supabase } from './supabase';

export const getProducts = async () => {
    if (!supabase) return [];

    const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('id', { ascending: true });

    if (error) {
        console.error('Error fetching products:', error);
        return [];
    }
    return data || [];
};

export const saveProduct = async (product) => {
    if (!supabase) throw new Error("Database not connected (missing update env vars)");

    // If it's a new product (no ID or ID is null), remove ID from object so Supabase generates it
    // But since our UI manages IDs or we want to allow editing...

    // Simplification: We will use 'upsert'. 
    // If product has an ID, it updates. If we want to create, we should omit ID or ensure it's unique.

    const payload = { ...product };
    // If creating new (id is missing or special), delete the key to let DB handle it
    if (!payload.id) delete payload.id;

    // Ensure specs is stored as JSONB
    if (typeof payload.specs !== 'object') {
        // handle error or default
    }

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
    if (!supabase) throw new Error("Database not connected");

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
    // Dangerous DANGER zone.
    // For now, let's just log.
    console.warn("Reset not fully implemented for DB safety.");
};
