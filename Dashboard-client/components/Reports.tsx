
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
import { useTenantConfig } from '../hooks/useTenantConfig';
import { toast } from 'react-hot-toast';
import { updateProfile, uploadAvatar } from '../services/profileService';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line, AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';

// --- Tipos de Dados ---
type ReportType = 'financial' | 'commercial' | 'operational' | 'projects' | 'custom';
type SidebarTab = 'generator' | 'templates' | 'history' | 'archive';

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
    projects: { title: 'Relatório de Projetos', subtitle: '', kpis: [], chartData: [], tableData: [], insight: '' },
    custom: { title: 'Relatório Personalizado', subtitle: '', kpis: [], chartData: [], tableData: [], insight: '' }
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

// --- Template Configurations ---
interface TemplateConfig {
    id: string;
    title: string;
    type: ReportType;
    date: string;
    size: string;
    icon: any;
    reportTitle: string;
    reportSubtitle: string;
    kpis: { label: string; value: string; trend: string }[];
    chartData: { name: string; val: number }[];
    tableData: ReportDataItem[];
    insight: string;
    period: string;
}

interface HistoryItem {
    id: string;
    title: string;
    type: ReportType;
    date: string;
    size: string;
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
            { date: '31/12/2025', description: 'Custos de Pessoal', value: '€ -98.400,00', status: 'Dedução' },
        ],
        insight: 'O trimestre apresentou crescimento sólido.',
        period: 'Q4 2025'
    },
    {
        id: 't2',
        title: 'Fluxo de Caixa Mensal',
        type: 'financial',
        date: '05 de Fev, 2026',
        size: '850 KB',
        icon: TrendingUp,
        reportTitle: 'Análise de Fluxo de Caixa Mensal',
        reportSubtitle: 'Movimentação financeira detalhada de Janeiro.',
        kpis: [
            { label: 'Entradas', value: '€ 150.000', trend: '+5%' },
            { label: 'Saídas', value: '€ 95.000', trend: '-2%' },
            { label: 'Saldo Final', value: '€ 55.000', trend: '+15%' }
        ],
        chartData: [
            { name: 'Semana 1', val: 20000 }, { name: 'Semana 2', val: 45000 },
            { name: 'Semana 3', val: 35000 }, { name: 'Semana 4', val: 50000 }
        ],
        tableData: [
            { date: '28/01/2026', description: 'Recebimento Cliente A', value: '€ 25.000', status: 'Confirmado' },
            { date: '25/01/2026', description: 'Pagamento Fornecedores', value: '€ 15.000', status: 'Pago' }
        ],
        insight: 'Liquidez saudável com saldo positivo.',
        period: 'Janeiro 2026'
    },
    {
        id: 't3',
        title: 'Conversão de Funil CRM',
        type: 'commercial',
        date: '02 de Fev, 2026',
        size: '1.5 MB',
        icon: Activity,
        reportTitle: 'Performance do Funil de Vendas',
        reportSubtitle: 'Taxas de conversão por estágio do pipeline.',
        kpis: [
            { label: 'Leads Novos', value: '2.500', trend: '+20%' },
            { label: 'MQLs', value: '850', trend: '+15%' },
            { label: 'SQLs', value: '320', trend: '+10%' }
        ],
        chartData: [
            { name: 'Leads', val: 2500 }, { name: 'Opts', val: 850 }, { name: 'Deal', val: 320 }
        ],
        tableData: [
            { date: '01/02/2026', description: 'Campanha Meta Ads', value: '1.200 leads', status: 'Processado' }
        ],
        insight: 'Funil aquecido com alta entrada de MQLs.',
        period: 'Últimos 30 dias'
    },
    {
        id: 't4',
        title: 'Análise de Churn Rate',
        type: 'commercial',
        date: '15 de Jan, 2026',
        size: '980 KB',
        icon: FileText,
        reportTitle: 'Saúde da Base de Clientes',
        reportSubtitle: 'Taxas de cancelamento e sucesso do cliente.',
        kpis: [
            { label: 'Churn Rate', value: '1.8%', trend: '-0.4%' },
            { label: 'Expansion', value: '€ 12k', trend: '+€ 2k' },
            { label: 'LTV', value: '€ 4.5k', trend: '+€ 300' }
        ],
        chartData: [
            { name: 'Nov', val: 2500 }, { name: 'Dez', val: 2200 }, { name: 'Jan', val: 1800 }
        ],
        tableData: [
            { date: '14/01/2026', description: 'Renovação Plano Pro', value: '€ 4.500', status: 'Ativo' }
        ],
        insight: 'Redução de churn devido ao onboarding assistido.',
        period: 'Q1'
    },
    {
        id: 't5',
        title: 'Performance Operacional',
        type: 'operational',
        date: '28 de Jan, 2026',
        size: '1.1 MB',
        icon: SettingsIcon,
        reportTitle: 'Eficiência de Atendimento e SLA',
        reportSubtitle: 'Tempo de resposta e resolução de chamados.',
        kpis: [
            { label: 'Avg Speed', value: '14 min', trend: '-2 min' },
            { label: 'Resolved 1h', value: '92%', trend: '+4%' }
        ],
        chartData: [
            { name: 'Seg', val: 120 }, { name: 'Ter', val: 150 }, { name: 'Qua', val: 140 }
        ],
        tableData: [
            { date: '27/01/2026', description: 'Pico de Chamados', value: '180', status: 'Resolvido' }
        ],
        insight: 'SLA mantido acima de 90%.',
        period: 'Semana 4'
    },
    {
        id: 't6',
        title: 'Pesquisa de Satisfação NPS',
        type: 'operational',
        date: '01 de Fev, 2026',
        size: '600 KB',
        icon: Layout,
        reportTitle: 'Relatório de CSAT e NPS',
        reportSubtitle: 'Feedback consolidado dos usuários.',
        kpis: [
            { label: 'NPS Score', value: '78', trend: '+5' },
            { label: 'CSAT', value: '4.8/5', trend: '+0.2' }
        ],
        chartData: [
            { name: 'P', val: 75 }, { name: 'N', val: 15 }, { name: 'D', val: 10 }
        ],
        tableData: [
            { date: '31/01/2026', description: 'Pesquisa Jan', value: '4.9', status: 'Excelente' }
        ],
        insight: 'Usuários satisfeitos com as novas automações.',
        period: 'Janeiro 2026'
    }
];

