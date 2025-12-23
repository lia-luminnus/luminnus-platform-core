
import React, { useContext } from 'react';
import Header from './Header';
import { LanguageContext } from '../App';

const Plan: React.FC = () => {
  const { t } = useContext(LanguageContext);

  const handleAction = (action: string) => {
      alert(`${t('featureComingSoon')} (${action})`);
  }

  return (
    <div className="flex flex-col h-full">
      <Header title={t('planTitle')} />
      <div className="flex-1 p-8 pt-2 overflow-y-auto max-w-5xl mx-auto w-full space-y-8">
         
         {/* Current Plan */}
         <div className="glass-panel bg-white dark:bg-white/5 rounded-xl p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
               <div>
                  <h2 className="text-xl font-bold">{t('essentialPlan')}</h2>
                  <div className="flex flex-wrap items-center gap-4 mt-2">
                     <span className="px-3 py-1 rounded-full bg-green-500/10 text-green-500 text-xs font-bold border border-green-500/20">ACTIVE</span>
                     <span className="text-sm text-gray-500">{t('nextBilling')} July 15, 2024</span>
                     <span className="text-sm font-medium">R$99/mo</span>
                  </div>
               </div>
               <div className="flex gap-4">
                  <button onClick={() => handleAction(t('manageSubscription'))} className="px-6 py-2 rounded-lg bg-brand-primary text-white font-bold text-sm hover:opacity-90 transition-opacity">{t('manageSubscription')}</button>
                  <button onClick={() => handleAction(t('cancelPlan'))} className="px-6 py-2 rounded-lg border border-gray-300 dark:border-white/20 text-sm font-bold hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">{t('cancelPlan')}</button>
               </div>
            </div>
         </div>

         {/* Upgrade Options */}
         <div>
            <h2 className="text-2xl font-bold mb-6">{t('upgradePlan')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {/* Pro */}
               <div className="glass-panel bg-white dark:bg-white/5 rounded-xl p-8 flex flex-col border border-brand-primary/30 relative overflow-hidden">
                  <div className="absolute top-0 right-0 bg-brand-primary text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl">{t('recommended')}</div>
                  <h3 className="text-xl font-bold">Pro Plan</h3>
                  <p className="text-4xl font-black my-4">R$199<span className="text-base font-normal text-gray-500">/mo</span></p>
                  <ul className="space-y-3 mb-8 flex-1">
                     {['Everything in Essential', 'Advanced Analytics', 'Priority Email Support', 'Up to 10 Team Members'].map((feat, i) => (
                        <li key={i} className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                           <span className="material-symbols-outlined text-green-400 text-lg">check_circle</span>
                           {feat}
                        </li>
                     ))}
                  </ul>
                  <button onClick={() => handleAction(t('choosePro'))} className="w-full py-3 rounded-lg bg-gradient-to-r from-cyan-400 to-blue-500 text-white font-bold hover:shadow-lg transition-all">{t('choosePro')}</button>
               </div>

               {/* Enterprise */}
               <div className="glass-panel bg-white dark:bg-white/5 rounded-xl p-8 flex flex-col border border-transparent hover:border-gray-300 dark:hover:border-white/10 transition-colors">
                  <h3 className="text-xl font-bold">{t('enterprise')}</h3>
                  <p className="text-4xl font-black my-4">{t('custom')}</p>
                  <ul className="space-y-3 mb-8 flex-1">
                     {['Everything in Pro', 'Dedicated Account Manager', 'Custom SLA & 24/7 Support', 'Unlimited Team Members'].map((feat, i) => (
                        <li key={i} className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                           <span className="material-symbols-outlined text-brand-primary text-lg">rocket_launch</span>
                           {feat}
                        </li>
                     ))}
                  </ul>
                  <button onClick={() => handleAction(t('contactSales'))} className="w-full py-3 rounded-lg border border-gray-300 dark:border-white/20 font-bold hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">{t('contactSales')}</button>
               </div>
            </div>
         </div>

         {/* History */}
         <div>
            <h2 className="text-2xl font-bold mb-6">{t('paymentHistory')}</h2>
            <div className="glass-panel bg-white dark:bg-white/5 rounded-xl overflow-hidden">
               <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-gray-400">
                     <tr>
                        <th className="p-4 font-semibold">{t('date')}</th>
                        <th className="p-4 font-semibold">{t('description')}</th>
                        <th className="p-4 font-semibold">{t('amount')}</th>
                        <th className="p-4 font-semibold">{t('status')}</th>
                        <th className="p-4 font-semibold">{t('invoice')}</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-white/5">
                     {[
                        { date: 'Jun 15, 2024', desc: 'Essential Plan Subscription', amt: 'R$99.00', status: 'Paid' },
                        { date: 'May 15, 2024', desc: 'Essential Plan Subscription', amt: 'R$99.00', status: 'Paid' },
                        { date: 'Apr 15, 2024', desc: 'Essential Plan Subscription', amt: 'R$99.00', status: 'Paid' },
                     ].map((row, i) => (
                        <tr key={i} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                           <td className="p-4">{row.date}</td>
                           <td className="p-4">{row.desc}</td>
                           <td className="p-4">{row.amt}</td>
                           <td className="p-4"><span className="text-green-500 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> {row.status}</span></td>
                           <td className="p-4"><button onClick={() => handleAction('Download Invoice')} className="text-brand-primary hover:underline flex items-center gap-1"><span className="material-symbols-outlined text-base">download</span> PDF</button></td>
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

export default Plan;
