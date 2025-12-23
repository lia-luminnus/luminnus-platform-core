import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

const Hero = () => {
  const { t } = useLanguage();

  const scrollToSection = (sectionId: string) => {
    const element = document.querySelector(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section
      id="inicio"
      className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-white via-purple-50 to-white dark:from-[#0B0B0D] dark:via-[#1A1037] dark:to-[#0B0B0D] transition-colors duration-500"
      style={{
        padding: '120px 5%'
      }}
    >
      {/* Animated Background Effects */}
      <div className="absolute inset-0">
        {/* Particle Effects */}
        <div className="absolute inset-0">
          {[...Array(30)].map((_, i) => (
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
        </div>

        {/* Glow Effect */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[150px] animate-pulse-glow" />
      </div>

      {/* Content Container */}
      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center max-w-7xl mx-auto">
          {/* Left Column - Text Content */}
          <div className="space-y-8 animate-fade-in text-left">
            <div className="space-y-6">
              <h1 className="text-4xl lg:text-6xl font-bold leading-tight text-foreground">
                {t('hero_title')}
              </h1>

              <p className="text-xl lg:text-2xl text-muted-foreground leading-relaxed">
                {t('hero_subtitle')}
              </p>
            </div>

            {/* Call to Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button
                onClick={() => window.location.href = '/planos'}
                size="lg"
                className="bg-gradient-to-r from-[#7C3AED] to-[#FF2E9E] hover:opacity-90 transition-opacity text-lg px-8 py-6 text-white"
              >
                {t('btn_test_free')}
              </Button>
              <Button
                onClick={() => scrollToSection('#solucoes')}
                size="lg"
                variant="outline"
                className="border-primary/30 text-foreground hover:bg-primary/10 text-lg px-8 py-6"
              >
                {t('btn_view_features')}
              </Button>
            </div>
          </div>

          {/* Right Column - Image/Visual */}
          <div className="relative lg:block hidden animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <div className="relative w-full h-[500px] flex items-center justify-center">
              {/* Holographic Effect Placeholder */}
              <div className="relative w-[400px] h-[400px]">
                {/* Outer Glow */}
                <div className="absolute inset-0 bg-gradient-to-r from-[#7C3AED] via-[#FF2E9E] to-[#22D3EE] rounded-full blur-3xl opacity-40 animate-pulse-glow" />

                {/* Central Orb */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-64 h-64 rounded-full bg-gradient-to-br from-[#7C3AED]/80 via-[#FF2E9E]/60 to-[#22D3EE]/80 animate-float shadow-2xl relative overflow-hidden">
                    {/* Inner Light Rays */}
                    <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/20 to-transparent animate-pulse" />

                    {/* LIA Text */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-6xl font-bold text-white drop-shadow-2xl">LIA</span>
                    </div>
                  </div>
                </div>

                {/* Orbiting Particles */}
                {[...Array(8)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute top-1/2 left-1/2 w-3 h-3 bg-white rounded-full animate-orbit"
                    style={{
                      animationDelay: `${i * 0.5}s`,
                      animationDuration: '8s'
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;