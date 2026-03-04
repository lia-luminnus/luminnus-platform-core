import { useLanguage } from "@/contexts/LanguageContext";

const LiaStatistics = () => {
  const { currentLanguage } = useLanguage();

  const statisticsByLang = {
    pt: [
      { icon: "⚡", title: "78%", subtitle: "Redução no tempo gasto com tarefas administrativas repetitivas." },
      { icon: "💰", title: "40%–60%", subtitle: "Economia média em custos operacionais de atendimento e suporte." },
      { icon: "📈", title: "3x–5x", subtitle: "Aumento médio de produtividade com automação inteligente." },
      { icon: "⏱️", title: "<2s", subtitle: "Tempo de resposta automatizado em múltiplos atendimentos simultâneos." },
      { icon: "🔗", title: "+1000", subtitle: "Integrações com sistemas como Telegram, CRMs e ERPs." },
      { icon: "🧠", title: "IA Treinável", subtitle: "Memória contextual que aprende padrões específicos de cada empresa." },
      { icon: "📊", title: "Dashboard em tempo real", subtitle: "Métricas, gráficos e relatórios automáticos integrados." },
      { icon: "🌐", title: "99,9% uptime", subtitle: "Disponibilidade 24h/dia sem pausas." },
      { icon: "🛠️", title: "1–3 dias", subtitle: "Tempo médio de implantação da LIA, conforme o porte do negócio." }
    ],
    en: [
      { icon: "⚡", title: "78%", subtitle: "Reduction in time spent on repetitive administrative tasks." },
      { icon: "💰", title: "40%–60%", subtitle: "Average savings in customer service and support operational costs." },
      { icon: "📈", title: "3x–5x", subtitle: "Average productivity increase with intelligent automation." },
      { icon: "⏱️", title: "<2s", subtitle: "Automated response time for multiple simultaneous services." },
      { icon: "🔗", title: "+1000", subtitle: "Integrations with systems like Telegram, CRMs, and ERPs." },
      { icon: "🧠", title: "Trainable AI", subtitle: "Contextual memory that learns specific patterns from each company." },
      { icon: "📊", title: "Real-time Dashboard", subtitle: "Integrated metrics, charts, and automatic reports." },
      { icon: "🌐", title: "99.9% uptime", subtitle: "24/7 availability without breaks." },
      { icon: "🛠️", title: "1–3 days", subtitle: "Average LIA implementation time, depending on business size." }
    ],
    es: [
      { icon: "⚡", title: "78%", subtitle: "Reducción en el tiempo dedicado a tareas administrativas repetitivas." },
      { icon: "💰", title: "40%–60%", subtitle: "Ahorro promedio en costos operativos de atención y soporte." },
      { icon: "📈", title: "3x–5x", subtitle: "Aumento promedio de productividad con automatización inteligente." },
      { icon: "⏱️", title: "<2s", subtitle: "Tiempo de respuesta automatizado en múltiples atenciones simultáneas." },
      { icon: "🔗", title: "+1000", subtitle: "Integraciones con sistemas como Telegram, CRMs y ERPs." },
      { icon: "🧠", title: "IA Entrenable", subtitle: "Memoria contextual que aprende patrones específicos de cada empresa." },
      { icon: "📊", title: "Dashboard en tiempo real", subtitle: "Métricas, gráficos e informes automáticos integrados." },
      { icon: "🌐", title: "99,9% uptime", subtitle: "Disponibilidad 24/7 sin interrupciones." },
      { icon: "🛠️", title: "1–3 días", subtitle: "Tiempo promedio de implementación de LIA, según el tamaño del negocio." }
    ]
  };

  const headersByLang = {
    pt: { title: "📊 Resultados Reais da LIA", subtitle: "Uma plataforma consciente e cognitiva que transforma empresas em potências automatizadas." },
    en: { title: "📊 Real Results with LIA", subtitle: "A conscious and cognitive platform that transforms companies into automated powerhouses." },
    es: { title: "📊 Resultados Reales con LIA", subtitle: "Una plataforma consciente y cognitiva que transforma empresas en potencias automatizadas." }
  };

  const statistics = statisticsByLang[currentLanguage] || statisticsByLang.pt;
  const headers = headersByLang[currentLanguage] || headersByLang.pt;

  return (
    <section
      id="lia-numeros"
      className="relative overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, #0B0B0D 0%, #111111 100%)',
        padding: '100px 5%'
      }}
    >
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] animate-pulse-glow" />
        <div className="absolute bottom-1/3 right-1/4 w-[500px] h-[500px] bg-secondary/10 rounded-full blur-[120px] animate-pulse-glow" style={{ animationDelay: '1s' }} />
      </div>

      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <div className="max-w-7xl mx-auto space-y-16 animate-fade-in">
          {/* Header */}
          <div className="text-center space-y-4">
            <h2 className="text-4xl lg:text-6xl font-bold text-white">
              {headers.title}
            </h2>
            <p className="text-xl lg:text-2xl text-white/70 max-w-4xl mx-auto">
              {headers.subtitle}
            </p>
          </div>

          {/* Statistics Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-12">
            {statistics.map((stat, index) => (
              <div
                key={index}
                className="group p-8 rounded-2xl bg-white/5 backdrop-blur-lg border border-white/10 hover:border-primary/40 transition-all duration-300 hover:scale-105 hover:bg-white/10 animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="space-y-4">
                  {/* Icon */}
                  <div className="text-5xl group-hover:scale-110 transition-transform duration-300">
                    {stat.icon}
                  </div>

                  {/* Title */}
                  <h3 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-[#7C3AED] via-[#FF2E9E] to-[#22D3EE] bg-clip-text text-transparent">
                    {stat.title}
                  </h3>

                  {/* Subtitle */}
                  <p className="text-white/80 text-base lg:text-lg leading-relaxed">
                    {stat.subtitle}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default LiaStatistics;
