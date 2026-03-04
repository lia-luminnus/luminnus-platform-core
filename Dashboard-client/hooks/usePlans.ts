import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Interface do Plano para uso no frontend
 */
export interface Plan {
    id?: string;
    name: string;
    price: string;              // Preço mensal normal (ex: "€29")
    annualPrice: string;         // Preço mensal COM desconto anual (ex: "€26")
    annualTotal?: string;        // Total anual (ex: "€312")
    annualSavings?: string;      // Economia anual (ex: "€36")
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
    // Campos de créditos (v2.0)
    creditosPlano?: number;
    creditHighlights?: string[];
    customCTA?: {
        text: string;
        action: string;
    };
}

// Fallback plans sincronizados com o site (luminnus.ai/planos) — v2.0 USD
export const fallbackPlans: Plan[] = [
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
        liaQuote: "O plano Start é perfeito se você está começando! Com 1.000 créditos por mês, cada visitante do seu site é atendido em segundos. Nunca mais perca um lead! 🚀",
        maxChannels: 1,
        maxConversations: 100,
        maxMessages: 1000,
        creditosPlano: 1000,
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
        liaQuote: "Esse é o plano que recomendo para quem já tem um fluxo constante de leads! Com 5.000 créditos, posso atender, qualificar e agendar milhares de visitantes. Conversão na veia! 🚀",
        maxChannels: 5,
        maxConversations: 500,
        maxMessages: 5000,
        creditosPlano: 5000,
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
        liaQuote: "O Pro é para quem quer uma LIA 100% personalizada! Com 15.000 créditos, vou me adaptar ao seu negócio e converter cada visitante em cliente. 💎",
        maxChannels: "Ilimitado",
        maxConversations: "Ilimitado",
        maxMessages: "Ilimitado",
        creditosPlano: 15000,
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

const PLAN_ORDER: Record<string, number> = { 'Start': 1, 'Plus': 2, 'Pro': 3 };

function sortPlans(plans: Plan[]): Plan[] {
    return [...plans].sort((a, b) => (PLAN_ORDER[a.name] || 99) - (PLAN_ORDER[b.name] || 99));
}

function convertPlanFromDB(dbPlan: any): Plan {
    const gradientStart = dbPlan.gradient_start || '262.1 83.3% 57.8%';
    const gradientEnd = dbPlan.gradient_end || '330.4 81.2% 60.4%';

    const parsePrice = (priceStr: string | undefined): number => {
        if (!priceStr) return 0;
        let clean = priceStr.replace(/[^0-9.,]/g, '');
        if (!clean) return 0;
        if (clean.includes(',') && clean.includes('.')) {
            clean = clean.replace(/\./g, '').replace(',', '.');
        } else if (clean.includes(',')) {
            clean = clean.replace(',', '.');
        } else if (clean.includes('.')) {
            const parts = clean.split('.');
            if (parts[parts.length - 1].length === 3) clean = clean.replace(/\./g, '');
        }
        return parseFloat(clean) || 0;
    };

    const numericPrice = parsePrice(dbPlan.price);
    const discountPct = dbPlan.discount || 20;

    // Calcular preço anual: se o banco tem annual_price como total, dividir por 12;
    // se não, aplicar desconto ao preço mensal
    let displayAnnual: string;
    let annualTotal: string;
    let annualSavings: string;

    if (dbPlan.annual_price) {
        const numAnnual = parsePrice(dbPlan.annual_price);
        if (numAnnual > numericPrice * 2) {
            // annual_price no banco é o total anual
            displayAnnual = `$${Math.round(numAnnual / 12)}`;
            annualTotal = `$${numAnnual.toLocaleString('pt-BR')}`;
            annualSavings = `$${Math.round((numericPrice * 12) - numAnnual)}`;
        } else {
            // annual_price no banco já é o mensal com desconto
            displayAnnual = dbPlan.annual_price;
            annualTotal = `$${Math.round(numAnnual * 12).toLocaleString('pt-BR')}`;
            annualSavings = `$${Math.round((numericPrice - numAnnual) * 12)}`;
        }
    } else {
        const discountedMonthly = Math.round(numericPrice * (1 - discountPct / 100));
        displayAnnual = `$${discountedMonthly}`;
        annualTotal = `$${(discountedMonthly * 12).toLocaleString('pt-BR')}`;
        annualSavings = `$${Math.round((numericPrice - discountedMonthly) * 12)}`;
    }

    return {
        id: dbPlan.id,
        name: dbPlan.plan_name,
        price: dbPlan.price,
        annualPrice: displayAnnual,
        annualTotal,
        annualSavings,
        period: '/mês',
        description: dbPlan.description,
        features: dbPlan.features || [],
        color: `from-[hsl(${gradientStart})] to-[hsl(${gradientEnd})]`,
        popular: dbPlan.is_popular || false,
        discount: discountPct,
        liaQuote: dbPlan.lia_quote || '',
        maxChannels: dbPlan.max_channels,
        maxConversations: dbPlan.max_conversations,
        maxMessages: dbPlan.max_messages,
        creditosPlano: dbPlan.creditos_plano,
        creditHighlights: dbPlan.credit_highlights,
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
        const interval = setInterval(loadPlans, 30000);
        return () => clearInterval(interval);
    }, []);

    const loadPlans = async () => {
        // v7.0: Cache-first strategy
        const cacheKey = 'plans_cache';
        const cached = localStorage.getItem(cacheKey);

        if (cached) {
            try {
                const { data, timestamp } = JSON.parse(cached);
                const age = Date.now() - timestamp;
                const TTL = 5 * 60 * 1000; // 5min TTL

                if (age < TTL) {
                    console.log(`[usePlans] ✅ Using cached plans (age: ${Math.round(age / 1000)}s)`);
                    setPlans(data);
                    setLoading(false);
                    // Revalidate em background
                    setTimeout(() => loadPlansFromDB(), 100);
                    return;
                } else {
                    console.log(`[usePlans] ⚠️ Cache expired (age: ${Math.round(age / 1000)}s), fetching fresh`);
                }
            } catch (e) {
                console.warn('[usePlans] Cache parse error, ignoring:', e);
            }
        }

        // Fetch from DB
        await loadPlansFromDB();
    };

    const loadPlansFromDB = async () => {
        try {
            if (!supabase) return;

            // v6.2: Timeout de 5s para evitar spinner infinito
            const fetchPromise = supabase.from('plan_configs').select('*').order('created_at', { ascending: true });
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('PLANS_TIMEOUT')), 5000));

            const { data, error } = await Promise.race([fetchPromise, timeoutPromise]) as any;

            if (error) throw error;
            if (data && data.length > 0) {
                const parsedPlans = sortPlans(data.map(convertPlanFromDB));
                setPlans(parsedPlans);

                // v7.0: Salvar no cache
                localStorage.setItem('plans_cache', JSON.stringify({
                    data: parsedPlans,
                    timestamp: Date.now()
                }));
            }
        } catch (err) {
            console.warn('[Dashboard-usePlans] Error/Timeout fetching plans, using fallback:', err);
        } finally {
            setLoading(false);
        }
    };

    return { plans, loading };
}
