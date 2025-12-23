
import React, { useContext } from 'react';
import Header from './Header';
import { LanguageContext } from '../App';
import { Skeleton } from './ui/Skeleton';

const Logistics: React.FC = () => {
  const { t } = useContext(LanguageContext);

  const handleAction = (action: string) => {
    alert(`${t('featureComingSoon')} (${action})`);
  };

  return (
    <div className="flex flex-col h-full">
      <Header title={t('logisticsTitle')} />
      
      <div className="flex-1 p-8 pt-2 overflow-y-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <p className="text-gray-500 dark:text-gray-400">{t('logisticsDesc')}</p>
            <div className="flex gap-3">
                <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-white/10 transition-colors">
                    <span className="material-symbols-outlined text-lg">calendar_today</span>
                    {t('last30Days')}
                    <span className="material-symbols-outlined text-lg">expand_more</span>
                </button>
                <button onClick={() => handleAction('New Shipment')} className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity shadow-lg shadow-brand-primary/20">
                    <span className="material-symbols-outlined text-lg">add_circle</span>
                    {t('newShipment')}
                </button>
            </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[
                { title: t('ongoingDeliveries'), value: '1,204', change: '+12%', trend: 'up', icon: 'local_shipping', color: 'text-green-500', iconBg: 'bg-green-500/10' },
                { title: t('delayed'), value: '32', change: '+5', trend: 'up', icon: 'warning', color: 'text-red-500', iconBg: 'bg-red-500/10' },
                { title: t('delivered'), value: '8,721', change: '+8%', trend: 'up', icon: 'check_circle', color: 'text-blue-500', iconBg: 'bg-blue-500/10' },
                { title: t('onHold'), value: '115', change: '-2', trend: 'down', icon: 'pause_circle', color: 'text-yellow-500', iconBg: 'bg-yellow-500/10' },
            ].map((stat, index) => (
                <div key={index} className="glass-panel bg-white dark:bg-white/5 p-6 rounded-xl border border-gray-200 dark:border-white/5 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{stat.title}</h3>
                        <div className={`p-2 rounded-lg ${stat.iconBg}`}>
                            <span className={`material-symbols-outlined text-xl ${stat.color}`}>{stat.icon}</span>
                        </div>
                    </div>
                    <div className="flex items-end gap-3">
                        <span className="text-3xl font-bold text-gray-800 dark:text-white">{stat.value}</span>
                        <span className={`text-xs font-medium mb-1 flex items-center ${stat.trend === 'up' && stat.color !== 'text-red-500' ? 'text-green-500' : stat.color}`}>
                            <span className="material-symbols-outlined text-sm mr-0.5">
                                {stat.trend === 'up' ? 'trending_up' : 'trending_down'}
                            </span>
                            {stat.change}
                        </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{t('fromLastMonth')}</p>
                </div>
            ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Live Map */}
            <div className="lg:col-span-2 glass-panel bg-white dark:bg-white/5 rounded-xl p-6 border border-gray-200 dark:border-white/5 shadow-sm">
                <h3 className="text-lg font-bold mb-6 text-gray-800 dark:text-white">{t('liveTracking')}</h3>
                <div className="w-full h-[400px] bg-gray-100 dark:bg-[#1a1f2e] rounded-xl relative overflow-hidden flex items-center justify-center group">
                    {/* Abstract Map Representation */}
                    <div className="absolute inset-0 opacity-30" style={{
                        backgroundImage: 'radial-gradient(circle at 2px 2px, gray 1px, transparent 0)',
                        backgroundSize: '20px 20px'
                    }}></div>
                    
                    {/* Simulated Routes */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none">
                        <path d="M100 300 Q 250 100 400 250 T 700 300" fill="none" stroke="#8B5CF6" strokeWidth="3" strokeDasharray="10 5" className="animate-pulse opacity-50" />
                        <path d="M50 100 Q 300 350 600 100" fill="none" stroke="#3B82F6" strokeWidth="3" strokeDasharray="8 4" className="animate-pulse opacity-50" />
                    </svg>

                    {/* Simulated Vehicles */}
                    <div className="absolute top-1/4 left-1/4 p-2 bg-brand-primary rounded-full shadow-lg shadow-brand-primary/50 animate-bounce">
                        <span className="material-symbols-outlined text-white text-sm block">local_shipping</span>
                    </div>
                    <div className="absolute bottom-1/3 right-1/3 p-2 bg-blue-500 rounded-full shadow-lg shadow-blue-500/50 animate-bounce delay-700">
                        <span className="material-symbols-outlined text-white text-sm block">local_shipping</span>
                    </div>
                    <div className="absolute top-1/2 right-10 p-2 bg-green-500 rounded-full shadow-lg shadow-green-500/50 animate-bounce delay-300">
                        <span className="material-symbols-outlined text-white text-sm block">inventory</span>
                    </div>

                    <p className="relative z-10 text-gray-400 font-medium bg-white/80 dark:bg-black/60 px-4 py-2 rounded-full backdrop-blur-sm">
                        Interactive Map Placeholder
                    </p>
                </div>
            </div>

            {/* Sidebar Actions & Status */}
            <div className="flex flex-col gap-6">
                {/* Quick Actions */}
                <div className="glass-panel bg-white dark:bg-white/5 rounded-xl p-6 border border-gray-200 dark:border-white/5 shadow-sm">
                    <h3 className="text-lg font-bold mb-4 text-gray-800 dark:text-white">{t('quickActions')}</h3>
                    <div className="space-y-3">
                        <button onClick={() => handleAction('Optimize Routes')} className="w-full flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors group">
                            <div className="p-2 bg-white dark:bg-white/5 rounded-lg shadow-sm group-hover:scale-110 transition-transform">
                                <span className="material-symbols-outlined text-brand-primary">alt_route</span>
                            </div>
                            <span className="font-medium text-sm text-gray-700 dark:text-gray-200">{t('optimizeRoutes')}</span>
                        </button>
                        <button onClick={() => handleAction('Check Stock')} className="w-full flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors group">
                            <div className="p-2 bg-white dark:bg-white/5 rounded-lg shadow-sm group-hover:scale-110 transition-transform">
                                <span className="material-symbols-outlined text-blue-500">inventory_2</span>
                            </div>
                            <span className="font-medium text-sm text-gray-700 dark:text-gray-200">{t('checkWarehouse')}</span>
                        </button>
                        <button onClick={() => handleAction('Generate Report')} className="w-full flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors group">
                            <div className="p-2 bg-white dark:bg-white/5 rounded-lg shadow-sm group-hover:scale-110 transition-transform">
                                <span className="material-symbols-outlined text-gray-500">description</span>
                            </div>
                            <span className="font-medium text-sm text-gray-700 dark:text-gray-200">{t('generateReport')}</span>
                        </button>
                    </div>
                </div>

                {/* Warehouse Status */}
                <div className="glass-panel bg-white dark:bg-white/5 rounded-xl p-6 border border-gray-200 dark:border-white/5 shadow-sm flex-1">
                    <h3 className="text-lg font-bold mb-6 text-gray-800 dark:text-white">{t('warehouseStatus')}</h3>
                    <div className="space-y-6">
                        {[
                            { name: 'Warehouse A', fill: 85, color: 'bg-brand-primary' },
                            { name: 'Warehouse B', fill: 60, color: 'bg-blue-500' },
                            { name: 'Warehouse C', fill: 40, color: 'bg-green-500' }
                        ].map((wh, i) => (
                            <div key={i}>
                                <div className="flex justify-between items-center mb-2 text-sm">
                                    <span className="font-medium text-gray-700 dark:text-gray-300">{wh.name}</span>
                                    <span className="font-bold text-gray-800 dark:text-white">{wh.fill}% Full</span>
                                </div>
                                <div className="w-full bg-gray-100 dark:bg-white/10 rounded-full h-2.5">
                                    <div className={`${wh.color} h-2.5 rounded-full transition-all duration-1000`} style={{ width: `${wh.fill}%` }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Logistics;
