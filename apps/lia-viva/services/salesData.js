import { supabase } from '../config/supabase.js';

/**
 * Sales Data Service - Backend helper to fetch data for LIA context
 */
export async function getSalesSnapshot(userId) {
    try {
        if (!supabase) return null;

        // Note: For now we assume tenantId = userId. 
        // In a more complex setup, we'd fetch the tenantId first.
        const tenantId = userId;

        const [productsResp, ordersResp] = await Promise.all([
            supabase.from('products').select('name, stock_quantity, min_stock_level').eq('tenant_id', tenantId),
            supabase.from('orders').select('total_amount').eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(10)
        ]);

        const lowStock = (productsResp.data || []).filter(p => p.stock_quantity <= p.min_stock_level);
        const totalSales = (ordersResp.data || []).reduce((acc, o) => acc + Number(o.total_amount), 0);
        const recentOrdersCount = ordersResp.data?.length || 0;

        return {
            lowStock: lowStock.map(p => `${p.name} (Qtd: ${p.stock_quantity})`),
            recentSalesVolume: totalSales,
            recentOrdersCount
        };
    } catch (error) {
        console.error('❌ Error fetching sales snapshot:', error);
        return null;
    }
}

export default { getSalesSnapshot };
