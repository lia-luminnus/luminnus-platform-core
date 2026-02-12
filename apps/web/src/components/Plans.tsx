// Force rebuild - Updated with Stripe integration and payment options
import { Check, Bot, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState } from "react";
import { usePlans } from "@/hooks/usePlans";
import { PaymentOptionsDialog } from "@/components/PaymentOptionsDialog";
import { STRIPE_PRICES, type PlanName, type PaymentType } from "@/lib/stripe";
import { supabase } from "@/integrations/supabase/client";

const Plans = () => {
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

      // Check for tenant membership
      const { data: membership, error: memberError } = await (supabase
        .from('tenant_members' as any) as any)
        .select('tenant_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!membership || memberError) {
        console.error('No tenant membership found or error:', memberError);
        window.location.href = '/onboarding';
        return;
      }

      // Create checkout session via Edge Function
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          priceId,
          userId: user.id,
          tenantId: membership.tenant_id,
          userEmail: user.email,
          planName: planName,
          billingType: paymentType,
          successUrl: `${window.location.origin}/area-do-cliente?checkout=success`,
          cancelUrl: `${window.location.origin}/planos?checkout=canceled`,
        },
      });

      if (error) {
        console.error('Checkout error:', error);
        alert('Erro ao criar sessão de pagamento. Tente novamente.');
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

    // Parse prices
    const monthlyPrice = plan.price;
    const annualPrice = plan.annualPrice;

    // Calculate 12x price (with discount)
    const numericMonthly = parseFloat(plan.price.replace(/[^0-9.,]/g, '').replace(',', '.'));
    const monthlyCommitPrice = `€${Math.round(numericMonthly * (1 - plan.discount / 100))}`;

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
    <section id="planos" className="py-20 lg:py-32 relative overflow-hidden bg-[#0B0B0F]">
      <div className="absolute inset-0 bg-gradient-to-b from-[#0B0B0F] via-[#FF2E9E]/5 to-[#0B0B0F]" />

      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <div className="text-center space-y-4 mb-8 animate-fade-in">
          <h2 className="text-4xl lg:text-6xl font-bold text-white">
            Planos da LIA Atendimento
          </h2>
          <p className="text-lg lg:text-xl text-white/70 max-w-2xl mx-auto">
            Planos para todos os tamanhos de negócio
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-4 mb-16 animate-fade-in">
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
            <span className="ml-2 px-2 py-1 text-xs bg-gradient-to-r from-[#7C3AED] to-[#FF2E9E] rounded-full">
              -20%
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
                className={`relative p-8 rounded-2xl backdrop-blur-lg border transition-all duration-300 hover:scale-105 animate-fade-in ${plan.popular
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

                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                  <p className="text-sm text-white/60 mb-4">{plan.description}</p>
                  <div className="space-y-1">
                    <div className="flex items-center justify-center gap-3">
                      <p
                        className="text-4xl font-black"
                        style={{
                          background: 'linear-gradient(to right, #7C3AED, #FF2E9E)',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          backgroundClip: 'text'
                        }}
                      >
                        {isAnnual ? plan.annualPrice : plan.price}
                      </p>
                      {isAnnual && (
                        <span className="px-2 py-1 text-xs font-bold rounded-full bg-gradient-to-r from-[#7C3AED]/20 to-[#FF2E9E]/20 text-[#FF2E9E]">
                          -{plan.discount}%
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-white/50">
                      {isAnnual ? (
                        <>
                          <span className="block text-xs text-white/40">Plano anual em 12x (fidelidade 12 meses)</span>
                          <span className="block text-xs text-green-400 font-semibold">
                            Economize {'annualSavings' in plan ? (plan as any).annualSavings : ''}/ano
                          </span>
                        </>
                      ) : (
                        plan.period
                      )}
                    </p>
                  </div>
                </div>

                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-5 h-5 rounded-full bg-[#22D3EE]/20 flex items-center justify-center mt-0.5">
                        <Check className="w-3 h-3 text-[#22D3EE]" />
                      </div>
                      <span className="text-white/80 leading-relaxed">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Credit Highlights */}
                {'creditHighlights' in plan && (plan as any).creditHighlights && (
                  <div className="mb-4 p-3 rounded-xl bg-gradient-to-r from-[#7C3AED]/10 to-[#FF2E9E]/10 border border-[#7C3AED]/20">
                    <p className="text-xs text-white/50 mb-2 font-semibold uppercase tracking-wider">O que dá para fazer:</p>
                    <div className="flex flex-wrap gap-2">
                      {(plan as any).creditHighlights.map((h: string, idx: number) => (
                        <span key={idx} className="px-2.5 py-1 text-xs rounded-full bg-white/10 text-white/80">
                          {h}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Lia Quote */}
                <div className="mb-6 p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-start gap-2 mb-2">
                    <Bot className="w-5 h-5 text-[#7C3AED] flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-white/60 font-semibold">Lia diz:</p>
                  </div>
                  <p className="text-sm text-white/80 italic leading-relaxed">"{plan.liaQuote}"</p>
                </div>

                <div className="space-y-3">
                  {plan.customCTA ? (
                    <>
                      <Button
                        onClick={() => handleSubscribe(plan.name)}
                        disabled={isCheckoutLoading}
                        className={`w-full h-12 bg-gradient-to-r ${plan.color} hover:shadow-[0_0_30px_rgba(124,58,237,0.5)] border-0`}
                      >
                        {isCheckoutLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : plan.customCTA.text}
                      </Button>
                      <Button
                        onClick={() => setSelectedPlan(plan.name)}
                        variant="outline"
                        className="w-full h-12 border-[#22D3EE]/50 text-[#22D3EE] hover:bg-[#22D3EE]/10"
                      >
                        Perguntar à Lia
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        onClick={() => handleSubscribe(plan.name)}
                        disabled={isCheckoutLoading}
                        className={`w-full h-12 ${plan.popular
                          ? "bg-gradient-to-r from-[#7C3AED] to-[#FF2E9E] hover:shadow-[0_0_30px_rgba(124,58,237,0.5)] border-0"
                          : "bg-white/10 hover:bg-white/20 text-white border border-white/20"
                          }`}
                      >
                        {isCheckoutLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : `Assinar ${plan.name}`}
                      </Button>
                      <Button
                        onClick={() => setSelectedPlan(plan.name)}
                        variant="outline"
                        className="w-full h-12 border-[#22D3EE]/50 text-[#22D3EE] hover:bg-[#22D3EE]/10"
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
  );
};

export default Plans;
