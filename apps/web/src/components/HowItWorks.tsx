import { Code2, Brain, Zap } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const HowItWorks = () => {
    const { t } = useLanguage();
    const steps = [
        {
            number: "01",
            icon: <Code2 className="w-8 h-8 text-[#0EA5E9]" />,
            title: t("how_step1_title"),
            description: t("how_step1_desc"),
            color: "from-[#22D3EE] to-[#0EA5E9]"
        },
        {
            number: "02",
            icon: <Brain className="w-8 h-8 text-[#7C3AED]" />,
            title: t("how_step2_title"),
            description: t("how_step2_desc"),
            color: "from-[#7C3AED] to-[#FF2E9E]"
        },
        {
            number: "03",
            icon: <Zap className="w-8 h-8 text-[#FF2E9E]" />,
            title: t("how_step3_title"),
            description: t("how_step3_desc"),
            color: "from-[#FF2E9E] to-[#F97316]"
        }
    ];

    return (
        <section id="como-funciona" className="py-24 bg-gray-50/50 dark:bg-[#110C24] relative overflow-hidden transition-colors duration-500">
            <div className="container mx-auto px-4 lg:px-8 relative z-10">
                <div className="text-center max-w-3xl mx-auto mb-20 space-y-4">
                    <h2 className="text-3xl md:text-5xl font-bold text-foreground">
                        {t('how_title_main')} <span className="bg-gradient-to-r from-[#0EA5E9] to-[#7C3AED] bg-clip-text text-transparent">{t('how_title_highlight')}</span> {t('how_title_end')}
                    </h2>
                    <p className="text-lg text-muted-foreground">
                        {t('how_subtitle')}
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-8 lg:gap-12 max-w-6xl mx-auto relative">
                    {/* Connecting line for desktop */}
                    <div className="hidden md:block absolute top-[4.5rem] left-[10%] right-[10%] h-[2px] bg-gradient-to-r from-[#0EA5E9]/20 via-[#7C3AED]/20 to-[#FF2E9E]/20" />

                    {steps.map((step, idx) => (
                        <div key={idx} className="relative z-10 flex flex-col items-center text-center group">
                            <div className={`w-36 h-36 rounded-full bg-white dark:bg-[#1A1037] border-4 border-gray-50 dark:border-[#0B0B0D] flex items-center justify-center mb-8 shadow-xl group-hover:scale-110 transition-transform duration-500 relative`}>
                                <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${step.color} opacity-10`} />
                                {step.icon}
                                <div className="absolute -top-2 -right-2 w-10 h-10 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-4 border-white dark:border-[#1A1037] flex items-center justify-center font-bold text-sm">
                                    {step.number}
                                </div>
                            </div>

                            <h3 className="text-2xl font-bold mb-4 text-foreground">{step.title}</h3>
                            <p className="text-muted-foreground leading-relaxed">
                                {step.description}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default HowItWorks;
