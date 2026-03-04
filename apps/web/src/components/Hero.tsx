import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { ArrowRight, Clock, MessageSquare, Calendar, TrendingUp } from "lucide-react";

const Hero = () => {
  const { t } = useLanguage();

  return (
    <section
      id="inicio"
      className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-white via-purple-50 to-white dark:from-[#0B0B0D] dark:via-[#1A1037] dark:to-[#0B0B0D] transition-colors duration-500"
      style={{ padding: '120px 5%' }}
    >
      {/* Animated Background Effects */}
      <div className="absolute inset-0">
        {[...Array(25)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-primary rounded-full animate-particle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 8}s`,
              animationDuration: `${8 + Math.random() * 4}s`,
              boxShadow: '0 0 10px currentColor'
            }}
          />
        ))}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[150px] animate-pulse-glow" />
      </div>

      {/* Content Container */}
      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center max-w-7xl mx-auto">

          {/* Left Column - Text Content */}
          <div className="space-y-8 animate-fade-in text-left">
            {/* Problem Awareness Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400 text-sm font-semibold">
              <Clock className="w-4 h-4" />
              <span>{t('hero_badge')}</span>
            </div>

            <div className="space-y-6">
              <h1 className="text-4xl lg:text-6xl font-bold leading-tight text-foreground">
                {t('hero_title_1')}<span className="bg-gradient-to-r from-[#7C3AED] to-[#FF2E9E] bg-clip-text text-transparent">{t('hero_title_highlight')}</span>{t('hero_title_2')}
              </h1>

              <p className="text-xl lg:text-2xl text-muted-foreground leading-relaxed">
                {t('hero_subtitle')}
              </p>
            </div>

            {/* Social Proof Stats */}
            <div className="flex flex-wrap gap-6 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <TrendingUp className="w-4 h-4 text-green-500" />
                <span><strong className="text-foreground">3x</strong> {t('hero_stat1')}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-4 h-4 text-blue-500" />
                <span><strong className="text-foreground">&lt;2s</strong> {t('hero_stat2')}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-4 h-4 text-purple-500" />
                <span><strong className="text-foreground">24/7</strong> {t('hero_stat3')}</span>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button
                onClick={() => window.location.href = '/planos'}
                size="lg"
                className="bg-gradient-to-r from-[#7C3AED] to-[#FF2E9E] hover:opacity-90 transition-all text-lg px-8 py-6 text-white group"
              >
                {t('hero_btn_primary')}
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button
                onClick={() => {
                  const element = document.querySelector('#como-funciona');
                  if (element) element.scrollIntoView({ behavior: 'smooth' });
                }}
                size="lg"
                variant="outline"
                className="text-lg px-8 py-6 border-primary/30 hover:bg-primary/5"
              >
                {t('hero_btn_secondary')}
              </Button>
            </div>

            {/* Trust Signal */}
            <p className="text-xs text-muted-foreground/60">
              {t('hero_disclaimer')}
            </p>
          </div>

          {/* Right Column - Widget Preview */}
          <div className="relative lg:block hidden animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <div className="relative w-full flex items-center justify-center">
              {/* Background Glow */}
              <div className="absolute inset-0 bg-gradient-to-r from-[#7C3AED] via-[#FF2E9E] to-[#22D3EE] rounded-3xl blur-3xl opacity-20 animate-pulse-glow" />

              {/* Chat Widget Mockup */}
              <div className="relative w-[380px] bg-[#0D111C]/95 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
                {/* Widget Header */}
                <div className="p-5 bg-gradient-to-r from-[#7C3AED] to-[#FF2E9E]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                      <MessageSquare className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-white font-bold text-sm">{t('hero_widget_title')}</p>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                        <span className="text-white/80 text-xs">{t('hero_widget_online')}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Chat Messages */}
                <div className="p-5 space-y-4">
                  {/* LIA Message */}
                  <div className="flex gap-2">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-r from-[#7C3AED] to-[#FF2E9E] flex items-center justify-center shrink-0">
                      <span className="text-white text-[10px] font-bold">L</span>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-none px-4 py-3 max-w-[280px]">
                      <p className="text-white/90 text-sm">{t('hero_widget_msg1')}</p>
                    </div>
                  </div>

                  {/* User Message */}
                  <div className="flex gap-2 justify-end">
                    <div className="bg-gradient-to-r from-[#7C3AED] to-[#FF2E9E] rounded-2xl rounded-tr-none px-4 py-3 max-w-[280px]">
                      <p className="text-white text-sm">{t('hero_widget_user_msg')}</p>
                    </div>
                  </div>

                  {/* LIA Response with CTA */}
                  <div className="flex gap-2">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-r from-[#7C3AED] to-[#FF2E9E] flex items-center justify-center shrink-0">
                      <span className="text-white text-[10px] font-bold">L</span>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-none px-4 py-3 max-w-[280px] space-y-3">
                      <p className="text-white/90 text-sm">{t('hero_widget_msg2')}</p>
                      <button className="w-full px-4 py-2 bg-gradient-to-r from-[#7C3AED] to-[#FF2E9E] text-white text-xs font-bold rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2">
                        <Calendar className="w-3.5 h-3.5" />
                        {t('hero_widget_btn')}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Input Area */}
                <div className="p-4 border-t border-white/5">
                  <div className="flex items-center gap-2 bg-white/5 rounded-xl px-4 py-3">
                    <span className="text-white/30 text-sm flex-1">{t('hero_widget_input')}</span>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#7C3AED] to-[#FF2E9E] flex items-center justify-center">
                      <ArrowRight className="w-4 h-4 text-white" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default Hero;