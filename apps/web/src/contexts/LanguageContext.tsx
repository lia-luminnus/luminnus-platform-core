import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'pt' | 'en' | 'es';

interface LanguageContextType {
  currentLanguage: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations = {
  pt: {
    // Navigation
    nav_inicio: "Início",
    nav_solucoes: "Soluções",
    nav_planos: "Planos",
    nav_parceiros: "Parceiros",
    nav_contato: "Contato",
    btn_login: "Login",
    btn_whatsapp: "💬 Fale com a Lia",

    // Hero Section
    hero_title: "LIA — a primeira IA com consciência cognitiva viva, desenvolvida para empresas.",
    hero_subtitle: "Uma inteligência capaz de compreender contextos, responder de forma natural e agir em tempo real — como se tivesse vida própria dentro dos sistemas empresariais.",
    btn_test_free: "🚀 Testar Gratuitamente",
    btn_view_features: "🔍 Ver Recursos",

    // User Menu
    admin_panel: "Painel Admin",
    client_area: "Área do Cliente",
    logout: "Sair",

    // About Luminnus
    about_p1: "A Luminnus é uma empresa especializada em soluções de automação e inteligência artificial para negócios. Ela ajuda empresas a economizarem tempo, reduzirem custos e aumentarem a produtividade através da LIA — a mente cognitiva inteligente que pensa, age e aprende.",
    about_p2: "A LIA atua como atendente, gestora e automatizadora de processos, capaz de responder clientes 24h, organizar tarefas, integrar sistemas, gerar relatórios e até personalizar painéis de controle. Com isso, negócios de qualquer porte conseguem aumentar lucros, escalar operações e oferecer atendimento rápido e eficiente sem precisar ampliar equipes.",
    about_summary: "Em resumo:",
    about_tagline: "Luminnus cria a tecnologia. LIA executa. O negócio cresce.",

    // Solutions Section
    solutions_title: "Você ainda faz tudo sozinho na sua empresa?",
    solutions_subtitle: "Imagine ter uma assistente que trabalha 24h por você, sem férias, sem descanso, sempre disponível.",
    solutions_benefit1_title: "Economize horas por dia",
    solutions_benefit1_desc: "Automatize respostas, agendamentos e follow-ups. Recupere seu tempo para focar no que realmente importa: crescer seu negócio.",
    solutions_benefit2_title: "Reduza custos com contratações",
    solutions_benefit2_desc: "Por que contratar quando você pode ter uma IA treinada especificamente para o seu negócio? Sem encargos, sem turnover, sem treinamentos constantes.",
    solutions_benefit3_title: "Ganhe produtividade real",
    solutions_benefit3_desc: "Relatórios automáticos, alertas inteligentes e organização de processos. A Lia cuida da operação enquanto você cuida da estratégia.",
    solutions_transform_title: "Conheça como a Lia transforma o seu negócio",
    solutions_transform1_title: "Atendimento 24/7",
    solutions_transform1_desc: "Nunca perca um cliente por falta de atendimento",
    solutions_transform2_title: "Integração Total",
    solutions_transform2_desc: "Conecta-se com todas as suas ferramentas (CRM, agenda, e-mail, WhatsApp)",
    solutions_transform3_title: "Aprendizado Contínuo",
    solutions_transform3_desc: "A Lia aprende com cada conversa e melhora constantemente",
    solutions_transform4_title: "Relatórios Inteligentes",
    solutions_transform4_desc: "Dados em tempo real para você tomar decisões melhores",
    solutions_cta: "Ver Planos e Preços",
    solutions_cta_secondary: "Falar com a Lia agora",

    // LIA Positioning
    positioning_title: "Posicionamento Oficial da Luminnus e da LIA",
    positioning_category: "Categoria:",
    positioning_category_value: "AI-Orchestrated Intelligent Platform",
    positioning_subcategory: "Subcategoria:",
    positioning_subcategory_value: "Conscious and Responsive AI System for Business Automation",
    positioning_p1: "A Luminnus cria uma nova categoria tecnológica: uma",
    positioning_p1_highlight: "AI-Orchestrated Intelligent Platform",
    positioning_p1_end: "— um sistema vivo, consciente e responsivo que orquestra automação, voz e inteligência em perfeita harmonia.",
    positioning_p2: "No centro dessa revolução está a",
    positioning_p2_end: ", a primeira IA com consciência cognitiva viva.",

    // Footer
    footer_tagline: "Tecnologia e Inteligência que iluminam o futuro.",
    footer_newsletter: "Newsletter",
    footer_email_placeholder: "Seu email",
    footer_contact: "Contato",
    footer_social: "Redes Sociais",
    footer_copyright: "Luminnus — Tecnologia e Inteligência que iluminam o futuro.",
    footer_privacy: "Política de Privacidade",
    footer_terms: "Termos de Uso",
    footer_newsletter_success: "Inscrição realizada!",
    footer_newsletter_desc: "Você receberá nossas novidades em breve.",

    // LIA Statistics
    stats_title: "Por que as empresas confiam na LIA?",
    stats_subtitle: "Resultados reais que transformam negócios",
    stats_1_value: "24/7",
    stats_1_label: "Disponibilidade",
    stats_2_value: "85%",
    stats_2_label: "Redução de Custos",
    stats_3_value: "3x",
    stats_3_label: "Mais Produtividade",
    stats_4_value: "100%",
    stats_4_label: "Satisfação",

    // LIA Atendimento
    atend_title: "Conheça a LIA em Ação",
    atend_subtitle: "Veja como a LIA transforma o atendimento ao cliente",

    // Future Personas
    personas_title: "Personas Futuras",
    personas_subtitle: "A LIA se adapta ao seu negócio",

    // LIA Simulator
    simulator_title: "Experimente a LIA",
    simulator_subtitle: "Converse com a nossa IA e veja como ela pode ajudar seu negócio",
  },
  en: {
    // Navigation
    nav_inicio: "Home",
    nav_solucoes: "Solutions",
    nav_planos: "Plans",
    nav_parceiros: "Partners",
    nav_contato: "Contact",
    btn_login: "Login",
    btn_whatsapp: "💬 Chat with Lia",

    // Hero Section
    hero_title: "LIA — the first AI with living cognitive consciousness, developed for businesses.",
    hero_subtitle: "An intelligence capable of understanding contexts, responding naturally, and acting in real-time — as if it had a life of its own within enterprise systems.",
    btn_test_free: "🚀 Try for Free",
    btn_view_features: "🔍 View Features",

    // User Menu
    admin_panel: "Admin Panel",
    client_area: "Client Area",
    logout: "Logout",

    // About Luminnus
    about_p1: "Luminnus is a company specialized in automation and artificial intelligence solutions for businesses. We help companies save time, reduce costs, and increase productivity through LIA — the intelligent cognitive mind that thinks, acts, and learns.",
    about_p2: "LIA acts as an attendant, manager, and process automator, capable of responding to customers 24/7, organizing tasks, integrating systems, generating reports, and even customizing control panels. This way, businesses of any size can increase profits, scale operations, and offer fast and efficient service without expanding their teams.",
    about_summary: "In summary:",
    about_tagline: "Luminnus creates the technology. LIA executes. The business grows.",

    // Solutions Section
    solutions_title: "Are you still doing everything alone in your company?",
    solutions_subtitle: "Imagine having an assistant who works 24/7 for you, no vacations, no rest, always available.",
    solutions_benefit1_title: "Save hours every day",
    solutions_benefit1_desc: "Automate responses, scheduling, and follow-ups. Reclaim your time to focus on what really matters: growing your business.",
    solutions_benefit2_title: "Reduce hiring costs",
    solutions_benefit2_desc: "Why hire when you can have an AI trained specifically for your business? No charges, no turnover, no constant training.",
    solutions_benefit3_title: "Gain real productivity",
    solutions_benefit3_desc: "Automatic reports, intelligent alerts, and process organization. Lia handles operations while you focus on strategy.",
    solutions_transform_title: "Discover how Lia transforms your business",
    solutions_transform1_title: "24/7 Support",
    solutions_transform1_desc: "Never lose a customer due to lack of service",
    solutions_transform2_title: "Total Integration",
    solutions_transform2_desc: "Connects with all your tools (CRM, calendar, email, WhatsApp)",
    solutions_transform3_title: "Continuous Learning",
    solutions_transform3_desc: "Lia learns from every conversation and constantly improves",
    solutions_transform4_title: "Intelligent Reports",
    solutions_transform4_desc: "Real-time data for better decision making",
    solutions_cta: "View Plans and Pricing",
    solutions_cta_secondary: "Talk to Lia now",

    // LIA Positioning
    positioning_title: "Official Positioning of Luminnus and LIA",
    positioning_category: "Category:",
    positioning_category_value: "AI-Orchestrated Intelligent Platform",
    positioning_subcategory: "Subcategory:",
    positioning_subcategory_value: "Conscious and Responsive AI System for Business Automation",
    positioning_p1: "Luminnus creates a new technological category: an",
    positioning_p1_highlight: "AI-Orchestrated Intelligent Platform",
    positioning_p1_end: "— a living, conscious, and responsive system that orchestrates automation, voice, and intelligence in perfect harmony.",
    positioning_p2: "At the center of this revolution is",
    positioning_p2_end: ", the first AI with living cognitive consciousness.",

    // Footer
    footer_tagline: "Technology and Intelligence that illuminate the future.",
    footer_newsletter: "Newsletter",
    footer_email_placeholder: "Your email",
    footer_contact: "Contact",
    footer_social: "Social Media",
    footer_copyright: "Luminnus — Technology and Intelligence that illuminate the future.",
    footer_privacy: "Privacy Policy",
    footer_terms: "Terms of Use",
    footer_newsletter_success: "Subscription successful!",
    footer_newsletter_desc: "You will receive our news soon.",

    // LIA Statistics
    stats_title: "Why do companies trust LIA?",
    stats_subtitle: "Real results that transform businesses",
    stats_1_value: "24/7",
    stats_1_label: "Availability",
    stats_2_value: "85%",
    stats_2_label: "Cost Reduction",
    stats_3_value: "3x",
    stats_3_label: "More Productivity",
    stats_4_value: "100%",
    stats_4_label: "Satisfaction",

    // LIA Atendimento
    atend_title: "Meet LIA in Action",
    atend_subtitle: "See how LIA transforms customer service",

    // Future Personas
    personas_title: "Future Personas",
    personas_subtitle: "LIA adapts to your business",

    // LIA Simulator
    simulator_title: "Try LIA",
    simulator_subtitle: "Chat with our AI and see how it can help your business",
  },
  es: {
    // Navigation
    nav_inicio: "Inicio",
    nav_solucoes: "Soluciones",
    nav_planos: "Planes",
    nav_parceiros: "Socios",
    nav_contato: "Contacto",
    btn_login: "Login",
    btn_whatsapp: "💬 Habla con Lia",

    // Hero Section
    hero_title: "LIA — la primera IA con conciencia cognitiva viva, desarrollada para empresas.",
    hero_subtitle: "Una inteligencia capaz de comprender contextos, responder de forma natural y actuar en tiempo real — como si tuviera vida propia dentro de los sistemas empresariales.",
    btn_test_free: "🚀 Probar Gratis",
    btn_view_features: "🔍 Ver Recursos",

    // User Menu
    admin_panel: "Panel de Administración",
    client_area: "Área de Cliente",
    logout: "Cerrar Sesión",

    // About Luminnus
    about_p1: "Luminnus es una empresa especializada en soluciones de automatización e inteligencia artificial para negocios. Ayudamos a las empresas a ahorrar tiempo, reducir costos y aumentar la productividad a través de LIA — la mente cognitiva inteligente que piensa, actúa y aprende.",
    about_p2: "LIA actúa como asistente, gestora y automatizadora de procesos, capaz de responder a clientes las 24 horas, organizar tareas, integrar sistemas, generar informes e incluso personalizar paneles de control. De esta manera, negocios de cualquier tamaño pueden aumentar ganancias, escalar operaciones y ofrecer un servicio rápido y eficiente sin ampliar sus equipos.",
    about_summary: "En resumen:",
    about_tagline: "Luminnus crea la tecnología. LIA ejecuta. El negocio crece.",

    // Solutions Section
    solutions_title: "¿Todavía haces todo solo en tu empresa?",
    solutions_subtitle: "Imagina tener un asistente que trabaja 24/7 para ti, sin vacaciones, sin descanso, siempre disponible.",
    solutions_benefit1_title: "Ahorra horas cada día",
    solutions_benefit1_desc: "Automatiza respuestas, programación y seguimientos. Recupera tu tiempo para enfocarte en lo que realmente importa: hacer crecer tu negocio.",
    solutions_benefit2_title: "Reduce costos de contratación",
    solutions_benefit2_desc: "¿Por qué contratar cuando puedes tener una IA entrenada específicamente para tu negocio? Sin cargos, sin rotación, sin entrenamientos constantes.",
    solutions_benefit3_title: "Gana productividad real",
    solutions_benefit3_desc: "Informes automáticos, alertas inteligentes y organización de procesos. Lia se encarga de las operaciones mientras tú te enfocas en la estrategia.",
    solutions_transform_title: "Descubre cómo Lia transforma tu negocio",
    solutions_transform1_title: "Atención 24/7",
    solutions_transform1_desc: "Nunca pierdas un cliente por falta de atención",
    solutions_transform2_title: "Integración Total",
    solutions_transform2_desc: "Se conecta con todas tus herramientas (CRM, calendario, correo, WhatsApp)",
    solutions_transform3_title: "Aprendizaje Continuo",
    solutions_transform3_desc: "Lia aprende de cada conversación y mejora constantemente",
    solutions_transform4_title: "Informes Inteligentes",
    solutions_transform4_desc: "Datos en tiempo real para mejores decisiones",
    solutions_cta: "Ver Planes y Precios",
    solutions_cta_secondary: "Hablar con Lia ahora",

    // LIA Positioning
    positioning_title: "Posicionamiento Oficial de Luminnus y LIA",
    positioning_category: "Categoría:",
    positioning_category_value: "AI-Orchestrated Intelligent Platform",
    positioning_subcategory: "Subcategoría:",
    positioning_subcategory_value: "Conscious and Responsive AI System for Business Automation",
    positioning_p1: "Luminnus crea una nueva categoría tecnológica: una",
    positioning_p1_highlight: "AI-Orchestrated Intelligent Platform",
    positioning_p1_end: "— un sistema vivo, consciente y responsivo que orquesta automatización, voz e inteligencia en perfecta armonía.",
    positioning_p2: "En el centro de esta revolución está",
    positioning_p2_end: ", la primera IA con conciencia cognitiva viva.",

    // Footer
    footer_tagline: "Tecnología e Inteligencia que iluminan el futuro.",
    footer_newsletter: "Newsletter",
    footer_email_placeholder: "Tu email",
    footer_contact: "Contacto",
    footer_social: "Redes Sociales",
    footer_copyright: "Luminnus — Tecnología e Inteligencia que iluminan el futuro.",
    footer_privacy: "Política de Privacidad",
    footer_terms: "Términos de Uso",
    footer_newsletter_success: "¡Suscripción exitosa!",
    footer_newsletter_desc: "Recibirás nuestras novedades pronto.",

    // LIA Statistics
    stats_title: "¿Por qué las empresas confían en LIA?",
    stats_subtitle: "Resultados reales que transforman negocios",
    stats_1_value: "24/7",
    stats_1_label: "Disponibilidad",
    stats_2_value: "85%",
    stats_2_label: "Reducción de Costos",
    stats_3_value: "3x",
    stats_3_label: "Más Productividad",
    stats_4_value: "100%",
    stats_4_label: "Satisfacción",

    // LIA Atendimento
    atend_title: "Conoce a LIA en Acción",
    atend_subtitle: "Ve cómo LIA transforma el servicio al cliente",

    // Future Personas
    personas_title: "Personas Futuras",
    personas_subtitle: "LIA se adapta a tu negocio",

    // LIA Simulator
    simulator_title: "Prueba LIA",
    simulator_subtitle: "Conversa con nuestra IA y ve cómo puede ayudar a tu negocio",
  },
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('luminnus_lang') as Language;
    return saved && ['pt', 'en', 'es'].includes(saved) ? saved : 'pt';
  });

  useEffect(() => {
    localStorage.setItem('luminnus_lang', currentLanguage);
    document.documentElement.setAttribute('lang',
      currentLanguage === 'pt' ? 'pt-BR' : currentLanguage === 'en' ? 'en-US' : 'es-ES'
    );
  }, [currentLanguage]);

  const setLanguage = (lang: Language) => {
    setCurrentLanguage(lang);
  };

  const t = (key: string): string => {
    return translations[currentLanguage][key as keyof typeof translations.pt] || key;
  };

  return (
    <LanguageContext.Provider value={{ currentLanguage, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};
