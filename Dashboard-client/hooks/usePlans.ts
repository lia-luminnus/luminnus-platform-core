import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Interface do Plano para uso no frontend
 */
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

// Fallback plans para sincronização com o site
export const fallbackPlans: Plan[] = [
    {
        id: "7c3aed01-3211-4bda-bc6b-4e5a9d828590",
        name: "Start",
        price: "€27",
        annualPrice: "€26",
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
        liaQuote: "O plano Start é perfeito se você está começando! Vou cuidar das perguntas mais frequentes dos seus clientes, trabalhar 24h e liberar seu tempo para focar no crescimento.",
        maxChannels: 1,
        maxConversations: 100,
        maxMessages: 1000
    },
    {
        id: "7c3aed02-3211-4bda-bc6b-4e5a9d828590",
        name: "Plus",
        price: "€147",
        annualPrice: "€117",
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
        liaQuote: "Esse é o plano que recomendo para quem já tem um fluxo constante de clientes! Vou agendar reuniões, atualizar seu CRM e até gerar relatórios inteligentes.",
        maxChannels: 5,
        maxConversations: 500,
        maxMessages: 5000
    },
    {
        id: "7c3aed03-3211-4bda-bc6b-4e5a9d828590",
        name: "Pro",
        price: "A partir de €997",
        annualPrice: "A partir de €797",
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
        liaQuote: "O Pro é para quem quer uma Lia 100% personalizada! Teremos uma equipe dedicada cuidando de tudo e eu vou trabalhar como se fosse parte do time.",
        maxChannels: "Ilimitado",
        maxConversations: "Ilimitado",
        maxMessages: "Ilimitado"
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
    const numericAnnualPrice = dbPlan.annual_price ? parsePrice(dbPlan.annual_price) : numericPrice * 12;

    // Se o annual_price no banco for o total, dividimos por 12 para mostrar o mensal equivalente
    const displayAnnual = dbPlan.annual_price && parsePrice(dbPlan.annual_price) > (numericPrice * 2)
        ? `€${Math.round(parsePrice(dbPlan.annual_price) / 12)}`
        : (dbPlan.annual_price || `€${Math.round(numericPrice * 0.8)}`);

    return {
        id: dbPlan.id,
        name: dbPlan.plan_name,
        price: dbPlan.price,
        annualPrice: displayAnnual,
        period: '/mês',
        description: dbPlan.description,
        features: dbPlan.features || [],
        color: `from-[hsl(${gradientStart})] to-[hsl(${gradientEnd})]`,
        popular: dbPlan.is_popular || false,
        discount: dbPlan.discount || 20,
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
