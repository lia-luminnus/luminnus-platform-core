// Functional Plans page with Stripe integration
import { useState } from "react";
import { Check, Bot, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePlans } from "@/hooks/usePlans";
import { PaymentOptionsDialog } from "@/components/PaymentOptionsDialog";
import { STRIPE_PRICES, type PlanName, type PaymentType } from "@/lib/stripe";
import { supabase } from "@/integrations/supabase/client";
import UnifiedHeader from "@/components/UnifiedHeader";
import Footer from "@/components/Footer";

const Plans = ({ isEmbedded = false }: { isEmbedded?: boolean }) => {
  const { plans, loading } = usePlans();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isAnnual, setIsAnnual] = useState(true);
  const [paymentDialogPlan, setPaymentDialogPlan] = useState<string | null>(null);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);

  // Create Stripe Checkout session
  const createCheckoutSession = async (planName: string, paymentType: PaymentType) => {
    setIsCheckoutLoading(true);

    try {
      // Get price ID based on plan and payment type
      const planPrices = STRIPE_PRICES[planName as PlanName];
      if (!planPrices) {
        console.error('Unknown plan:', planName);
        return;
      }

      const priceId = planPrices[paymentType];
      if (!priceId) {
        console.error('Price not available for:', planName, paymentType);
        alert('Este plano ainda não está disponível para contratação online. Entre em contato com nosso suporte.');
        return;
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        // Redirect to login
        window.location.href = '/auth?redirect=/planos';
        return;
      }
      // Tenant e opcional no checkout: se nao existir membership, seguimos sem bloquear compra
      let finalTenantId: string | undefined;
      const { data: memberships } = await (supabase
        .from('tenant_members' as any) as any)
        .select('tenant_id')
        .eq('user_id', user.id)
        .limit(1);

      if (Array.isArray(memberships) && memberships.length > 0) {
        finalTenantId = memberships[0].tenant_id;
      }

      // Create checkout session via Edge Function
      console.log(`[Plans] Calling Edge Function with:`, {
        priceId,
        userId: user.id,
        tenantId: finalTenantId,
        planName,
        paymentType
      });

      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          priceId,
          userId: user.id,
          tenantId: finalTenantId,
          userEmail: user.email,
          planName: planName,
          billingType: paymentType,
          // v5.8: Redirecionar direto para o dashboard após sucesso
          successUrl: `${window.location.origin}/dashboard?checkout=success`,
          cancelUrl: `${window.location.origin}/planos?checkout=canceled`,
        },
      });

      if (error) {
        console.error('Checkout error:', error);
        const details = (error as any)?.message || 'Tente novamente em alguns instantes.';
        alert(`Erro ao criar sessão de pagamento. ${details}`);
        return;
      }

      // Redirect to Stripe Checkout
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Checkout error:', err);
      alert('Erro ao processar pagamento. Tente novamente.');
    } finally {
      setIsCheckoutLoading(false);
    }
  };

  const handleSubscribe = (planName: string) => {
    const plan = plans.find(p => p.name === planName);

    // Pro plan with custom CTA
    if (plan?.customCTA) {
      window.open(plan.customCTA.action, "_blank");
      return;
    }

    if (isAnnual) {
      // Show payment options dialog (À Vista vs 12x)
      setPaymentDialogPlan(planName);
    } else {
      // Direct monthly checkout
      createCheckoutSession(planName, 'monthly');
    }
  };

  const handlePaymentOptionSelect = (option: PaymentType) => {
    if (paymentDialogPlan) {
      createCheckoutSession(paymentDialogPlan, option);
    }
  };

  const getLiaExplanation = (planName: string) => {
    const plan = plans.find(p => p.name === planName);
    return plan?.liaQuote || "";
  };

  // Get plan data for payment dialog
  const getPaymentDialogData = () => {
    if (!paymentDialogPlan) return null;
    const plan = plans.find(p => p.name === paymentDialogPlan);
    if (!plan) return null;

    // Parse prices using the precalculated values from usePlans
    const monthlyPrice = plan.price; // ex: $29
    const annualPrice = plan.annualTotal || ''; // ex: $313
    const monthlyCommitPrice = plan.annualPrice; // ex: $26

    return {
      planName: plan.name,
      monthlyPrice,
      annualPrice,
      monthlyCommitPrice,
      discount: plan.discount,
    };
  };

  const dialogData = getPaymentDialogData();

  return (
    <div className="min-h-screen bg-[#0B0B0F]">
      {!isEmbedded && <UnifiedHeader />}

      <section id="planos" className="py-12 lg:py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0B0B0F] via-primary/5 to-[#0B0B0F]" />

        <div className="container mx-auto px-4 lg:px-8 relative z-10">
          <div className="text-center space-y-4 mb-12 animate-fade-in">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#FF2E9E] mb-4">
              <Sparkles className="w-8 h-8 text-white" />
            </div>

            <h1 className="text-5xl lg:text-7xl font-bold text-white">
              Escolha seu plano
            </h1>

            <p className="text-xl lg:text-2xl text-white/70 max-w-3xl mx-auto">
              Nunca mais perca um lead. A LIA atende, qualifica e agenda — 24h por dia.
            </p>
          </div>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4 mb-8 animate-fade-in">
            <span className={`text-lg font-semibold transition-all ${!isAnnual ? 'text-white' : 'text-white/50'}`}>
              Mensal
            </span>
            <button
              onClick={() => setIsAnnual(!isAnnual)}
              className={`relative w-14 h-7 rounded-full transition-all duration-300 ${isAnnual ? 'bg-gradient-to-r from-[#7C3AED] to-[#FF2E9E]' : 'bg-white/20'
                }`}
            >
              <div
                className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform duration-300 ${isAnnual ? 'translate-x-7' : 'translate-x-0'
                  }`}
              />
            </button>
            <span className={`text-lg font-semibold transition-all ${isAnnual ? 'text-white' : 'text-white/50'}`}>
              Anual
              <span className="ml-2 px-3 py-1 text-xs font-bold bg-green-500/20 text-green-400 rounded-full border border-green-500/30">
                Economize até 20%
              </span>
            </span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto mb-12">
              {plans.map((plan, index) => (
                <div
                  key={plan.name}
                  className={`relative p-6 rounded-2xl backdrop-blur-lg border transition-all duration-300 hover:scale-105 animate-fade-in ${plan.popular
                    ? "bg-gradient-to-br from-[#7C3AED]/20 to-[#FF2E9E]/20 border-[#7C3AED] shadow-[0_0_50px_rgba(124,58,237,0.3)]"
                    : "bg-white/5 border-white/10 hover:border-[#7C3AED]/50"
                    }`}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <div className="px-6 py-2 rounded-full bg-gradient-to-r from-[#7C3AED] to-[#FF2E9E] shadow-lg">
                        <p className="text-sm font-bold text-white">Mais Popular</p>
                      </div>
                    </div>
                  )}

                  <div className="text-center mb-6">
                    <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                    <p className="text-sm text-white/60 mb-4">{plan.description}</p>
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="flex items-center gap-3">
                        {(() => {
                          // Hardcoded reliable gradients per plan (the DB format is Tailwind, not raw CSS)
                          const planGradients: Record<string, string> = {
                            'Start': 'linear-gradient(to right, #22D3EE, #0EA5E9)',
                            'Plus': 'linear-gradient(to right, #7C3AED, #FF2E9E)',
                            'Pro': 'linear-gradient(to right, #FF2E9E, #F97316)',
                          };
                          const gradient = planGradients[plan.name] || 'linear-gradient(to right, #7C3AED, #FF2E9E)';

                          const displayPrice = isAnnual ? plan.annualPrice : plan.price;

                          return (
                            <>
                              <p
                                className="text-5xl font-black tracking-tighter"
                                style={{
                                  background: gradient,
                                  WebkitBackgroundClip: 'text',
                                  WebkitTextFillColor: 'transparent',
                                  backgroundClip: 'text'
                                }}
                              >
                                {displayPrice}
                              </p>
                              {isAnnual && plan.discount > 0 && (
                                <span className="px-2 py-1 text-sm font-bold rounded-full bg-gradient-to-r from-[#7C3AED] to-[#FF2E9E] text-white shadow-md transform -rotate-12">
                                  -{plan.discount}%
                                </span>
                              )}
                            </>
                          );
                        })()}
                      </div>
                      <p className="text-sm text-white/50">
                        {isAnnual ? (
                          <>
                            <span className="block text-xs text-white/40 mb-1">
                              Plano anual em 12x (fidelidade 12 meses)
                            </span>
                            {(() => {
                              const savings = plan.annualSavings || `${plan.discount}%`;
                              return (
                                <span className="block text-sm text-green-400 font-bold">
                                  Economize {savings}/ano
                                </span>
                              );
                            })()}
                          </>
                        ) : (
                          plan.period
                        )}
                      </p>
                    </div>
                  </div>

                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-5 h-5 rounded-full bg-[#22D3EE]/20 flex items-center justify-center mt-0.5">
                          <Check className="w-3 h-3 text-[#22D3EE]" />
                        </div>
                        <span className="text-white/80 leading-relaxed text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Lia Quote */}
                  <div className="mb-6 p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="flex items-start gap-2 mb-2">
                      <Bot className="w-5 h-5 text-[#7C3AED] flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-white/60 font-semibold">Lia diz:</p>
                    </div>
                    <p className="text-sm text-white/80 italic leading-relaxed text-center">"{plan.liaQuote}"</p>
                  </div>

                  <div className="space-y-3">
                    {plan.customCTA ? (
                      <>
                        <Button
                          onClick={() => handleSubscribe(plan.name)}
                          disabled={isCheckoutLoading}
                          className={`w-full h-10 bg-gradient-to-r ${plan.color} hover:shadow-[0_0_30px_rgba(124,58,237,0.5)] border-0`}
                        >
                          {isCheckoutLoading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            plan.customCTA?.text || "Assinar plano"
                          )}
                        </Button>
                        <Button
                          onClick={() => setSelectedPlan(plan.name)}
                          variant="outline"
                          className="w-full h-10 border-[#22D3EE]/50 text-[#22D3EE] hover:bg-[#22D3EE]/10"
                        >
                          Perguntar à Lia
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          onClick={() => handleSubscribe(plan.name)}
                          disabled={isCheckoutLoading}
                          className={`w-full h-10 ${plan.popular
                            ? "bg-gradient-to-r from-[#7C3AED] to-[#FF2E9E] hover:shadow-[0_0_30px_rgba(124,58,237,0.5)] border-0"
                            : "bg-white/10 hover:bg-white/20 text-white border border-white/20"
                            }`}
                        >
                          {isCheckoutLoading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            "Assinar plano"
                          )}
                        </Button>
                        <Button
                          onClick={() => setSelectedPlan(plan.name)}
                          variant="outline"
                          className="w-full h-10 border-[#22D3EE]/50 text-[#22D3EE] hover:bg-[#22D3EE]/10"
                        >
                          Perguntar à Lia
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Payment Options Dialog */}
        {dialogData && (
          <PaymentOptionsDialog
            isOpen={!!paymentDialogPlan}
            onClose={() => setPaymentDialogPlan(null)}
            planName={dialogData.planName}
            monthlyPrice={dialogData.monthlyPrice}
            annualPrice={dialogData.annualPrice}
            monthlyCommitPrice={dialogData.monthlyCommitPrice}
            discount={dialogData.discount}
            onSelectOption={handlePaymentOptionSelect}
          />
        )}

        {/* Dialog for Lia Explanation */}
        <Dialog open={!!selectedPlan} onOpenChange={() => setSelectedPlan(null)}>
          <DialogContent className="bg-[#0B0B0F] border-[#7C3AED]/30 text-white max-w-2xl">
            <DialogHeader>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#FF2E9E] flex items-center justify-center">
                  <Bot className="w-6 h-6 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-2xl text-white">LIA Atendimento</DialogTitle>
                  <DialogDescription className="text-white/60">
                    Explicando o plano {selectedPlan}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="py-6">
              <div className="p-6 rounded-xl bg-gradient-to-br from-[#7C3AED]/10 to-[#FF2E9E]/10 border border-[#7C3AED]/30">
                <p className="text-lg text-white/90 leading-relaxed whitespace-pre-line">
                  {selectedPlan && getLiaExplanation(selectedPlan)}
                </p>
              </div>

              {/* Typing indicator */}
              <div className="flex gap-1 mt-4 justify-end">
                <div className="w-2 h-2 rounded-full bg-[#22D3EE] animate-pulse" style={{ animationDelay: "0s" }} />
                <div className="w-2 h-2 rounded-full bg-[#22D3EE] animate-pulse" style={{ animationDelay: "0.2s" }} />
                <div className="w-2 h-2 rounded-full bg-[#22D3EE] animate-pulse" style={{ animationDelay: "0.4s" }} />
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => {
                  setSelectedPlan(null);
                  handleSubscribe(selectedPlan || "");
                }}
                className="flex-1 bg-gradient-to-r from-[#7C3AED] to-[#FF2E9E] hover:shadow-[0_0_30px_rgba(124,58,237,0.5)] border-0"
              >
                Quero este plano
              </Button>
              <Button
                onClick={() => setSelectedPlan(null)}
                variant="outline"
                className="flex-1 border-white/20 text-white hover:bg-white/10"
              >
                Fechar
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Glow Effect */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#FF2E9E]/10 rounded-full blur-[150px] -z-10" />
      </section>

      {!isEmbedded && <Footer />}
    </div>
  );
};

export default Plans;
