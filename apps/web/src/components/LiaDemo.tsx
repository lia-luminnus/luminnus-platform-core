import { useState } from "react";
import { Bot, Send, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import liaAvatar from "@/assets/lia-assistant.png";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const LiaDemo = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const suggestedQuestions = [
    "O que a Luminnus faz?",
    "Como a Lia pode me ajudar?",
    "Quanto custa?",
    "Quais integrações vocês têm?",
    "Qual plano é melhor para mim?",
    "Ver planos recomendados"
  ];

  const responses: { [key: string]: string } = {
    "o que a luminnus faz?": "A Luminnus cria inteligências artificiais personalizadas para empresas. Eu sou uma delas! Posso te ajudar com atendimento, conteúdo ou relatórios. 🚀",
    "como a lia pode me ajudar?": "Posso automatizar seu atendimento 24h, responder clientes, agendar compromissos, integrar com seu CRM e muito mais. Deixa comigo! 😊",
    "quanto custa?": "Temos planos a partir de €27/mês (Start), €147/mês (Plus) e planos personalizados Pro a partir de €997/mês. Quer que eu te ajude a escolher o melhor para você? 💰",
    "quais integrações vocês têm?": "Me conecto com Telegram, HubSpot, RD Station, Pipedrive, Google Calendar, Outlook e muito mais! Trabalho 24h conectada às suas ferramentas. 🔗",
    "qual plano é melhor para mim?": "Ótima pergunta! 🎯\n\n• Start (€27/mês): Para quem está começando, 1 canal de atendimento\n• Plus (€147/mês): Para empresas em crescimento, múltiplos canais + IA avançada\n• Pro (€997+/mês): Totalmente personalizado para grandes operações\n\nClique em 'Ver Planos Recomendados' abaixo para conhecer todos os detalhes!",
    "ver planos recomendados": "Claro! Deixa eu te mostrar nossos planos:\n\n🌟 Start: Ideal para começar com automação básica\n💎 Plus: Nosso mais popular! Múltiplos canais + integrações ilimitadas\n🚀 Pro: Solução enterprise sob medida\n\nClique no botão 'Ver Planos Recomendados' abaixo para ver todos os detalhes e escolher o seu!",
    "default": "Ótima pergunta! Posso te ajudar com atendimento, agendamentos, integrações e automações. O que você gostaria de saber especificamente? 💡\n\nSe quiser, posso te recomendar o melhor plano para o seu negócio! 😊"
  };

  const handleSend = (question?: string) => {
    const userMessage = question || input;
    if (!userMessage.trim()) return;

    // Add user message
    const newMessages: Message[] = [...messages, { role: "user", content: userMessage }];
    setMessages(newMessages);
    setInput("");
    setIsTyping(true);

    // Simulate typing delay
    setTimeout(() => {
      const normalizedQuestion = userMessage.toLowerCase().trim();
      const response = responses[normalizedQuestion] || responses["default"];

      setMessages([...newMessages, { role: "assistant", content: response }]);
      setIsTyping(false);
    }, 1000 + Math.random() * 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <section id="demo" className="py-20 lg:py-32 relative overflow-hidden bg-[#0B0B0F]">
      <div className="absolute inset-0 bg-gradient-to-b from-[#0B0B0F] via-[#7C3AED]/5 to-[#0B0B0F]" />

      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center space-y-4 mb-12 animate-fade-in">
            <h2 className="text-4xl lg:text-6xl font-bold bg-gradient-to-r from-[#7C3AED] via-[#FF2E9E] to-[#22D3EE] bg-clip-text text-transparent">
              Converse com a LIA
            </h2>
            <p className="text-lg lg:text-xl text-white/70">
              Faça uma pergunta e veja como a Lia pode te ajudar
            </p>
          </div>

          {/* Chat Container */}
          <div className="rounded-2xl bg-white/5 backdrop-blur-lg border border-white/10 overflow-hidden shadow-[0_0_50px_rgba(124,58,237,0.2)]">
            {/* Messages Area */}
            <div className="h-[400px] overflow-y-auto p-6 space-y-4">
              {messages.length === 0 && (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center space-y-4">
                    <div className="relative w-16 h-16 mx-auto">
                      {/* Pulse Rings */}
                      <motion.div
                        className="absolute inset-0 rounded-full bg-magenta/30"
                        animate={{
                          scale: [1, 1.5, 1],
                          opacity: [0.6, 0, 0.6],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                      />
                      <motion.div
                        className="absolute inset-0 rounded-full bg-magenta/20"
                        animate={{
                          scale: [1, 2, 1],
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
                        <img src={liaAvatar} alt="Lia avatar" className="w-20 h-20 rounded-2xl object-cover object-top border border-white/10 shadow-2xl" />
                      </div>
                    </div>
                    <p className="text-white/60">Escolha uma pergunta abaixo ou digite a sua!</p>
                  </div>
                </div>
              )}

              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex gap-3 animate-fade-in ${message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                >
                  {message.role === "assistant" && (
                    <div className="flex-shrink-0 relative w-10 h-10">
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
                      <div className="relative z-10">
                        <img src={liaAvatar} alt="Lia avatar" className="w-12 h-12 rounded-2xl object-cover object-top border border-white/10 shadow-lg" />
                      </div>
                    </div>
                  )}

                  <div
                    className={`max-w-[80%] p-4 rounded-2xl ${message.role === "user"
                      ? "bg-gradient-to-r from-[#22D3EE]/20 to-[#22D3EE]/30 border border-[#22D3EE]/30 text-white"
                      : "bg-gradient-to-r from-[#7C3AED]/20 to-[#FF2E9E]/20 border border-[#7C3AED]/30 text-white/90"
                      }`}
                  >
                    <p className="leading-relaxed">{message.content}</p>
                  </div>

                  {message.role === "user" && (
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#22D3EE]/20 border border-[#22D3EE]/30 flex items-center justify-center">
                      <User className="w-6 h-6 text-[#22D3EE]" />
                    </div>
                  )}
                </div>
              ))}

              {isTyping && (
                <div className="flex gap-3 animate-fade-in">
                  <div className="flex-shrink-0 relative w-10 h-10">
                    {/* Pulse Rings */}
                    <motion.div
                      className="absolute inset-0 rounded-full bg-magenta/30"
                      animate={{
                        scale: [1, 1.4, 1],
                        opacity: [0.6, 0, 0.6],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    />
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#FF2E9E] flex items-center justify-center overflow-hidden border border-white/10 relative z-10">
                      <img src={liaAvatar} alt="Lia avatar" className="w-full h-full object-cover scale-[1.2] translate-y-[10%]" />
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-[#7C3AED]/20 to-[#FF2E9E]/20 border border-[#7C3AED]/30">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 rounded-full bg-white/60 animate-pulse" style={{ animationDelay: "0s" }} />
                      <div className="w-2 h-2 rounded-full bg-white/60 animate-pulse" style={{ animationDelay: "0.2s" }} />
                      <div className="w-2 h-2 rounded-full bg-white/60 animate-pulse" style={{ animationDelay: "0.4s" }} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Suggested Questions */}
            {messages.length === 0 && (
              <div className="px-6 pb-4 border-t border-white/10">
                <p className="text-sm text-white/60 mb-3 mt-4">Perguntas sugeridas:</p>
                <div className="flex flex-wrap gap-2">
                  {suggestedQuestions.map((question, index) => (
                    <button
                      key={index}
                      onClick={() => handleSend(question)}
                      className="px-4 py-2 text-sm rounded-full bg-white/5 border border-white/10 text-white/80 hover:bg-[#7C3AED]/20 hover:border-[#7C3AED]/50 transition-all"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* CTA para ver planos - aparece após conversar */}
            {messages.length > 0 && (
              <div className="px-6 pb-4 border-t border-white/10">
                <Link to="/planos">
                  <Button className="w-full mt-4 bg-gradient-to-r from-[#7C3AED] to-[#FF2E9E] hover:shadow-[0_0_30px_rgba(124,58,237,0.5)] border-0">
                    Ver Planos Recomendados →
                  </Button>
                </Link>
              </div>
            )}

            {/* Input Area */}
            <div className="p-4 border-t border-white/10 bg-white/5">
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Digite sua pergunta..."
                  className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-[#7C3AED] focus:ring-[#7C3AED]"
                  disabled={isTyping}
                />
                <Button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || isTyping}
                  className="bg-gradient-to-r from-[#7C3AED] to-[#FF2E9E] hover:shadow-[0_0_20px_rgba(124,58,237,0.5)] border-0"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LiaDemo;
