import { Bot, MessageSquare, Calendar, Database, Clock, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import liaImage from "@/assets/lia-assistant-new.png";
const LiaAtendimento = () => {
  const features = [{
    icon: MessageSquare,
    text: "Atende por WhatsApp, chat, voz ou e-mail"
  }, {
    icon: Zap,
    text: "Responde FAQs e faz onboarding interativo"
  }, {
    icon: Calendar,
    text: "Agenda compromissos com Google Calendar"
  }, {
    icon: Database,
    text: "Integra com CRMs (HubSpot, RD Station, Pipedrive)"
  }, {
    icon: Clock,
    text: "Follow-ups automáticos inteligentes"
  }, {
    icon: Bot,
    text: "Atua 24h com linguagem natural e profissional"
  }];
  const suggestedQuestions = ["Como a Lia pode ajudar meu negócio?", "Quais integrações a Lia possui?", "A Lia funciona 24 horas?"];
  return <section id="lia" className="py-20 lg:py-32 relative overflow-hidden bg-gradient-to-b from-[#0B0B0F] to-[#1A1A24]">
      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        
        {/* Título da Seção */}
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-4xl lg:text-6xl font-bold text-white">
            LIA Atendimento
          </h2>
          <p className="text-xl text-white/70">Sua empresa disponível 24 horas</p>
        </div>

        {/* Layout de 2 Colunas: Imagem da Lia + Chat */}
        <div className="grid lg:grid-cols-2 gap-8 items-start max-w-6xl mx-auto mb-12">
          
          {/* Coluna Esquerda: Imagem da Lia */}
          <div className="flex items-center justify-center lg:justify-end">
            <div className="relative">
              <img src={liaImage} alt="Lia - Assistente Virtual Inteligente" className="w-full max-w-md rounded-2xl shadow-[0_0_80px_rgba(124,58,237,0.4)] hover:shadow-[0_0_100px_rgba(124,58,237,0.7)] hover:scale-105 transition-all duration-500 cursor-pointer" />
              <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-gradient-to-br from-[#7C3AED] to-[#FF2E9E] rounded-full blur-3xl opacity-50 animate-pulse-glow" />
            </div>
          </div>

          {/* Coluna Direita: Chat Interface */}
          <div className="flex flex-col justify-center">
            {/* Features em Pills */}
            <div className="flex flex-wrap gap-3 mb-6">
              <span className="px-4 py-2 rounded-full bg-[#7C3AED]/20 border border-[#7C3AED]/40 text-white/90 text-sm">
                💬 WhatsApp & Chat
              </span>
              <span className="px-4 py-2 rounded-full bg-[#FF2E9E]/20 border border-[#FF2E9E]/40 text-white/90 text-sm">
                📅 Agendamentos
              </span>
              <span className="px-4 py-2 rounded-full bg-[#22D3EE]/20 border border-[#22D3EE]/40 text-white/90 text-sm">
                🔗 Integrações CRM
              </span>
            </div>

            {/* Perguntas Sugeridas */}
            <div className="space-y-3 mb-6">
              <p className="text-white/70 text-sm font-semibold mb-3">Perguntas sugeridas:</p>
              {suggestedQuestions.map((question, index) => <button key={index} className="w-full text-left p-4 rounded-xl bg-white/5 border border-white/10 hover:border-[#7C3AED]/50 hover:bg-white/10 transition-all text-white/80">
                  {question}
                </button>)}
            </div>

            {/* Resposta da Lia com CTA */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-[#7C3AED]/10 to-[#FF2E9E]/10 backdrop-blur-lg border border-[#7C3AED]/30">
              <div className="flex items-start gap-4 mb-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#FF2E9E] flex items-center justify-center">
                  <Bot className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-white/90 leading-relaxed mb-3">
                    "Olá! 😊 Sou a Lia e posso automatizar todo o seu atendimento. Trabalho 24h por dia respondendo clientes, agendando reuniões e integrando com suas ferramentas favoritas."
                  </p>
                  <p className="text-white/80 leading-relaxed">
                    "Quer que eu analise seu caso e recomende o melhor plano para sua empresa?"
                  </p>
                </div>
              </div>
              
              <Button onClick={() => window.location.href = '/planos'} className="w-full bg-gradient-to-r from-[#7C3AED] to-[#FF2E9E] hover:shadow-[0_0_30px_rgba(124,58,237,0.6)] transition-all border-0 text-lg h-12">
                Ver Planos Recomendados 🚀
              </Button>
            </div>
          </div>
        </div>

        {/* Features Grid abaixo (mantido mas mais compacto) */}
        <div className="grid md:grid-cols-3 gap-4 max-w-5xl mx-auto">
          {features.map((feature, index) => {
          const Icon = feature.icon;
          return <div key={index} className="p-4 rounded-lg bg-white/5 border border-white/10 hover:border-[#7C3AED]/30 transition-all">
                <Icon className="w-5 h-5 text-[#22D3EE] mb-2" />
                <p className="text-white/80 text-sm">{feature.text}</p>
              </div>;
        })}
        </div>
      </div>
    </section>;
};
export default LiaAtendimento;