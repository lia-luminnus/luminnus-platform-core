import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, MessageSquare, Calendar, Database, Clock, Zap, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import liaImage from "@/assets/lia-assistant-new.png";
import liaAvatar from "@/assets/lia-assistant.png";

const LiaAtendimento = () => {
  const [activeQuestion, setActiveQuestion] = useState<number | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [liaResponse, setLiaResponse] = useState<{ text: string[]; cta?: boolean }>({
    text: [
      "Olá! 😊 Sou a Lia e posso automatizar todo o seu atendimento. Trabalho 24h por dia respondendo clientes, agendando reuniões e integrando com suas ferramentas favoritas.",
      "Quer que eu analise seu caso e recomende o melhor plano para sua empresa?"
    ],
    cta: true
  });

  const features = [
    { icon: MessageSquare, text: "Atende por WhatsApp, chat, voz ou e-mail" },
    { icon: Zap, text: "Responde FAQs e faz onboarding interativo" },
    { icon: Calendar, text: "Agenda compromissos com Google Calendar" },
    { icon: Database, text: "Integra com CRMs (HubSpot, RD Station, Pipedrive)" },
    { icon: Clock, text: "Follow-ups automáticos inteligentes" },
    { icon: Bot, text: "Atua 24h com linguagem natural e profissional" }
  ];

  const suggestedQuestions = [
    {
      q: "Como a Lia pode ajudar meu negócio?",
      a: "Eu posso reduzir seu tempo de resposta para zero, qualificar leads automaticamente e garantir que nenhum cliente fique sem atenção, mesmo às 3 da manhã! 🚀"
    },
    {
      q: "Quais integrações a Lia possui?",
      a: "Conecto nativamente com WhatsApp, CRMs (RD Station, HubSpot), Google Calendar e muito mais via API. Automação de ponta a ponta! 🔗"
    },
    {
      q: "A Lia funciona 24 horas?",
      a: "Exatamente! Nunca durmo, não tiro férias e mantenho o mesmo padrão de excelência em cada atendimento, 24 horas por dia, 7 dias por semana. ⏰"
    }
  ];

  const handleQuestionClick = (index: number) => {
    if (isTyping) return;
    setActiveQuestion(index);
    setIsTyping(true);

    // Simula tempo de resposta
    setTimeout(() => {
      setLiaResponse({
        text: [suggestedQuestions[index].a],
        cta: true
      });
      setIsTyping(false);
    }, 1200);
  };

  return (
    <section id="lia" className="py-20 lg:py-32 relative overflow-hidden bg-gradient-to-b from-[#0B0B0F] to-[#0D0D15]">
      {/* Background Decorativo */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-[#7C3AED]/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-[#FF2E9E]/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        {/* Título da Seção */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center space-y-4 mb-16"
        >
          <h2 className="text-4xl lg:text-7xl font-bold text-white tracking-tight">
            LIA <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#7C3AED] to-[#FF2E9E]">Atendimento</span>
          </h2>
          <p className="text-xl text-white/60 max-w-2xl mx-auto">Sua empresa sempre online e inteligente</p>
        </motion.div>

        {/* Layout Principal */}
        <div className="grid lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto mb-20">

          {/* Coluna Esquerda: Personagem */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="relative group"
          >
            <div className="relative z-10 rounded-3xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur-sm">
              <motion.img
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                src={liaImage}
                alt="Lia - Assistente Virtual"
                className="w-full h-auto aspect-[4/5] object-cover object-top"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0F] via-transparent to-transparent opacity-60" />
            </div>

            {/* Efeitos de Brilho Dinâmicos */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-[#7C3AED] to-[#FF2E9E] rounded-[2rem] blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200 animate-pulse" />
            <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-[#7C3AED] rounded-full blur-3xl opacity-40 animate-pulse" />
          </motion.div>

          {/* Coluna Direita: Interface Interativa */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="flex flex-col h-full"
          >
            {/* Pills de Categorias */}
            <div className="flex flex-wrap gap-2 mb-8">
              {["WhatsApp & Chat", "Agendamentos", "Integrações CRM"].map((label, idx) => (
                <span key={idx} className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/80 text-xs font-medium backdrop-blur-md">
                  {label}
                </span>
              ))}
            </div>

            {/* Simulação de Chat Interface */}
            <div className="flex-1 space-y-6">
              <div className="space-y-4">
                <p className="text-white/40 text-xs font-bold uppercase tracking-widest pl-1">Escolha um tópico:</p>
                <div className="grid gap-3">
                  {suggestedQuestions.map((item, index) => (
                    <motion.button
                      key={index}
                      whileHover={{ x: 8 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleQuestionClick(index)}
                      className={`text-left p-4 rounded-2xl border transition-all duration-300 flex items-center justify-between group
                        ${activeQuestion === index
                          ? 'bg-[#7C3AED]/20 border-[#7C3AED]/50 text-white'
                          : 'bg-white/5 border-white/5 text-white/60 hover:border-white/20 hover:bg-white/[0.08]'}`}
                    >
                      <span className="text-sm font-medium">{item.q}</span>
                      <ArrowRight className={`w-4 h-4 transition-transform ${activeQuestion === index ? 'translate-x-0 opacity-100' : '-translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100'}`} />
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Balão de Resposta Dynamic */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={liaResponse.text[0] + isTyping}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl shadow-2xl relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-4">
                    <div className="relative">
                      {/* Pulse Rings */}
                      <motion.div
                        className="absolute inset-0 rounded-2xl bg-magenta/30"
                        animate={{
                          scale: [1, 1.2, 1],
                          opacity: [0.6, 0, 0.6],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                      />
                      <motion.div
                        className="absolute inset-0 rounded-2xl bg-magenta/20"
                        animate={{
                          scale: [1, 1.5, 1],
                          opacity: [0.4, 0, 0.4],
                        }}
                        transition={{
                          duration: 3,
                          repeat: Infinity,
                          ease: "easeInOut",
                          delay: 0.5,
                        }}
                      />

                      <div className="relative z-10">
                        <img
                          src={liaAvatar}
                          alt="Lia Avatar"
                          className="w-14 h-14 rounded-2xl object-cover object-top shadow-[0_0_15px_rgba(255,46,158,0.4)]"
                        />
                      </div>
                    </div>
                  </div>

                  {isTyping ? (
                    <div className="flex items-center gap-2 py-4">
                      <div className="flex gap-1">
                        <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 bg-[#7C3AED] rounded-full" />
                        <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 bg-[#7C3AED] rounded-full" />
                        <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 bg-[#7C3AED] rounded-full" />
                      </div>
                      <span className="text-white/40 text-xs font-medium">Lia está digitando...</span>
                    </div>
                  ) : (
                    <div className="space-y-4 pr-10">
                      {liaResponse.text.map((t, i) => (
                        <p key={i} className="text-white/90 text-base leading-relaxed font-light">{t}</p>
                      ))}

                      {liaResponse.cta && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.3 }}
                          className="pt-4"
                        >
                          <Button
                            onClick={() => window.location.href = '/planos'}
                            className="bg-gradient-to-r from-[#7C3AED] to-[#FF2E9E] hover:opacity-90 transition-all text-white font-bold h-14 px-8 rounded-2xl w-full sm:w-auto shadow-lg shadow-[#7C3AED]/20"
                          >
                            Ver Planos Recomendados
                            <ArrowRight className="ml-2 w-5 h-5" />
                          </Button>
                        </motion.div>
                      )}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        </div>

        {/* Features Grid Modernizada */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 max-w-7xl mx-auto">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -5 }}
                className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.05] hover:border-[#7C3AED]/30 transition-all flex flex-col items-center text-center group"
              >
                <div className="p-3 rounded-xl bg-white/5 mb-4 group-hover:bg-[#7C3AED]/10 transition-colors">
                  <Icon className="w-6 h-6 text-[#22D3EE]" />
                </div>
                <p className="text-white/60 text-xs leading-snug group-hover:text-white/90 transition-colors">
                  {feature.text}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default LiaAtendimento;
