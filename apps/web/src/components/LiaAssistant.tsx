import { Button } from "@/components/ui/button";
import liaImage from "@/assets/lia-assistant.png";
const LiaAssistant = () => {
  const scrollToPlans = () => {
    const element = document.getElementById("planos");
    if (element) {
      element.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }
  };
  return <section id="lia" className="py-20 lg:py-32 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-magenta/5 to-background" />
      
      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Lia Image with Holographic Effect */}
          <div className="relative animate-fade-in order-2 lg:order-1">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl hover:shadow-[0_0_60px_rgba(255,140,0,0.6)] transition-all duration-500">
              {/* Lighter gradient background */}
              <div className="absolute inset-0 bg-gradient-to-br from-purple-600/40 via-background to-magenta-600/40" />
              
              <img src={liaImage} alt="Lia - Assistente Virtual Inteligente da Luminnus" className="w-full h-auto object-cover relative z-10" />
              
              {/* Subtle Holographic Overlay */}
              <div className="absolute inset-0 bg-gradient-to-tr from-orange-400/10 via-transparent to-primary/10 z-20" />
              
              {/* Ambient Glow Effect */}
              <div className="absolute -inset-1 bg-gradient-to-r from-orange-400/50 via-primary/30 to-magenta/50 rounded-2xl blur-xl opacity-60 animate-pulse-glow" />
            </div>
          </div>

          {/* Text Content */}
          <div className="space-y-6 lg:space-y-8 animate-fade-in order-1 lg:order-2">
            <h2 className="text-4xl lg:text-6xl font-bold">
              Conheça a{" "}
              <span className="bg-gradient-to-r from-magenta via-primary to-secondary bg-clip-text text-transparent">
                Lia Assistant
              </span>
            </h2>
            
            <p className="text-lg lg:text-xl text-muted-foreground leading-relaxed">
              Lia é a assistente virtual da Luminnus. <span className="text-accent font-semibold">Inteligente,  e eficiente</span>, ela ajuda empresas a economizar tempo, automatizar tarefas e 
              atender clientes 24h por dia.
            </p>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 mt-2 rounded-full bg-primary animate-pulse-glow" />
                <p className="text-foreground">Automação de tarefas repetitivas</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 mt-2 rounded-full bg-secondary animate-pulse-glow" />
                <p className="text-foreground">Atendimento inteligente 24/7</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 mt-2 rounded-full bg-accent animate-pulse-glow" />
                <p className="text-foreground">Integração com seus sistemas</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 mt-2 rounded-full bg-magenta animate-pulse-glow" />
                <p className="text-foreground">Relatórios e análises em tempo real</p>
              </div>
            </div>

            <Button onClick={scrollToPlans} size="lg" className="text-lg h-14 px-8 bg-gradient-to-r from-magenta to-primary hover:shadow-[0_0_40px_rgba(255,46,158,0.6)] transition-all">
              Ver Planos da Lia →
            </Button>
          </div>
        </div>
      </div>
    </section>;
};
export default LiaAssistant;