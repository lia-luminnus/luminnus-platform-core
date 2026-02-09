/**
 * Hook para acessar configurações de branding do tenant
 * Garante que cada empresa tenha sua própria identidade visual
 */

import { useState, useEffect } from 'react';
import { useDashboardAuth } from '../contexts/DashboardAuthContext';

export interface TenantConfig {
    companyName: string;
    companyLogoUrl: string | null;
    primaryColor: string;
    secondaryColor: string;
}

const DEFAULT_CONFIG: TenantConfig = {
    companyName: 'Minha Empresa',
    companyLogoUrl: null,
    primaryColor: '#7C3AED',
    secondaryColor: '#EC4899'
};

export function useTenantConfig(): TenantConfig {
    const { profile } = useDashboardAuth();
    const [config, setConfig] = useState<TenantConfig>(DEFAULT_CONFIG);

    useEffect(() => {
        if (profile) {
            setConfig({
                companyName: profile.company_name || 'Minha Empresa',
                companyLogoUrl: profile.company_logo_url || null,
                primaryColor: profile.company_primary_color || DEFAULT_CONFIG.primaryColor,
                secondaryColor: profile.company_secondary_color || DEFAULT_CONFIG.secondaryColor
            });
        }
    }, [profile]);

    return config;
}
