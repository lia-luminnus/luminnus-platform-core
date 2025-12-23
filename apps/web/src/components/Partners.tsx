import snodoLogo from "@/assets/snodo-logo.jpg";

const Partners = () => {
  const partners = [
    { name: "Snodo", logo: snodoLogo },
  ];

  return (
    <section id="parceiros" className="py-20 lg:py-32 relative overflow-hidden bg-[#0B0B0F]">
      <div className="absolute inset-0 bg-gradient-to-b from-[#0B0B0F] via-primary/5 to-[#0B0B0F]" />
      
      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <div className="text-center space-y-4 mb-16 animate-fade-in">
          <h2 className="text-4xl lg:text-6xl font-bold bg-gradient-to-r from-primary via-secondary to-magenta bg-clip-text text-transparent animate-gradient-shift bg-200%">
            Parceiros
          </h2>
          <p className="text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto">
            Conheça as empresas e marcas que confiam na Luminnus.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-6 mb-12">
          {partners.map((partner, index) => (
            <div
              key={partner.name}
              className="animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <img 
                src={partner.logo} 
                alt={partner.name}
                className="max-w-[150px] opacity-90 hover:opacity-100 hover:scale-105 transition-all duration-300"
              />
            </div>
          ))}
        </div>

        <div className="text-center">
          <a 
            href="#contato"
            className="inline-block bg-gradient-to-r from-primary to-secondary text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg hover:shadow-primary/30 transition-all duration-300"
          >
            Saiba mais →
          </a>
        </div>
      </div>
    </section>
  );
};

export default Partners;
