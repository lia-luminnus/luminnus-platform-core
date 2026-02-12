export interface Plan {
  id: string;
  name: string;
  price: string;              // Preço mensal normal (ex: "€29")
  annualPrice: string;         // Preço mensal COM desconto anual (ex: "€26")
  annualTotal: string;         // Total anual (ex: "€312")
  annualSavings: string;       // Economia anual (ex: "€36")
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
    // Mensal: €29/mês | Anual: €26/mês (-10%, fidelidade 12 meses)
    price: "€29",
    annualPrice: "€26",
    annualTotal: "€313",
    annualSavings: "€36",
    period: "/mês",
    description: "Ideal para pequenos negócios e profissionais autônomos",
    features: [
      "1.000 Créditos LIA / mês",
      "Integração com WhatsApp (1 número)",
      "Chat online no site (widget)",
      "Integração com e-mail",
      "1 fluxo de automação",
      "Agendamento simples (Google Agenda)",
      "Relatórios básicos de atendimento",
      "Suporte por e-mail",
      "1 usuário"
    ],
    color: "from-[#22D3EE] to-[#0EA5E9]",
    popular: false,
    discount: 10,
    liaQuote: "O plano Start é perfeito se você está começando! Com 1.000 créditos por mês, você pode trocar até 1.000 mensagens comigo ou usar voz, marketing e tudo mais. Vou cuidar dos seus clientes 24h e liberar seu tempo para crescer. 🚀",
    creditosPlano: 1000,
    maxChannels: 1,
    creditHighlights: [
      "~1.000 mensagens/mês",
      "~200 min de voz",
      "~330 disparos marketing"
    ]
  },
  {
    id: "7c3aed02-3211-4bda-bc6b-4e5a9d828590",
    name: "Plus",
    // Mensal: €249/mês | Anual: €199/mês (-20%, fidelidade 12 meses)
    price: "€249",
    annualPrice: "€199",
    annualTotal: "€2.390",
    annualSavings: "€600",
    period: "/mês",
    description: "Para empresas em crescimento que precisam escalar",
    features: [
      "12.000 Créditos LIA / mês",
      "WhatsApp Business (vários números)",
      "Chat integrado (com histórico)",
      "E-mail profissional",
      "Messenger, Telegram",
      "Integração com CRM (HubSpot, RD Station, Pipedrive)",
      "Agenda integrada (Google, Outlook)",
      "Google Sheets / Excel online",
      "10 fluxos de automação",
      "Gatilhos por palavras-chave",
      "Etiquetas automáticas",
      "Relatórios detalhados",
      "Suporte prioritário",
      "Até 3 usuários"
    ],
    color: "from-[#7C3AED] to-[#FF2E9E]",
    popular: true,
    discount: 20,
    liaQuote: "Esse é o plano que recomendo para quem já tem um fluxo constante de clientes! Com 12.000 créditos, posso atender milhares de mensagens, usar voz, fazer marketing e integrar com tudo. É automação de verdade com inteligência! 🚀",
    creditosPlano: 12000,
    maxChannels: 5,
    creditHighlights: [
      "~12.000 mensagens/mês",
      "~2.400 min de voz",
      "~4.000 disparos marketing"
    ]
  },
  {
    id: "7c3aed03-3211-4bda-bc6b-4e5a9d828590",
    name: "Pro",
    // Mensal: €899/mês | Anual: €719/mês (-20%, fidelidade 12 meses)
    price: "€899",
    annualPrice: "€719",
    annualTotal: "€8.630",
    annualSavings: "€5.400",
    period: "/mês",
    description: "Solução enterprise totalmente personalizada",
    features: [
      "40.000 Créditos LIA / mês",
      "Assistente LIA com personalidade customizável",
      "Construtor visual de fluxos com IA",
      "Múltiplas instâncias personalizadas da LIA",
      "Integração com ERP (SAP, Conta Azul, Bling)",
      "Sistemas financeiros e bancários",
      "Ferramentas internas da empresa",
      "Integração por API e Webhooks",
      "Canais e integrações ilimitados",
      "Relatórios financeiros inteligentes",
      "Gestão de equipe com permissões",
      "10+ usuários",
      "Suporte com gestor dedicado",
      "Implantação assistida"
    ],
    color: "from-[#FF2E9E] to-[#F97316]",
    popular: false,
    discount: 20,
    liaQuote: "O Pro é para quem quer uma LIA 100% personalizada! Com 40.000 créditos, vou me adaptar completamente ao seu negócio, integrar com qualquer sistema e trabalhar como parte do time. É o máximo em inteligência empresarial! 💎",
    creditosPlano: 40000,
    maxChannels: "Ilimitado",
    creditHighlights: [
      "~40.000 mensagens/mês",
      "~8.000 min de voz",
      "~13.300 disparos marketing"
    ],
    customCTA: {
      text: "Solicitar proposta personalizada",
      action: "https://wa.me/YOUR_WHATSAPP_NUMBER?text=Olá!%20Gostaria%20de%20solicitar%20uma%20proposta%20personalizada%20do%20plano%20Pro"
    }
  }
];

// Tabela de conversão de créditos
export const CREDIT_CONVERSION = {
  message: { credits: 1, label: "Mensagem de chat" },
  voice_min: { credits: 5, label: "Minuto de voz" },
  marketing: { credits: 3, label: "Disparo marketing" },
  stt: { credits: 2, label: "Transcrição de áudio" },
  doc_analysis: { credits: 5, label: "Análise de documento" },
  scheduling: { credits: 2, label: "Agendamento" },
  image_gen: { credits: 10, label: "Geração de imagem" },
  web_search: { credits: 1, label: "Busca na web" },
};

// Pacotes de recarga
export const RECHARGE_PACKAGES = [
  { name: "Recarga Básica", credits: 400, price: "€9", highlight: "Ideal para picos de uso" },
  { name: "Recarga Smart", credits: 1500, price: "€29", highlight: "Melhor custo-benefício" },
  { name: "Recarga Turbo", credits: 3500, price: "€59", highlight: "Para campanhas e eventos" },
  { name: "Recarga Business", credits: 10000, price: "€149", highlight: "Para operações intensivas" },
];
