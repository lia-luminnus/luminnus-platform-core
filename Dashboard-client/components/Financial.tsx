
import React, { useContext, useState, useRef } from 'react';
import Header from './Header';
import { Transaction } from '../types';
import { AreaChart, Area, PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { LanguageContext } from '../App';
import { Spreadsheet, SpreadsheetHandle } from './ui/Spreadsheet';

const Financial: React.FC = () => {
  const { t } = useContext(LanguageContext);
  const [timeFilter, setTimeFilter] = useState('6M');
  const [activeTab, setActiveTab] = useState<'overview' | 'sheets'>('overview');
  const spreadsheetRef = useRef<SpreadsheetHandle>(null);

  const transactions: Transaction[] = [
    { id: '1', description: 'Monthly Subscription - Pro Plan', date: '2023-10-28', amount: 299.00, status: 'completed' },
    { id: '2', description: 'API Usage Overage', date: '2023-10-25', amount: -45.50, status: 'completed' },
    { id: '3', description: 'Nexus Integration Setup', date: '2023-10-22', amount: -1200.00, status: 'completed' },
    { id: '4', description: 'Project Zenith Phase 1', date: '2023-10-20', amount: 5000.00, status: 'in_progress' },
    { id: '5', description: 'New Client Onboarding Fee', date: '2023-10-18', amount: 2500.00, status: 'pending' },
  ];

  const chartData = [
    { name: 'Jan', uv: 4000, pv: 2400 },
    { name: 'Feb', uv: 3000, pv: 1398 },
    { name: 'Mar', uv: 2000, pv: 9800 },
    { name: 'Apr', uv: 2780, pv: 3908 },
    { name: 'May', uv: 1890, pv: 4800 },
    { name: 'Jun', uv: 2390, pv: 3800 },
    { name: 'Jul', uv: 3490, pv: 4300 },
  ];

  const pieData = [
    { name: 'Operations', value: 400 },
    { name: 'Marketing', value: 300 },
    { name: 'Salaries', value: 300 },
    { name: 'Tools', value: 200 },
  ];
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  const getStatusLabel = (status: string) => {
      if (status === 'completed') return t('completed');
      if (status === 'in_progress') return t('inProgress');
      if (status === 'pending') return t('pending');
      if (status === 'failed') return t('failed');
      return status;
  };

  const handleAction = (action: string) => {
      alert(`${t('featureComingSoon')} (${action})`);
  };

  const handleNewSheet = () => {
    if (spreadsheetRef.current) {
        spreadsheetRef.current.addSheet();
    }
  };

  return (
    <div className="flex flex-col h-full">
      <Header title={t('financialTitle')} />
      
      {/* Sub-Navigation Tabs */}
      <div className="px-8 border-b border-gray-200 dark:border-white/10 flex gap-6 bg-white dark:bg-[#0A0F1A] sticky top-0 z-10">
        <button 
            onClick={() => setActiveTab('overview')}
            className={`py-3 text-sm font-medium transition-colors relative ${activeTab === 'overview' ? 'text-brand-primary' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
        >
            Visão Geral
            {activeTab === 'overview' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-brand-primary"></span>}
        </button>
        <button 
            onClick={() => setActiveTab('sheets')}
            className={`py-3 text-sm font-medium transition-colors relative ${activeTab === 'sheets' ? 'text-brand-primary' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
        >
            Planilhas & Docs
            {activeTab === 'sheets' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-brand-primary"></span>}
        </button>
      </div>

      <div className="flex-1 p-8 pt-6 overflow-hidden flex flex-col">
         
         {activeTab === 'overview' ? (
             <div className="overflow-y-auto h-full pr-2">
                <div className="flex justify-end mb-6">
                    <button onClick={() => handleAction('Generate Report')} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white dark:bg-white/10 hover:bg-gray-50 dark:hover:bg-white/20 transition-colors font-medium text-sm shadow-sm">
                        <span className="material-symbols-outlined text-xl">download</span>
                        Generate Report
                    </button>
                </div>

                <div className="grid grid-cols-12 gap-6 mb-6">
                    <div className="col-span-12 lg:col-span-12 grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                        { label: t('totalBalance'), value: '$122,430.50', icon: 'account_balance_wallet', color: 'bg-blue-500/20 text-blue-400' },
                        { label: t('totalRevenue'), value: '$23,890.10', icon: 'arrow_upward', color: 'bg-green-500/20 text-green-400' },
                        { label: t('totalExpenses'), value: '$8,120.75', icon: 'arrow_downward', color: 'bg-red-500/20 text-red-400' },
                    ].map((stat, i) => (
                        <div key={i} className="glass-panel bg-white dark:bg-white/5 p-6 rounded-xl flex items-center gap-4 shadow-sm">
                            <div className={`p-3 rounded-full ${stat.color}`}>
                                <span className="material-symbols-outlined text-3xl">{stat.icon}</span>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
                                <p className="text-3xl font-bold dark:text-white">{stat.value}</p>
                            </div>
                        </div>
                    ))}
                    </div>
                </div>

                <div className="grid grid-cols-12 gap-6 mb-6">
                    <div className="col-span-12 lg:col-span-8">
                    <div className="glass-panel bg-white dark:bg-white/5 p-6 rounded-xl h-80 flex flex-col shadow-sm">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-semibold text-lg">{t('revenueVsExpenses')}</h3>
                            <div className="flex items-center gap-1 bg-gray-100 dark:bg-white/10 p-1 rounded-lg">
                                {['3M', '6M', '1Y', 'All'].map(range => (
                                    <button 
                                        key={range} 
                                        onClick={() => setTimeFilter(range)}
                                        className={`text-xs px-3 py-1 rounded hover:bg-white dark:hover:bg-white/20 transition-all ${timeFilter === range ? 'bg-white dark:bg-white/20 font-bold shadow-sm' : ''}`}
                                    >
                                        {range}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="flex-1 min-h-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px', color: '#fff' }} />
                                <Area type="monotone" dataKey="uv" stroke="#8B5CF6" fillOpacity={1} fill="url(#colorUv)" />
                                <Area type="monotone" dataKey="pv" stroke="#3B82F6" fillOpacity={0.1} fill="#3B82F6" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    </div>
                    <div className="col-span-12 lg:col-span-4">
                    <div className="glass-panel bg-white dark:bg-white/5 p-6 rounded-xl h-80 flex flex-col shadow-sm">
                        <h3 className="font-semibold text-lg mb-4">{t('expenseBreakdown')}</h3>
                        <div className="flex-1 min-h-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} fill="#8884d8" paddingAngle={5} dataKey="value">
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    </div>
                </div>

                <div className="glass-panel bg-white dark:bg-white/5 rounded-xl overflow-hidden shadow-sm">
                    <div className="p-6 border-b border-gray-200 dark:border-white/10">
                    <h3 className="font-semibold text-lg">{t('recentTransactions')}</h3>
                    </div>
                    <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-gray-400">
                            <tr>
                                <th className="p-4 font-medium">{t('description')}</th>
                                <th className="p-4 font-medium">{t('date')}</th>
                                <th className="p-4 font-medium">{t('amount')}</th>
                                <th className="p-4 font-medium">{t('status')}</th>
                                <th className="p-4 font-medium"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-white/5">
                            {transactions.map((t) => (
                                <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                <td className="p-4 font-medium dark:text-white">{t.description}</td>
                                <td className="p-4 text-gray-500 dark:text-gray-400">{t.date}</td>
                                <td className={`p-4 font-bold ${t.amount > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                    {t.amount > 0 ? '+' : ''}{t.amount.toFixed(2)}
                                </td>
                                <td className="p-4">
                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold bg-${
                                        t.status === 'completed' ? 'green' : t.status === 'pending' ? 'yellow' : 'blue'
                                    }-500/20 text-${
                                        t.status === 'completed' ? 'green' : t.status === 'pending' ? 'yellow' : 'blue'
                                    }-500`}>
                                        {getStatusLabel(t.status)}
                                    </span>
                                </td>
                                <td className="p-4 text-right">
                                    <button onClick={() => handleAction('More Actions')} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10"><span className="material-symbols-outlined text-lg">more_horiz</span></button>
                                </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    </div>
                </div>
             </div>
         ) : (
             /* Spreadsheet Tab Content */
             <div className="h-full flex flex-col animate-fade-in">
                 <div className="flex justify-between items-center mb-4">
                     <div>
                         <h2 className="text-xl font-bold">Planilhas & Documentos</h2>
                         <p className="text-gray-500 text-sm">Gerencie orçamentos, previsões e dados complexos.</p>
                     </div>
                     <button 
                        onClick={handleNewSheet}
                        className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-bold shadow-lg hover:opacity-90 transition-opacity"
                     >
                         <span className="material-symbols-outlined text-lg">add</span>
                         Nova Planilha
                     </button>
                 </div>
                 <div className="flex-1 min-h-0 pb-2">
                     <Spreadsheet ref={spreadsheetRef} />
                 </div>
             </div>
         )}

      </div>
    </div>
  );
};

export default Financial;
