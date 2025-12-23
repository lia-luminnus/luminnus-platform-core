// Force rebuild - Updated with annual/monthly toggle
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

const Plans = () => {
  const { plans, loading } = usePlans();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isAnnual, setIsAnnual] = useState(true);

  const handleSubscribe = (planName: string) => {
    const plan = plans.find(p => p.name === planName);
    if (plan?.customCTA) {
      window.open(plan.customCTA.action, "_blank");
    } else {
      window.open("https://pay.kiwify.com.br/uRHrFT8", "_blank");
    }
  };

  const getLiaExplanation = (planName: string) => {
    const plan = plans.find(p => p.name === planName);
    return plan?.liaQuote || "";
  };

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
            className={`relative w-14 h-7 rounded-full transition-all duration-300 ${
              isAnnual ? 'bg-gradient-to-r from-[#7C3AED] to-[#FF2E9E]' : 'bg-white/20'
            }`}
          >
            <div
              className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform duration-300 ${
                isAnnual ? 'translate-x-7' : 'translate-x-0'
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
              className={`relative p-8 rounded-2xl backdrop-blur-lg border transition-all duration-300 hover:scale-105 animate-fade-in ${
                plan.popular
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
                  {(() => {
                    const colors = plan.color.match(/hsl\([^)]+\)/g) || [];
                    const gradient = colors.length === 2 
                      ? `linear-gradient(to right, ${colors[0]}, ${colors[1]})` 
                      : 'linear-gradient(to right, #7C3AED, #FF2E9E)';
                    
                    return (
                      <p 
                        className="text-4xl font-black"
                        style={{
                          background: gradient,
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          backgroundClip: 'text'
                        }}
                      >
                        {isAnnual ? plan.annualPrice : plan.price}
                      </p>
                    );
                  })()}
                  <p className="text-sm text-white/50">
                    {isAnnual ? '/ano' : plan.period}
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
                      className={`w-full h-12 bg-gradient-to-r ${plan.color} hover:shadow-[0_0_30px_rgba(124,58,237,0.5)] border-0`}
                    >
                      {plan.customCTA.text}
                    </Button>
                    <Button
                      onClick={() => setSelectedPlan(plan.name)}
                      variant="outline"
                      className="w-full h-12 border-[#22D3EE]/50 text-[#22D3EE] hover:bg-[#22D3EE]/10"
                    >
                      A Lia explica este plano
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      onClick={() => handleSubscribe(plan.name)}
                      className={`w-full h-12 ${
                        plan.popular
                          ? "bg-gradient-to-r from-[#7C3AED] to-[#FF2E9E] hover:shadow-[0_0_30px_rgba(124,58,237,0.5)] border-0"
                          : "bg-white/10 hover:bg-white/20 text-white border border-white/20"
                      }`}
                    >
                      Assinar {plan.name}
                    </Button>
                    <Button
                      onClick={() => setSelectedPlan(plan.name)}
                      variant="outline"
                      className="w-full h-12 border-[#22D3EE]/50 text-[#22D3EE] hover:bg-[#22D3EE]/10"
                    >
                      A Lia explica este plano
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
          </div>
        )}
      </div>

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
