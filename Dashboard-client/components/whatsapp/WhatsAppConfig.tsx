import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { backendService } from '../lia/services/backendService';
import CustomSelect from '../ui/CustomSelect';

interface WhatsAppConfigProps {
    onSave?: () => void;
}

const WhatsAppConfig: React.FC<WhatsAppConfigProps> = ({ onSave }) => {
    const [config, setConfig] = useState({
        objective: 'Vendas',
        tone: 'Consultivo',
        language: 'pt-BR',
        handoffRules: {
            sensitiveWords: true,
            angryCustomer: true,
            legalRequest: true
        }
    });

    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [editingPlaybook, setEditingPlaybook] = useState<any | null>(null);
    const [playbookContent, setPlaybookContent] = useState('');
    const [playbookName, setPlaybookName] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [isRecommending, setIsRecommending] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [playbooks, setPlaybooks] = useState<any[]>([]);

    const defaultPlaybooks = [
        {
            name: 'Qualificação Lead',
            content: `Objetivo: Identificar e qualificar leads promissores.

REGRAS:
1. Sempre pergunte o nome da empresa e cargo do contato.
2. Identifique o problema principal que o lead busca resolver.
3. Pergunte sobre o orçamento disponível e prazo de decisão.
4. Classifique o lead como QUENTE, MORNO ou FRIO.
5. Se QUENTE → agende reunião com consultor.
6. Se MORNO → envie material educativo.
7. Se FRIO → adicione à newsletter.

PERGUNTAS ESSENCIAIS:
- Qual seu principal desafio hoje?
- Você já utiliza alguma solução similar?
- Qual o tamanho da sua equipe?`
        },
        {
            name: 'Suporte Técnico',
            content: `Objetivo: Resolver problemas técnicos de forma eficiente.

REGRAS:
1. Sempre solicite o ID do cliente ou e-mail de cadastro.
2. Verifique o status da conta antes de prosseguir.
3. Classifique o problema: CRÍTICO, ALTO, MÉDIO ou BAIXO.
4. Para problemas CRÍTICOS → escale imediatamente para humano.
5. Colete logs e prints de erro quando aplicável.
6. Ofereça soluções passo-a-passo com linguagem simples.

FLUXO DE ATENDIMENTO:
- Saudação → Identificação → Diagnóstico → Solução → Confirmação
- Tempo máximo por etapa: 3 minutos
- Se não resolver em 10 min → transferir para especialista`
        },
        {
            name: 'Agendamento',
            content: `Objetivo: Agendar reuniões e compromissos de forma eficiente.

REGRAS:
1. Sempre confirme nome completo e telefone de contato.
2. Ofereça no mínimo 3 opções de horário.
3. Priorize horários comerciais (9h-18h).
4. Envie confirmação por WhatsApp após agendamento.
5. Lembre o cliente 24h e 1h antes do compromisso.

INFORMAÇÕES A COLETAR:
- Nome completo
- Telefone de contato
- E-mail (opcional)
- Motivo da reunião
- Preferência de horário (manhã/tarde)

APÓS AGENDAR:
- Confirmar dados coletados
- Informar endereço/link da reunião
- Perguntar se há algo mais`
        },
        {
            name: 'Onboarding Cliente',
            content: `Objetivo: Facilitar os primeiros passos do cliente no produto/serviço.

REGRAS:
1. Boas-vindas calorosas e personalizadas.
2. Verifique se o cliente já acessou o painel/produto.
3. Envie guia rápido ou vídeo de "Como Começar".
4. Tire dúvidas sobre configuração inicial.
5. Agende uma "Call de Setup" se necessário.

FLUXO:
- Boas-vindas → Verificação de Acesso → Guia Rápido → Dúvidas → Próximos Passos`
        },
        {
            name: 'Pesquisa NPS / Feedback',
            content: `Objetivo: Coletar feedback e medir satisfação do cliente.

REGRAS:
1. Pergunte: "De 0 a 10, o quanto você recomendaria nossa empresa?"
2. Se 9 ou 10 (Promotor) → Agradeça e peça um depoimento.
3. Se 7 ou 8 (Passivo) → Pergunte o que falta para ser nota 10.
4. Se 0 a 6 (Detrator) → Desculpe-se e abra um ticket prioritário.
5. Registre a resposta no CRM imediatamente.`
        },
        {
            name: 'Recuperação de Vendas',
            content: `Objetivo: Converter leads que abandonaram o carrinho ou pararam de responder.

REGRAS:
1. Tom de voz empático: "Percebi que você não concluiu..."
2. Ofereça um cupom de desconto exclusivo (válido por 24h).
3. Pergunte se houve alguma dúvida técnica no fechamento.
4. Destaque 2 benefícios principais que o cliente vai perder.
5. Crie senso de urgência (últimas unidades/vagas).`
        },
        {
            name: 'FAQ / Informações',
            content: `Objetivo: Responder dúvidas frequentes de forma direta.

REGRAS:
1. Mantenha as respostas curtas (máximo 4 linhas).
2. Sempre ofereça o link para a Central de Ajuda completa.
3. Se a dúvida for complexa → ofereça falar com humano.
4. Use Bullet Points para facilitar a leitura no celular.
5. Confirme se a dúvida foi sanada antes de encerrar.`
        }
    ];

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Carregar configurações iniciais
    useEffect(() => {
        const loadSettings = async () => {
            setIsLoading(true);
            const settings = await backendService.getWhatsAppSettings();
            if (settings) {
                setConfig({
                    objective: settings.profile_json?.objective || 'Vendas',
                    tone: settings.profile_json?.tone || 'Consultivo',
                    language: settings.profile_json?.language || 'pt-BR',
                    handoffRules: settings.profile_json?.handoff_rules || {
                        sensitiveWords: true,
                        angryCustomer: true,
                        legalRequest: true
                    }
                });
                setPlaybooks(settings.playbooks_json || []);
            }
            setIsLoading(false);
        };
        loadSettings();

    }, []);

    const handleSaveSettings = async () => {
        const success = await backendService.saveWhatsAppSettings({
            profile_json: config,
            playbooks_json: playbooks
        });

        if (success) {
            alert('Configurações salvas com sucesso!');
            if (onSave) onSave();
        } else {
            alert('Erro ao salvar as configurações.');
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !editingPlaybook) return;

        setIsUploading(true);
        try {
            const result = await backendService.uploadPlaybookDocument(file, editingPlaybook);
            if (result.ok) {
                // Adicionar o texto extraído ao conteúdo atual do playbook
                setPlaybookContent(prev => prev + '\n\n' + result.extractedText);
                alert('Documento processado com sucesso! O conteúdo foi adicionado às regras.');
            } else {
                alert('Erro ao processar documento: ' + result.error);
            }
        } catch (error) {
            console.error('Erro no upload:', error);
            alert('Falha crítica no processamento do arquivo.');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleRecommend = async () => {
        if (!editingPlaybook || isRecommending) return;

        setIsRecommending(true);
        try {
            const result = await backendService.getPlaybookRecommendation(
                config.objective,
                config.tone,
                playbookName
            );
            if (result.ok) {
                setPlaybookContent(result.recommendation);
            } else {
                alert('Erro ao obter recomendação: ' + result.error);
            }
        } catch (error) {
            console.error('Erro na recomendação:', error);
            alert('Falha ao conectar com IA para recomendação.');
        } finally {
            setIsRecommending(false);
        }
    };

    const openEditor = (playbook?: any) => {
        if (playbook) {
            setEditingPlaybook(playbook);
            setPlaybookName(playbook.name);
            setPlaybookContent(playbook.content || '');
        } else {
            const newName = `Novo Playbook ${playbooks.length + 1}`;
            setEditingPlaybook({ id: 'new', name: newName });
            setPlaybookName(newName);
            setPlaybookContent('');
        }
        setIsEditorOpen(true);
    };

    const savePlaybookChanges = () => {
        let updatedPlaybooks = [...playbooks];

        // Se a lista estiver vazia (primeiro salvamento), carregar defaults primeiro para não perdê-los
        if (updatedPlaybooks.length === 0) {
            updatedPlaybooks = JSON.parse(JSON.stringify(defaultPlaybooks));
        }

        if (editingPlaybook?.id === 'new') {
            updatedPlaybooks.push({ name: playbookName, content: playbookContent });
        } else {
            const index = updatedPlaybooks.findIndex(p => p.name === editingPlaybook.name);
            if (index >= 0) {
                updatedPlaybooks[index] = { name: playbookName, content: playbookContent };
            }
        }

        setPlaybooks(updatedPlaybooks);
        setIsEditorOpen(false);
    };

    const deletePlaybook = (name: string) => {
        if (window.confirm(`Deseja realmente excluir o playbook "${name}"?`)) {
            const sourceList = playbooks.length > 0 ? playbooks : JSON.parse(JSON.stringify(defaultPlaybooks));
            const updated = sourceList.filter((p: any) => p.name !== name);
            setPlaybooks(updated);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }


    return (
        <div className="p-6 h-full overflow-y-auto w-full space-y-8 no-scrollbar pb-20 bg-transparent">
            <div className="max-w-7xl mx-auto space-y-8">

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* A1) Perfil do Agente */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-2 mb-1.5">
                            <span className="material-symbols-outlined text-brand-primary text-lg">person_search</span>
                            <h4 className="font-black text-[11px] uppercase tracking-widest text-gray-500">Perfil do Agente</h4>
                        </div>

                        <div className="glass-panel bg-white p-4 rounded-2xl border border-gray-300 dark:border-white/10 dark:bg-white/5 shadow-sm space-y-3">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5">Objetivo do Canal</label>
                                <CustomSelect
                                    value={config.objective}
                                    onChange={(value) => setConfig({ ...config, objective: value })}
                                    options={[
                                        { label: 'Vendas', value: 'vendas' },
                                        { label: 'Suporte', value: 'suporte' },
                                        { label: 'Agendamento', value: 'agendamento' },
                                        { label: 'Financeiro', value: 'financeiro' }
                                    ]}
                                    variant="glass"
                                    placeholder="Selecione o objetivo"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5">Tom de Voz</label>
                                <CustomSelect
                                    value={config.tone}
                                    onChange={(value) => setConfig({ ...config, tone: value })}
                                    options={[
                                        { label: 'Consultivo', value: 'Consultivo' },
                                        { label: 'Formal', value: 'Formal' },
                                        { label: 'Direto', value: 'Direto' },
                                        { label: 'Leve / Descontraído', value: 'Leve' }
                                    ]}
                                    variant="glass"
                                    placeholder="Selecione o tom"
                                />
                            </div>
                        </div>
                    </div>

                    {/* A2) Handoff Rules */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-2 mb-1.5">
                            <span className="material-symbols-outlined text-brand-primary text-lg">hail</span>
                            <h4 className="font-black text-[11px] uppercase tracking-widest text-gray-500">Regras de Handoff</h4>
                        </div>

                        <div className="glass-panel bg-white p-4 rounded-2xl border border-gray-300 dark:border-white/10 dark:bg-white/5 shadow-sm space-y-1.5">
                            {[
                                { id: 'sensitiveWords', label: 'Palavras Sensíveis' },
                                { id: 'angryCustomer', label: 'Cliente Irritado (Sentimento)' },
                                { id: 'legalRequest', label: 'Pedido Jurídico / Reclamação' }
                            ].map((rule) => (
                                <label key={rule.id} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-all cursor-pointer group">
                                    <span className="text-xs font-bold text-gray-600 dark:text-gray-300 group-hover:text-brand-primary transition-colors">{rule.label}</span>
                                    <div className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={(config.handoffRules as any)[rule.id]}
                                            onChange={(e) => setConfig({
                                                ...config,
                                                handoffRules: {
                                                    ...config.handoffRules,
                                                    [rule.id]: e.target.checked
                                                }
                                            })}
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-brand-primary"></div>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>

                {/* A3) Playbooks - MVP Preview */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-brand-primary text-lg">auto_stories</span>
                            <h4 className="font-black text-[11px] uppercase tracking-widest text-gray-500">Playbooks Operacionais</h4>
                        </div>
                        <button
                            onClick={() => {
                                if (window.confirm('Deseja restaurar todos os playbooks para os valores padrão? Esta ação não pode ser desfeita.')) {
                                    setPlaybooks(JSON.parse(JSON.stringify(defaultPlaybooks)));
                                    alert('✅ Templates restaurados! Clique em "Salvar Alterações" para confirmar.');
                                }
                            }}
                            className="text-xs font-black text-brand-primary hover:underline uppercase tracking-tighter"
                        >
                            Restaurar Templates
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {(playbooks.length > 0 ? playbooks : defaultPlaybooks).map((playbook) => (
                            <div
                                key={playbook.name}
                                className="glass-panel bg-white p-4 rounded-2xl border-2 border-dashed border-gray-300 dark:border-white/20 hover:border-brand-primary/50 transition-all group cursor-pointer relative shadow-sm dark:bg-white/10"
                            >
                                <div onClick={() => openEditor(playbook)}>
                                    <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/5 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform text-gray-400 group-hover:text-brand-primary">
                                        <span className="material-symbols-outlined text-lg">edit_note</span>
                                    </div>
                                    <h5 className="font-bold text-xs mb-0.5">{playbook.name}</h5>
                                    <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">Clique para editar</p>
                                </div>

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        deletePlaybook(playbook.name);
                                    }}
                                    className="absolute top-4 right-4 w-7 h-7 rounded-full bg-red-500/10 text-red-500 opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center z-10"
                                >
                                    <span className="material-symbols-outlined text-sm">delete</span>
                                </button>
                            </div>
                        ))}
                        <button
                            onClick={() => openEditor()}
                            className="flex flex-col items-center justify-center p-4 rounded-2xl border border-dashed border-gray-300 dark:border-white/20 hover:bg-brand-primary/5 text-gray-400 hover:text-brand-primary transition-all overflow-hidden"
                        >
                            <span className="material-symbols-outlined text-2xl mb-1">add_circle</span>
                            <span className="font-bold text-[10px] uppercase tracking-widest">Novo Playbook</span>
                        </button>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 border-t border-gray-200 dark:border-white/10 pt-6">
                    <button
                        onClick={handleSaveSettings}
                        className="px-6 py-2.5 bg-brand-primary text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-brand-primary/20 hover:scale-105 active:scale-95 transition-all"
                    >
                        Salvar Alterações
                    </button>
                </div>
            </div>

            {/* Modal de Edição de Playbook */}
            {isEditorOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsEditorOpen(false)}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative w-full max-w-2xl bg-white dark:bg-[#0a0d14] rounded-[32px] border border-gray-300 dark:border-white/10 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.3)] overflow-hidden"
                    >
                        <div className="p-8 border-b border-gray-100 dark:border-white/5 flex items-center justify-between bg-gray-50/30 dark:bg-white/5">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                                    <span className="material-symbols-outlined text-2xl">auto_stories</span>
                                </div>
                                <div className="flex-1">
                                    <input
                                        type="text"
                                        className="bg-transparent border-none p-0 text-xl font-black tracking-tight outline-none w-full focus:ring-0 text-gray-900 dark:text-white"
                                        value={playbookName}
                                        onChange={(e) => setPlaybookName(e.target.value)}
                                        placeholder="Nome do Playbook"
                                    />
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Configurando Regras do Agente</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsEditorOpen(false)}
                                className="w-10 h-10 rounded-full hover:bg-gray-100 dark:hover:bg-white/5 flex items-center justify-center text-gray-400 transition-all"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="p-8 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Modelo Base</label>
                                    <CustomSelect
                                        value=""
                                        onChange={(selectedValue) => {
                                            const template = defaultPlaybooks.find(t => t.name === selectedValue);
                                            if (template) {
                                                const hasContent = playbookContent.trim().length > 0;
                                                if (!hasContent || window.confirm('Trocar o modelo irá sobrescrever seu texto atual. Continuar?')) {
                                                    setPlaybookContent(template.content);
                                                    setPlaybookName(template.name);
                                                }
                                            }
                                        }}
                                        options={defaultPlaybooks.map(t => ({ label: t.name, value: t.name }))}
                                        variant="glass"
                                        placeholder="Selecionar modelo..."
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Contexto Sugerido</label>
                                    <div className="px-4 py-2 bg-brand-primary/5 rounded-xl border border-brand-primary/10">
                                        <p className="text-[10px] font-bold text-brand-primary">{config.objective} / {config.tone}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Regras e Instruções</label>
                                <textarea
                                    className="w-full h-48 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-6 text-sm font-medium focus:ring-2 focus:ring-brand-primary/50 outline-none transition-all no-scrollbar resize-none"
                                    value={playbookContent}
                                    onChange={(e) => setPlaybookContent(e.target.value)}
                                    placeholder="Descreva como o agente deve se comportar neste cenário..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div
                                    onClick={() => !isUploading && fileInputRef.current?.click()}
                                    className={`p-4 rounded-2xl border border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5 flex items-center gap-3 cursor-pointer hover:bg-brand-primary/5 transition-all ${isUploading ? 'opacity-50 cursor-wait' : ''}`}
                                >
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept=".pdf,.docx,.doc,.txt,.xlsx,.xls"
                                        onChange={handleFileUpload}
                                    />
                                    <span className="material-symbols-outlined text-brand-primary animate-pulse">upload_file</span>
                                    <div>
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Conhecimento</p>
                                        <p className="text-[11px] font-bold">{isUploading ? 'Analisando...' : 'Carregar Documento'}</p>
                                    </div>
                                </div>
                                <div
                                    onClick={handleRecommend}
                                    className={`p-4 rounded-2xl border border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5 flex items-center gap-3 cursor-pointer hover:bg-brand-primary/5 transition-all ${isRecommending ? 'opacity-50 cursor-wait' : ''}`}
                                >
                                    <span className="material-symbols-outlined text-brand-primary">auto_awesome</span>
                                    <div>
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">IA Recomendação</p>
                                        <p className="text-[11px] font-bold">{isRecommending ? 'Gerando...' : 'Sugerir com IA'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-gray-50 dark:bg-white/5 border-t border-gray-100 dark:border-white/10 flex justify-end gap-3">
                            <button
                                onClick={() => setIsEditorOpen(false)}
                                className="px-6 py-2.5 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-gray-600 dark:hover:text-white transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={savePlaybookChanges}
                                className="px-8 py-2.5 bg-brand-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-brand-primary/20 hover:scale-105 active:scale-95 transition-all"
                            >
                                Salvar Playbook
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default WhatsAppConfig;
