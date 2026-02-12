import { useState, useEffect, useCallback, useRef } from 'react';
import { getCreditBalance, getCreditTransactions, getCreditPackages } from '../services/creditService';
import type { CreditBalance, CreditTransaction, CreditPackage } from '../services/creditService';

interface UseCreditsOptions {
    tenantId: string | null;
    autoRefresh?: boolean;         // Poling automático (default: true)
    refreshInterval?: number;      // Intervalo em ms (default: 60s)
}

interface UseCreditsReturn {
    balance: CreditBalance | null;
    transactions: CreditTransaction[];
    packages: CreditPackage[];
    loading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
    percentual: number;
    isLow: boolean;              // < 20% restante
    isCritical: boolean;         // < 5% restante
    isExceeded: boolean;         // > 100% usado
}

export function useCredits(options: UseCreditsOptions): UseCreditsReturn {
    const { tenantId, autoRefresh = true, refreshInterval = 60000 } = options;

    const [balance, setBalance] = useState<CreditBalance | null>(null);
    const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
    const [packages, setPackages] = useState<CreditPackage[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const refresh = useCallback(async () => {
        if (!tenantId) return;

        try {
            setError(null);
            const bal = await getCreditBalance(tenantId);
            if (bal) setBalance(bal);
        } catch (err: any) {
            setError(err.message || 'Erro ao carregar créditos');
        }
    }, [tenantId]);

    // Carregamento inicial
    useEffect(() => {
        if (!tenantId) {
            setLoading(false);
            return;
        }

        const load = async () => {
            setLoading(true);
            try {
                const [bal, txns, pkgs] = await Promise.all([
                    getCreditBalance(tenantId),
                    getCreditTransactions(tenantId),
                    getCreditPackages(),
                ]);
                if (bal) setBalance(bal);
                setTransactions(txns);
                setPackages(pkgs);
            } catch (err: any) {
                setError(err.message || 'Erro ao carregar créditos');
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [tenantId]);

    // Auto-refresh
    useEffect(() => {
        if (!autoRefresh || !tenantId) return;

        intervalRef.current = setInterval(refresh, refreshInterval);
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [autoRefresh, tenantId, refreshInterval, refresh]);

    const percentual = balance?.percentual_uso ?? 0;
    const remaining = balance ? (balance.creditos_totais - balance.creditos_usados) : 0;
    const total = balance?.creditos_totais ?? 1;

    return {
        balance,
        transactions,
        packages,
        loading,
        error,
        refresh,
        percentual,
        isLow: remaining > 0 && remaining / total < 0.2,
        isCritical: remaining > 0 && remaining / total < 0.05,
        isExceeded: remaining <= 0,
    };
}
