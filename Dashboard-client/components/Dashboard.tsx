
import React, { useContext, useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Header from './Header';
import { LanguageContext } from '../App';
import { useAppStore } from '../store/useAppStore';
import { Skeleton } from './ui/Skeleton';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

const Dashboard: React.FC = () => {
  const { t } = useContext(LanguageContext);
  const { businessType } = useAppStore();
  const [timeRange, setTimeRange] = useState('weekly');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1200);
    return () => clearTimeout(timer);
  }, []);

  const getDynamicStats = () => {
    switch(businessType) {
        case 'health_wellness':
            return [
                { key: t('newClients'), val: '18', label: 'Pacientes', icon: 'personal_injury', color: 'text-blue-500', glow: 'shadow-blue-500/10' },
                { key: 'conversions', val: '92%', label: 'Retorno', icon: 'repeat', color: 'text-green-500', glow: 'shadow-green-500/10' },
                { key: 'messages', val: '45', label: 'Dúvidas', icon: 'chat', color: 'text-purple-500', glow: 'shadow-purple-500/10' },
            ];
        case 'retail':
            return [
                { key: t('newClients'), val: '142', label: 'Pedidos', icon: 'shopping_bag', color: 'text-blue-500', glow: 'shadow-blue-500/10' },
                { key: 'conversions', val: '3.4%', label: 'Conv. Loja', icon: 'storefront', color: 'text-green-500', glow: 'shadow-green-500/10' },
                { key: 'sales', val: 'R$42k', label: 'Faturamento', icon: 'payments', color: 'text-pink-500', glow: 'shadow-pink-500/10' },
            ];
        default:
            return [
                { key: t('newClients'), val: '12', label: t('newClients'), icon: 'person_add', color: 'text-blue-500', glow: 'shadow-blue-500/10' },
                { key: 'conversions', val: '84%', label: t('conversions'), icon: 'trending_up', color: 'text-green-500', glow: 'shadow-green-500/10' },
                { key: 'messages', val: '302', label: t('messages'), icon: 'chat_bubble', color: 'text-purple-500', glow: 'shadow-purple-500/10' },
            ];
    }
  };

  const stats = [
    ...getDynamicStats(),
    { key: t('attendances'), val: '45', label: t('attendances'), icon: 'support_agent', color: 'text-cyan-500', glow: 'shadow-cyan-500/10' },
    { key: t('sales'), val: '$12.5k', label: t('sales'), icon: 'attach_money', color: 'text-pink-500', glow: 'shadow-pink-500/10' },
    { key: t('tickets'), val: '23', label: t('tickets'), icon: 'confirmation_number', color: 'text-orange-500', glow: 'shadow-orange-500/10' },
  ];

  const data = [
    { name: t('mon'), value: 30 },
    { name: t('tue'), value: 45 },
    { name: t('wed'), value: 35 },
    { name: t('thu'), value: 60 },
    { name: t('fri'), value: 50 },
    { name: t('sat'), value: 75 },
    { name: t('sun'), value: 65 },
  ];

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-dark-bg">
      <Header />
      
      <div className="flex-1 overflow-y-auto p-8 pt-2 scroll-smooth">
        <div className="grid grid-cols-12 gap-6">
          
          <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-panel bg-white dark:bg-white/5 rounded-3xl p-8 border border-gray-200 dark:border-white/10 shadow-xl"
            >
               <h3 className="font-black text-xl mb-8 uppercase tracking-tighter text-gray-800 dark:text-white">Relatório de Atividade</h3>
               <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
                  {stats.map((stat, i) => (
                      <motion.div 
                        key={i} 
                        whileHover={{ y: -5, scale: 1.05 }}
                        className={`cursor-pointer bg-gray-50 dark:bg-white/5 p-6 rounded-2xl premium-transition group border border-transparent hover:border-brand-primary/20 shadow-sm hover:shadow-2xl ${stat.glow}`}
                        onClick={() => toast.success(`${stat.label} ativo`)}
                      >
                         {loading ? (
                             <div className="flex flex-col items-center gap-2">
                                 <Skeleton className="h-4 w-20" />
                                 <Skeleton className="h-10 w-16" />
                             </div>
                         ) : (
                             <>
                                <div className="flex justify-between items-start mb-4">
                                    <div className={`p-2 rounded-xl bg-white dark:bg-white/10 ${stat.color} shadow-sm group-hover:rotate-12 transition-transform`}>
                                        <span className={`material-symbols-outlined`}>{stat.icon}</span>
                                    </div>
                                    <span className="material-symbols-outlined text-gray-300 dark:text-gray-600 group-hover:text-brand-primary">north_east</span>
                                </div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{stat.label}</p>
                                <p className={`text-3xl font-black ${stat.color} tracking-tighter`}>{stat.val}</p>
                             </>
                         )}
                      </motion.div>
                  ))}
               </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass-panel bg-white dark:bg-white/5 rounded-3xl p-8 h-96 border border-gray-200 dark:border-white/10 shadow-xl"
            >
               <div className="flex justify-between items-center mb-8">
                  <h3 className="font-black text-xl uppercase tracking-tighter">{t('generalPerformance')}</h3>
                  <div className="flex items-center gap-1 bg-gray-100 dark:bg-white/10 p-1.5 rounded-xl shadow-inner">
                    {['daily', 'weekly', 'monthly'].map((id) => (
                      <button 
                        key={id} 
                        onClick={() => setTimeRange(id)}
                        className={`text-[10px] font-black uppercase px-4 py-2 rounded-lg premium-transition ${
                            timeRange === id 
                            ? 'bg-white dark:bg-brand-primary text-brand-primary dark:text-white shadow-lg' 
                            : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                        }`}
                      >
                        {t(id as any)}
                      </button>
                    ))}
                  </div>
               </div>
               <div className="flex-1 w-full min-h-0">
                 {loading ? <Skeleton className="w-full h-full rounded-2xl" /> : (
                     <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data}>
                            <defs>
                                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.4}/>
                                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 10, fontWeight: 'bold'}} />
                            <YAxis axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 10, fontWeight: 'bold'}} />
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '16px', color: '#fff', padding: '12px' }}
                                itemStyle={{ color: '#8B5CF6', fontWeight: 'bold' }}
                            />
                            <Area type="monotone" dataKey="value" stroke="#8B5CF6" strokeWidth={4} fillOpacity={1} fill="url(#colorValue)" />
                        </AreaChart>
                    </ResponsiveContainer>
                 )}
               </div>
            </motion.div>
          </div>

          <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
             <motion.div 
               initial={{ opacity: 0, x: 20 }}
               animate={{ opacity: 1, x: 0 }}
               transition={{ delay: 0.3 }}
               className="glass-panel bg-white dark:bg-white/5 rounded-3xl p-8 border border-gray-200 dark:border-white/10 shadow-xl"
             >
                <h3 className="font-black text-lg mb-6 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-2 h-2 bg-brand-primary rounded-full"></span>
                    {t('dailySummary')}
                </h3>
                <div className="space-y-4">
                    {[
                        { title: t('tasksToday'), desc: '5 concluídas, 3 pendentes.', icon: 'checklist', color: 'bg-blue-500/10 text-blue-500' },
                        { title: t('liaActions'), desc: '12 automações executadas.', icon: 'bolt', color: 'bg-purple-500/10 text-purple-500' }
                    ].map((item, idx) => (
                        <div key={idx} className="p-5 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 hover-lift flex gap-4 items-center">
                            <div className={`p-3 rounded-xl ${item.color}`}>
                                <span className="material-symbols-outlined">{item.icon}</span>
                            </div>
                            <div>
                                <p className="font-bold text-sm text-gray-800 dark:text-white">{item.title}</p>
                                <p className="text-[11px] text-gray-500 font-medium">{item.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
             </motion.div>

             <motion.div 
               initial={{ opacity: 0, x: 20 }}
               animate={{ opacity: 1, x: 0 }}
               transition={{ delay: 0.4 }}
               className="rounded-3xl p-8 bg-gradient-to-br from-purple-600 to-blue-700 text-white shadow-2xl relative overflow-hidden group"
             >
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:scale-125 premium-transition"></div>
                <h3 className="font-black text-xl mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined animate-pulse">auto_awesome</span>
                    {t('liaInsights')}
                </h3>
                <p className="text-sm text-purple-100 mb-8 leading-relaxed opacity-90 font-medium">
                  {t('liaInsightsText')}
                </p>
                <div className="flex gap-4">
                   <button className="flex-1 py-3 px-4 rounded-xl bg-white text-purple-700 text-xs font-black uppercase tracking-widest hover:scale-105 active:scale-95 premium-transition shadow-lg">
                    {t('investigate')}
                   </button>
                   <button className="p-3 rounded-xl bg-white/20 hover:bg-white/30 premium-transition">
                    <span className="material-symbols-outlined">more_vert</span>
                   </button>
                </div>
             </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
