import { Button } from "@/components/ui/button";
import { ArrowRight, Bot } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

const CtaFinal = () => {
    const navigate = useNavigate();
    const { t } = useLanguage();

    return (
        <section className="py-24 relative overflow-hidden bg-[#1A1037]">
            {/* Background decorations */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#0B0B0D] to-[#1A1037]/50" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/20 rounded-full blur-[150px] animate-pulse-glow" />

            <div className="container mx-auto px-4 relative z-10 text-center">
                <div className="max-w-4xl mx-auto space-y-8">
                    <div className="inline-flex w-16 h-16 rounded-full bg-white/10 items-center justify-center mb-4">
                        <Bot className="w-8 h-8 text-white" />
                    </div>

                    <h2 className="text-4xl md:text-6xl font-bold text-white leading-tight">
                        {t('cta_final_title_main')} <span className="text-red-500">{t('cta_final_title_highlight')}</span>
                    </h2>

                    <p className="text-xl md:text-2xl text-gray-300 max-w-2xl mx-auto leading-relaxed">
                        {t('cta_final_subtitle')}
                    </p>

                    <div className="pt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Button
                            size="lg"
                            onClick={() => navigate("/dashboard")}
                            className="w-full sm:w-auto text-lg h-16 px-10 bg-gradient-to-r from-[#FF2E9E] to-[#F97316] hover:opacity-90 text-white rounded-full shadow-lg shadow-[#FF2E9E]/25 transition-all hover:scale-105"
                        >
                            {t('cta_final_btn_primary')}
                            <ArrowRight className="ml-2 w-5 h-5" />
                        </Button>
                        <Button
                            size="lg"
                            variant="outline"
                            onClick={() => {
                                const plansSection = document.getElementById('planos');
                                if (plansSection) {
                                    plansSection.scrollIntoView({ behavior: 'smooth' });
                                } else {
                                    navigate("/plans");
                                }
                            }}
                            className="w-full sm:w-auto text-lg h-16 px-10 border-gray-600 text-white hover:bg-white/5 rounded-full"
                        >
                            {t('cta_final_btn_secondary')}
                        </Button>
                    </div>
                    <p className="text-sm text-gray-400 mt-6">{t('cta_final_disclaimer')}</p>
                </div>
            </div>
        </section>
    );
};

export default CtaFinal;
