import { Bot, Check, Loader2, Zap } from "lucide-react";
import React, { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ThemeContext } from '../App';
import { useDashboardAuth } from '../contexts/DashboardAuthContext';
import { LanguageContext } from '../contexts/LanguageContext';
import { usePlans, Plan as PlanType } from '../hooks/usePlans';
import { useSubscription } from '../hooks/useSubscription';
import { useCredits } from '../hooks/useCredits';
import { supabase } from '../lib/supabase';
import Header from './Header';
import { toast } from 'react-hot-toast';
import RechargeSelector from './RechargeSelector';
import { CreditPackage } from '../services/creditService';

const Plan: React.FC = () => {
   const { t } = useContext(LanguageContext);
   const { plans, loading: loadingPlans } = usePlans();
   const { user, profile, plan: authPlan, setPlanName } = useDashboardAuth();
   const { subscription, invoices, loading: loadingSub } = useSubscription();
   const [isAnnual, setIsAnnual] = useState(true);
   const [isRechargeModalOpen, setIsRechargeModalOpen] = useState(false);
   const navigate = useNavigate();

   // Credits system
   const tenantId = profile?.tenant_id || user?.id || null;
   const { balance, percentual, isLow, isCritical, isExceeded, loading: loadingCredits } = useCredits({ tenantId });

   // Usar plan_name do subscription (Supabase) como fonte primária, com fallback para authPlan
   const currentPlanName = subscription?.plan_name || authPlan?.name || 'Start';

   const PLAN_ORDER: Record<string, number> = { 'Start': 1, 'Plus': 2, 'Pro': 3 };
   const currentTier = PLAN_ORDER[currentPlanName] || 1;

   // 🔐 ADMIN PRIVILEGE: Se for admin, mostrar todos os planos e permitir troca livre
   const isAdmin = user?.email === "luminnus.lia.ai@gmail.com";
   const filteredPlans = isAdmin ? plans : plans.filter(p => (PLAN_ORDER[p.name] || 0) >= currentTier);


   const DASHBOARD_STRIPE_PRICES: Record<string, { monthly: string; annual_12x: string }> = {
      Start: { monthly: 'price_1T6xy5Ry1wqZ6TIAqMWlPsRx', annual_12x: 'price_1T7bcnRy1wqZ6TIAuBJmw6zK' },
      Plus: { monthly: 'price_1T6xy6Ry1wqZ6TIA2aRMn5IP', annual_12x: 'price_1T7bm5Ry1wqZ6TIAW7gckvlV' },
      Pro: { monthly: 'price_1T6xy8Ry1wqZ6TIA3yWCsIDB', annual_12x: 'price_1T7bsMRy1wqZ6TIA1OzNWIGL' },
   };

   const handleManage = async () => {
      try {
         toast.loading('Abrindo portal de gerenciamento...', { id: 'portal' });
         const { data, error } = await supabase.functions.invoke('create-portal-session');

         if (error) throw error;

         if (data?.url) {
            window.location.href = data.url;
         } else {
            throw new Error('URL não retornada');
         }
      } catch (err: any) {
         console.error('[Plan] Erro ao abrir portal:', err);
         toast.error('Erro ao abrir gerenciamento: ' + (err.message || 'Desconhecido'), { id: 'portal' });
      }
   };

   const handleCancel = () => {
      if (subscription?.payment_type === 'annual_12x') {
         toast((t) => (
            <div className="flex flex-col gap-2">
               <span className="font-bold border-b border-white/10 pb-1 mb-1">Aviso de Fidelidade</span>
               <p className="text-xs text-white/80">Seu plano possui contrato de 12 meses. Você pode acessar o portal para atualizar seu cartão e ver faturas, mas o cancelamento deve ser solicitado via suporte.</p>
               <div className="flex gap-2 mt-2 flex-wrap">
                  <button onClick={() => { toast.dismiss(t.id); handleManage(); }} className="bg-brand-primary text-white text-[10px] font-black px-4 py-2 rounded-lg hover:scale-105 transition-all shadow-lg shadow-brand-primary/20">Acessar Portal (Faturas/Cartão)</button>
                  <button onClick={() => { toast.dismiss(t.id); navigate('/support'); }} className="bg-white/10 text-white/80 text-[10px] font-black px-4 py-2 rounded-lg hover:bg-white/20 transition-all">Falar com Suporte</button>
               </div>
            </div>
         ), { duration: 10000, icon: '🛡️', style: { background: '#1A1A24', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' } });
      } else {
         handleManage();
      }
   };

   const handleSubscribe = async (plan: PlanType) => {
      if (plan.customCTA) {
         window.open(plan.customCTA.action, '_blank');
         return;
      }

      if (!user?.id) {
         toast.error('Usuário não autenticado. Faça login novamente.');
         return;
      }

      const paymentType = isAnnual ? 'annual_12x' : 'monthly';
      const priceId = DASHBOARD_STRIPE_PRICES[plan.name]?.[paymentType];

      if (!priceId) {
         toast.error('Preço não configurado para este plano.');
         return;
      }

      try {
         toast.loading(`Iniciando checkout ${plan.name}...`, { id: 'checkout-plan' });

         const { data, error } = await supabase.functions.invoke('create-checkout-session', {
            body: {
               priceId,
               userId: user.id,
               tenantId: profile?.tenant_id || user.id,
               userEmail: user.email,
               planName: plan.name,
               billingType: paymentType,
               successUrl: `${window.location.origin}/#/plan?checkout=success`,
               cancelUrl: `${window.location.origin}/#/plan?checkout=canceled`,
            },
         });

         if (error) throw error;

         if (data?.url) {
            window.location.href = data.url;
         } else {
            throw new Error('URL de checkout não retornada.');
         }
      } catch (err: any) {
         console.error('[Plan] Erro no upgrade de plano:', err);
         toast.error('Erro ao iniciar upgrade: ' + (err.message || 'Desconhecido'), { id: 'checkout-plan' });
      }
   };

   const handlePkgSelect = async (pkg: CreditPackage) => {
      if (!supabase) {
         toast.error('Supabase não configurado corretamente.');
         return;
      }

      try {
         toast.loading(`Iniciando checkout para ${pkg.nome}...`, { id: 'checkout' });

         const { data, error } = await supabase.functions.invoke('create-checkout-session', {
            body: {
               priceId: pkg.stripe_price_id,
               userId: user?.id,
               tenantId: user?.id, // Assumindo que o userId é o tenantId no dashboard-client
               userEmail: user?.email,
               mode: 'payment',
               credits: pkg.creditos,
               successUrl: `${window.location.origin}/#/financial?checkout=success`,
               cancelUrl: `${window.location.origin}/#/financial?checkout=canceled`,
            },
         });

         if (error) throw error;

         if (data?.url) {
            window.location.href = data.url;
         } else {
            throw new Error('URL de checkout não retornada.');
         }
      } catch (err: any) {
         console.error('[Plan] Erro no checkout:', err);
         toast.error('Erro ao processar pagamento: ' + (err.message || 'Desconhecido'), { id: 'checkout' });
      }
   };

   if (loadingPlans || loadingSub) {
      return (
         <div className="flex flex-col h-full bg-[#0B0B0F]">
            <Header title={t('planTitle')} />
            <div className="flex-1 flex items-center justify-center">
               <Loader2 className="w-12 h-12 text-brand-primary animate-spin" />
            </div>
         </div>
      );
   }

   return (
      <div className="flex flex-col h-full bg-[#0B0B0F] relative overflow-hidden">
         {/* Background Glows (Matching Website) */}
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#FF2E9E]/5 rounded-full blur-[120px] -z-0 pointer-events-none" />

         <Header title={t('planTitle')} />

         <div className="flex-1 p-6 pt-2 overflow-y-auto max-w-7xl mx-auto w-full space-y-10 relative z-10 custom-scrollbar">

            {/* Billing Toggle (Identical to Website) */}
            <div className="flex items-center justify-center gap-4 mt-8">
               <span className={`text-base font-bold transition-all ${!isAnnual ? 'text-white' : 'text-white/40'}`}>Mensal</span>
               <button
                  onClick={() => setIsAnnual(!isAnnual)}
                  className={`relative w-14 h-7 rounded-full transition-all duration-300 ${isAnnual ? 'bg-gradient-to-r from-[#7C3AED] to-[#FF2E9E]' : 'bg-white/10 group hover:bg-white/20'}`}
               >
                  <div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-lg transition-transform duration-300 ${isAnnual ? 'translate-x-7' : 'translate-x-0'}`} />
               </button>
               <span className={`text-base font-bold transition-all ${isAnnual ? 'text-white' : 'text-white/40'}`}>
                  Anual
                  <span className="ml-2 px-2 py-0.5 text-[10px] bg-gradient-to-r from-[#7C3AED] to-[#FF2E9E] rounded-full text-white font-black uppercase">Economize 20%</span>
               </span>
            </div>

            {/* Current Subscription Status - Compact Version */}
            <div className="bg-gradient-to-br from-white/5 to-transparent border border-white/10 rounded-3xl p-6 backdrop-blur-xl relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/10 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-brand-primary/15 transition-all duration-700" />
               <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
                  <div className="space-y-1.5">
                     <p className="text-[9px] font-black uppercase tracking-[0.2em] text-brand-primary/60">Assinatura Atual</p>
                     <div className="flex items-center gap-3">
                        <h2 className="text-2xl font-black text-white tracking-tight leading-none">
                           {currentPlanName}
                        </h2>
                        <span className={`px-2.5 py-0.5 rounded-full text-[8px] font-black border tracking-widest uppercase ${subscription?.status === 'active'
                           ? 'bg-green-500/10 text-green-500 border-green-500/20'
                           : 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                           }`}>
                           {subscription?.status === 'active' ? 'Ativa' : 'Pendente'}
                        </span>
                     </div>
                     <p className="text-[10px] font-bold text-white/40">
                        Olá, <span className="text-brand-primary">{profile?.full_name || user?.email?.split('@')[0] || 'Usuário'}</span>
                     </p>
                     {subscription?.current_period_end && (
                        <p className="text-[10px] font-bold text-white/30 flex items-center gap-1.5">
                           {subscription.cancel_at_period_end ? 'Expira em ' : 'Renovação em '}
                           <span className="text-white/60">{new Date(subscription.current_period_end).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                        </p>
                     )}
                  </div>
                  <button
                     onClick={handleCancel}
                     className="px-6 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/10 font-bold text-[10px] transition-all active:scale-95 uppercase tracking-wider"
                  >
                     Gerenciar Plano
                  </button>
               </div>
            </div>

            {/* Credit Balance Widget */}
            {balance && (
               <div className="bg-gradient-to-br from-white/5 to-transparent border border-white/10 rounded-3xl p-6 backdrop-blur-xl relative overflow-hidden">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                     <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isExceeded ? 'bg-red-500/20' : isCritical ? 'bg-orange-500/20' : isLow ? 'bg-yellow-500/20' : 'bg-brand-primary/20'
                           }`}>
                           <Zap className={`w-5 h-5 ${isExceeded ? 'text-red-400' : isCritical ? 'text-orange-400' : isLow ? 'text-yellow-400' : 'text-brand-primary'
                              }`} />
                        </div>
                        <div>
                           <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40">Créditos LIA</p>
                           <p className="text-lg font-black text-white">
                              {balance.creditos_restantes.toLocaleString('pt-BR')} <span className="text-sm font-bold text-white/40">/ {balance.creditos_totais.toLocaleString('pt-BR')}</span>
                           </p>
                        </div>
                     </div>
                     <div className="flex items-center gap-3">
                        <div className="text-right">
                           <p className="text-[10px] font-bold text-white/40">Plano: {balance.creditos_plano.toLocaleString('pt-BR')}</p>
                           {balance.creditos_bonus > 0 && (
                              <p className="text-[10px] font-bold text-green-400">+{balance.creditos_bonus.toLocaleString('pt-BR')} bónus</p>
                           )}
                        </div>
                        <button
                           onClick={() => setIsRechargeModalOpen(true)}
                           className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#FF2E9E] text-white font-black text-[10px] uppercase tracking-wider hover:shadow-lg hover:shadow-brand-primary/20 transition-all active:scale-95"
                        >
                           + Recarregar
                        </button>
                     </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-3 rounded-full bg-white/10 overflow-hidden">
                     <div
                        className={`h-full rounded-full transition-all duration-1000 ${isExceeded ? 'bg-gradient-to-r from-red-500 to-red-400 animate-pulse' :
                           isCritical ? 'bg-gradient-to-r from-orange-500 to-red-500' :
                              isLow ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                                 'bg-gradient-to-r from-[#22D3EE] to-[#7C3AED]'
                           }`}
                        style={{ width: `${Math.min(percentual, 100)}%` }}
                     />
                  </div>
                  <div className="flex justify-between mt-2">
                     <span className="text-[10px] font-bold text-white/30">{balance.creditos_usados.toLocaleString('pt-BR')} usados</span>
                     <span className={`text-[10px] font-black ${isExceeded ? 'text-red-400' : isCritical ? 'text-orange-400' : isLow ? 'text-yellow-400' : 'text-white/40'
                        }`}>{percentual.toFixed(1)}% utilizado</span>
                  </div>

                  {/* Alert Messages */}
                  {isExceeded && (
                     <div className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                        <p className="text-xs text-red-400 font-bold">⚠️ Créditos excedidos! Recarregue para continuar usando a LIA sem interrupções.</p>
                     </div>
                  )}
                  {isCritical && !isExceeded && (
                     <div className="mt-3 p-3 rounded-xl bg-orange-500/10 border border-orange-500/20">
                        <p className="text-xs text-orange-400 font-bold">🔋 Créditos críticos! Considere recarregar ou fazer upgrade do plano.</p>
                     </div>
                  )}
               </div>
            )}

            {/* Upgrade Options Header */}
            <div className="text-center space-y-2">
               <h2 className="text-4xl font-black text-white tracking-tighter">Escolha seu novo nível</h2>
               <p className="text-white/40 font-medium">Desbloqueie o poder total da LIA e escale seu negócio.</p>
            </div>

            {/* Plan Cards Grid - Matching Website Design */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-20">
               {filteredPlans.map((p, idx) => {
                  const isCurrent = currentPlanName === p.name;
                  const displayPriceValue = isAnnual ? p.annualPrice : p.price;

                  return (
                     <div
                        key={p.name}
                        className={`relative p-8 rounded-[32px] border transition-all duration-500 hover:scale-[1.02] flex flex-col group ${p.popular
                           ? "bg-gradient-to-br from-[#7C3AED]/15 to-[#FF2E9E]/15 border-brand-primary shadow-[0_30px_60px_-15px_rgba(124,58,237,0.3)]"
                           : "bg-white/5 border-white/10 hover:border-white/20"
                           } ${isCurrent ? 'opacity-60 ring-2 ring-brand-primary/50' : ''}`}
                     >
                        {p.popular && (
                           <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                              <div className="px-6 py-2 rounded-full bg-gradient-to-r from-[#7C3AED] to-[#FF2E9E] shadow-xl ring-4 ring-dark-bg">
                                 <p className="text-[10px] font-black text-white uppercase tracking-widest whitespace-nowrap">Mais Popular</p>
                              </div>
                           </div>
                        )}

                        <div className="mb-8">
                           <h3 className="text-2xl font-black text-white mb-2 tracking-tight">{p.name}</h3>
                           <p className="text-xs text-white/40 leading-relaxed min-h-[40px]">{p.description}</p>
                        </div>

                        <div className="mb-8">
                           <div className="flex items-baseline gap-2">
                              <span
                                 className="text-5xl font-black tracking-tighter bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent group-hover:from-white group-hover:to-white transition-all duration-500"
                                 style={{
                                    backgroundImage: `linear-gradient(to right, ${p.name === 'Pro' ? '#FF2E9E, #F97316' : p.popular ? '#7C3AED, #FF2E9E' : 'white, #ffffff60'})`,
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent'
                                 }}
                              >
                                 {displayPriceValue}
                              </span>
                              <span className="text-sm font-bold text-white/30 uppercase tracking-widest">/mês</span>
                              {isAnnual && (
                                 <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-gradient-to-r from-[#7C3AED]/20 to-[#FF2E9E]/20 text-[#FF2E9E]">
                                    -{p.discount}%
                                 </span>
                              )}
                           </div>
                           {isAnnual && (
                              <div className="mt-2 space-y-0.5">
                                 <p className="text-[10px] font-bold text-white/40">Plano anual em 12x (fidelidade 12 meses)</p>
                                 {'annualSavings' in p && (
                                    <p className="text-[10px] font-black text-green-400 uppercase tracking-widest">
                                       Economize {(p as any).annualSavings}/ano
                                    </p>
                                 )}
                              </div>
                           )}
                        </div>

                        <ul className="space-y-4 mb-10 flex-1">
                           {p.features.map((feature, i) => (
                              <li key={i} className="flex items-start gap-3">
                                 <div className="flex-shrink-0 w-5 h-5 rounded-full bg-brand-primary/20 flex items-center justify-center mt-0.5">
                                    <Check className="w-3 h-3 text-brand-primary" />
                                 </div>
                                 <span className="text-xs font-bold text-white/60 leading-tight group-hover:text-white/80 transition-colors">{feature}</span>
                              </li>
                           ))}
                        </ul>

                        {/* Lia Quote Section (Icon + Quote) */}
                        <div className="p-5 rounded-2xl bg-white/5 border border-white/5 mb-8 relative group/quote">
                           <div className="flex items-center gap-2 mb-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#FF2E9E] flex items-center justify-center shadow-lg">
                                 <Bot className="w-4 h-4 text-white" />
                              </div>
                              <span className="text-[10px] font-black uppercase tracking-widest text-[#7C3AED]">Lia diz:</span>
                           </div>
                           <p className="text-xs text-white/70 italic leading-relaxed font-medium">"{p.liaQuote || 'Este plano é excelente para seu crescimento!'}"</p>
                        </div>

                        {isCurrent && !isAdmin ? (
                           <button disabled className="w-full py-5 rounded-2xl bg-white/5 border border-white/10 text-white/30 font-black text-[10px] uppercase tracking-widest cursor-default">
                              Plano Atual
                           </button>
                        ) : (
                           <button
                              onClick={() => {
                                 if (isAdmin) {
                                    setPlanName(p.name as any);
                                    toast.success(`Admin: Visualização alterada para ${p.name}`);
                                 } else {
                                    handleSubscribe(p);
                                 }
                              }}
                              className={`w-full py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.15em] transition-all active:scale-[0.98] shadow-2xl ${p.popular
                                 ? 'bg-gradient-to-r from-[#7C3AED] to-[#FF2E9E] text-white shadow-brand-primary/20 hover:shadow-brand-primary/40'
                                 : 'bg-white text-black hover:bg-gray-200 shadow-white/5'
                                 } ${isCurrent && isAdmin ? 'ring-2 ring-white/20' : ''}`}
                           >
                              {isAdmin && isCurrent ? 'Plano Ativo (Admin)' : p.customCTA?.text || `Assinar ${p.name}`}
                           </button>
                        )}
                     </div>
                  );
               })}
            </div>

            {/* History Table - Refined Style */}
            <div className="space-y-6 pt-10 pb-20">
               <h2 className="text-2xl font-black text-white tracking-tight">Histórico de Pagamentos</h2>
               <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden backdrop-blur-md">
                  <table className="w-full text-left text-[11px]">
                     <thead className="bg-white/5 border-b border-white/10">
                        <tr>
                           <th className="p-6 font-black uppercase tracking-widest text-white/40">Data</th>
                           <th className="p-6 font-black uppercase tracking-widest text-white/40">Descrição</th>
                           <th className="p-6 font-black uppercase tracking-widest text-white/40">Valor</th>
                           <th className="p-6 font-black uppercase tracking-widest text-white/40">Status</th>
                           <th className="p-6 font-black uppercase tracking-widest text-white/40 text-right">Fatura</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-white/5">
                        {invoices.length > 0 ? invoices.map((row) => (
                           <tr key={row.id} className="hover:bg-white/5 transition-colors group">
                              <td className="p-6 font-bold text-white/60 group-hover:text-white">{new Date(row.created_at).toLocaleDateString('pt-BR')}</td>
                              <td className="p-6 font-black text-white">{row.description || 'Assinatura LUMINNUS'}</td>
                              <td className="p-6 font-black text-white/60">{row.amount_paid.toLocaleString('pt-BR', { style: 'currency', currency: (row.currency || 'EUR').toUpperCase() })}</td>
                              <td className="p-6">
                                 <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full font-black uppercase tracking-tighter text-[9px] ${row.status === 'paid' ? 'bg-green-500/10 text-green-500' : 'bg-orange-500/10 text-orange-400'
                                    }`}>
                                    <span className={`w-1 h-1 rounded-full ${row.status === 'paid' ? 'bg-green-500' : 'bg-orange-500'}`} />
                                    {row.status === 'paid' ? 'Pago' : 'Pendente'}
                                 </span>
                              </td>
                              <td className="p-6 text-right">
                                 {row.invoice_pdf ? (
                                    <a href={row.invoice_pdf} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-brand-primary font-black uppercase tracking-widest hover:text-white transition-colors">
                                       <span className="material-symbols-outlined text-sm">download</span> PDF
                                    </a>
                                 ) : <span className="text-white/20">-</span>}
                              </td>
                           </tr>
                        )) : (
                           <tr>
                              <td colSpan={5} className="p-20 text-center text-white/30 font-bold italic">Nenhuma fatura encontrada.</td>
                           </tr>
                        )}
                     </tbody>
                  </table>
               </div>
            </div>

         </div>

         <RechargeSelector
            isOpen={isRechargeModalOpen}
            onClose={() => setIsRechargeModalOpen(false)}
            onSelect={handlePkgSelect}
            currentPlan={currentPlanName}
         />
      </div>
   );
};

export default Plan;


