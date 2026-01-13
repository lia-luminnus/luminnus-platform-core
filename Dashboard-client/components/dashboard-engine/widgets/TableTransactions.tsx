/**
 * Table Transactions Widget
 * 
 * Lista paginada de transações recentes
 */

import React, { useMemo, useState } from 'react';
import { Loader2, ChevronLeft, ChevronRight, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { WidgetProps } from '../types';

// ============================================
// Helpers
// ============================================

function formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2,
    }).format(value);
}

function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

// ============================================
// Types
// ============================================

interface TransactionRow {
    id: string;
    data: {
        date: string;
        description: string;
        type: 'in' | 'out';
        category: string;
        amount: number;
        payment_method?: string;
    };
    created_at: string;
}

// ============================================
// Component
// ============================================

function TableTransactions({ id, config, data, loading, error, isEditMode }: WidgetProps) {
    const { title, config: widgetConfig } = config;
    const pageSize = widgetConfig?.pageSize || 10;

    const [currentPage, setCurrentPage] = useState(0);

    // Transform data
    const transactions = useMemo(() => {
        if (!data || !Array.isArray(data)) return [];
        return data as TransactionRow[];
    }, [data]);

    // Pagination
    const totalPages = Math.ceil(transactions.length / pageSize);
    const paginatedData = transactions.slice(
        currentPage * pageSize,
        (currentPage + 1) * pageSize
    );

    if (loading) {
        return (
            <div className="h-full w-full rounded-2xl p-4 bg-white/5 border border-white/10 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="h-full w-full rounded-2xl p-4 bg-red-500/10 border border-red-500/30 flex flex-col items-center justify-center">
                <span className="text-red-400 text-sm">{error}</span>
            </div>
        );
    }

    // Empty state
    if (!transactions || transactions.length === 0) {
        return (
            <div className="h-full w-full rounded-2xl p-4 bg-white/5 border border-white/10 flex flex-col">
                <h3 className="text-sm font-semibold text-white mb-2">{title}</h3>
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <span className="material-symbols-outlined text-4xl text-gray-600 mb-2">receipt_long</span>
                        <p className="text-sm text-gray-500">Nenhuma transação encontrada</p>
                        <p className="text-xs text-gray-600 mt-1">Importe dados ou conecte uma integração</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`h-full w-full rounded-2xl p-4 bg-white/5 border border-white/10 flex flex-col ${isEditMode ? 'cursor-move' : ''}`}>
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white">{title}</h3>
                <span className="text-xs text-gray-400">{transactions.length} transações</span>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto scrollbar-hide">
                <table className="w-full text-sm border-separate border-spacing-0">
                    <thead className="sticky top-0 z-10 bg-[#111827]/80 backdrop-blur-md">
                        <tr className="text-gray-400 text-xs shadow-[0_1px_0_0_rgba(255,255,255,0.1)]">
                            <th className="text-left py-3 px-2 font-black uppercase tracking-widest opacity-70">Data</th>
                            <th className="text-left py-3 px-2 font-black uppercase tracking-widest opacity-70">Descrição</th>
                            <th className="text-left py-3 px-2 font-black uppercase tracking-widest opacity-70">Categoria</th>
                            <th className="text-right py-3 px-2 font-black uppercase tracking-widest opacity-70">Valor</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {paginatedData.map((tx, idx) => (
                            <tr
                                key={tx.id || idx}
                                className="border-b border-white/5 hover:bg-white/5 transition-colors"
                            >
                                <td className="py-4 px-2 text-gray-300 font-medium">{formatDate(tx.data?.date || (tx as any).date)}</td>
                                <td className="py-4 px-2 text-white font-bold max-w-[200px] truncate">{tx.data?.description || (tx as any).description || '-'}</td>
                                <td className="py-4 px-2">
                                    <span className="px-3 py-1 rounded-lg bg-white/5 text-gray-400 text-[10px] font-black uppercase tracking-wider border border-white/5">
                                        {tx.data?.category || (tx as any).category || 'Outros'}
                                    </span>
                                </td>
                                <td className="py-4 px-2 text-right">
                                    <div className="flex items-center justify-end gap-1 font-black">
                                        {(tx.data?.type || (tx as any).type) === 'in' ? (
                                            <ArrowUpCircle className="w-3 h-3 text-green-500" />
                                        ) : (
                                            <ArrowDownCircle className="w-3 h-3 text-red-500" />
                                        )}
                                        <span className={(tx.data?.type || (tx as any).type) === 'in' ? 'text-green-400' : 'text-red-400'}>
                                            {formatCurrency(tx.data?.amount || (tx as any).amount || 0)}
                                        </span>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between pt-3 border-t border-white/10 mt-2">
                    <button
                        onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                        disabled={currentPage === 0}
                        className="p-1 rounded hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <ChevronLeft className="w-4 h-4 text-gray-400" />
                    </button>
                    <span className="text-xs text-gray-400">
                        Página {currentPage + 1} de {totalPages}
                    </span>
                    <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                        disabled={currentPage >= totalPages - 1}
                        className="p-1 rounded hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                    </button>
                </div>
            )}
        </div>
    );
}

export default TableTransactions;
