import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface Plan {
    id?: string;
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
    maxChannels: string | number;
    maxConversations: string | number;
    maxMessages: string | number;
    customCTA?: {
        text: string;
        action: string;
    };
}

// Fallback plans for dashboard (matches web app structure)
export const fallbackPlans: Plan[] = [
    {
        id: "7c3aed01-3211-4bda-bc6b-4e5a9d828590",
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
        liaQuote: "",
        maxChannels: 1,
        maxConversations: 100,
        maxMessages: 1000
    },
    {
        id: "7c3aed02-3211-4bda-bc6b-4e5a9d828590",
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
        liaQuote: "",
        maxChannels: 5,
        maxConversations: 500,
        maxMessages: 5000
    },
    {
        id: "7c3aed03-3211-4bda-bc6b-4e5a9d828590",
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
        liaQuote: "",
        maxChannels: "Ilimitado",
        maxConversations: "Ilimitado",
        maxMessages: "Ilimitado"
    }
];

// Ordem fixa dos planos: Start=1, Plus=2, Pro=3
const PLAN_ORDER: Record<string, number> = {
    'Start': 1,
    'Plus': 2,
    'Pro': 3,
};

function sortPlans(plans: Plan[]): Plan[] {
    return [...plans].sort((a, b) => {
        const orderA = PLAN_ORDER[a.name] || 99;
        const orderB = PLAN_ORDER[b.name] || 99;
        return orderA - orderB;
    });
}

function convertPlanFromDB(dbPlan: any): Plan {
    const gradientStart = dbPlan.gradient_start || '262.1 83.3% 57.8%';
    const gradientEnd = dbPlan.gradient_end || '330.4 81.2% 60.4%';

    const parsePrice = (priceStr: string | undefined): number => {
        if (!priceStr) return 0;
        let clean = priceStr.replace(/[^0-9.,]/g, '');
        if (!clean) return 0;

        // Se tiver vírgula E ponto: pontos são milhares, vírgula é decimal
        if (clean.includes(',') && clean.includes('.')) {
            clean = clean.replace(/\./g, '').replace(',', '.');
        }
        // Se tiver apenas vírgula: é decimal
        else if (clean.includes(',')) {
            clean = clean.replace(',', '.');
        }
        // Se tiver apenas ponto: verificar se é milhar ou decimal
        else if (clean.includes('.')) {
            const parts = clean.split('.');
            const lastPart = parts[parts.length - 1];
            // Ponto seguido de exatamente 3 dígitos = milhar (ex: 1.411)
            if (lastPart.length === 3) {
                clean = clean.replace(/\./g, '');
            }
        }
        return parseFloat(clean) || 0;
    };

    const numericPrice = parsePrice(dbPlan.price);
    const numericAnnualPrice = dbPlan.annual_price ? parsePrice(dbPlan.annual_price) : numericPrice * 12;

    const expectedAnnual = numericPrice * 12;
    const calculatedDiscount = expectedAnnual > 0
        ? Math.round(((expectedAnnual - numericAnnualPrice) / expectedAnnual) * 100)
        : 0;

    return {
        id: dbPlan.id,
        name: dbPlan.plan_name,
        price: dbPlan.price,
        annualPrice: dbPlan.annual_price || "",
        period: '/mês',
        description: dbPlan.description,
        features: dbPlan.features || [],
        color: `from-[hsl(${gradientStart})] to-[hsl(${gradientEnd})]`,
        popular: dbPlan.is_popular || false,
        discount: calculatedDiscount,
        liaQuote: dbPlan.lia_quote || '',
        maxChannels: dbPlan.max_channels,
        maxConversations: dbPlan.max_conversations,
        maxMessages: dbPlan.max_messages,
        customCTA: dbPlan.custom_cta_text && dbPlan.custom_cta_action ? {
            text: dbPlan.custom_cta_text,
            action: dbPlan.custom_cta_action
        } : undefined
    };
}

export function usePlans() {
    const [plans, setPlans] = useState<Plan[]>(fallbackPlans);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadPlans();

        // Polling literal de 30 segundos no dashboard para manter atualizado
        const interval = setInterval(loadPlans, 30000);
        return () => clearInterval(interval);
    }, []);

    const loadPlans = async () => {
        try {
            if (!supabase) return;

            const { data, error } = await supabase
                .from('plan_configs')
                .select('*')
                .order('created_at', { ascending: true });

            if (error) throw error;

            if (data && data.length > 0) {
                setPlans(sortPlans(data.map(convertPlanFromDB))); // Ordenar Start, Plus, Pro
            }
        } catch (err) {
            console.error('[Dashboard-client] Error loading plans:', err);
        } finally {
            setLoading(false);
        }
    };

    return { plans, loading };
}
