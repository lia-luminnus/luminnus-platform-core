import { Stethoscope, Building2, GraduationCap, Wrench, ShoppingBag, Briefcase } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const TargetAudience = () => {
    const { t } = useLanguage();
    const segments = [
        {
            icon: <Stethoscope className="w-8 h-8 text-[#0EA5E9]" />,
            title: t("target_card1_title"),
            desc: t("target_card1_desc"),
            bg: "bg-[#0EA5E9]/10"
        },
        {
            icon: <Building2 className="w-8 h-8 text-[#7C3AED]" />,
            title: t("target_card2_title"),
            desc: t("target_card2_desc"),
            bg: "bg-[#7C3AED]/10"
        },
        {
            icon: <GraduationCap className="w-8 h-8 text-[#FF2E9E]" />,
            title: t("target_card3_title"),
            desc: t("target_card3_desc"),
            bg: "bg-[#FF2E9E]/10"
        },
        {
            icon: <Wrench className="w-8 h-8 text-[#F97316]" />,
            title: t("target_card4_title"),
            desc: t("target_card4_desc"),
            bg: "bg-[#F97316]/10"
        },
        {
            icon: <ShoppingBag className="w-8 h-8 text-[#22D3EE]" />,
            title: t("target_card5_title"),
            desc: t("target_card5_desc"),
            bg: "bg-[#22D3EE]/10"
        },
        {
            icon: <Briefcase className="w-8 h-8 text-primary" />,
            title: t("target_card6_title"),
            desc: t("target_card6_desc"),
            bg: "bg-primary/10"
        }
    ];

    return (
        <section className="py-24 bg-white dark:bg-[#0B0B0D] relative overflow-hidden transition-colors duration-500">
            <div className="container mx-auto px-4 lg:px-8 relative z-10">
                <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
                    <h2 className="text-3xl md:text-5xl font-bold text-foreground">
                        {t('target_title_main')} <span className="bg-gradient-to-r from-[#FF2E9E] to-[#F97316] bg-clip-text text-transparent">{t('target_title_highlight')}</span> {t('target_title_end')}
                    </h2>
                    <p className="text-lg text-muted-foreground">
                        {t('target_subtitle')}
                    </p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
                    {segments.map((segment, idx) => (
                        <div
                            key={idx}
                            className="group p-8 rounded-3xl bg-gray-50/50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/[0.05] hover:bg-white dark:hover:bg-[#1A1037] hover:shadow-xl transition-all duration-300"
                        >
                            <div className={`w-16 h-16 rounded-2xl ${segment.bg} flex items-center justify-center mb-6`}>
                                {segment.icon}
                            </div>
                            <h3 className="text-xl font-bold mb-3 text-foreground">{segment.title}</h3>
                            <p className="text-muted-foreground leading-relaxed">
                                {segment.desc}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default TargetAudience;
