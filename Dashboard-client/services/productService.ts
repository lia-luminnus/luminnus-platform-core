/**
 * Product Service - CRUD operations for inventory management
 * Connects to Supabase 'products' table
 */

import { supabase } from '../lib/supabase';
import { Product } from '../types';

// Map database row to frontend Product type
const mapDbToProduct = (row: any): Product => ({
    id: row.id,
    name: row.name,
    sku: row.sku || '',
    category: row.category || 'General',
    description: row.description || '',
    price: Number(row.price) || 0,
    costPrice: Number(row.cost_price) || 0,
    stock: row.stock_quantity || 0,
    minStock: row.min_stock_level || 5,
    status: row.status === 'active'
        ? (row.stock_quantity === 0 ? 'out_of_stock' : row.stock_quantity <= (row.min_stock_level || 5) ? 'low_stock' : 'in_stock')
        : 'out_of_stock', // Fallback
    image: row.image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(row.name)}&background=random`,
    createdAt: row.created_at,
    updatedAt: row.updated_at
});

// Map frontend Product to database columns
const mapProductToDb = (product: Partial<Product>, tenantId: string) => ({
    tenant_id: tenantId,
    name: product.name,
    sku: product.sku,
    category: product.category,
    description: product.description,
    price: product.price,
    cost_price: product.costPrice, // Assuming we add this to frontend type later
    stock_quantity: product.stock,
    min_stock_level: product.minStock,
    image_url: product.image,
    status: 'active' // We control logic status via stock levels
});

export const productService = {
    /**
     * List all products for a tenant
     */
    async listProducts(tenantId: string): Promise<Product[]> {
        try {
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .eq('tenant_id', tenantId)
                .order('name');

            if (error) throw error;

            return (data || []).map(mapDbToProduct);
        } catch (error) {
            console.error('❌ [Products] Error listing products:', error);
            return [];
        }
    },

    /**
     * Get a single product by ID
     */
    async getProduct(id: string): Promise<Product | null> {
        try {
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            return mapDbToProduct(data);
        } catch (error) {
            console.error('❌ [Products] Error getting product:', error);
            return null;
        }
    },

    /**
     * Create a new product
     */
    async createProduct(tenantId: string, product: Partial<Product>): Promise<Product | null> {
        try {
            const dbData = mapProductToDb(product, tenantId);

            const { data, error } = await supabase
                .from('products')
                .insert(dbData)
                .select()
                .single();

            if (error) throw error;
            return mapDbToProduct(data);
        } catch (error) {
            console.error('❌ [Products] Error creating product:', error);
            return null;
        }
    },

    /**
     * Update an existing product
     */
    async updateProduct(id: string, product: Partial<Product>): Promise<Product | null> {
        try {
            // We only update fields that are present
            const updates: any = {};
            if (product.name !== undefined) updates.name = product.name;
            if (product.sku !== undefined) updates.sku = product.sku;
            if (product.category !== undefined) updates.category = product.category;
            if (product.price !== undefined) updates.price = product.price;
            if (product.stock !== undefined) updates.stock_quantity = product.stock;
            if (product.minStock !== undefined) updates.min_stock_level = product.minStock;
            if (product.image !== undefined) updates.image_url = product.image;
            updates.updated_at = new Date().toISOString();

            const { data, error } = await supabase
                .from('products')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return mapDbToProduct(data);
        } catch (error) {
            console.error('❌ [Products] Error updating product:', error);
            return null;
        }
    },

    /**
     * Delete a product
     */
    async deleteProduct(id: string): Promise<boolean> {
        try {
            const { error } = await supabase
                .from('products')
                .delete()
                .eq('id', id);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('❌ [Products] Error deleting product:', error);
            return false;
        }
    }
};

export default productService;
