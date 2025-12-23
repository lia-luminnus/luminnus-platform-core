const About = () => {
  return (
    <section id="solucoes" className="py-20 lg:py-32 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-secondary/5 to-background" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-secondary/10 rounded-full blur-[150px] animate-pulse-glow" />
      
      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <div className="max-w-4xl mx-auto text-center space-y-8 animate-fade-in">
          <h2 className="text-4xl lg:text-6xl font-bold bg-gradient-to-r from-secondary via-primary to-magenta bg-clip-text text-transparent animate-gradient-shift bg-200%">
            Inovação com Propósito
          </h2>
          
          <div className="space-y-6 text-lg lg:text-xl text-muted-foreground leading-relaxed">
            <p>
              A <span className="text-primary font-semibold">Luminnus</span> é uma empresa de consultoria 
              e tecnologia especializada em automação, IA e integração de sistemas corporativos.
            </p>
            
            <p>
              Nosso foco é desenvolver <span className="text-secondary font-semibold">soluções acessíveis 
              e inteligentes</span> para pequenas e médias empresas.
            </p>
            
            <p className="text-xl lg:text-2xl font-medium text-foreground pt-4">
              Acreditamos que a tecnologia deve trabalhar por você — e não o contrário.
            </p>
          </div>

          <div className="flex justify-center gap-4 pt-8">
            <div className="w-16 h-1 bg-gradient-to-r from-transparent via-primary to-transparent animate-pulse" />
            <div className="w-16 h-1 bg-gradient-to-r from-transparent via-secondary to-transparent animate-pulse" style={{ animationDelay: "0.5s" }} />
            <div className="w-16 h-1 bg-gradient-to-r from-transparent via-accent to-transparent animate-pulse" style={{ animationDelay: "1s" }} />
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;
