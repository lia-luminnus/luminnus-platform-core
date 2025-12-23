import { useState } from "react";
import { Check, Sparkles, Bot, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import UnifiedHeader from "@/components/UnifiedHeader";
import Footer from "@/components/Footer";
import { usePlans } from "@/hooks/usePlans";

const Plans = () => {
  const { plans, loading } = usePlans();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isAnnual, setIsAnnual] = useState(true);

  const handleSubscribe = (planName: string) => {
    const plan = plans.find(p => p.name === planName);
    if (plan?.customCTA) {
      window.open(plan.customCTA.action, "_blank");
    } else {
      window.open("https://buy.stripe.com/test_example", "_blank");
    }
  };

  const getLiaExplanation = (planName: string) => {
    const plan = plans.find(p => p.name === planName);
    return plan?.liaQuote || "";
  };

  return (
    <div className="min-h-screen bg-[#0B0B0F]">
      <UnifiedHeader />

      <section className="py-32 lg:py-40 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0B0B0F] via-primary/5 to-[#0B0B0F]" />

        <div className="container mx-auto px-4 lg:px-8 relative z-10">
          {/* Header */}
          <div className="text-center space-y-6 mb-20 animate-fade-in">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#FF2E9E] mb-4">
              <Sparkles className="w-8 h-8 text-white" />
            </div>

            <h1 className="text-5xl lg:text-7xl font-bold text-white">
              Escolha seu plano
            </h1>

            <p className="text-xl lg:text-2xl text-white/70 max-w-3xl mx-auto">
              Encontre a solução perfeita para automatizar seu atendimento com a Lia
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
              <span className="ml-2 px-2 py-1 text-xs bg-gradient-to-r from-green-400 to-emerald-500 rounded-full">
                Economize até 20%
              </span>
            </span>
          </div>

          {/* Loading state */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
            </div>
          ) : (
            <>
              {/* Plans Grid */}
              <div id="planos" className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
                {plans.map((plan, index) => {
                  // Lógica de cálculo de preços
                  const numericPrice = parseFloat(plan.price.replace(/[^0-9.,]/g, '').replace(',', '.'));
                  const discount = plan.discount || 0;

                  // Preço Anual Total = (Mensal * 12) - Desconto%
                  const annualTotal = !isNaN(numericPrice)
                    ? (numericPrice * 12) * (1 - (discount / 100))
                    : 0;

                  // Preço Mensalizado no Plano Anual = Total Anual / 12
                  const annualMonthlyPrice = annualTotal / 12;

                  // Formatação
                  const displayPrice = isAnnual
                    ? `€${Math.round(annualMonthlyPrice)}`
                    : plan.price;

                  const displayAnnualTotal = `€${Math.round(annualTotal)}`;

                  return (
                    <div
                      key={index}
                      className={`relative p-8 rounded-2xl bg-white/5 backdrop-blur-lg border-2 transition-all duration-300 hover:scale-105 animate-fade-in ${plan.popular
                        ? "border-[#7C3AED] shadow-[0_0_60px_rgba(124,58,237,0.4)]"
                        : "border-white/10 hover:border-white/20"
                        }`}
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      {plan.popular && (
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-[#7C3AED] to-[#FF2E9E] text-white text-sm font-semibold shadow-lg">
                          Mais Popular
                        </div>
                      )}

                      <div className="text-center mb-6">
                        <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                        <div className="space-y-2">
                          <div className="flex items-center justify-center gap-3">
                            {(() => {
                              const colors = plan.color.match(/hsl\([^)]+\)/g) || [];
                              const gradient = colors.length === 2
                                ? `linear-gradient(to right, ${colors[0]}, ${colors[1]})`
                                : 'linear-gradient(to right, #7C3AED, #FF2E9E)';

                              return (
                                <div className="flex flex-col items-center">
                                  <div className="flex items-center gap-2">
                                    <p
                                      className="text-6xl font-black tracking-tighter"
                                      style={{
                                        background: gradient,
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                        backgroundClip: 'text'
                                      }}
                                    >
                                      {displayPrice}
                                    </p>
                                    {isAnnual && discount > 0 && (
                                      <span className="px-2 py-1 text-sm font-bold rounded-full bg-gradient-to-r from-[#7C3AED] to-[#FF2E9E] text-white shadow-md transform -rotate-12">
                                        -{discount}%
                                      </span>
                                    )}
                                  </div>

                                  {isAnnual && (
                                    <p className="text-sm text-white/60 font-medium mt-1">
                                      Total anual: {displayAnnualTotal}
                                    </p>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                          <p className="text-sm text-white/50 font-medium">
                            {isAnnual ? '/mês (faturado anualmente)' : '/mês'}
                          </p>
                        </div>
                        <p className="text-white/70 text-sm mt-4">{plan.description}</p>
                      </div>

                      <ul className="space-y-3 mb-8">
                        {plan.features.map((feature, idx) => (
                          <li key={idx} className="flex items-start gap-3 text-white/80">
                            <Check className="w-5 h-5 text-[#22D3EE] flex-shrink-0 mt-0.5" />
                            <span className="text-sm">{feature}</span>
                          </li>
                        ))}
                      </ul>

                      <div className="space-y-3">
                        {plan.customCTA ? (
                          <>
                            <Button
                              onClick={() => handleSubscribe(plan.name)}
                              className={`w-full bg-gradient-to-r ${plan.color} hover:shadow-[0_0_40px_rgba(124,58,237,0.6)] transition-all border-0 h-12`}
                            >
                              {plan.customCTA.text}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => setSelectedPlan(plan.name)}
                              className="w-full border-white/20 text-white hover:bg-white/10"
                            >
                              Perguntar à Lia
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              onClick={() => handleSubscribe(plan.name)}
                              className={`w-full bg-gradient-to-r ${plan.color} hover:shadow-[0_0_40px_rgba(124,58,237,0.6)] transition-all border-0 h-12`}
                            >
                              Assinar {plan.name}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => setSelectedPlan(plan.name)}
                              className="w-full border-white/20 text-white hover:bg-white/10"
                            >
                              Perguntar à Lia
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </section>

      {/* Lia Explanation Dialog */}
      <Dialog open={selectedPlan !== null} onOpenChange={() => setSelectedPlan(null)}>
        <DialogContent className="bg-[#1A1A24] border-[#7C3AED]/30 text-white max-w-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#FF2E9E] flex items-center justify-center flex-shrink-0">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <DialogTitle className="text-2xl bg-gradient-to-r from-[#7C3AED] to-[#FF2E9E] bg-clip-text text-transparent">
                O que a Lia diz sobre o plano {selectedPlan}
              </DialogTitle>
            </div>
            <DialogDescription className="text-white/90 text-base leading-relaxed">
              {selectedPlan && getLiaExplanation(selectedPlan)}
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default Plans;
