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
    nav_how_it_works: "Como Funciona",
    nav_solucoes: "Soluções",
    nav_planos: "Planos",
    nav_parceiros: "Parceiros",
    nav_contato: "Contato",
    btn_login: "Entrar",
    btn_test_free_nav: "Testar Grátis",

    // Hero Section
    hero_badge: "79% dos leads abandonam sites sem resposta em 5 min",
    hero_title_1: "Sua IA que ",
    hero_title_highlight: "atende, qualifica e agenda",
    hero_title_2: " leads no seu site 24h",
    hero_subtitle: "Você gasta em anúncios, mas quantos leads estão saindo do seu site sem resposta? A Luminnus coloca uma IA treinada no seu negócio para responder, qualificar e agendar — em segundos.",
    hero_stat1: "mais conversões",
    hero_stat2: "tempo de resposta",
    hero_stat3: "sem pausas",
    hero_btn_primary: "Testar Grátis por 7 Dias",
    hero_btn_secondary: "Como Funciona",
    hero_disclaimer: "Sem compromisso • Cartão necessário • Cancele quando quiser",
    hero_widget_title: "LIA — Assistente Inteligente",
    hero_widget_online: "Online agora",
    hero_widget_msg1: "Olá! Sou a LIA, assistente inteligente da empresa. Como posso ajudar? 😊",
    hero_widget_user_msg: "Quero saber mais sobre os serviços",
    hero_widget_msg2: "Claro! Temos várias opções. Para eu te recomendar a melhor, posso agendar uma demonstração?",
    hero_widget_btn: "Agendar Agora",
    hero_widget_input: "Digite sua mensagem...",
    hero_title: "LIA — a primeira IA com consciência cognitiva viva, desenvolvida para empresas.",
    hero_subtitle_old: "Uma inteligência capaz de compreender contextos, responder de forma natural e agir em tempo real — como se tivesse vida própria dentro dos sistemas empresariais.",
    btn_test_free: "🚀 Entrar na demo",
    btn_view_features: "Quanto custa não ter a LIA?",
    discovery_title: "O Futuro do seu Negócio começa aqui",
    discovery_subtitle: "Lia não é apenas uma IA. Ela é a evolução da consciência empresarial.",
    calc_title: "Quanto custa não ter a Lia?",
    calc_subtitle: "Calcule agora o impacto financeiro da ineficiência no seu atendimento.",
    calc_label_tickets: "Atendimentos por mês",
    calc_label_hours: "Horas gastas por atendimento",
    calc_label_cost: "Custo por hora (MDO)",
    calc_result_loss: "Você está perdendo anualmente:",
    calc_cta: "Pare de perder dinheiro agora",

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
    solutions_transform2_desc: "Conecta-se com todas as suas ferramentas (CRM, agenda, e-mail, Telegram)",
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
    sim_title: "💡 Simule seus Resultados com a LIA",
    sim_subtitle: "Descubra quanto tempo, dinheiro e produtividade sua empresa pode ganhar automatizando com inteligência artificial.",
    sim_label_biz: "Tipo de negócio:",
    sim_opt_biz1: "Profissional Autônomo",
    sim_opt_biz2: "Pequena Empresa",
    sim_opt_biz3: "Média Empresa",
    sim_opt_biz4: "Grande Empresa",
    sim_label_emp: "Número de colaboradores:",
    sim_opt_emp1: "1 pessoa",
    sim_opt_emp2: "2 a 5 pessoas",
    sim_opt_emp3: "6 a 15 pessoas",
    sim_opt_emp4: "Mais de 15 pessoas",
    sim_label_hours: "Horas semanais gastas com atendimento e e-mails:",
    sim_opt_hours1: "Até 10h",
    sim_opt_hours2: "Entre 10h e 30h",
    sim_opt_hours3: "Mais de 30h",
    sim_btn_calc: "Calcular Resultados",
    sim_res_title: "📊 Resultados Estimados",
    sim_res_subtitle: "Com base nas informações inseridas, veja o impacto que a LIA pode gerar no seu negócio.",
    sim_res_time: "h/semana",
    sim_res_time_label: "Tempo economizado",
    sim_res_cost: "/mês",
    sim_res_cost_label: "Redução de custos",
    sim_res_prod_label: "Aumento de produtividade",
    sim_btn_plans: "Ver Planos Recomendados →",

    // Problem Section
    problem_title_main: "O seu maior gargalo não é o tráfego. É o",
    problem_title_highlight: "atendimento.",
    problem_subtitle: "Enquanto a sua equipe está ocupada, o seu site converte muito menos do que poderia. Veja a realidade:",
    problem_card1_title: "97% dos visitantes saem sem falar",
    problem_card1_desc: "O tráfego chega, mas a fricção de preencher formulários longos ou esperar e-mails afasta a maioria dos seus potenciais clientes.",
    problem_card2_title: "Tempo de resposta: > 5 min",
    problem_card2_desc: "As chances de converter um lead caem 10x se você demorar mais de 5 minutos para responder. A maioria já foi para o concorrente.",
    problem_card3_title: "Custo por lead vai para o ralo",
    problem_card3_desc: "Você paga €3 a €10 por cada clique. Se o lead entra em contato e não recebe uma resposta imediata, é dinheiro jogado no lixo.",

    // How It Works
    how_title_main: "Como a",
    how_title_highlight: "máquina",
    how_title_end: "funciona",
    how_subtitle: "Implementação rápida e sem atrito. Você não precisa saber programar.",
    how_step1_title: "Instale em 5 minutos",
    how_step1_desc: "Copie e cole um trecho de código no seu site (ou use nosso plugin) e o Web Widget da LIA aparecerá magicamente.",
    how_step2_title: "Treine com o seu conteúdo",
    how_step2_desc: "Diga à LIA o que a sua empresa faz. Envie PDFs, links ou textos, e ela aprenderá tudo em segundos para responder como um especialista.",
    how_step3_title: "Atenda e Converte no Automático",
    how_step3_desc: "Cada visitante é atendido instantaneamente. A LIA qualifica o lead, recolhe o contato e agenda a reunião direto na sua Google Agenda.",

    // Target Audience
    target_title_main: "Criado para o",
    target_title_highlight: "seu",
    target_title_end: "negócio",
    target_subtitle: "A LIA adapta-se a qualquer nicho de mercado. Se você tem visitantes no site, você precisa da LIA.",
    target_card1_title: "Clínicas & Consultórios",
    target_card1_desc: "Agende consultas 24h por dia e tire dúvidas sobre tratamentos sem depender de um recepcionista.",
    target_card2_title: "Imobiliárias",
    target_card2_desc: "Qualifique leads buscando imóveis, recolha o perfil certo e passe para o corretor com a visita pré-agendada.",
    target_card3_title: "Escolas & Cursos",
    target_card3_desc: "Responda sobre preços, matrículas, horários e currículos instantaneamente para novos alunos.",
    target_card4_title: "Serviços B2B/B2C",
    target_card4_desc: "Orçamentos rápidos, qualificação de leads e agendamento de visitas técnicas de forma autônoma.",
    target_card5_title: "E-Commerce",
    target_card5_desc: "Apoio à compra, tirar dúvidas de produtos e acompanhar pedidos interagindo direto no site.",
    target_card6_title: "Agências & Consultorias",
    target_card6_desc: "Filtre qual o tamanho do cliente, recolha os contatos e marque a call de diagnóstico sem atritos.",

    // Final CTA
    cta_final_title_main: "Enquanto lê isto, o seu site está a",
    cta_final_title_highlight: "perder leads.",
    cta_final_subtitle: "A cada minuto que passa, um potencial cliente sai do seu site e vai para o concorrente porque não teve atendimento rápido.",
    cta_final_btn_primary: "Ativar Luminnus — 7 Dias Grátis",
    cta_final_btn_secondary: "Ver Planos Novamente",
    cta_final_disclaimer: "Cancelamento a qualquer momento. Suporte rápido para setup.",
  },
  en: {
    // Navigation
    nav_inicio: "Home",
    nav_how_it_works: "How it Works",
    nav_solucoes: "Solutions",
    nav_planos: "Pricing",
    nav_parceiros: "Partners",
    nav_contato: "Contact",
    btn_login: "Login",
    btn_test_free_nav: "Try it Free",

    // Hero Section
    hero_badge: "79% of leads leave sites without a response in 5 min",
    hero_title_1: "Your AI that ",
    hero_title_highlight: "serves, qualifies and schedules",
    hero_title_2: " leads on your website 24/7",
    hero_subtitle: "You spend on ads, but how many leads are leaving your website without an answer? Luminnus puts a trained AI in your business to reply, qualify, and schedule — in seconds.",
    hero_stat1: "more conversions",
    hero_stat2: "response time",
    hero_stat3: "without breaks",
    hero_btn_primary: "Try it Free for 7 Days",
    hero_btn_secondary: "How it Works",
    hero_disclaimer: "No commitment • Credit card required • Cancel anytime",
    hero_widget_title: "LIA — Intelligent Assistant",
    hero_widget_online: "Online now",
    hero_widget_msg1: "Hi! I'm LIA, the company's intelligent assistant. How can I help you? 😊",
    hero_widget_user_msg: "I want to know more about the services",
    hero_widget_msg2: "Sure! We have several options. To recommend the best one for you, can I schedule a demo?",
    hero_widget_btn: "Schedule Now",
    hero_widget_input: "Type your message...",
    hero_title: "LIA — the first AI with living cognitive consciousness, developed for businesses.",
    hero_subtitle_old: "An intelligence capable of understanding contexts, responding naturally, and acting in real-time — as if it had a life of its own within enterprise systems.",
    btn_test_free: "🚀 Enter Demo",
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
    solutions_transform2_desc: "Connects with all your tools (CRM, calendar, email, Telegram)",
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
    sim_title: "💡 Simulate your Results with LIA",
    sim_subtitle: "Discover how much time, money, and productivity your company can gain by automating with artificial intelligence.",
    sim_label_biz: "Business type:",
    sim_opt_biz1: "Freelancer / Self-employed",
    sim_opt_biz2: "Small Business",
    sim_opt_biz3: "Medium Business",
    sim_opt_biz4: "Large Business",
    sim_label_emp: "Number of employees:",
    sim_opt_emp1: "1 person",
    sim_opt_emp2: "2 to 5 people",
    sim_opt_emp3: "6 to 15 people",
    sim_opt_emp4: "More than 15 people",
    sim_label_hours: "Weekly hours spent on customer service and emails:",
    sim_opt_hours1: "Up to 10h",
    sim_opt_hours2: "Between 10h and 30h",
    sim_opt_hours3: "More than 30h",
    sim_btn_calc: "Calculate Results",
    sim_res_title: "📊 Estimated Results",
    sim_res_subtitle: "Based on the information provided, see the impact LIA can generate in your business.",
    sim_res_time: "h/week",
    sim_res_time_label: "Time saved",
    sim_res_cost: "/month",
    sim_res_cost_label: "Cost reduction",
    sim_res_prod_label: "Productivity increase",
    sim_btn_plans: "View Recommended Plans →",

    // Problem Section
    problem_title_main: "Your biggest bottleneck is not traffic. It is",
    problem_title_highlight: "customer service.",
    problem_subtitle: "While your team is busy, your website converts much less than it could. Look at the reality:",
    problem_card1_title: "97% of visitors leave without talking",
    problem_card1_desc: "Traffic comes, but the friction of filling out long forms or waiting for emails drives away most of your potential customers.",
    problem_card2_title: "Response time: > 5 min",
    problem_card2_desc: "The chances of converting a lead drop 10x if you take more than 5 minutes to reply. Most have already gone to the competitor.",
    problem_card3_title: "Cost per lead goes down the drain",
    problem_card3_desc: "You pay €3 to €10 for every click. If the lead gets in touch and doesn't get an immediate response, it's money thrown away.",

    // How It Works
    how_title_main: "How the",
    how_title_highlight: "machine",
    how_title_end: "works",
    how_subtitle: "Fast and frictionless implementation. You don't need to know how to code.",
    how_step1_title: "Install in 5 minutes",
    how_step1_desc: "Copy and paste a snippet of code on your site (or use our plugin) and LIA's Web Widget will magically appear.",
    how_step2_title: "Train with your content",
    how_step2_desc: "Tell LIA what your company does. Send PDFs, links, or texts, and she will learn everything in seconds to answer like an expert.",
    how_step3_title: "Service and Convert on Autopilot",
    how_step3_desc: "Every visitor is served instantly. LIA qualifies the lead, collects the contact, and books the meeting directly in your Google Calendar.",

    // Target Audience
    target_title_main: "Built for",
    target_title_highlight: "your",
    target_title_end: "business",
    target_subtitle: "LIA adapts to any market niche. If you have visitors on your website, you need LIA.",
    target_card1_title: "Clinics & Offices",
    target_card1_desc: "Book appointments 24/7 and answer treatment questions without relying on a receptionist.",
    target_card2_title: "Real Estate",
    target_card2_desc: "Qualify leads looking for properties, gather the right profile, and pass it to the broker with a pre-booked visit.",
    target_card3_title: "Schools & Courses",
    target_card3_desc: "Answer pricing, enrollment, schedule, and curriculum questions instantly for new students.",
    target_card4_title: "B2B/B2C Services",
    target_card4_desc: "Fast quotes, lead qualification, and scheduling of technical visits autonomously.",
    target_card5_title: "E-Commerce",
    target_card5_desc: "Purchase support, solving product doubts, and order tracking interacting directly on the site.",
    target_card6_title: "Agencies & Consultancies",
    target_card6_desc: "Filter client size, collect contacts, and book diagnostic calls without friction.",

    // Final CTA
    cta_final_title_main: "While you read this, your website is",
    cta_final_title_highlight: "losing leads.",
    cta_final_subtitle: "Every minute that passes, a potential client leaves your website and goes to a competitor because they didn't get fast service.",
    cta_final_btn_primary: "Activate Luminnus — 7 Days Free",
    cta_final_btn_secondary: "View Plans Again",
    cta_final_disclaimer: "Cancel anytime. Fast support for setup.",
  },
  es: {
    // Navigation
    nav_inicio: "Inicio",
    nav_how_it_works: "Cómo Funciona",
    nav_solucoes: "Soluciones",
    nav_planos: "Planes",
    nav_parceiros: "Socios",
    nav_contato: "Contacto",
    btn_login: "Entrar",
    btn_test_free_nav: "Prueba Gratis",

    // Hero Section
    hero_badge: "El 79% de los leads abandonan sitios web sin respuesta en 5 min",
    hero_title_1: "Tu IA que ",
    hero_title_highlight: "atiende, califica y programa",
    hero_title_2: " leads en tu sitio web 24/7",
    hero_subtitle: "Gastas en anuncios, pero ¿cuántos leads se van de tu sitio sin respuesta? Luminnus coloca una IA entrenada en tu negocio para responder, calificar y programar, en segundos.",
    hero_stat1: "más conversiones",
    hero_stat2: "tiempo de respuesta",
    hero_stat3: "sin pausas",
    hero_btn_primary: "Prueba Gratis por 7 Días",
    hero_btn_secondary: "Cómo Funciona",
    hero_disclaimer: "Sin compromiso • Tarjeta de crédito requerida • Cancela cuando quieras",
    hero_widget_title: "LIA — Asistente Inteligente",
    hero_widget_online: "En línea ahora",
    hero_widget_msg1: "¡Hola! Soy LIA, el asistente inteligente de la empresa. ¿En qué te puedo ayudar? 😊",
    hero_widget_user_msg: "Quiero saber más sobre los servicios",
    hero_widget_msg2: "¡Claro! Tenemos varias opciones. Para recomendarte la mejor, ¿puedo programar una demostración?",
    hero_widget_btn: "Programar Ahora",
    hero_widget_input: "Escribe tu mensaje...",
    hero_title: "LIA — la primera IA con conciencia cognitiva viva, desarrollada para empresas.",
    hero_subtitle_old: "Una inteligencia capaz de comprender contextos, responder de forma natural y actuar en tiempo real — como si tuviera vida propia dentro de los sistemas empresariales.",
    btn_test_free: "🚀 Entrar en la demo",
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
    solutions_transform2_desc: "Se conecta con todas tus herramientas (CRM, calendario, correo, Telegram)",
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
    sim_title: "💡 Simula tus Resultados con LIA",
    sim_subtitle: "Descubre cuánto tiempo, dinero y productividad puede ganar tu empresa automatizando con inteligencia artificial.",
    sim_label_biz: "Tipo de negocio:",
    sim_opt_biz1: "Profesional Autónomo",
    sim_opt_biz2: "Pequeña Empresa",
    sim_opt_biz3: "Mediana Empresa",
    sim_opt_biz4: "Gran Empresa",
    sim_label_emp: "Número de empleados:",
    sim_opt_emp1: "1 persona",
    sim_opt_emp2: "2 a 5 personas",
    sim_opt_emp3: "6 a 15 personas",
    sim_opt_emp4: "Más de 15 personas",
    sim_label_hours: "Horas semanales dedicadas a atención al cliente y correos electrónicos:",
    sim_opt_hours1: "Hasta 10h",
    sim_opt_hours2: "Entre 10h y 30h",
    sim_opt_hours3: "Más de 30h",
    sim_btn_calc: "Calcular Resultados",
    sim_res_title: "📊 Resultados Estimados",
    sim_res_subtitle: "Según la información proporcionada, descubre el impacto que LIA puede generar en tu negocio.",
    sim_res_time: "h/semana",
    sim_res_time_label: "Tiempo ahorrado",
    sim_res_cost: "/mes",
    sim_res_cost_label: "Reducción de costos",
    sim_res_prod_label: "Aumento de productividad",
    sim_btn_plans: "Ver Planes Recomendados →",

    // Problem Section
    problem_title_main: "Tu mayor obstáculo no es el tráfico. Es la",
    problem_title_highlight: "atención.",
    problem_subtitle: "Mientras tu equipo está ocupado, tu sitio web convierte mucho menos de lo que podría. Mira la realidad:",
    problem_card1_title: "El 97% de los visitantes se van sin hablar",
    problem_card1_desc: "El tráfico llega, pero la fricción de llenar formularios largos o esperar correos electrónicos aleja a la mayoría de tus clientes potenciales.",
    problem_card2_title: "Tiempo de respuesta: > 5 min",
    problem_card2_desc: "Las posibilidades de convertir a un cliente potencial caen 10 veces si tardas más de 5 minutos en responder. La mayoría ya se ha ido a la competencia.",
    problem_card3_title: "El costo por lead se va por el desagüe",
    problem_card3_desc: "Pagas de €3 a €10 por cada clic. Si el lead se pone en contacto y no recibe una respuesta inmediata, es dinero tirado a la basura.",

    // How It Works
    how_title_main: "Cómo funciona la",
    how_title_highlight: "máquina",
    how_title_end: "",
    how_subtitle: "Implementación rápida y sin fricciones. No necesitas saber programar.",
    how_step1_title: "Instala en 5 minutos",
    how_step1_desc: "Copia y pega un fragmento de código en tu sitio web (o usa nuestro plugin) y el Web Widget de LIA aparecerá mágicamente.",
    how_step2_title: "Entrena con tu contenido",
    how_step2_desc: "Dile a LIA a qué se dedica tu empresa. Envía PDFs, enlaces o textos, y ella aprenderá todo en segundos para responder como una experta.",
    how_step3_title: "Atiende y Convierte en Piloto Automático",
    how_step3_desc: "Cada visitante es atendido al instante. LIA califica al lead, recopila el contacto y agenda la reunión directamente en tu Google Calendar.",

    // Target Audience
    target_title_main: "Creado para",
    target_title_highlight: "tu",
    target_title_end: "negocio",
    target_subtitle: "LIA se adapta a cualquier nicho de mercado. Si tienes visitantes en tu sitio web, necesitas a LIA.",
    target_card1_title: "Clínicas y Consultorios",
    target_card1_desc: "Reserva citas 24/7 y responde a preguntas sobre tratamientos sin depender de una recepcionista.",
    target_card2_title: "Inmobiliarias",
    target_card2_desc: "Califica a los clientes potenciales que buscan propiedades, recopila el perfil adecuado y pásalo al corredor con una visita pre-reservada.",
    target_card3_title: "Escuelas y Cursos",
    target_card3_desc: "Responde preguntas sobre precios, inscripciones, horarios y currículos al instante para nuevos estudiantes.",
    target_card4_title: "Servicios B2B/B2C",
    target_card4_desc: "Presupuestos rápidos, calificación de clientes potenciales y programación de visitas técnicas de forma autónoma.",
    target_card5_title: "E-Commerce",
    target_card5_desc: "Soporte de compras, resolución de dudas sobre productos y seguimiento de pedidos interactuando directamente en el sitio.",
    target_card6_title: "Agencias y Consultorías",
    target_card6_desc: "Filtra el tamaño del cliente, recopila contactos y agenda llamadas de diagnóstico sin fricción.",

    // Final CTA
    cta_final_title_main: "Mientras lees esto, tu sitio web está",
    cta_final_title_highlight: "perdiendo leads.",
    cta_final_subtitle: "Cada minuto que pasa, un cliente potencial abandona tu sitio web y se va a la competencia porque no recibió un servicio rápido.",
    cta_final_btn_primary: "Activar Luminnus — 7 Días Gratis",
    cta_final_btn_secondary: "Ver Planes de Nuevo",
    cta_final_disclaimer: "Cancela en cualquier momento. Soporte rápido para la configuración.",
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
