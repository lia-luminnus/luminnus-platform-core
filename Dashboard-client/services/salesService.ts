/**
 * Sales Service - CRUD operations for orders and transactions
 * Connects to Supabase 'orders', 'order_items', and 'transactions' tables
 */

import { supabase } from '../lib/supabase';
import { Product, Order, OrderItem, Transaction } from '../types';
import { backendService } from '../components/lia/services/backendService';

// Map database row to frontend Order type
const mapDbToOrder = (row: any, items: any[] = []): Order => ({
    id: row.id,
    tenantId: row.tenant_id,
    customerId: row.customer_id,
    customerName: row.customer_name,
    status: row.status,
    totalAmount: Number(row.total_amount),
    paymentMethod: row.payment_method,
    notes: row.notes,
    items: items.map(mapDbToOrderItem),
    createdAt: row.created_at,
    updatedAt: row.updated_at
});

// Map database row to frontend OrderItem type
const mapDbToOrderItem = (row: any): OrderItem => ({
    id: row.id,
    orderId: row.order_id,
    productId: row.product_id,
    productName: row.product_name,
    quantity: row.quantity,
    unitPrice: Number(row.unit_price),
    subtotal: Number(row.subtotal)
});

// Map database row to frontend Transaction type
const mapDbToTransaction = (row: any): Transaction => ({
    id: row.id,
    tenantId: row.tenant_id,
    type: row.type,
    category: row.category,
    description: row.description,
    amount: Number(row.amount),
    date: row.date,
    status: row.status,
    relatedOrderId: row.related_order_id,
    createdAt: row.created_at
});

export const salesService = {
    /**
     * List all orders for a tenant
     */
    async listOrders(tenantId: string): Promise<Order[]> {
        try {
            const { data, error } = await supabase
                .from('orders')
                .select('*, order_items(*)')
                .eq('tenant_id', tenantId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            return (data || []).map(row => mapDbToOrder(row, row.order_items));
        } catch (error) {
            console.error('❌ [Sales] Error listing orders:', error);
            return [];
        }
    },

    /**
     * Create a new order with items and transaction
     */
    async createOrder(tenantId: string, orderData: Partial<Order>, items: OrderItem[]): Promise<Order | null> {
        try {
            // 1. Create Order header
            const { data: order, error: orderError } = await supabase
                .from('orders')
                .insert({
                    tenant_id: tenantId,
                    customer_id: orderData.customerId,
                    customer_name: orderData.customerName,
                    status: orderData.status || 'completed',
                    total_amount: orderData.totalAmount,
                    payment_method: orderData.paymentMethod,
                    notes: orderData.notes
                })
                .select()
                .single();

            if (orderError) throw orderError;

            // 2. Create Order Items
            const itemsData = items.map(item => ({
                tenant_id: tenantId,
                order_id: order.id,
                product_id: item.productId,
                product_name: item.productName,
                quantity: item.quantity,
                unit_price: item.unitPrice,
                subtotal: item.subtotal
            }));

            const { error: itemsError } = await supabase
                .from('order_items')
                .insert(itemsData);

            if (itemsError) throw itemsError;

            // 3. Update Stock (Decrement quantity)
            for (const item of items) {
                // We use an RPC call or simple update. For simplicity now, direct update.
                // ideally this should be a database function to be atomic
                await this.decrementStock(item.productId, item.quantity);
            }

            // 4. Create Transaction Record (Financial)
            if (orderData.status === 'completed') {
                await supabase.from('transactions').insert({
                    tenant_id: tenantId,
                    type: 'income',
                    category: 'Sales',
                    description: `Venda #${order.id.slice(0, 8)} - ${orderData.customerName || 'Cliente Balcão'}`,
                    amount: orderData.totalAmount,
                    date: new Date().toISOString(),
                    status: 'completed',
                    related_order_id: order.id
                });
            }

            // 5. Trigger WhatsApp Notification (Async)
            this.sendOrderNotification(tenantId, orderData, items).catch(err =>
                console.error('⚠️ [Sales] Failed to send WhatsApp notification:', err)
            );

            return mapDbToOrder(order, itemsData);
        } catch (error) {
            console.error('❌ [Sales] Error creating order:', error);
            return null;
        }
    },

    /**
     * Decrement stock for a product
     */
    async decrementStock(productId: string, quantity: number) {
        try {
            // First get current stock
            const { data: product } = await supabase
                .from('products')
                .select('stock_quantity')
                .eq('id', productId)
                .single();

            if (product) {
                const newStock = Math.max(0, product.stock_quantity - quantity);
                await supabase
                    .from('products')
                    .update({ stock_quantity: newStock })
                    .eq('id', productId);
            }
        } catch (error) {
            console.error('❌ [Sales] Error updating stock:', error);
        }
    },

    /**
     * List recent transactions for financial overview
     */
    async listTransactions(tenantId: string, limit = 50): Promise<Transaction[]> {
        try {
            const { data, error } = await supabase
                .from('transactions')
                .select('*')
                .eq('tenant_id', tenantId)
                .order('date', { ascending: false })
                .limit(limit);

            if (error) throw error;

            return (data || []).map(mapDbToTransaction);
        } catch (error) {
            console.error('❌ [Sales] Error listing transactions:', error);
            return [];
        }
    },

    /**
     * Get financial summary (Income vs Expenses)
     */
    async getFinancialSummary(tenantId: string): Promise<{ income: number, expenses: number, balance: number }> {
        try {
            const { data, error } = await supabase
                .from('transactions')
                .select('type, amount')
                .eq('tenant_id', tenantId);

            if (error) throw error;

            const income = data
                .filter((t: any) => t.type === 'income')
                .reduce((acc: number, t: any) => acc + Number(t.amount), 0);

            const expenses = data
                .filter((t: any) => t.type === 'expense')
                .reduce((acc: number, t: any) => acc + Number(t.amount), 0);

            return { income, expenses, balance: income - expenses };
        } catch (error) {
            console.error('❌ [Sales] Error getting summary:', error);
            return { income: 0, expenses: 0, balance: 0 };
        }
    },

    /**
     * Send order confirmation via WhatsApp
     */
    async sendOrderNotification(tenantId: string, order: Partial<Order>, items: OrderItem[]) {
        try {
            // Check if user has WhatsApp integration active
            const settings = await backendService.getWhatsAppSettings();
            if (!settings || !settings.active) return; // Only if active

            const customerName = order.customerName || 'Cliente';
            const total = order.totalAmount?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

            const message = `🛍️ *Pedido Confirmado!*
            
Olá ${customerName}, seu pedido foi recebido com sucesso!

*Detalhes do Pedido:*
${items.map(item => `• ${item.quantity}x ${item.productName}`).join('\n')}

*Total:* ${total}
*Pagamento:* ${order.paymentMethod === 'credit_card' ? 'Cartão de Crédito' : order.paymentMethod === 'pix' ? 'PIX' : 'Dinheiro'}

Obrigado pela preferência! ✨`;

            // We need a phone number to send to.
            const customerPhone = order.customerPhone;

            console.log('📱 [Sales] Triggering WhatsApp notification for:', customerName, customerPhone || '(No phone)');

            if (customerPhone && customerPhone.length >= 10) {
                const conversationId = `order_${order.id || Date.now()}`;
                await backendService.sendWhatsAppMessage(customerPhone, message, conversationId);
            }

        } catch (error) {
            console.error('❌ [Sales] Error in WhatsApp notification trigger:', error);
        }
    }
};

export default salesService;
