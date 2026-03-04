export interface Plan {
  id: string;
  name: string;
  price: string;              // Preço mensal (ex: "$29")
  annualPrice: string;         // Preço mensal COM desconto anual (ex: "$26")
  annualTotal: string;         // Total anual (ex: "$312")
  annualSavings: string;       // Economia anual (ex: "$36")
  period: string;
  description: string;
  features: string[];
  color: string;
  popular: boolean;
  discount: number;            // Percentual de desconto anual (10, 20, etc)
  liaQuote: string;
  // Campos de créditos (v2.0)
  creditosPlano: number;
  maxChannels: string | number;
  maxConversations: string | number;
  maxMessages: string | number;
  creditHighlights: string[];
  customCTA?: {
    text: string;
    action: string;
  };
}

export const plans: Plan[] = [
  {
    id: "7c3aed01-3211-4bda-bc6b-4e5a9d828590",
    name: "Start",
    // Mensal: $29/mês | Anual: $26/mês (-10%, fidelidade 12 meses)
    price: "$29",
    annualPrice: "$26",
    annualTotal: "$312",
    annualSavings: "$36",
    period: "/mês",
    description: "Ideal para pequenos negócios e profissionais autônomos",
    features: [
      "1.000 Créditos LIA / mês",
      "Chat online no site ( Web Widget)",
      "Integração com Telegram",
      "Integração com e-mail",
      "Criação de 1 fluxo de automação",
      "Agendamento simples (Google Agenda)",
      "Relatórios básicos de atendimento",
      "Acesso à LIA via painel (respostas simples)",
      "CRM de leads integrado",
      "Suporte por e-mail",
      "1 usuário"
    ],
    color: "from-[#22D3EE] to-[#0EA5E9]",
    popular: false,
    discount: 10,
    liaQuote: "O plano Start é perfeito se você está começando! Com 1.000 créditos por mês, cada visitante do seu site é atendido em segundos, qualificado e agendado. Nunca mais perca um lead! 🚀",
    creditosPlano: 1000,
    maxChannels: 1,
    maxConversations: 100,
    maxMessages: 1000,
    creditHighlights: [
      "~1.000 mensagens/mês",
      "~200 min de voz",
      "~500 qualificações de leads"
    ]
  },
  {
    id: "7c3aed02-3211-4bda-bc6b-4e5a9d828590",
    name: "Plus",
    // Mensal: $99/mês | Anual: $79/mês (-20%, fidelidade 12 meses)
    price: "$99",
    annualPrice: "$79",
    annualTotal: "$948",
    annualSavings: "$240",
    period: "/mês",
    description: "Para empresas em crescimento que precisam escalar",
    features: [
      "5.000 Créditos LIA / mês",
      "Chat integrado (com histórico completo)",
      "Telegram + Web Widget",
      "E-mail profissional",
      "Integração com CRM (HubSpot, RD Station, Pipedrive)",
      "Google Sheets / Excel online",
      "10 fluxos de automação customizados",
      "Gatilhos por palavras-chave",
      "Etiquetas automáticas",
      "Relatórios detalhados de conversão",
      "Suporte prioritário 24/7",
      "Até 3 usuários",
      "Agenda Google Integrada",
      "Painel personalizável"
    ],
    color: "from-[#7C3AED] to-[#FF2E9E]",
    popular: true,
    discount: 20,
    liaQuote: "Esse é o plano que recomendo para quem já tem um fluxo constante de leads! Com 5.000 créditos, posso atender, qualificar e agendar milhares de visitantes do seu site. Conversão na veia! 🚀",
    creditosPlano: 5000,
    maxChannels: 5,
    maxConversations: 500,
    maxMessages: 5000,
    creditHighlights: [
      "~5.000 mensagens/mês",
      "~1.000 min de voz",
      "~2.500 qualificações de leads"
    ]
  },
  {
    id: "7c3aed03-3211-4bda-bc6b-4e5a9d828590",
    name: "Pro",
    // Mensal: $249/mês | Anual: $199/mês (-20%, fidelidade 12 meses)
    price: "$249",
    annualPrice: "$199",
    annualTotal: "$2.388",
    annualSavings: "$600",
    period: "/mês",
    description: "Solução customizada para operações intensivas e robustas",
    features: [
      "15.000 Créditos LIA / mês",
      "Assistente LIA com personalidade customizável",
      "Construtor visual de fluxos com IA",
      "Criação de múltiplas instâncias personalizadas da LIA",
      "Integração básica com ERP (Conta Azul, Bling)",
      "Integração por API e Webhooks",
      "Sistemas financeiros e bancários",
      "Ferramentas internas da empresa",
      "Canais e integrações ilimitados",
      "Criação de relatórios financeiros inteligentes",
      "Gestão de equipe com permissões",
      "10+ usuários",
      "Suporte com gestor dedicado",
      "Implantação assistida"
    ],
    color: "from-[#FF2E9E] to-[#F97316]",
    popular: false,
    discount: 20,
    liaQuote: "O Pro é para quem quer uma LIA 100% personalizada! Com 15.000 créditos, vou me adaptar completamente ao seu negócio, integrar com diversos sistemas e converter cada visitante em cliente. 💎",
    creditosPlano: 15000,
    maxChannels: "Ilimitado",
    maxConversations: "Ilimitado",
    maxMessages: "Ilimitado",
    creditHighlights: [
      "~15.000 mensagens/mês",
      "~3.000 min de voz",
      "~7.500 qualificações de leads"
    ],
    customCTA: {
      text: "Solicitar proposta personalizada",
      action: "mailto:contato@luminnus.ai?subject=Proposta%20Pro%20Personalizada"
    }
  }
];

// Tabela de conversão de créditos (alinhada com creditService.ts backend)
export const CREDIT_CONVERSION = {
  message: { credits: 1, label: "Mensagem de chat" },
  voice_min: { credits: 5, label: "Minuto de voz" },
  stt: { credits: 2, label: "Transcrição de áudio" },
  doc_analysis: { credits: 4, label: "Análise de documento" },
  scheduling: { credits: 2, label: "Agendamento" },
  image_gen: { credits: 10, label: "Geração de imagem" },
  web_search: { credits: 1, label: "Busca na web" },
};

// Pacotes de recarga (USD — Stripe converte automaticamente)
export const RECHARGE_PACKAGES = [
  { name: "Recarga Básica", credits: 400, price: "$9", highlight: "Ideal para picos de uso" },
  { name: "Recarga Smart", credits: 1500, price: "$29", highlight: "Melhor custo-benefício" },
  { name: "Recarga Turbo", credits: 3500, price: "$59", highlight: "Para campanhas e eventos" },
  { name: "Recarga Business", credits: 10000, price: "$149", highlight: "Para operações intensivas" },
];
