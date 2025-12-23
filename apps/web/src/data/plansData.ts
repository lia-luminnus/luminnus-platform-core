export interface Plan {
  name: string;
  price: string;
  annualPrice: string;
  period: string;
  description: string;
  features: string[];
  color: string;
  popular: boolean;
  discount: number;
  liaQuote: string;
  // Novos campos para limites do plano
  maxChannels: string | number;
  maxConversations: string | number;
  maxMessages: string | number;
  customCTA?: {
    text: string;
    action: string;
  };
}

export const plans: Plan[] = [
  {
    name: "Start",
    price: "€27",
    annualPrice: "€291,60",
    period: "/mês",
    description: "Ideal para pequenos negócios e profissionais autônomos",
    features: [
      "Integração com WhatsApp (1 número)",
      "Chat online no site (widget simples)",
      "Integração com e-mail",
      "Criação de 1 fluxo de automação",
      "Agendamento simples (Google Agenda)",
      "Relatórios básicos de atendimento",
      "Acesso à LIA via painel (respostas simples)",
      "Suporte por e-mail",
      "1 usuário"
    ],
    color: "from-[#22D3EE] to-[#0EA5E9]",
    popular: false,
    discount: 10,
    liaQuote: "O plano Start é perfeito se você está começando! Vou cuidar das perguntas mais frequentes dos seus clientes, trabalhar 24h e liberar seu tempo para focar no crescimento. É como ter um assistente sempre disponível, sem custos de contratação.",
    maxChannels: 1,
    maxConversations: 100,
    maxMessages: 1000
  },
  {
    name: "Plus",
    price: "€147",
    annualPrice: "€1.411",
    period: "/mês",
    description: "Para empresas em crescimento que precisam escalar",
    features: [
      "WhatsApp Business (vários números)",
      "Chat integrado (com histórico)",
      "E-mail profissional",
      "Messenger (Facebook), Telegram, Instagram Direct",
      "Integração com CRM (HubSpot, RD Station, Pipedrive)",
      "Agenda integrada (Google, Outlook)",
      "Google Sheets / Excel online",
      "10 fluxos de automação customizados",
      "Gatilhos por palavras-chave",
      "Etiquetas automáticas",
      "Relatórios detalhados",
      "Suporte prioritário",
      "Até 3 usuários"
    ],
    color: "from-[#7C3AED] to-[#FF2E9E]",
    popular: true,
    discount: 20,
    liaQuote: "Esse é o plano que recomendo para quem já tem um fluxo constante de clientes! Com o Plus, posso atender em múltiplos canais, aprender com cada conversa e integrar com todas as suas ferramentas. Vou agendar reuniões, atualizar seu CRM e até gerar relatórios inteligentes. É automação de verdade! 🚀",
    maxChannels: 5,
    maxConversations: 500,
    maxMessages: 5000
  },
  {
    name: "Pro",
    price: "A partir de €997",
    annualPrice: "A partir de €9.564",
    period: "/mês",
    description: "Solução enterprise totalmente personalizada",
    features: [
      "Assistente LIA com personalidade customizável",
      "Construtor visual de fluxos com IA",
      "Criação de múltiplas instâncias personalizadas da LIA",
      "Integração com ERP (SAP, Conta Azul, Bling)",
      "Sistemas financeiros e bancários",
      "Ferramentas internas da empresa",
      "Integração por API e Webhooks",
      "Acesso ilimitado a canais e integrações",
      "Criação de relatórios financeiros inteligentes",
      "Gestão de equipe com permissões",
      "10+ usuários",
      "Suporte com gestor dedicado",
      "Implantação assistida"
    ],
    color: "from-[#FF2E9E] to-[#F97316]",
    popular: false,
    discount: 20,
    liaQuote: "O Pro é para quem quer uma Lia 100% personalizada! Vou me adaptar completamente ao seu negócio, usar sua linguagem, seguir seus processos e integrar com qualquer sistema. Teremos uma equipe dedicada cuidando de tudo e eu vou trabalhar como se fosse parte do time. É o máximo em inteligência artificial empresarial! 💎",
    maxChannels: "Ilimitado",
    maxConversations: "Ilimitado",
    maxMessages: "Ilimitado",
    customCTA: {
      text: "Solicitar proposta personalizada",
      action: "https://wa.me/YOUR_WHATSAPP_NUMBER?text=Olá!%20Gostaria%20de%20solicitar%20uma%20proposta%20personalizada%20do%20plano%20Pro"
    }
  }
];