const MOCK_HISTORY: HistoryItem[] = [
    { id: 'h1', title: 'Relatório Financeiro Jan/2026', type: 'financial', date: 'Hoje, 10:45', size: '1.1 MB' },
    { id: 'h2', title: 'Comercial Q4 Recap', type: 'commercial', date: 'Ontem, 16:30', size: '2.5 MB' },
];

// --- Componente Interno: Modal de Configuração de Branding ---
const ReportBrandingSettings = ({
    isOpen,
    onClose,
    config,
    onUpdate
}: {
    isOpen: boolean;
    onClose: () => void;
    config: any;
    onUpdate: () => void;
}) => {
    const { user, refreshProfile } = useDashboardAuth();
    const [companyName, setCompanyName] = useState(config.companyName || 'LUMINNUS PLATFORM');
    const [primaryColor, setPrimaryColor] = useState(config.primaryColor || '#7C3AED');
    const [secondaryColor, setSecondaryColor] = useState(config.secondaryColor || '#EC4899');
    const [isSaving, setIsSaving] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSave = async () => {
        if (!user) return;
        setIsSaving(true);
        try {
            await updateProfile(user.id, {
                company_name: companyName,
                company_primary_color: primaryColor,
                company_secondary_color: secondaryColor
            });
            await refreshProfile(user);
            onUpdate();
            toast.success('Identidade do relatório atualizada!');
            onClose();
        } catch (error) {
            console.error(error);
            toast.error('Erro ao salvar configuração.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        const uploadToast = toast.loading('Enviando logo...');
        try {
            const url = await uploadAvatar(user.id, file);
            await updateProfile(user.id, { company_logo_url: url });
            await refreshProfile(user);
            onUpdate();
            toast.success('Logo atualizada!');
        } catch (error) {
            toast.error('Erro no upload da logo.');
        } finally {
            toast.dismiss(uploadToast);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-md z-[200]"
                    />
                    <motion.div
                        initial={{ x: '100%', opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: '100%', opacity: 0 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed right-0 top-0 h-full w-full max-w-md bg-[#0D111C] shadow-2xl z-[201] p-8 overflow-y-auto border-l border-white/10"
                    >
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2 text-white">
                                <SettingsIcon className="w-5 h-5 text-brand-primary" />
                                Configurar Relatório
                            </h2>
                            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-white/40 hover:text-white transition-all">
                                <span className="material-symbols-outlined text-2xl">close</span>
                            </button>
                        </div>

                        <div className="space-y-8">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Logo da Empresa</label>
                                <div className="border-2 border-dashed border-white/10 rounded-2xl p-8 flex flex-col items-center justify-center gap-4 hover:border-brand-primary/50 transition-all bg-white/5 group">
                                    {config.companyLogoUrl ? (
                                        <div className="relative group">
                                            <img src={config.companyLogoUrl} alt="Logo" className="h-20 object-contain drop-shadow-2xl" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg backdrop-blur-sm">
                                                <button onClick={() => fileInputRef.current?.click()} className="text-white text-xs font-bold uppercase tracking-widest bg-brand-primary px-4 py-2 rounded-lg">Trocar</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div onClick={() => fileInputRef.current?.click()} className="h-20 w-20 bg-white/5 rounded-2xl flex flex-col items-center justify-center border border-white/10 cursor-pointer group-hover:bg-brand-primary/10 group-hover:border-brand-primary/30 transition-all">
                                            <span className="material-symbols-outlined text-3xl text-white/20 group-hover:text-brand-primary transition-colors">upload_file</span>
                                            <span className="text-[8px] font-bold text-white/20 mt-1 uppercase">Upload</span>
                                        </div>
                                    )}
                                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Nome da Empresa</label>
                                <input
                                    type="text"
                                    value={companyName}
                                    onChange={(e) => setCompanyName(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-sm font-bold text-white focus:ring-2 focus:ring-brand-primary outline-none transition-all"
                                    placeholder="Ex: Minha Empresa LTDA"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Cor Primária</label>
                                    <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10">
                                        <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="h-8 w-8 rounded-lg cursor-pointer border-none bg-transparent" />
                                        <span className="text-xs font-mono text-white/60 font-bold uppercase">{primaryColor}</span>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Cor Secundária</label>
                                    <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10">
                                        <input type="color" value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} className="h-8 w-8 rounded-lg cursor-pointer border-none bg-transparent" />
                                        <span className="text-xs font-mono text-white/60 font-bold uppercase">{secondaryColor}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-12">
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="w-full py-4 bg-gradient-to-r from-brand-primary to-purple-600 text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:shadow-2xl hover:shadow-brand-primary/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                            >
                                {isSaving ? <Clock className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                {isSaving ? 'Gravando...' : 'Aplicar Identidade'}
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

const Reports: React.FC = () => {
    const { t } = useContext(LanguageContext);
    const { user, profile, refreshProfile } = useDashboardAuth();
    const tenantConfig = useTenantConfig();
    const [activeTab, setActiveTab] = useState<SidebarTab>('generator');
    const [isConfigOpen, setIsConfigOpen] = useState(false);
    const [selectedType, setSelectedType] = useState<ReportType>('financial');
    const [activeTemplate, setActiveTemplate] = useState<TemplateConfig | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [showLiaAssistant, setShowLiaAssistant] = useState(false);
    const [liaResponse, setLiaResponse] = useState<string>('"Olá! Posso te ajudar a analisar estes dados ou exportar em novos formatos. O que deseja?"');
    const [liaLoading, setLiaLoading] = useState(false);
    const printRef = useRef<HTMLDivElement>(null);

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

    const handleLiaInsight = () => {
        setLiaLoading(true);
        setTimeout(() => {
            setLiaResponse('"Analisei os dados. A performance está sólida, com tendência de crescimento em ' + currentData.kpis[0]?.label + '."');
            setLiaLoading(false);
            toast.success('Insight gerado!');
        }, 1500);
    };

    const handleLiaClearFilters = () => {
        setSelectedType('financial');
        setLiaResponse('"Filtros resetados!"');
    };

    const handleLiaShare = async () => {
        toast.success('Link copiado!');
    };

    const handleLiaQuery = (query: string) => {
        setLiaLoading(true);
        setTimeout(() => {
            setLiaResponse(`"Entendido sobre '${query}'. Os dados indicam que está tudo dentro do esperado."`);
            setLiaLoading(false);
        }, 1500);
    };

    const handleOpenTemplate = (template: TemplateConfig) => {
        setActiveTemplate(template);
        setSelectedType(template.type);
        setActiveTab('generator');
    };

    const handleOpenFromHistory = (type: ReportType, title: string) => {
        setSelectedType(type);
        setActiveTab('generator');
    };

    const handleDownloadTemplate = (template: TemplateConfig) => {
        toast.success('Baixando...');
    };

    const handleShareTemplate = async (template: TemplateConfig) => {
        toast.success('Link copiado!');
    };

    const handlePrint = () => {
        window.print();
    };

    const handleExportCSV = () => {
        const headers = ['Data', 'Descricao', 'Valor'];
        const rows = currentData.tableData.map(item => [item.date, item.description, `"${item.value}"`]);
        const csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map(e => e.join(",")).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Relatorio_${selectedType}_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('CSV exportado!');
    };

    const handleExportExcel = () => {
        handleExportCSV(); // Using CSV as Excel-compatible for now
        toast.success('Excel exportado!');
    };

    const handleGenerateReport = () => {
        setIsGenerating(true);
        setTimeout(() => {
            setIsGenerating(false);
            toast.success('Relatório gerado!');
        }, 1000);
    };

    return (
        <div className="flex h-full bg-[#0D0D14] overflow-hidden print:bg-white relative">
            <div className="absolute top-0 right-0 w-[700px] h-[700px] bg-brand-primary/10 rounded-full blur-[160px] -z-0 pointer-events-none" />

            <aside className="w-72 border-r border-white/10 flex flex-col p-6 gap-6 bg-[#12121A]/90 backdrop-blur-2xl z-10 print:hidden relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-primary via-pink-500 to-orange-500" />
                <div className="space-y-3">
                    <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] px-3">Central de Inteligência</h3>
                    <div className="space-y-2">
                        <SidebarItem icon={Layout} label="Gerador Master" active={activeTab === 'generator'} onClick={() => setActiveTab('generator')} />
                        <SidebarItem icon={Save} label="Modelos Salvos" active={activeTab === 'templates'} onClick={() => setActiveTab('templates')} />
                        <SidebarItem icon={History} label="Histórico" active={activeTab === 'history'} onClick={() => setActiveTab('history')} count="1" />
                    </div>
                </div>
            </aside>

            <main className="flex-1 flex flex-col overflow-hidden relative">
                {activeTab === 'generator' ? (
                    <>
                        <header className="p-6 border-b border-white/10 flex justify-between items-center bg-[#15151F]/80 backdrop-blur-xl print:hidden">
                            <div className="flex items-center gap-4">
                                <div className="space-y-0.5">
                                    <h2 className="text-xl font-black text-white tracking-tight">Gerador de Relatórios</h2>
                                    <p className="text-[10px] font-black uppercase tracking-widest bg-gradient-to-r from-brand-primary to-pink-500 bg-clip-text text-transparent">Configuração em Tempo Real</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <button onClick={() => setIsConfigOpen(true)} className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white/70 hover:text-white text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2">
                                    <SettingsIcon className="w-3.5 h-3.5 text-brand-primary" />
                                    Branding
                                </button>
                                <button onClick={handlePrint} className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/70 transition-all border border-white/10" title="Imprimir">
                                    <Printer className="w-4 h-4" />
                                </button>
                                <div className="h-6 w-px bg-white/10 mx-1" />
                                <button onClick={handleGenerateReport} className="bg-gradient-to-r from-brand-primary to-purple-600 text-white px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-brand-primary/20">
                                    {isGenerating ? 'Gerando...' : 'Gerar Novo'}
                                </button>
                                <div className="flex bg-white/5 rounded-xl border border-white/10 p-1">
                                    <button onClick={handleExportCSV} className="p-2 rounded-lg hover:bg-white/10 text-white/70 transition-all" title="Exportar CSV">
                                        <Download className="w-4 h-4" />
                                    </button>
                                    <button onClick={handleExportExcel} className="p-2 rounded-lg hover:bg-white/10 text-white/70 transition-all" title="Exportar Excel">
                                        <FileText className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </header>
                        <div className="flex-1 overflow-y-auto p-12 bg-[#0A0A10] flex justify-center custom-scrollbar print:p-0 print:bg-white relative">
                            <div className="absolute inset-0 bg-gradient-to-b from-brand-primary/5 via-transparent to-pink-500/5 pointer-events-none" />
                            <div ref={printRef} className="w-[210mm] min-h-[297mm] bg-white text-slate-800 shadow-2xl rounded-lg p-12 flex flex-col gap-10 print:shadow-none print:w-full relative z-10">
                                <div className="flex justify-between items-start border-b-2 border-slate-100 pb-8">
                                    <div className="space-y-4">
                                        <div className="h-14 flex items-center">
                                            {tenantConfig.companyLogoUrl ? (
                                                <img src={tenantConfig.companyLogoUrl} alt={tenantConfig.companyName} className="h-full object-contain" />
                                            ) : (
                                                <div className="h-14 w-14 rounded-xl flex items-center justify-center text-white font-black text-2xl shadow-xl" style={{ backgroundColor: tenantConfig.primaryColor }}>
                                                    {tenantConfig.companyName.charAt(0)}
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <h1 className="text-2xl font-black tracking-tighter uppercase" style={{ color: tenantConfig.primaryColor }}>{tenantConfig.companyName}</h1>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{currentData.title}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-black text-slate-900 uppercase">Emissão: {new Date().toLocaleDateString('pt-BR')}</p>
                                    </div>
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

                                <div className="h-[220px] w-full border border-slate-100 rounded-3xl p-6 bg-slate-50/50">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={currentData.chartData}>
                                            <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
                                            <YAxis fontSize={10} axisLine={false} tickLine={false} />
                                            <Bar dataKey="val" fill={tenantConfig.primaryColor} radius={[6, 6, 0, 0]} barSize={45} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>

                                <table className="w-full text-left text-[10px]">
                                    <thead className="border-b border-slate-100">
                                        <tr>
                                            <th className="py-4 text-slate-400 uppercase tracking-widest">Data</th>
                                            <th className="py-4 text-slate-400 uppercase tracking-widest">Descrição</th>
                                            <th className="py-4 text-slate-400 uppercase tracking-widest text-right">Valor</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {currentData.tableData.map((item, i) => (
                                            <tr key={i} className="border-b border-slate-50">
                                                <td className="py-4 font-bold text-slate-500">{item.date}</td>
                                                <td className="py-4 font-black text-slate-900">{item.description}</td>
                                                <td className="py-4 font-black text-slate-900 text-right">{item.value}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 p-10 overflow-y-auto custom-scrollbar">
                        <div className="max-w-6xl mx-auto space-y-10">
                            <div>
                                <h2 className="text-3xl font-black text-white capitalize mb-2">{activeTab === 'templates' ? 'Modelos Salvos' : 'Histórico Recent'}</h2>
                                <p className="text-white/40 text-sm">{activeTab === 'templates' ? 'Selecione um template para gerar um novo relatório personalizado.' : 'Relatórios gerados anteriormente disponíveis para visualização.'}</p>
                            </div>

                            {activeTab === 'templates' ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {MOCK_TEMPLATES.map((template) => (
                                        <div key={template.id} className="group bg-[#15151F] border border-white/10 rounded-3xl p-6 hover:border-brand-primary/50 transition-all cursor-pointer flex flex-col gap-4 relative overflow-hidden">
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/10 rounded-full blur-3xl group-hover:bg-brand-primary/20 transition-all" />
                                            <div className="flex justify-between items-start">
                                                <div className="p-3 rounded-2xl bg-white/5 group-hover:bg-brand-primary/20 transition-all">
                                                    <template.icon className="w-6 h-6 text-brand-primary" />
                                                </div>
                                                <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">{template.size}</span>
                                            </div>
                                            <div>
                                                <h4 className="text-white font-black text-base group-hover:text-brand-primary transition-all">{template.title}</h4>
                                                <p className="text-white/40 text-[11px] mt-1">{template.reportSubtitle}</p>
                                            </div>
                                            <div className="flex items-center justify-between mt-4">
                                                <div className="flex gap-2">
                                                    <button onClick={() => handleOpenTemplate(template)} className="px-4 py-2 bg-brand-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all">
                                                        Gerar
                                                    </button>
                                                    <button onClick={() => handleDownloadTemplate(template)} className="p-2 bg-white/5 hover:bg-white/10 text-white/70 rounded-xl transition-all border border-white/10">
                                                        <Download className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                                <span className="text-[9px] font-black text-white/30 uppercase">{template.date}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {MOCK_HISTORY.map((item) => (
                                        <div key={item.id} className="bg-[#15151F] border border-white/10 rounded-2xl p-4 hover:bg-white/5 transition-all flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                                                    <FileText className="w-5 h-5 text-white/40" />
                                                </div>
                                                <div>
                                                    <h4 className="text-white font-black text-sm">{item.title}</h4>
                                                    <p className="text-white/30 text-[10px] uppercase tracking-widest">{item.type} • {item.size}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className="text-[10px] font-black text-white/20 uppercase">{item.date}</span>
                                                <button onClick={() => handleOpenFromHistory(item.type, item.title)} className="p-2 hover:text-brand-primary transition-all">
                                                    <FolderOpen className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <button onClick={() => setShowLiaAssistant(!showLiaAssistant)} className="fixed bottom-10 right-10 w-16 h-16 bg-gradient-to-br from-brand-primary to-pink-500 rounded-full flex items-center justify-center shadow-2xl z-[100] border-2 border-white/20">
                    <img
                        src="/images/lia-bust.png"
                        alt="LIA"
                        className="w-full h-full object-cover object-top"
                    />
                </button>

                <AnimatePresence>
                    {showLiaAssistant && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                            className="fixed bottom-28 right-10 w-80 bg-[#1A1A28] border border-white/15 rounded-3xl shadow-2xl p-6 z-[100]"
                        >
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-primary to-pink-500 overflow-hidden">
                                    <img src="/images/lia-bust.png" className="w-full h-full object-cover object-top" />
                                </div>
                                <h4 className="text-white font-black text-sm">LIA Assistant</h4>
                            </div>
                            <div className="text-[11px] text-white/70 italic bg-white/5 p-3 rounded-xl mb-4">{liaResponse}</div>
                            <div className="pt-4 border-t border-white/10">
                                <input type="text" placeholder="Pergunte algo..." className="w-full bg-white/10 border border-white/15 rounded-xl py-2.5 px-4 text-xs text-white" />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <ReportBrandingSettings isOpen={isConfigOpen} onClose={() => setIsConfigOpen(false)} config={tenantConfig} onUpdate={() => refreshProfile(user)} />
            </main>
        </div>
    );
};

export default Reports;
