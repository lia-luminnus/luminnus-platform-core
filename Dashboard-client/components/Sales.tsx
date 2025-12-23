
import React, { useContext } from 'react';
import Header from './Header';
import { LanguageContext } from '../App';

const Sales: React.FC = () => {
  const { t } = useContext(LanguageContext);

  const sales = [
      { id: '#1023', customer: 'Alex Smith', total: 120.50, status: 'completed', date: 'Just now' },
      { id: '#1022', customer: 'Maria Garcia', total: 45.00, status: 'completed', date: '15 min ago' },
      { id: '#1021', customer: 'John Doe', total: 89.99, status: 'pending', date: '1 hour ago' },
      { id: '#1020', customer: 'Sarah Connor', total: 299.00, status: 'completed', date: '2 hours ago' },
      { id: '#1019', customer: 'Bruce Wayne', total: 15.00, status: 'failed', date: 'Yesterday' },
  ];

  const handleAction = (action: string) => {
    // Placeholder action handler
    console.log(action);
  };

  return (
    <div className="flex flex-col h-full">
      <Header title={t('sales')} />
      <div className="flex-1 p-8 pt-2 overflow-y-auto">
         {/* Top Stats */}
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="glass-panel bg-white dark:bg-white/5 p-6 rounded-xl border border-gray-200 dark:border-white/5 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-green-500/10 rounded-lg text-green-500">
                        <span className="material-symbols-outlined">attach_money</span>
                    </div>
                    <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">Vendas Hoje</h3>
                </div>
                <p className="text-3xl font-bold text-gray-800 dark:text-white">$1,240.50</p>
                <p className="text-xs text-green-500 mt-1 flex items-center">
                    <span className="material-symbols-outlined text-sm mr-1">trending_up</span>
                    +15% vs ontem
                </p>
            </div>
             <div className="glass-panel bg-white dark:bg-white/5 p-6 rounded-xl border border-gray-200 dark:border-white/5 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                     <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
                        <span className="material-symbols-outlined">shopping_bag</span>
                    </div>
                    <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">Pedidos</h3>
                </div>
                <p className="text-3xl font-bold text-gray-800 dark:text-white">12</p>
                <p className="text-xs text-blue-500 mt-1 flex items-center">
                    <span className="material-symbols-outlined text-sm mr-1">add</span>
                    3 novos
                </p>
            </div>
             <div className="glass-panel bg-white dark:bg-white/5 p-6 rounded-xl border border-gray-200 dark:border-white/5 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                     <div className="p-2 bg-purple-500/10 rounded-lg text-purple-500">
                        <span className="material-symbols-outlined">analytics</span>
                    </div>
                    <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">Ticket Médio</h3>
                </div>
                <p className="text-3xl font-bold text-gray-800 dark:text-white">$103.00</p>
                 <p className="text-xs text-gray-500 mt-1">Estável</p>
            </div>
         </div>

         {/* Action Bar */}
         <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-gray-800 dark:text-white">Pedidos Recentes</h2>
            <div className="flex gap-2">
                 <button onClick={() => handleAction('Export')} className="px-4 py-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-white/10 transition-colors flex items-center gap-2">
                    <span className="material-symbols-outlined text-lg">download</span>
                    Exportar
                </button>
                <button onClick={() => handleAction('New Order')} className="px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity flex items-center gap-2 shadow-lg shadow-brand-primary/20">
                    <span className="material-symbols-outlined text-lg">add</span>
                    Novo Pedido
                </button>
            </div>
         </div>

         {/* Sales Table */}
         <div className="glass-panel bg-white dark:bg-white/5 rounded-xl overflow-hidden shadow-sm border border-gray-200 dark:border-white/5">
            <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-white/10">
                    <tr>
                        <th className="p-4 font-medium">ID</th>
                        <th className="p-4 font-medium">Cliente</th>
                        <th className="p-4 font-medium">Total</th>
                        <th className="p-4 font-medium">Status</th>
                        <th className="p-4 font-medium">Data</th>
                        <th className="p-4 font-medium text-right"></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-white/5">
                    {sales.map(sale => (
                        <tr key={sale.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                            <td className="p-4 font-medium text-gray-800 dark:text-white">{sale.id}</td>
                            <td className="p-4 text-gray-600 dark:text-gray-300">{sale.customer}</td>
                            <td className="p-4 font-bold text-gray-800 dark:text-white">${sale.total.toFixed(2)}</td>
                            <td className="p-4">
                                <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                                    sale.status === 'completed' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 
                                    sale.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                                    'bg-red-500/10 text-red-500 border-red-500/20'
                                }`}>
                                    {sale.status === 'completed' ? 'Concluído' : sale.status === 'pending' ? 'Pendente' : 'Falhou'}
                                </span>
                            </td>
                            <td className="p-4 text-gray-500 dark:text-gray-400">{sale.date}</td>
                            <td className="p-4 text-right">
                                <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 hover:text-brand-primary transition-colors">
                                    <span className="material-symbols-outlined text-lg">more_horiz</span>
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
         </div>
      </div>
    </div>
  );
};

export default Sales;
    