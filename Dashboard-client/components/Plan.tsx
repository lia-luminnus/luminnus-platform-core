import React, { useContext, useState } from 'react';
import Header from './Header';
import { LanguageContext } from '../contexts/LanguageContext';
import { usePlans, Plan as PlanType } from '../hooks/usePlans';
import { useDashboardAuth } from '../contexts/DashboardAuthContext';
import { Loader2, Check, Rocket } from 'lucide-react';

const Plan: React.FC = () => {
   const { t } = useContext(LanguageContext);
   const { plans, loading } = usePlans();
   const { plan: currentPlan } = useDashboardAuth();
   const [isAnnual, setIsAnnual] = useState(true);

   const handleAction = (action: string) => {
      alert(`${t('featureComingSoon')} (${action})`);
   };

   if (loading) {
      return (
         <div className="flex flex-col h-full">
            <Header title={t('planTitle')} />
            <div className="flex-1 flex items-center justify-center">
               <Loader2 className="w-12 h-12 text-brand-primary animate-spin" />
            </div>
         </div>
      );
   }

   return (
      <div className="flex flex-col h-full bg-[#0B0B0F]">
         <Header title={t('planTitle')} />
         <div className="flex-1 p-6 pt-2 overflow-y-auto max-w-7xl mx-auto w-full space-y-8">

            {/* Billing Toggle (Matches Web App) */}
            <div className="flex items-center justify-center gap-4 mt-8">
               <span className={`text-sm font-semibold transition-all ${!isAnnual ? 'text-white' : 'text-white/50'}`}>
                  Mensal
               </span>
               <button
                  onClick={() => setIsAnnual(!isAnnual)}
                  className={`relative w-12 h-6 rounded-full transition-all duration-300 ${isAnnual ? 'bg-gradient-to-r from-[#7C3AED] to-[#FF2E9E]' : 'bg-white/20'}`}
               >
                  <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-300 ${isAnnual ? 'translate-x-6' : 'translate-x-0'}`} />
               </button>
               <span className={`text-sm font-semibold transition-all ${isAnnual ? 'text-white' : 'text-white/50'}`}>
                  Anual
                  <span className="ml-2 px-2 py-0.5 text-[10px] bg-green-500/20 text-green-400 rounded-full border border-green-500/30">
                     Economize
                  </span>
               </span>
            </div>

            {/* Current Subscription Status */}
            <div className="glass-panel bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/10 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-brand-primary/20 transition-all" />
               <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
                  <div className="space-y-2">
                     <p className="text-sm font-medium text-gray-400">Assinatura Atual</p>
                     <h2 className="text-3xl font-black bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                        {currentPlan?.name || 'Start'}
                     </h2>
                     <div className="flex flex-wrap items-center gap-4 mt-3">
                        <span className="px-3 py-1 rounded-full bg-green-500/10 text-green-500 text-[10px] font-black border border-green-500/20 tracking-widest">ATIVA</span>
                        <span className="text-xs text-gray-500">Renovação em 15 de Julho, 2024</span>
                     </div>
                  </div>
                  <div className="flex gap-3">
                     <button
                        onClick={() => handleAction(t('manageSubscription'))}
                        className="px-6 py-2.5 rounded-xl bg-white text-black font-black text-xs hover:bg-gray-200 transition-all active:scale-95"
                     >
                        GERENCIAR
                     </button>
                     <button
                        onClick={() => handleAction(t('cancelPlan'))}
                        className="px-6 py-2.5 rounded-xl border border-white/10 text-white/70 font-black text-xs hover:bg-white/5 transition-all active:scale-95"
                     >
                        CANCELAR
                     </button>
                  </div>
               </div>
            </div>

            {/* Upgrade Options */}
            <div className="space-y-8">
               <div className="text-center">
                  <h2 className="text-3xl font-black mb-2">Upgrade seu nível</h2>
                  <p className="text-gray-500">Mude seu plano para desbloquear novos recursos e inteligência</p>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {plans.map((p, idx) => {
                     // Lógica de cálculo de preços robusta
                     const parsePrice = (str: string) => {
                        const clean = str.replace(/[^0-9.,]/g, '');
                        if (clean.includes(',') && clean.includes('.')) {
                           return parseFloat(clean.replace(/\./g, '').replace(',', '.')) || 0;
                        }
                        if (clean.includes(',')) return parseFloat(clean.replace(',', '.')) || 0;
                        return parseFloat(clean) || 0;
                     };

                     const numericPrice = parsePrice(p.price);
                     const annualTotal = !isNaN(numericPrice) ? (numericPrice * 12) * (1 - (p.discount / 100)) : 0;
                     const annualMonthlyPrice = annualTotal / 12;
                     const displayPrice = isAnnual ? `€${Math.round(annualMonthlyPrice)}` : p.price;
                     const isCurrent = currentPlan?.name === p.name;

                     return (
                        <div
                           key={idx}
                           className={`glass-panel border-2 rounded-3xl p-6 flex flex-col transition-all duration-500 relative overflow-hidden group hover:scale-[1.01] ${p.popular ? 'border-brand-primary/50 shadow-[0_0_40px_rgba(124,58,237,0.15)]' : 'border-white/5 hover:border-white/20'
                              } ${isCurrent ? 'opacity-80' : ''}`}
                        >
                           {p.popular && (
                              <div className="absolute top-0 right-0 bg-brand-primary text-white text-[10px] font-black px-4 py-1.5 rounded-bl-2xl tracking-tighter">
                                 MAIS POPULAR
                              </div>
                           )}

                           <h3 className="text-xl font-black tracking-tight mb-1">{p.name}</h3>
                           <p className="text-xs text-gray-500 mb-6">{p.description}</p>

                           <div className="flex items-baseline gap-1 mb-6">
                              <span className="text-5xl font-black tracking-tighter">{displayPrice}</span>
                              <span className="text-sm text-gray-500">{isAnnual ? '/mês' : '/mês'}</span>
                           </div>

                           <ul className="space-y-4 mb-10 flex-1">
                              {p.features.slice(0, 8).map((feat, i) => (
                                 <li key={i} className="flex items-start gap-3 text-xs text-gray-400 group-hover:text-gray-200 transition-colors">
                                    <Check className="w-4 h-4 text-brand-primary flex-shrink-0" />
                                    {feat}
                                 </li>
                              ))}
                           </ul>

                           {isCurrent ? (
                              <button disabled className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-white/40 font-black text-xs cursor-default">
                                 PLANO ATUAL
                              </button>
                           ) : (
                              <button
                                 onClick={() => handleSubscribe(p)}
                                 className={`w-full py-4 rounded-2xl font-black text-xs transition-all active:scale-95 ${p.popular
                                    ? 'bg-gradient-to-r from-[#7C3AED] to-[#FF2E9E] text-white shadow-lg hover:shadow-brand-primary/30'
                                    : 'bg-white text-black hover:bg-gray-200'
                                    }`}
                              >
                                 {p.customCTA?.text || `ESCOLHER ${p.name.toUpperCase()}`}
                              </button>
                           )}
                        </div>
                     );
                  })}
               </div>
            </div>

            {/* History (Static but visually updated) */}
            <div className="space-y-6 pt-8">
               <h2 className="text-xl font-black">{t('paymentHistory')}</h2>
               <div className="glass-panel bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                     <thead className="bg-white/5 text-gray-500 border-b border-white/10">
                        <tr>
                           <th className="p-5 font-black uppercase tracking-wider">{t('date')}</th>
                           <th className="p-5 font-black uppercase tracking-wider">{t('description')}</th>
                           <th className="p-5 font-black uppercase tracking-wider">{t('amount')}</th>
                           <th className="p-5 font-black uppercase tracking-wider">{t('status')}</th>
                           <th className="p-5 font-black uppercase tracking-wider text-right">{t('invoice')}</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-white/5">
                        {[
                           { date: 'Jun 15, 2024', desc: 'Assinatura Plano Essencial', amt: '€27', status: 'Pago' },
                           { date: 'Mai 15, 2024', desc: 'Assinatura Plano Essencial', amt: '€27', status: 'Pago' },
                           { date: 'Abr 15, 2024', desc: 'Assinatura Plano Essencial', amt: '€27', status: 'Pago' },
                        ].map((row, i) => (
                           <tr key={i} className="hover:bg-white/5 transition-colors group">
                              <td className="p-5 text-gray-400 group-hover:text-white transition-colors">{row.date}</td>
                              <td className="p-5 font-bold">{row.desc}</td>
                              <td className="p-5">{row.amt}</td>
                              <td className="p-5">
                                 <span className="flex items-center gap-2 text-green-500 font-bold">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                    {row.status}
                                 </span>
                              </td>
                              <td className="p-5 text-right">
                                 <button onClick={() => handleAction('Download')} className="text-brand-primary font-black hover:underline inline-flex items-center gap-1">
                                    <span className="material-symbols-outlined text-sm">download</span> PDF
                                 </button>
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

   function handleSubscribe(plan: PlanType) {
      if (plan.customCTA) {
         window.open(plan.customCTA.action, '_blank');
      } else {
         handleAction(`Assinar ${plan.name}`);
      }
   }
};

export default Plan;
