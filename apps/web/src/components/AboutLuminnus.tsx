import { useLanguage } from "@/contexts/LanguageContext";

const AboutLuminnus = () => {
  const { t } = useLanguage();

  return (
    <section
      id="about-luminnus"
      className="relative overflow-hidden"
      style={{
        background: '#0B0B0D',
        color: '#FFFFFF',
        padding: '100px 5%'
      }}
    >
      {/* Background Effect */}
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[150px] animate-pulse-glow" />
      </div>

      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
          <div className="space-y-6 text-lg lg:text-xl leading-relaxed">
            <p>{t('about_p1')}</p>
            <p>{t('about_p2')}</p>

            <p className="text-2xl lg:text-3xl font-semibold pt-6 text-center">
              <span className="bg-gradient-to-r from-[#7C3AED] via-[#FF2E9E] to-[#22D3EE] bg-clip-text text-transparent">
                {t('about_summary')}
              </span>
              <br />
              <span className="text-white mt-2 block">
                {t('about_tagline').split('. ')[0]}. <span className="font-bold text-primary">{t('about_tagline').split('. ')[1]}.</span> {t('about_tagline').split('. ')[2]}
              </span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutLuminnus;
