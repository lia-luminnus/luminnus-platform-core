import { GraduationCap, Lightbulb, DollarSign } from "lucide-react";

const FuturePersonas = () => {
  const personas = [
    {
      icon: GraduationCap,
      name: "LIA Professora",
      description: "Ensina e treina com IA"
    },
    {
      icon: Lightbulb,
      name: "LIA Criadora",
      description: "Roteiros, posts, copywriting"
    },
    {
      icon: DollarSign,
      name: "LIA Financeira/Contadora",
      description: "Controle financeiro e relatórios"
    }
  ];

  return (
    <section className="py-20 lg:py-32 relative overflow-hidden bg-[#0B0B0F]">
      <div className="absolute inset-0 bg-gradient-to-b from-[#0B0B0F] via-[#22D3EE]/5 to-[#0B0B0F]" />
      
      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <div className="text-center space-y-4 mb-16 animate-fade-in">
          <h2 className="text-4xl lg:text-6xl font-bold text-white">
            Outras Personas da LIA
          </h2>
          <div className="inline-block px-6 py-2 rounded-full bg-[#22D3EE]/10 border border-[#22D3EE]/30">
            <p className="text-lg text-[#22D3EE] font-semibold">Em Breve</p>
          </div>
          <p className="text-lg lg:text-xl text-white/70 max-w-2xl mx-auto">
            Estamos desenvolvendo novas personas da Lia para atender diferentes necessidades do seu negócio
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {personas.map((persona, index) => {
            const Icon = persona.icon;
            return (
              <div
                key={index}
                className="group relative p-8 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 overflow-hidden animate-fade-in"
                style={{ animationDelay: `${index * 0.15}s` }}
              >
                {/* Locked Overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent backdrop-blur-[2px] z-10 pointer-events-none" />
                
                {/* Coming Soon Badge */}
                <div className="absolute top-4 right-4 z-20">
                  <div className="px-3 py-1 rounded-full bg-[#22D3EE]/20 border border-[#22D3EE]/40">
                    <p className="text-xs text-[#22D3EE] font-semibold">Em Breve</p>
                  </div>
                </div>

                <div className="relative z-0">
                  {/* Icon */}
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-white/10 to-white/5 border border-white/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <Icon className="w-8 h-8 text-white/60" />
                  </div>

                  {/* Content */}
                  <h3 className="text-2xl font-bold text-white/80 mb-3">
                    {persona.name}
                  </h3>
                  <p className="text-white/60 leading-relaxed">
                    {persona.description}
                  </p>
                </div>

                {/* Glow Effect on Hover */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#7C3AED]/10 to-[#22D3EE]/10 blur-xl" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Info Text */}
        <div className="text-center mt-12">
          <p className="text-white/60 max-w-2xl mx-auto">
            Cada persona da Lia será especializada em uma área específica, mantendo a mesma inteligência, 
            empatia e eficiência que você já conhece.
          </p>
        </div>
      </div>
    </section>
  );
};

export default FuturePersonas;
