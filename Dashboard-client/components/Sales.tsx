
import React, { useState, useContext, useEffect } from 'react';
import Header from './Header';
import { LanguageContext } from '../contexts/LanguageContext';
import { Order, Transaction } from '../types';
import salesService from '../services/salesService';
import { useDashboardAuth } from '../contexts/DashboardAuthContext';
import toast from 'react-hot-toast';
import OrderModal from './OrderModal';

const Sales: React.FC = () => {
    const { t } = useContext(LanguageContext);
    const { user, isAdmin } = useDashboardAuth();

    const [orders, setOrders] = useState<Order[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState({ income: 0, expenses: 0, balance: 0 });

    // Modal State
    const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);

    // Helper to get tenant ID
    const getTenantId = () => {
        const metadata = (user as any)?.user_metadata;
        const tenantId = metadata?.tenant_id || (user as any)?.tenant_id;
        return tenantId || user?.id || 'default-tenant';
    };

    const loadData = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const tenantId = getTenantId();
            const [ordersData, transactionsData, statsData] = await Promise.all([
                salesService.listOrders(tenantId),
                salesService.listTransactions(tenantId),
                salesService.getFinancialSummary(tenantId)
            ]);

            setOrders(ordersData);
            setTransactions(transactionsData);
            setSummary(statsData);
        } catch (error) {
            console.error('Error loading sales data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [user]);

    const handleOrderSuccess = () => {
        loadData(); // Refresh data after new order
    };

    return (
        <div className="flex flex-col h-full">
            <Header title={t('sales') || 'Vendas'} />

            <div className="flex-1 p-8 pt-2 overflow-y-auto">

                {/* Main Actions */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Visão Geral</h2>
                        <p className="text-gray-500 dark:text-gray-400 text-sm">Acompanhe suas vendas e performance financeira</p>
                    </div>
                    <button
                        onClick={() => setIsOrderModalOpen(true)}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-primary text-white hover:opacity-90 transition-opacity font-medium shadow-lg shadow-brand-primary/30"
                    >
                        <span className="material-symbols-outlined">add_shopping_cart</span>
                        Novo Pedido
                    </button>
                </div>

                {/* Financial Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="glass-panel bg-white dark:bg-white/5 p-6 rounded-xl border border-gray-200 dark:border-white/5 shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <span className="material-symbols-outlined text-6xl text-brand-primary">trending_up</span>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Vendas Hoje</p>
                        <p className="text-3xl font-bold text-gray-800 dark:text-white">
                            ${summary.income.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        <div className="mt-4 flex items-center text-xs text-green-500 font-medium">
                            <span className="material-symbols-outlined text-sm mr-1">trending_up</span>
                            +15% vs ontem
                        </div>
                    </div>

                    <div className="glass-panel bg-white dark:bg-white/5 p-6 rounded-xl border border-gray-200 dark:border-white/5 shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <span className="material-symbols-outlined text-6xl text-brand-secondary">shopping_bag</span>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Pedidos</p>
                        <p className="text-3xl font-bold text-gray-800 dark:text-white">
                            {orders.filter(o => new Date(o.createdAt).toDateString() === new Date().toDateString()).length}
                        </p>
                        <div className="mt-4 flex items-center text-xs text-blue-500 font-medium">
                            <span className="material-symbols-outlined text-sm mr-1">add</span>
                            {orders.length} pedidos totais
                        </div>
                    </div>

                    <div className="glass-panel bg-white dark:bg-white/5 p-6 rounded-xl border border-gray-200 dark:border-white/5 shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <span className="material-symbols-outlined text-6xl text-brand-accent">account_balance_wallet</span>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Ticket Médio</p>
                        <p className="text-3xl font-bold text-gray-800 dark:text-white">
                            ${orders.length > 0 ? (summary.income / orders.length).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                        </p>
                        <div className="mt-4 flex items-center text-xs text-brand-primary font-medium">
                            Estável
                        </div>
                    </div>
                </div>

                {/* Recent Orders Table */}
                <div className="glass-panel bg-white dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/5 shadow-sm mb-8 overflow-hidden">
                    <div className="p-6 border-b border-gray-200 dark:border-white/5 flex justify-between items-center">
                        <h3 className="font-bold text-gray-800 dark:text-white">Pedidos Recentes</h3>
                        <div className="flex gap-2">
                            <button className="px-4 py-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-white/10 transition-colors flex items-center gap-2">
                                <span className="material-symbols-outlined text-lg">download</span>
                                Exportar
                            </button>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-white/10">
                                <tr>
                                    <th className="px-6 py-4 font-medium">ID</th>
                                    <th className="px-6 py-4 font-medium">Cliente</th>
                                    <th className="px-6 py-4 font-medium">Total</th>
                                    <th className="px-6 py-4 font-medium">Status</th>
                                    <th className="px-6 py-4 font-medium">Data</th>
                                    <th className="px-6 py-4 font-medium text-right"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-white/5">
                                {loading ? (
                                    <tr>
                                        <td colSpan={6} className="text-center py-8 text-gray-500 font-medium">
                                            Carregando pedidos...
                                        </td>
                                    </tr>
                                ) : orders.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="text-center py-8 text-gray-500">
                                            Nenhuma venda registrada ainda.
                                        </td>
                                    </tr>
                                ) : (
                                    orders.slice(0, 10).map((order) => (
                                        <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                            <td className="px-6 py-4 font-mono text-xs text-gray-500">#{order.id.slice(0, 8)}</td>
                                            <td className="px-6 py-4 font-medium text-gray-800 dark:text-white">
                                                {order.customerName || 'Cliente Balcão'}
                                            </td>
                                            <td className="px-6 py-4 font-bold text-gray-800 dark:text-white">
                                                ${order.totalAmount.toFixed(2)}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border ${order.status === 'completed' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                                                    order.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                                                        'bg-red-500/10 text-red-500 border-red-500/20'
                                                    }`}>
                                                    {order.status === 'completed' ? 'Concluído' : order.status === 'pending' ? 'Pendente' : 'Falhou'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                                                {new Date(order.createdAt).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 hover:text-brand-primary transition-colors">
                                                    <span className="material-symbols-outlined text-lg">more_horiz</span>
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <OrderModal
                isOpen={isOrderModalOpen}
                onClose={() => setIsOrderModalOpen(false)}
                onSuccess={handleOrderSuccess}
            />
        </div>
    );
};

export default Sales;
