
import React, { useContext, useState } from 'react';
import Header from './Header';
import { Automation } from '../types';
import { LanguageContext } from '../App';

const Automations: React.FC = () => {
  const { t } = useContext(LanguageContext);
  const [filter, setFilter] = useState('all');

  const automations: Automation[] = [
    { id: '1', name: 'Onboard New Client', trigger: 'New form submission', lastRun: '2 hours ago', status: 'active' },
    { id: '2', name: 'Monthly Financial Report', trigger: 'Scheduled - 1st of month', lastRun: '1 day ago', status: 'active' },
    { id: '3', name: 'Follow-up on Open Tickets', trigger: 'Ticket status changed', lastRun: '4 hours ago', status: 'error' },
    { id: '4', name: 'Social Media Daily Post', trigger: 'Scheduled - Daily 9 AM', lastRun: '22 hours ago', status: 'paused' },
    { id: '5', name: 'Assign Lead to Sales Team', trigger: 'New lead in CRM', lastRun: '30 minutes ago', status: 'active' },
  ];

  const getStatusLabel = (status: string) => {
      if (status === 'active') return t('active');
      if (status === 'paused') return t('paused');
      if (status === 'error') return t('error');
      return status;
  };

  const handleAction = (action: string) => {
      alert(`${t('featureComingSoon')} (${action})`);
  }

  return (
    <div className="flex flex-col h-full">
      <Header title={t('automationsTitle')} />
      <div className="flex-1 p-8 pt-2 overflow-y-auto">
         <div className="flex justify-end mb-6">
             <button onClick={() => handleAction('New Automation')} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-primary text-white hover:opacity-90 transition-opacity font-medium text-sm shadow-lg shadow-brand-primary/30">
                 <span className="material-symbols-outlined text-xl">add_circle</span>
                 New Automation
             </button>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[
               { label: t('totalAutomations'), value: '12', icon: 'bolt', color: 'text-blue-400', bg: 'bg-blue-400/10' },
               { label: t('active'), value: '8', icon: 'check_circle', color: 'text-green-400', bg: 'bg-green-400/10' },
               { label: t('errors24h'), value: '2', icon: 'error', color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
            ].map((stat, i) => (
               <div key={i} className="glass-panel bg-white dark:bg-white/5 p-6 rounded-xl flex items-center gap-4 shadow-sm">
                  <div className={`p-3 rounded-lg ${stat.bg}`}>
                     <span className={`material-symbols-outlined text-3xl ${stat.color}`}>{stat.icon}</span>
                  </div>
                  <div>
                     <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
                     <p className="text-2xl font-bold dark:text-white">{stat.value}</p>
                  </div>
               </div>
            ))}
         </div>

         <div className="glass-panel bg-white dark:bg-white/5 rounded-xl overflow-hidden shadow-sm">
            <div className="p-6 border-b border-gray-200 dark:border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
               <h2 className="text-lg font-semibold dark:text-white">{t('workflowList')}</h2>
               <div className="flex items-center gap-4 w-full md:w-auto">
                  <div className="relative flex-1 md:flex-initial">
                     <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">search</span>
                     <input type="text" placeholder={t('searchWorkflow')} className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm w-full md:w-64 focus:outline-none focus:ring-1 focus:ring-brand-primary text-gray-800 dark:text-white" />
                  </div>
                  <div className="flex items-center gap-1 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 p-1 rounded-lg">
                     {['all', 'active', 'paused'].map(status => (
                         <button 
                            key={status}
                            onClick={() => setFilter(status)}
                            className={`text-xs px-3 py-1 rounded capitalize transition-all ${
                                filter === status 
                                ? 'bg-white dark:bg-white/10 shadow-sm font-medium text-brand-primary dark:text-white' 
                                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                            }`}
                         >
                             {status}
                         </button>
                     ))}
                  </div>
               </div>
            </div>
            <div className="overflow-x-auto">
               <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-gray-400">
                     <tr>
                        <th className="px-6 py-4 font-medium">{t('workflowName')}</th>
                        <th className="px-6 py-4 font-medium">{t('trigger')}</th>
                        <th className="px-6 py-4 font-medium">{t('lastRun')}</th>
                        <th className="px-6 py-4 font-medium">{t('status')}</th>
                        <th className="px-6 py-4 font-medium text-center">{t('actions')}</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-white/5">
                     {automations.map((auto) => (
                        <tr key={auto.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                           <td className="px-6 py-4 font-semibold text-gray-800 dark:text-white">{auto.name}</td>
                           <td className="px-6 py-4 text-gray-500 dark:text-gray-300">{auto.trigger}</td>
                           <td className="px-6 py-4 text-gray-500 dark:text-gray-300">{auto.lastRun}</td>
                           <td className="px-6 py-4">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                                 auto.status === 'active' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                                 auto.status === 'error' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                 'bg-gray-500/10 text-gray-500 border-gray-500/20'
                              }`}>
                                 <span className={`w-1.5 h-1.5 rounded-full ${
                                    auto.status === 'active' ? 'bg-green-500' :
                                    auto.status === 'error' ? 'bg-red-500' :
                                    'bg-gray-500'
                                 }`}></span>
                                 {getStatusLabel(auto.status)}
                              </span>
                           </td>
                           <td className="px-6 py-4">
                              <div className="flex justify-center gap-2">
                                 <button onClick={() => handleAction(`Edit ${auto.name}`)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 hover:text-brand-primary transition-colors"><span className="material-symbols-outlined text-lg">edit</span></button>
                                 <button onClick={() => handleAction(`Monitor ${auto.name}`)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 hover:text-brand-primary transition-colors"><span className="material-symbols-outlined text-lg">monitoring</span></button>
                              </div>
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
         </div>
      </div>
    </div>
  );
};

export default Automations;
