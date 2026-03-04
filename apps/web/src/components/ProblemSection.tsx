import { Clock, TrendingDown, Users } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const ProblemSection = () => {
    const { t } = useLanguage();

    const problems = [
        {
            icon: <Users className="w-8 h-8 text-red-500" />,
            title: t("problem_card1_title"),
            description: t("problem_card1_desc")
        },
        {
            icon: <Clock className="w-8 h-8 text-orange-500" />,
            title: t("problem_card2_title"),
            description: t("problem_card2_desc")
        },
        {
            icon: <TrendingDown className="w-8 h-8 text-pink-500" />,
            title: t("problem_card3_title"),
            description: t("problem_card3_desc")
        }
    ];

    return (
        <section className="py-24 bg-white dark:bg-[#0B0B0D] relative overflow-hidden transition-colors duration-500">
            <div className="container mx-auto px-4 lg:px-8 relative z-10">
                <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
                    <h2 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">
                        {t('problem_title_main')} <span className="text-red-500">{t('problem_title_highlight')}</span>
                    </h2>
                    <p className="text-lg text-muted-foreground">
                        {t('problem_subtitle')}
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                    {problems.map((problem, idx) => (
                        <div
                            key={idx}
                            className="group p-8 rounded-3xl bg-gray-50/50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/[0.05] hover:border-red-500/30 dark:hover:border-red-500/30 transition-all duration-300 hover:shadow-2xl hover:shadow-red-500/10"
                        >
                            <div className="w-16 h-16 rounded-2xl bg-white dark:bg-[#1A1037] flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform duration-300">
                                {problem.icon}
                            </div>
                            <h3 className="text-xl font-bold mb-3 text-foreground">{problem.title}</h3>
                            <p className="text-muted-foreground leading-relaxed">
                                {problem.description}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default ProblemSection;
