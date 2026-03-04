import UnifiedHeader from "@/components/UnifiedHeader";
import Hero from "@/components/Hero";
import ProblemSection from "@/components/ProblemSection";
import HowItWorks from "@/components/HowItWorks";
import LiaSimulator from "@/components/LiaSimulator";
import TargetAudience from "@/components/TargetAudience";
import CtaFinal from "@/components/CtaFinal";
import Footer from "@/components/Footer";
import FloatingChatButton from "@/components/FloatingChatButton";

const Index = () => {
  return (
    <div className="min-h-screen bg-background transition-colors duration-300 overflow-x-hidden">
      <UnifiedHeader />
      {/* 1. Hero — Problema + CTA */}
      <Hero />
      {/* 2. ProblemSection — Bater na dor da perda de leads */}
      <ProblemSection />
      {/* 3. HowItWorks — 3 passos simples da solução */}
      <HowItWorks />
      {/* 4. Simulador — Demo interativa */}
      <LiaSimulator />
      {/* 5. Público-Alvo — Segmentos atendidos */}
      <TargetAudience />
      {/* 6. CtaFinal — Urgência e conversão */}
      <CtaFinal />
      <Footer />
      <FloatingChatButton />
    </div>
  );
};

export default Index;
