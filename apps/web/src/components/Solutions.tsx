import { Clock, TrendingDown, Zap, Bot, BarChart, MessageSquare, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

const Solutions = () => {
  const { t } = useLanguage();

  const benefits = [
    {
      icon: Clock,
      titleKey: "solutions_benefit1_title",
      descKey: "solutions_benefit1_desc"
    },
    {
      icon: TrendingDown,
      titleKey: "solutions_benefit2_title",
      descKey: "solutions_benefit2_desc"
    },
    {
      icon: Zap,
      titleKey: "solutions_benefit3_title",
      descKey: "solutions_benefit3_desc"
    }
  ];

  const transformations = [
    {
      icon: Bot,
      titleKey: "solutions_transform1_title",
      descKey: "solutions_transform1_desc"
    },
    {
      icon: MessageSquare,
      titleKey: "solutions_transform2_title",
      descKey: "solutions_transform2_desc"
    },
    {
      icon: BarChart,
      titleKey: "solutions_transform3_title",
      descKey: "solutions_transform3_desc"
    },
    {
      icon: Calendar,
      titleKey: "solutions_transform4_title",
      descKey: "solutions_transform4_desc"
    }
  ];


  return (
    <section id="solucoes" className="py-32 lg:py-40 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-[#0B0B0F] via-primary/5 to-[#0B0B0F]" />

      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        {/* Header */}
        <div className="text-center space-y-6 mb-20 animate-fade-in">
          <h1 className="text-5xl lg:text-7xl font-bold text-white leading-tight">
            {t('solutions_title')}
          </h1>

          <p className="text-xl lg:text-2xl text-white/70 max-w-4xl mx-auto">
            {t('solutions_subtitle')}
          </p>
        </div>

        {/* Benefits Grid */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-24">
          {benefits.map((benefit, index) => (
            <div
              key={index}
              className="p-8 rounded-2xl bg-white/5 backdrop-blur-lg border border-white/10 hover:border-white/20 transition-all duration-300 hover:scale-105 animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#FF2E9E] flex items-center justify-center mb-6">
                <benefit.icon className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">{t(benefit.titleKey)}</h3>
              <p className="text-white/70 leading-relaxed">{t(benefit.descKey)}</p>
            </div>
          ))}
        </div>

        {/* How Lia Transforms Section */}
        <div className="space-y-12 animate-fade-in" style={{ animationDelay: "0.3s" }}>
          <div className="text-center">
            <h2 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-[#7C3AED] to-[#FF2E9E] bg-clip-text text-transparent mb-4">
              {t('solutions_transform_title')}
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {transformations.map((item, index) => (
              <div
                key={index}
                className="flex items-start gap-4 p-6 rounded-xl bg-white/5 backdrop-blur-lg border border-white/10 hover:border-[#7C3AED]/50 transition-all duration-300 animate-fade-in"
                style={{ animationDelay: `${0.4 + index * 0.1}s` }}
              >
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#7C3AED]/20 to-[#FF2E9E]/20 flex items-center justify-center flex-shrink-0 border border-[#7C3AED]/30">
                  <item.icon className="w-6 h-6 text-[#7C3AED]" />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-white mb-2">{t(item.titleKey)}</h4>
                  <p className="text-white/70">{t(item.descKey)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center mt-16 space-y-4 animate-fade-in" style={{ animationDelay: "0.8s" }}>
          <Link to="/planos">
            <Button className="bg-gradient-to-r from-[#7C3AED] to-[#FF2E9E] hover:shadow-[0_0_40px_rgba(124,58,237,0.6)] transition-all border-0 h-14 px-10 text-lg">
              {t('solutions_cta')}
            </Button>
          </Link>

          <div>
            <Button
              variant="ghost"
              onClick={() => {
                const demoSection = document.getElementById('demo');
                if (demoSection) {
                  demoSection.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              className="text-white/70 hover:text-white hover:bg-white/10"
            >
              {t('solutions_cta_secondary')}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Solutions;
