/**
 * Table Transactions Widget
 * 
 * Lista paginada de transações recentes
 */

import React, { useMemo, useState, useContext } from 'react';
import { Loader2, ChevronLeft, ChevronRight, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { WidgetProps } from '../types';
import { LanguageContext } from '../../../contexts/LanguageContext';

// ============================================
// Helpers
// ============================================

function formatCurrency(value: number, language: string): string {
    const locale = language === 'en' ? 'en-US' : language === 'es' ? 'es-ES' : 'pt-BR';
    const currency = language === 'en' ? 'USD' : language === 'es' ? 'EUR' : 'BRL';
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
    }).format(value);
}

function formatDate(dateStr: string, language: string): string {
    const date = new Date(dateStr);
    const locale = language === 'en' ? 'en-US' : language === 'es' ? 'es-ES' : 'pt-BR';
    return date.toLocaleDateString(locale, { day: '2-digit', month: 'short' });
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
    const { t, language } = useContext(LanguageContext);
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
            <div className="h-full w-full rounded-2xl p-4 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 flex items-center justify-center">
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
            <div className="h-full w-full rounded-2xl p-4 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 flex flex-col">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <span className="material-symbols-outlined text-4xl text-gray-400 dark:text-gray-600 mb-2">receipt_long</span>
                        <p className="text-sm text-gray-500">{t('noTransactionsFound')}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-600 mt-1">{t('importDataDesc')}</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`h-full w-full rounded-2xl p-4 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 flex flex-col ${isEditMode ? 'cursor-move' : ''}`}>
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
                <span className="text-xs text-gray-500 dark:text-gray-400">{transactions.length} {t('transactionsLabel')}</span>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto scrollbar-hide">
                <table className="w-full text-sm border-separate border-spacing-0">
                    <thead className="sticky top-0 z-10 bg-gray-50/90 dark:bg-[#111827]/80 backdrop-blur-md">
                        <tr className="text-gray-600 dark:text-gray-400 text-xs shadow-[0_1px_0_0_rgba(0,0,0,0.1)] dark:shadow-[0_1px_0_0_rgba(255,255,255,0.1)]">
                            <th className="text-left py-3 px-2 font-black uppercase tracking-widest opacity-70">{t('date')}</th>
                            <th className="text-left py-3 px-2 font-black uppercase tracking-widest opacity-70">{t('description')}</th>
                            <th className="text-left py-3 px-2 font-black uppercase tracking-widest opacity-70">{t('category')}</th>
                            <th className="text-right py-3 px-2 font-black uppercase tracking-widest opacity-70">{t('amount')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                        {paginatedData.map((tx, idx) => (
                            <tr
                                key={tx.id || idx}
                                className="border-b border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                            >
                                <td className="py-4 px-2 text-gray-600 dark:text-gray-300 font-medium">{formatDate(tx.data?.date || (tx as any).date, language)}</td>
                                <td className="py-4 px-2 text-gray-900 dark:text-white font-bold max-w-[200px] truncate">{tx.data?.description || (tx as any).description || '-'}</td>
                                <td className="py-4 px-2">
                                    <span className="px-3 py-1 rounded-lg bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 text-[10px] font-black uppercase tracking-wider border border-gray-200 dark:border-white/5">
                                        {t(`cat_${(tx.data?.category || (tx as any).category || 'outros').toLowerCase()}`)}
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
                                            {formatCurrency(tx.data?.amount || (tx as any).amount || 0, language)}
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
                <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-white/10 mt-2">
                    <button
                        onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                        disabled={currentPage === 0}
                        className="p-1 rounded hover:bg-gray-100 dark:hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <ChevronLeft className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    </button>
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                        {t('page')} {currentPage + 1} {t('of')} {totalPages}
                    </span>
                    <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                        disabled={currentPage >= totalPages - 1}
                        className="p-1 rounded hover:bg-gray-100 dark:hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <ChevronRight className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    </button>
                </div>
            )}
        </div>
    );
}

export default TableTransactions;
