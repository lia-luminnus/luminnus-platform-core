
import { supabase } from '../lib/supabase';
import { Property } from '../types';

/**
 * Property Service - CRUD operations for real estate portfolio
 * Connects to Supabase 'properties' table
 */

const mapDbToProperty = (row: any): Property => ({
    id: row.id,
    tenantId: row.tenant_id,
    address: row.address,
    city: row.city,
    type: row.type as any,
    status: row.status as any,
    price: Number(row.price),
    bedrooms: row.bedrooms,
    date: row.date,
    images: row.images || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at
});

const mapPropertyToDb = (prop: Partial<Property>, tenantId: string) => ({
    tenant_id: tenantId,
    address: prop.address,
    city: prop.city,
    type: prop.type,
    status: prop.status,
    price: prop.price,
    bedrooms: prop.bedrooms,
    images: prop.images,
    date: prop.date || new Date().toISOString()
});

export const propertyService = {
    async listProperties(tenantId: string): Promise<Property[]> {
        try {
            const { data, error } = await supabase
                .from('properties')
                .select('*')
                .eq('tenant_id', tenantId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return (data || []).map(mapDbToProperty);
        } catch (error) {
            console.error('❌ [PropertyService] Error listing properties:', error);
            return [];
        }
    },

    async createProperty(tenantId: string, property: Partial<Property>): Promise<Property | null> {
        try {
            const dbData = mapPropertyToDb(property, tenantId);
            const { data, error } = await supabase
                .from('properties')
                .insert(dbData)
                .select()
                .single();

            if (error) throw error;
            return mapDbToProperty(data);
        } catch (error) {
            console.error('❌ [PropertyService] Error creating property:', error);
            return null;
        }
    },

    async updateProperty(id: string, property: Partial<Property>): Promise<Property | null> {
        try {
            const { data, error } = await supabase
                .from('properties')
                .update({
                    ...property,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return mapDbToProperty(data);
        } catch (error) {
            console.error('❌ [PropertyService] Error updating property:', error);
            return null;
        }
    },

    async deleteProperty(id: string): Promise<boolean> {
        try {
            const { error } = await supabase
                .from('properties')
                .delete()
                .eq('id', id);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('❌ [PropertyService] Error deleting property:', error);
            return false;
        }
    },

    /**
     * Upload an image to the properties_images bucket
     */
    async uploadImage(tenantId: string, file: File): Promise<string | null> {
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2)}${Date.now()}.${fileExt}`;
            const filePath = `${tenantId}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('properties_images')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data } = supabase.storage
                .from('properties_images')
                .getPublicUrl(filePath);

            return data.publicUrl;
        } catch (error) {
            console.error('❌ [PropertyService] Error uploading image:', error);
            return null;
        }
    }
};

export default propertyService;
