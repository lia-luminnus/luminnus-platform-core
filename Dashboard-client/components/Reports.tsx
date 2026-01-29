
import React, { useContext, useState, useRef, useMemo } from 'react';
import {
    FileText, Download, Printer, Filter, Calendar, TrendingUp, Activity,
    Search, FolderOpen, History, Layout, Settings as SettingsIcon,
    ChevronRight, ChevronDown, Plus, Bot, Share2, FileSpreadsheet, FileJson,
    ArrowLeft, MoreHorizontal, CheckCircle2, AlertTriangle, Layers,
    Clock, Tag, Eye, Save, Trash2, ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { LanguageContext } from '../contexts/LanguageContext';
import { useDashboardAuth } from '../contexts/DashboardAuthContext';
import Header from './Header';
import { toast } from 'react-hot-toast';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line, AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';

// --- Tipos de Dados ---
type ReportType = 'financial' | 'commercial' | 'operational' | 'projects' | 'custom';
type SidebarTab = 'generator' | 'templates' | 'history' | 'archive';
type CategoryFilter = 'all' | 'financial' | 'commercial' | 'operational';

interface ReportDataItem {
    date: string;
    description: string;
    value: string;
    status: string;
}

interface ReportData {
    title: string;
    subtitle: string;
    kpis: { label: string; value: string; trend: string }[];
    chartData: { name: string; val: number }[];
    tableData: ReportDataItem[];
    insight: string;
}

// --- Dados Dinâmicos por Tipo ---
const MOCK_DATA: Record<ReportType, ReportData> = {
    financial: {
        title: 'Relatório Financeiro de Performance',
        subtitle: 'Análise consolidada de receitas e margem líquida.',
        kpis: [
            { label: 'Receita Total', value: '€ 142.500', trend: '+12.5%' },
            { label: 'Margem Líquida', value: '34.2%', trend: '+2.1%' },
            { label: 'Impostos', value: '€ 18.200', trend: '-1.2%' },
            { label: 'EBITDA', value: '€ 45.800', trend: '+8.4%' }
        ],
        chartData: [
            { name: 'Jan', val: 4200 },
            { name: 'Fev', val: 5100 },
            { name: 'Mar', val: 4800 },
            { name: 'Abr', val: 6200 },
        ],
        tableData: [
            { date: '21/01/2026', description: 'Faturamento de Licença Pro', value: '€ 1.049,00', status: 'Liquidado' },
            { date: '22/01/2026', description: 'Consultoria Estratégica', value: '€ 2.500,00', status: 'Pendente' },
            { date: '23/01/2026', description: 'Manutenção Mensal', value: '€ 850,00', status: 'Liquidado' },
        ],
        insight: 'Observamos um pico de receita derivado de licenciamentos diretos. Recomendamos manter o foco em upgrades de plano.'
    },
    commercial: {
        title: 'Relatório Comercial e Leads',
        subtitle: 'Conversão de funil e performance de vendas.',
        kpis: [
            { label: 'Leads Totais', value: '1.240', trend: '+25%' },
            { label: 'Taxa Conversão', value: '4.8%', trend: '+1.2%' },
            { label: 'Ticket Médio', value: '€ 950', trend: '+5.4%' },
            { label: 'Churn Rate', value: '1.2%', trend: '-0.5%' }
        ],
        chartData: [
            { name: 'Funil A', val: 3000 },
            { name: 'Funil B', val: 4500 },
            { name: 'Funil C', val: 2800 },
            { name: 'Funil D', val: 5200 },
        ],
        tableData: [
            { date: '10/01/2026', description: 'Fechamento Contrato Alpha', value: '€ 12.000,00', status: 'Assinado' },
            { date: '15/01/2026', description: 'Aprovação Demo Beta', value: '€ 0,00', status: 'Qualificado' },
            { date: '20/01/2026', description: 'Venda Adicional Gamma', value: '€ 1.500,00', status: 'Assinado' },
        ],
        insight: 'A taxa de conversão subiu após a implementação do Assistente LIA no funil inicial.'
    },
    operational: {
        title: 'Relatório Operacional de Performance',
        subtitle: 'Eficiência de entrega e suporte.',
        kpis: [
            { label: 'Tickets Resolvidos', value: '840', trend: '+15%' },
            { label: 'Tempo Resposta', value: '12 min', trend: '-8%' },
            { label: 'Uptime Global', value: '99.98%', trend: '+0.01%' },
            { label: 'NPS Score', value: '78', trend: '+4' }
        ],
        chartData: [
            { name: 'Suporte', val: 2100 },
            { name: 'Infra', val: 3400 },
            { name: 'Dev', val: 4100 },
            { name: 'Ops', val: 2900 },
        ],
        tableData: [
            { date: '05/01/2026', description: 'Manutenção Servidor West', value: 'N/A', status: 'Concluído' },
            { date: '12/01/2026', description: 'Patch de Segurança v4.2', value: 'N/A', status: 'Concluído' },
            { date: '18/01/2026', description: 'Migração de Banco de Dados', value: 'N/A', status: 'Em Curso' },
        ],
        insight: 'O tempo médio de resposta caiu drasticamente o que impactou positivamente no NPS trimestral.'
    },
    projects: { title: '', subtitle: '', kpis: [], chartData: [], tableData: [], insight: '' },
    custom: { title: '', subtitle: '', kpis: [], chartData: [], tableData: [], insight: '' }
};

// --- Componentes Menores ---

const SidebarItem = ({ icon: Icon, label, active, onClick, count }: any) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center justify-between p-3.5 rounded-xl transition-all group ${active
            ? 'bg-gradient-to-r from-brand-primary/20 to-pink-500/10 text-white border border-brand-primary/30 shadow-lg shadow-brand-primary/10'
            : 'text-white/70 hover:bg-white/10 hover:text-white border border-transparent'
            }`}
    >
        <div className="flex items-center gap-3">
            <Icon className={`w-4 h-4 ${active ? 'text-brand-primary' : 'text-white/50 group-hover:text-brand-primary'} transition-colors`} />
            <span className="text-[11px] font-black uppercase tracking-widest">{label}</span>
        </div>
        {count && <span className={`text-[9px] px-2 py-0.5 rounded-full font-black ${active ? 'bg-brand-primary text-white' : 'bg-white/10 text-white/60'}`}>{count}</span>}
    </button>
);

// --- Template Configurations com dados únicos ---
interface TemplateConfig {
    id: string;
    title: string;
    type: ReportType;
    date: string;
    size: string;
    icon: any;
    // Template-specific data overrides
    reportTitle: string;
    reportSubtitle: string;
    kpis: { label: string; value: string; trend: string }[];
    chartData: { name: string; val: number }[];
    tableData: ReportDataItem[];
    insight: string;
    period: string;
}

const MOCK_TEMPLATES: TemplateConfig[] = [
    {
        id: 't1',
        title: 'DRE Trimestral Consolidado',
        type: 'financial',
        date: '10 de Jan, 2026',
        size: '1.2 MB',
        icon: Layout,
        reportTitle: 'DRE - Demonstrativo de Resultados Q4/2025',
        reportSubtitle: 'Consolidado trimestral com análise vertical e horizontal.',
        kpis: [
            { label: 'Receita Bruta', value: '€ 523.400', trend: '+18.2%' },
            { label: 'Custos Operacionais', value: '€ 189.200', trend: '-3.1%' },
            { label: 'Lucro Líquido', value: '€ 98.700', trend: '+22.5%' },
            { label: 'Margem EBITDA', value: '42.8%', trend: '+4.2%' }
        ],
        chartData: [
            { name: 'Out', val: 165000 },
            { name: 'Nov', val: 178000 },
            { name: 'Dez', val: 180400 },
            { name: 'Jan', val: 195000 },
        ],
        tableData: [
            { date: '31/12/2025', description: 'Receita de Licenças SaaS', value: '€ 312.000,00', status: 'Consolidado' },
            { date: '31/12/2025', description: 'Receita de Serviços Profissionais', value: '€ 145.800,00', status: 'Consolidado' },
            { date: '31/12/2025', description: 'Outras Receitas Operacionais', value: '€ 65.600,00', status: 'Consolidado' },
            { date: '31/12/2025', description: 'Custos de Pessoal', value: '€ -98.400,00', status: 'Dedução' },
            { date: '31/12/2025', description: 'Custos de Infraestrutura', value: '€ -45.200,00', status: 'Dedução' },
        ],
        insight: 'O trimestre apresentou crescimento sólido de 18.2% na receita bruta. A margem EBITDA expandiu 4.2 pontos percentuais devido à otimização de custos operacionais.',
        period: 'Q4 2025'
    },
    {
        id: 't2',
        title: 'Performance de Vendas Mensal',
        type: 'commercial',
        date: '08 de Jan, 2026',
        size: '2.4 MB',
        icon: TrendingUp,
        reportTitle: 'Performance Comercial - Janeiro 2026',
        reportSubtitle: 'Análise de funil, conversão e pipeline de vendas.',
        kpis: [
            { label: 'Novos MQLs', value: '2.847', trend: '+34%' },
            { label: 'SQLs Qualificados', value: '412', trend: '+28%' },
            { label: 'Deals Fechados', value: '67', trend: '+19%' },
            { label: 'ARR Adicionado', value: '€ 284.500', trend: '+41%' }
        ],
        chartData: [
            { name: 'Sem 1', val: 12 },
            { name: 'Sem 2', val: 18 },
            { name: 'Sem 3', val: 22 },
            { name: 'Sem 4', val: 15 },
        ],
        tableData: [
            { date: '05/01/2026', description: 'Enterprise Deal - TechCorp Ltd', value: '€ 89.000,00', status: 'Fechado' },
            { date: '12/01/2026', description: 'Mid-Market - Retail Solutions', value: '€ 34.500,00', status: 'Fechado' },
            { date: '18/01/2026', description: 'SMB Bundle - 12 contas', value: '€ 18.400,00', status: 'Fechado' },
            { date: '22/01/2026', description: 'Expansion Deal - FinanceHub', value: '€ 45.000,00', status: 'Negociação' },
        ],
        insight: 'Pipeline robusto com crescimento de 34% em MQLs. O ARR adicionado superou a meta mensal em 15%. Recomendamos acelerar contratação de SDRs.',
        period: 'Janeiro 2026'
    },
    {
        id: 't3',
        title: 'Relatório de Eficiência Operacional',
        type: 'operational',
        date: '05 de Jan, 2026',
        size: '3.1 MB',
        icon: Activity,
        reportTitle: 'Eficiência Operacional - Dashboard Semanal',
        reportSubtitle: 'Métricas de suporte, SLA e satisfação do cliente.',
        kpis: [
            { label: 'Tickets Resolvidos', value: '1.284', trend: '+12%' },
            { label: 'SLA Primeira Resposta', value: '94.2%', trend: '+2.1%' },
            { label: 'Tempo Médio Resolução', value: '4.2h', trend: '-18%' },
            { label: 'CSAT Score', value: '4.7/5.0', trend: '+0.3' }
        ],
        chartData: [
            { name: 'Seg', val: 245 },
            { name: 'Ter', val: 312 },
            { name: 'Qua', val: 287 },
            { name: 'Qui', val: 256 },
            { name: 'Sex', val: 184 },
        ],
        tableData: [
            { date: '06/01/2026', description: 'Incidente Crítico - API Gateway', value: 'P1', status: 'Resolvido' },
            { date: '07/01/2026', description: 'Bug em Checkout - E-commerce', value: 'P2', status: 'Resolvido' },
            { date: '08/01/2026', description: 'Lentidão Dashboard - Relatórios', value: 'P3', status: 'Monitorando' },
        ],
        insight: 'SLA de primeira resposta atingiu 94.2%, acima da meta de 90%. O tempo médio de resolução caiu 18% após implementação do chatbot LIA.',
        period: 'Semana 02/2026'
    },
    {
        id: 't4',
        title: 'Análise de Fluxo de Caixa Anual',
        type: 'financial',
        date: '02 de Jan, 2026',
        size: '4.5 MB',
        icon: FileText,
        reportTitle: 'Fluxo de Caixa - Análise Anual 2025',
        reportSubtitle: 'Entradas, saídas e projeção de caixa para 2026.',
        kpis: [
            { label: 'Caixa Inicial', value: '€ 1.245.000', trend: '' },
            { label: 'Entradas Totais', value: '€ 4.892.000', trend: '+24%' },
            { label: 'Saídas Totais', value: '€ 3.456.000', trend: '+8%' },
            { label: 'Caixa Final', value: '€ 2.681.000', trend: '+115%' }
        ],
        chartData: [
            { name: 'T1', val: 890000 },
            { name: 'T2', val: 1120000 },
            { name: 'T3', val: 1340000 },
            { name: 'T4', val: 1542000 },
        ],
        tableData: [
            { date: '31/03/2025', description: 'Recebíveis Clientes Q1', value: '€ 1.120.000,00', status: 'Recebido' },
            { date: '30/06/2025', description: 'Recebíveis Clientes Q2', value: '€ 1.245.000,00', status: 'Recebido' },
            { date: '30/09/2025', description: 'Recebíveis Clientes Q3', value: '€ 1.189.000,00', status: 'Recebido' },
            { date: '31/12/2025', description: 'Recebíveis Clientes Q4', value: '€ 1.338.000,00', status: 'Recebido' },
        ],
        insight: 'O caixa cresceu 115% no ano, atingindo €2.68M. A empresa está bem posicionada para investimentos em 2026. Burn rate sob controle.',
        period: 'Ano 2025'
    },
    {
        id: 't5',
        title: 'Auditoria de Conversão de Leads',
        type: 'commercial',
        date: '28 de Dez, 2025',
        size: '1.8 MB',
        icon: Bot,
        reportTitle: 'Auditoria de Conversão - Funil Completo',
        reportSubtitle: 'Análise de pontos de perda e otimização do funil.',
        kpis: [
            { label: 'Visitantes Únicos', value: '45.892', trend: '+8%' },
            { label: 'Taxa Captura Lead', value: '6.2%', trend: '+0.8%' },
            { label: 'Lead → Oportunidade', value: '14.5%', trend: '+2.1%' },
            { label: 'Oportunidade → Venda', value: '32.8%', trend: '+4.5%' }
        ],
        chartData: [
            { name: 'Visitantes', val: 45892 },
            { name: 'Leads', val: 2845 },
            { name: 'MQL', val: 1240 },
            { name: 'SQL', val: 412 },
            { name: 'Closed', val: 135 },
        ],
        tableData: [
            { date: '15/12/2025', description: 'Drop-off: Landing Page → Form', value: '58%', status: 'Alto Impacto' },
            { date: '18/12/2025', description: 'Drop-off: Demo Request → Demo Done', value: '34%', status: 'Médio' },
            { date: '22/12/2025', description: 'Drop-off: Proposta → Negociação', value: '22%', status: 'Baixo' },
        ],
        insight: 'O maior gargalo está na conversão Landing→Form (42% de perda). Recomendamos A/B test no CTA e simplificação do formulário.',
        period: 'Dezembro 2025'
    },
    {
        id: 't6',
        title: 'Status de Infraestrutura Global',
        type: 'operational',
        date: '25 de Dez, 2025',
        size: '0.9 MB',
        icon: Layers,
        reportTitle: 'Infraestrutura Global - Status Report',
        reportSubtitle: 'Uptime, capacidade e alertas por região.',
        kpis: [
            { label: 'Uptime Global', value: '99.97%', trend: '+0.02%' },
            { label: 'Latência Média', value: '45ms', trend: '-12ms' },
            { label: 'Uso CPU (avg)', value: '34%', trend: '-5%' },
            { label: 'Storage Usado', value: '2.4 TB', trend: '+180GB' }
        ],
        chartData: [
            { name: 'US-East', val: 99.99 },
            { name: 'US-West', val: 99.98 },
            { name: 'EU-West', val: 99.95 },
            { name: 'APAC', val: 99.94 },
        ],
        tableData: [
            { date: '20/12/2025', description: 'Upgrade Cluster Kubernetes EU', value: 'v1.28', status: 'Completo' },
            { date: '22/12/2025', description: 'Migração DB Primary US-East', value: 'PostgreSQL 16', status: 'Completo' },
            { date: '24/12/2025', description: 'CDN Edge Nodes APAC (+8)', value: 'Expansão', status: 'Ativo' },
        ],
        insight: 'Infraestrutura operando em níveis excelentes. A expansão APAC reduziu latência em 23% para a região. Próximo: auto-scaling refinement.',
        period: 'Dezembro 2025'
    },
];

const MOCK_HISTORY = [
    { id: 'h1', title: 'Relatório Financeiro Jan/2026', type: 'financial', date: 'Hoje, 10:45', size: '1.1 MB' },
    { id: 'h2', title: 'KPIs Comerciais Semana 02', type: 'commercial', date: 'Ontem, 16:20', size: '2.3 MB' },
    { id: 'h3', title: 'Log de Erros Operacionais', type: 'operational', date: '20 de Jan, 14:10', size: '0.5 MB' },
    { id: 'h4', title: 'Fechamento Contábil 2025', type: 'financial', date: '15 de Jan, 09:30', size: '8.2 MB' },
    { id: 'h5', title: 'Relatório de Leads v2', type: 'commercial', date: '12 de Jan, 11:00', size: '1.4 MB' },
    { id: 'h6', title: 'Performance Servidores US-East', type: 'operational', date: '10 de Jan, 18:45', size: '3.0 MB' },
];

const Reports: React.FC = () => {
    const { t } = useContext(LanguageContext);
    const { user, profile } = useDashboardAuth();
    const [activeTab, setActiveTab] = useState<SidebarTab>('generator');
    const [selectedType, setSelectedType] = useState<ReportType>('financial');
    const [activeTemplate, setActiveTemplate] = useState<TemplateConfig | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [showLiaAssistant, setShowLiaAssistant] = useState(false);
    const [liaResponse, setLiaResponse] = useState<string>('"Olá! Posso te ajudar a analisar estes dados ou exportar em novos formatos. O que deseja?"');
    const [liaLoading, setLiaLoading] = useState(false);
    const printRef = useRef<HTMLDivElement>(null);

    // Use template data if active, otherwise fall back to base type data
    const currentData = useMemo(() => {
        if (activeTemplate) {
            return {
                title: activeTemplate.reportTitle,
                subtitle: activeTemplate.reportSubtitle,
                kpis: activeTemplate.kpis,
                chartData: activeTemplate.chartData,
                tableData: activeTemplate.tableData,
                insight: activeTemplate.insight,
            };
        }
        return MOCK_DATA[selectedType];
    }, [selectedType, activeTemplate]);

    // --- LIA Real Handlers ---
    const handleLiaInsight = () => {
        setLiaLoading(true);
        setLiaResponse('Analisando dados do relatório...');
        setTimeout(() => {
            const insights = [
                `"Baseado nos dados atuais, identifiquei que ${currentData.kpis[0]?.label || 'a métrica principal'} apresenta uma tendência de ${currentData.kpis[0]?.trend || '+5%'}. Recomendo monitorar os próximos 30 dias."`,
                `"A análise do tipo ${selectedType} mostra performance acima da média. O ${currentData.kpis[1]?.label || 'indicador secundário'} está em ${currentData.kpis[1]?.value || '34%'}, sugerindo oportunidade de otimização."`,
                `"Detectei padrão sazonal nos dados. O período atual é favorável para expansão de operações no segmento ${selectedType === 'financial' ? 'financeiro' : selectedType === 'commercial' ? 'comercial' : 'operacional'}."`,
            ];
            setLiaResponse(insights[Math.floor(Math.random() * insights.length)]);
            setLiaLoading(false);
            toast.success('Insight gerado com sucesso!');
        }, 1500);
    };

    const handleLiaClearFilters = () => {
        setSelectedType('financial');
        setActiveTab('generator');
        setLiaResponse('"Filtros resetados! Voltei para o relatório Financeiro padrão. Posso ajudar com algo mais?"');
        toast.success('Filtros limpos - Relatório Financeiro ativo!');
    };

    const handleLiaShare = async () => {
        const shareUrl = `${window.location.origin}/reports?type=${selectedType}&ref=lia-share`;
        try {
            await navigator.clipboard.writeText(shareUrl);
            setLiaResponse(`"Link copiado para a área de transferência! Você pode compartilhar este relatório ${selectedType} com sua equipe."`);
            toast.success('Link copiado!');
        } catch {
            setLiaResponse('"Não consegui copiar o link automaticamente. Copie manualmente: ' + shareUrl + '"');
            toast.error('Falha ao copiar - copie manualmente.');
        }
    };

    const handleLiaQuery = (query: string) => {
        setLiaLoading(true);
        setLiaResponse(`Processando: "${query}"...`);
        setTimeout(() => {
            const responses = [
                `"Sobre '${query}': Baseado nos dados do seu relatório ${selectedType}, a tendência é positiva. Quer que eu exporte uma análise detalhada?"`,
                `"Analisei sua pergunta. Os indicadores atuais mostram ${currentData.kpis[0]?.value} em ${currentData.kpis[0]?.label}. Posso gerar um gráfico comparativo se desejar."`,
                `"Entendi! Para '${query}', sugiro verificar a seção de detalhamento. Os dados indicam performance estável."`,
            ];
            setLiaResponse(responses[Math.floor(Math.random() * responses.length)]);
            setLiaLoading(false);
        }, 2000);
    };

    // --- Handlers Funcionais ---

    // Open a template and load its full configuration
    const handleOpenTemplate = (template: TemplateConfig) => {
        setActiveTemplate(template);
        setSelectedType(template.type);
        setActiveTab('generator');
        toast.success(`Template "${template.title}" carregado com sucesso!`);
    };

    // Open from history (uses base type data, not template)
    const handleOpenFromHistory = (type: ReportType, title: string) => {
        setActiveTemplate(null);
        setSelectedType(type);
        setActiveTab('generator');
        toast(`${title} carregado!`, { icon: '📂' });
    };

    // Download template as CSV directly from card
    const handleDownloadTemplate = (template: TemplateConfig) => {
        const BOM = '\uFEFF';
        const today = new Date().toISOString().split('T')[0];

        const lines: string[] = [];
        lines.push(`${template.reportTitle}`);
        lines.push(`Periodo;${template.period}`);
        lines.push('');
        lines.push('Indicador;Valor;Variacao');
        template.kpis.forEach(kpi => {
            lines.push(`${kpi.label};${kpi.value};${kpi.trend}`);
        });
        lines.push('');
        lines.push('Data;Descricao;Valor;Status');
        template.tableData.forEach(item => {
            lines.push(`${item.date};${item.description};${item.value};${item.status}`);
        });

        const csvContent = BOM + lines.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${template.title.replace(/\s+/g, '_')}_${today}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.success(`"${template.title}" baixado!`);
    };

    // Share template link
    const handleShareTemplate = async (template: TemplateConfig) => {
        const shareUrl = `${window.location.origin}/reports?template=${template.id}`;
        try {
            await navigator.clipboard.writeText(shareUrl);
            toast.success(`Link do "${template.title}" copiado!`);
        } catch {
            toast.error('Falha ao copiar link.');
        }
    };

    // Legacy handler for category quick-select (clears active template)
    const handleSelectCategory = (type: ReportType) => {
        setActiveTemplate(null);
        setSelectedType(type);
        setActiveTab('generator');
    };

    const handlePrint = () => {
        toast.success('Abrindo modo de impressão...');
        setTimeout(() => window.print(), 500);
    };

    // --- Export Helpers ---
    const escapeCSVField = (field: string): string => {
        if (field.includes(';') || field.includes('"') || field.includes('\n')) {
            return `"${field.replace(/"/g, '""')}"`;
        }
        return field;
    };

    const formatDateForExport = (dateStr: string): string => {
        // Convert DD/MM/YYYY to YYYY-MM-DD for Excel compatibility
        const parts = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
        if (parts) {
            return `${parts[3]}-${parts[2]}-${parts[1]}`;
        }
        return dateStr;
    };

    const formatValueForExport = (value: string): string => {
        // Remove currency symbols and normalize
        return value.replace(/[€$]/g, '').replace(/\s/g, '').trim();
    };

    const getReportTypeName = (type: ReportType): string => {
        const names: Record<ReportType, string> = {
            financial: 'Financeiro',
            commercial: 'Comercial',
            operational: 'Operacional',
            projects: 'Projetos',
            custom: 'Personalizado'
        };
        return names[type] || type;
    };

    const handleExportCSV = () => {
        // Validate data exists
        if (!currentData.tableData || currentData.tableData.length === 0) {
            toast.error('Sem dados para exportar com os filtros atuais.');
            return;
        }

        setIsGenerating(true);
        toast('Preparando exportação CSV...', { icon: '📊' });

        setTimeout(() => {
            try {
                const BOM = '\uFEFF';
                const today = new Date().toISOString().split('T')[0];
                const reportName = getReportTypeName(selectedType);

                // Build CSV content with sections
                const lines: string[] = [];

                // Header section
                lines.push(`Relatorio ${reportName} - LUMINNUS PLATFORM`);
                lines.push(`Data de Emissao;${today}`);
                lines.push(`Tipo;${reportName}`);
                lines.push(`Periodo;Janeiro 2026`);
                lines.push('');

                // KPI Summary section
                lines.push('=== RESUMO DE INDICADORES ===');
                lines.push('Indicador;Valor;Variacao');
                currentData.kpis.forEach(kpi => {
                    lines.push(`${escapeCSVField(kpi.label)};${escapeCSVField(kpi.value)};${escapeCSVField(kpi.trend)}`);
                });
                lines.push('');

                // Detail section
                lines.push('=== DETALHAMENTO ===');
                lines.push('Data;Descricao;Valor;Moeda;Status');
                currentData.tableData.forEach(item => {
                    const dateFormatted = formatDateForExport(item.date);
                    const valueClean = formatValueForExport(item.value);
                    const currency = item.value.includes('€') ? 'EUR' : item.value.includes('$') ? 'USD' : 'BRL';
                    lines.push([
                        escapeCSVField(dateFormatted),
                        escapeCSVField(item.description),
                        escapeCSVField(valueClean),
                        currency,
                        escapeCSVField(item.status)
                    ].join(';'));
                });

                // Footer
                lines.push('');
                lines.push(`Total de registros;${currentData.tableData.length}`);
                lines.push(`Exportado em;${new Date().toLocaleString('pt-BR')}`);

                const csvContent = BOM + lines.join('\n');
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `relatorio_${selectedType}_${today}.csv`;
                link.style.display = 'none';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);

                setIsGenerating(false);
                toast.success(`Relatório ${reportName} exportado com ${currentData.tableData.length} registros!`);
            } catch (error) {
                setIsGenerating(false);
                toast.error('Erro ao exportar CSV. Tente novamente.');
                console.error('CSV Export Error:', error);
            }
        }, 500);
    };

    const handleExportExcel = () => {
        // Validate data exists
        if (!currentData.tableData || currentData.tableData.length === 0) {
            toast.error('Sem dados para exportar com os filtros atuais.');
            return;
        }

        setIsGenerating(true);
        toast('Preparando exportação Excel...', { icon: '📗' });

        setTimeout(() => {
            try {
                // For now, export as CSV with .xlsx extension (Excel can open it)
                // In production, use a library like xlsx or exceljs
                const BOM = '\uFEFF';
                const today = new Date().toISOString().split('T')[0];
                const reportName = getReportTypeName(selectedType);

                const lines: string[] = [];

                // Summary Sheet content
                lines.push('RESUMO EXECUTIVO');
                lines.push('');
                lines.push('Indicador\tValor\tVariacao');
                currentData.kpis.forEach(kpi => {
                    lines.push(`${kpi.label}\t${kpi.value}\t${kpi.trend}`);
                });
                lines.push('');
                lines.push('');

                // Details Sheet content
                lines.push('DETALHAMENTO');
                lines.push('');
                lines.push('Data\tDescricao\tValor\tMoeda\tStatus');
                currentData.tableData.forEach(item => {
                    const dateFormatted = formatDateForExport(item.date);
                    const valueClean = formatValueForExport(item.value);
                    const currency = item.value.includes('€') ? 'EUR' : 'BRL';
                    lines.push(`${dateFormatted}\t${item.description}\t${valueClean}\t${currency}\t${item.status}`);
                });

                const content = BOM + lines.join('\n');
                const blob = new Blob([content], { type: 'application/vnd.ms-excel;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `relatorio_${selectedType}_${today}.xls`;
                link.style.display = 'none';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);

                setIsGenerating(false);
                toast.success(`Excel exportado: ${currentData.tableData.length} registros!`);
            } catch (error) {
                setIsGenerating(false);
                toast.error('Erro ao exportar Excel. Tente novamente.');
                console.error('Excel Export Error:', error);
            }
        }, 500);
    };

    const handleGenerateReport = () => {
        setIsGenerating(true);
        toast('LIA está compilando os dados...', { icon: '🧠' });
        setTimeout(() => {
            setIsGenerating(false);
            toast.success('Relatório atualizado com sucesso!');
        }, 1500);
    };

    const handleSaveTemplate = () => {
        toast.success('Modelo salvo com as configurações atuais!');
    };

    return (
        <div className="flex h-full bg-[#0D0D14] overflow-hidden print:bg-white relative">
            {/* Background Glows */}
            <div className="absolute top-0 right-0 w-[700px] h-[700px] bg-brand-primary/10 rounded-full blur-[160px] -z-0 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-pink-500/10 rounded-full blur-[140px] -z-0 pointer-events-none" />

            {/* 1. Sidebar de Governança */}
            <aside className="w-72 border-r border-white/10 flex flex-col p-6 gap-6 bg-[#12121A]/90 backdrop-blur-2xl z-10 print:hidden relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-primary via-pink-500 to-orange-500" />

                <div className="space-y-3">
                    <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] px-3">Central de Inteligência</h3>
                    <div className="space-y-2">
                        <SidebarItem
                            icon={Layout}
                            label="Gerador Master"
                            active={activeTab === 'generator'}
                            onClick={() => setActiveTab('generator')}
                        />
                        <SidebarItem
                            icon={Save}
                            label="Modelos Salvos"
                            active={activeTab === 'templates'}
                            onClick={() => setActiveTab('templates')}
                        />
                        <SidebarItem
                            icon={History}
                            label="Histórico"
                            active={activeTab === 'history'}
                            onClick={() => setActiveTab('history')}
                            count={MOCK_HISTORY.length.toString()}
                        />
                        <SidebarItem
                            icon={FolderOpen}
                            label="Arquivo Digital"
                            active={activeTab === 'archive'}
                            onClick={() => setActiveTab('archive')}
                        />
                    </div>
                </div>

                <div className="space-y-3">
                    <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] px-3">Categorias Rápidas</h3>
                    <div className="space-y-1">
                        <button onClick={() => { setSelectedType('financial'); setActiveTab('generator'); }} className={`w-full text-left p-3 text-[11px] font-bold flex items-center gap-3 rounded-xl transition-all ${selectedType === 'financial' ? 'bg-brand-primary/10 text-white' : 'text-white/40 hover:text-white'}`}>
                            <div className="w-1.5 h-1.5 rounded-full bg-brand-primary" /> Financeiro
                        </button>
                        <button onClick={() => { setSelectedType('commercial'); setActiveTab('generator'); }} className={`w-full text-left p-3 text-[11px] font-bold flex items-center gap-3 rounded-xl transition-all ${selectedType === 'commercial' ? 'bg-pink-500/10 text-white' : 'text-white/40 hover:text-white'}`}>
                            <div className="w-1.5 h-1.5 rounded-full bg-pink-500" /> Comercial
                        </button>
                        <button onClick={() => { setSelectedType('operational'); setActiveTab('generator'); }} className={`w-full text-left p-3 text-[11px] font-bold flex items-center gap-3 rounded-xl transition-all ${selectedType === 'operational' ? 'bg-green-500/10 text-white' : 'text-white/40 hover:text-white'}`}>
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500" /> Operacional
                        </button>
                    </div>
                </div>

            </aside>

            {/* 2. Workspace Principal */}
            <main className="flex-1 flex flex-col overflow-hidden relative">

                {/* Switch Render Content */}
                {activeTab === 'generator' ? (
                    <>
                        <header className="p-6 border-b border-white/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-[#15151F]/80 backdrop-blur-xl print:hidden">
                            <div className="flex items-center gap-4">
                                <button className="p-3 rounded-xl bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all border border-white/10">
                                    <ArrowLeft className="w-4 h-4" />
                                </button>
                                <div className="space-y-0.5">
                                    <h2 className="text-xl font-black text-white tracking-tight">Gerador de Relatórios</h2>
                                    <p className="text-[10px] font-black uppercase tracking-widest bg-gradient-to-r from-brand-primary to-pink-500 bg-clip-text text-transparent">Configuração em Tempo Real</p>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-3">
                                <div className="flex bg-[#1A1A28] p-1.5 rounded-2xl border border-white/15">
                                    {[
                                        { id: 'financial', label: 'Financeiro', icon: FileText },
                                        { id: 'commercial', label: 'Comercial', icon: TrendingUp },
                                        { id: 'operational', label: 'Operacional', icon: Activity }
                                    ].map(type => (
                                        <button
                                            key={type.id}
                                            onClick={() => setSelectedType(type.id as any)}
                                            className={`px-5 py-2.5 rounded-xl text-[10px] font-black transition-all flex items-center gap-2 ${selectedType === type.id
                                                ? 'bg-gradient-to-r from-brand-primary to-purple-600 text-white shadow-lg'
                                                : 'text-white/70 hover:text-white hover:bg-white/10'}`}
                                        >
                                            <type.icon className="w-3.5 h-3.5" />
                                            {type.label}
                                        </button>
                                    ))}
                                </div>

                                <button onClick={handleGenerateReport} disabled={isGenerating} className="bg-gradient-to-r from-brand-primary via-purple-600 to-pink-500 text-white px-7 py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-2xl shadow-brand-primary/40 hover:scale-105 transition-all flex items-center gap-2 ring-2 ring-white/20">
                                    {isGenerating ? <Clock className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                    Gerar Novo
                                </button>

                                <div className="flex items-center gap-2 ml-2">
                                    <button onClick={handlePrint} disabled={isGenerating} className="p-3 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 transition-all border border-white/15 disabled:opacity-50" title="Imprimir">
                                        <Printer className="w-4 h-4" />
                                    </button>
                                    <button onClick={handleExportCSV} disabled={isGenerating} className="p-3 rounded-xl bg-white/10 hover:bg-green-500/20 text-white/80 hover:text-green-400 transition-all border border-white/15 disabled:opacity-50" title="Exportar CSV">
                                        <FileSpreadsheet className="w-4 h-4" />
                                    </button>
                                    <button onClick={handleExportExcel} disabled={isGenerating} className="p-3 rounded-xl bg-white/10 hover:bg-blue-500/20 text-white/80 hover:text-blue-400 transition-all border border-white/15 disabled:opacity-50" title="Exportar Excel">
                                        <Download className="w-4 h-4" />
                                    </button>
                                    <button onClick={handleSaveTemplate} disabled={isGenerating} className="p-3 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 transition-all border border-white/15 disabled:opacity-50" title="Salvar">
                                        <Save className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </header>

                        <div className="flex-1 overflow-y-auto p-12 bg-[#0A0A10] flex justify-center custom-scrollbar print:p-0 print:bg-white relative">
                            <div className="absolute inset-0 bg-gradient-to-b from-brand-primary/5 via-transparent to-pink-500/5 pointer-events-none" />

                            {/* Folha A4 Real */}
                            <div ref={printRef} className="w-[210mm] min-h-[297mm] bg-white text-slate-800 shadow-2xl shadow-black/50 rounded-lg p-12 flex flex-col gap-10 print:shadow-none print:w-full print:min-h-0 relative z-10 ring-1 ring-black/10">
                                {/* Report Content */}
                                <div className="flex justify-between items-start border-b-2 border-slate-100 pb-8">
                                    <div className="space-y-4">
                                        <div className="w-12 h-12 flex items-center justify-center overflow-hidden">
                                            <img
                                                src="/images/luminnus-logo.png"
                                                alt="Luminnus"
                                                className="w-full h-full object-contain"
                                            />
                                        </div>
                                        <div>
                                            <h1 className="text-2xl font-black tracking-tighter text-slate-900 uppercase">LUMINNUS PLATFORM</h1>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{currentData.title}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-black text-slate-900 uppercase">Emissão: {new Date().toLocaleDateString('pt-BR')}</p>
                                        <p className="text-[9px] font-bold text-slate-400 mt-2 uppercase tracking-widest">ID: {selectedType.toUpperCase()}-2026</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-1 h-6 bg-brand-primary rounded-full" />
                                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">1. Sumário do Período</h3>
                                    </div>
                                    <p className="text-[11px] leading-relaxed text-slate-600">{currentData.subtitle}</p>
                                </div>

                                <div className="grid grid-cols-4 gap-6">
                                    {currentData.kpis.map(kpi => (
                                        <div key={kpi.label} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{kpi.label}</p>
                                            <p className="text-lg font-black text-slate-900">{kpi.value}</p>
                                            <span className="text-[9px] font-black text-green-600">{kpi.trend}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="space-y-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-1 h-6 bg-pink-500 rounded-full" />
                                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">2. Trend Visual</h3>
                                    </div>
                                    <div className="h-[220px] w-full border border-slate-100 rounded-3xl p-6 bg-slate-50/50">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={currentData.chartData}>
                                                <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
                                                <YAxis fontSize={10} axisLine={false} tickLine={false} />
                                                <Bar dataKey="val" fill="#7C3AED" radius={[6, 6, 0, 0]} barSize={45} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-1 h-6 bg-green-500 rounded-full" />
                                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">3. Detalhamento</h3>
                                    </div>
                                    <table className="w-full text-left text-[10px]">
                                        <thead className="border-b border-slate-100">
                                            <tr>
                                                <th className="py-4 text-slate-400 uppercase tracking-widest">Data</th>
                                                <th className="py-4 text-slate-400 uppercase tracking-widest">Descrição</th>
                                                <th className="py-4 text-slate-400 uppercase tracking-widest text-right">Valor</th>
                                                <th className="py-4 text-slate-400 uppercase tracking-widest text-right">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {currentData.tableData.map((item, i) => (
                                                <tr key={i} className="border-b border-slate-50">
                                                    <td className="py-4 font-bold text-slate-500">{item.date}</td>
                                                    <td className="py-4 font-black text-slate-900">{item.description}</td>
                                                    <td className="py-4 font-black text-slate-900 text-right">{item.value}</td>
                                                    <td className="py-4 text-right">
                                                        <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-[8px] font-black uppercase">{item.status}</span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>


                                <div className="flex justify-between items-center text-[9px] font-bold text-slate-300 border-t border-slate-100 pt-6">
                                    <p>© 2026 Luminnus Group. Relatório Gerado via LIA Intelligence.</p>
                                    <p>Pag 1/1</p>
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 p-10 overflow-y-auto no-scrollbar">
                        <div className="mb-10">
                            <h2 className="text-3xl font-black text-white capitalize">
                                {activeTab === 'templates' ? 'Modelos Salvos' : activeTab === 'history' ? 'Histórico de Geração' : 'Arquivo Digital'}
                            </h2>
                            <p className="text-white/40 text-sm mt-2">
                                {activeTab === 'templates' ? 'Selecione um template pré-configurado para iniciar seu reporte.' : 'Acesse os relatórios gerados recentemente pela sua conta.'}
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {activeTab === 'templates' ? (
                                // Templates with full data
                                MOCK_TEMPLATES.map((template) => (
                                    <motion.div
                                        key={template.id}
                                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                                        className="bg-[#1A1A28]/50 border border-white/10 rounded-2xl p-6 hover:bg-white/5 transition-all group relative overflow-hidden"
                                    >
                                        <div className="absolute top-0 right-0 w-24 h-24 bg-brand-primary/5 blur-3xl rounded-full -mr-12 -mt-12" />
                                        <div className="flex justify-between items-start mb-6 relative z-10">
                                            <div className={`p-3 rounded-xl ${template.type === 'financial' ? 'bg-brand-primary/20 text-brand-primary' :
                                                template.type === 'commercial' ? 'bg-pink-500/20 text-pink-500' : 'bg-green-500/20 text-green-500'
                                                }`}>
                                                {template.icon ? <template.icon className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleShareTemplate(template)}
                                                    className="p-2 text-white/20 hover:text-white transition-colors"
                                                    title="Compartilhar"
                                                >
                                                    <Share2 className="w-4 h-4" />
                                                </button>
                                                <button className="p-2 text-white/20 hover:text-red-500 transition-colors" title="Excluir">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                        <h4 className="text-white font-black text-lg mb-1 leading-tight relative z-10">{template.title}</h4>
                                        <p className="text-white/40 text-[11px] mb-2 relative z-10">
                                            Período: {template.period}
                                        </p>
                                        <p className="text-white/30 text-[10px] mb-6 relative z-10">
                                            Criado em: {template.date} • {template.size}
                                        </p>
                                        <div className="flex gap-3 relative z-10">
                                            <button
                                                onClick={() => handleOpenTemplate(template)}
                                                className="flex-1 py-3 bg-brand-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-brand-primary/20"
                                            >
                                                Abrir
                                            </button>
                                            <button
                                                onClick={() => handleDownloadTemplate(template)}
                                                className="p-3 bg-white/5 hover:bg-green-500/20 hover:text-green-400 text-white rounded-xl transition-all border border-white/10"
                                                title="Baixar CSV"
                                            >
                                                <Download className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </motion.div>
                                ))
                            ) : (
                                // History items (simpler, uses base type data)
                                MOCK_HISTORY.map((item: any) => (
                                    <motion.div
                                        key={item.id}
                                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                                        className="bg-[#1A1A28]/50 border border-white/10 rounded-2xl p-6 hover:bg-white/5 transition-all group relative overflow-hidden"
                                    >
                                        <div className="absolute top-0 right-0 w-24 h-24 bg-brand-primary/5 blur-3xl rounded-full -mr-12 -mt-12" />
                                        <div className="flex justify-between items-start mb-6 relative z-10">
                                            <div className={`p-3 rounded-xl ${item.type === 'financial' ? 'bg-brand-primary/20 text-brand-primary' :
                                                item.type === 'commercial' ? 'bg-pink-500/20 text-pink-500' : 'bg-green-500/20 text-green-500'
                                                }`}>
                                                <History className="w-6 h-6" />
                                            </div>
                                            <div className="flex gap-2">
                                                <button className="p-2 text-white/20 hover:text-white transition-colors"><Share2 className="w-4 h-4" /></button>
                                                <button className="p-2 text-white/20 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                        </div>
                                        <h4 className="text-white font-black text-lg mb-1 leading-tight relative z-10">{item.title}</h4>
                                        <p className="text-white/40 text-[11px] mb-8 relative z-10">
                                            Gerado em: {item.date} • {item.size}
                                        </p>
                                        <div className="flex gap-3 relative z-10">
                                            <button
                                                onClick={() => handleOpenFromHistory(item.type as ReportType, item.title)}
                                                className="flex-1 py-3 bg-brand-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-brand-primary/20"
                                            >
                                                Abrir
                                            </button>
                                            <button className="p-3 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-all border border-white/10">
                                                <Download className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </motion.div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                <button onClick={() => setShowLiaAssistant(!showLiaAssistant)} className="fixed bottom-10 right-10 w-16 h-16 bg-gradient-to-br from-brand-primary to-pink-500 rounded-full flex items-center justify-center shadow-2xl shadow-brand-primary/50 hover:scale-110 active:scale-95 transition-all z-[100] print:hidden overflow-hidden border-2 border-white/20">
                    <img
                        src="/images/lia-bust.png"
                        alt="LIA"
                        className="w-full h-full object-cover object-top scale-110"
                    />
                </button>

                <AnimatePresence>
                    {showLiaAssistant && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20, x: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20, x: 20 }}
                            className="fixed bottom-28 right-10 w-80 bg-[#1A1A28] border border-white/15 rounded-3xl shadow-2xl p-6 z-[100] print:hidden shadow-purple-500/20"
                        >
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-primary to-pink-500 overflow-hidden border border-white/20">
                                    <img src="/images/lia-bust.png" className="w-full h-full object-cover object-top" />
                                </div>
                                <div>
                                    <h4 className="text-white font-black text-sm">LIA Report Assistant</h4>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-brand-primary">Inteligência Ativa</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className={`text-[11px] text-white/70 font-medium leading-relaxed bg-white/5 p-3 rounded-xl border border-white/5 italic ${liaLoading ? 'animate-pulse' : ''}`}>
                                    {liaResponse}
                                </div>

                                <div className="grid grid-cols-1 gap-2">
                                    <button
                                        type="button"
                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleLiaInsight(); }}
                                        disabled={liaLoading}
                                        className="text-left px-4 py-3 bg-white/5 rounded-xl text-[10px] text-white/60 hover:text-white hover:bg-white/10 transition-all font-bold border border-white/5 flex items-center gap-2 group cursor-pointer disabled:opacity-50"
                                    >
                                        <TrendingUp className="w-3 h-3 text-brand-primary group-hover:scale-110 transition-transform" />
                                        Gerar Insight Financeiro
                                    </button>
                                    <button
                                        type="button"
                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleLiaClearFilters(); }}
                                        className="text-left px-4 py-3 bg-white/5 rounded-xl text-[10px] text-white/60 hover:text-white hover:bg-white/10 transition-all font-bold border border-white/5 flex items-center gap-2 group cursor-pointer"
                                    >
                                        <Trash2 className="w-3 h-3 text-brand-primary group-hover:scale-110 transition-transform" />
                                        Limpar Filtros Ativos
                                    </button>
                                    <button
                                        type="button"
                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleLiaShare(); }}
                                        className="text-left px-4 py-3 bg-white/5 rounded-xl text-[10px] text-white/60 hover:text-white hover:bg-white/10 transition-all font-bold border border-white/5 flex items-center gap-2 group cursor-pointer"
                                    >
                                        <Share2 className="w-3 h-3 text-brand-primary group-hover:scale-110 transition-transform" />
                                        Compartilhar Reporte
                                    </button>
                                </div>

                                <div className="pt-4 border-t border-white/10">
                                    <form onSubmit={(e) => {
                                        e.preventDefault();
                                        const input = e.currentTarget.querySelector('input');
                                        if (input && input.value.trim()) {
                                            handleLiaQuery(input.value.trim());
                                            input.value = '';
                                        } else {
                                            toast('Digite uma pergunta para a LIA.', { icon: '💬' });
                                        }
                                    }} className="relative">
                                        <input
                                            type="text"
                                            name="liaQuery"
                                            placeholder="Pergunte algo à LIA..."
                                            disabled={liaLoading}
                                            className="w-full bg-white/10 border border-white/15 rounded-xl py-3 px-4 pr-12 text-xs text-white focus:outline-none focus:border-brand-primary placeholder:text-white/30 disabled:opacity-50"
                                        />
                                        <button
                                            type="submit"
                                            disabled={liaLoading}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 bg-brand-primary rounded-lg hover:bg-brand-primary/80 transition-colors cursor-pointer disabled:opacity-50"
                                        >
                                            <Search className="w-3.5 h-3.5 text-white" />
                                        </button>
                                    </form>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main >
        </div >
    );
};

export default Reports;
