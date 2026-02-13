/**
 * ==============================================
 * OUTPUT CONTRACTS SERVICE
 * Detecção de intenção e templates de contrato
 * ==============================================
 */

export type ContractType =
    | 'json_fix'
    | 'doc_summary'
    | 'doc_validation'
    | 'spreadsheet_analysis'
    | 'visual_troubleshooting'
    | 'visual_analysis'
    | 'error_troubleshooting'
    | 'log_analysis'
    | 'action_execution'
    | 'email_standard'
    | 'general'
    | 'unknown';

interface ContractTemplate {
    type: ContractType;
    systemInstructions: string;
    outputRules: string[];
    jsonOnly?: boolean;
}

/**
 * Serviço de Contratos de Output
 * Detecta intenção e fornece templates para governança conforme PROTOCOLO MESTRE
 */
export class OutputContracts {

    // Instrução Mestra LIA Excelência Operacional v4.0 (SEM assinatura)
    public static readonly MASTER_INSTRUCTION = `
42: PROTOCOLO OBRIGATÓRIO (A-L):
A) REGRA DE OURO: NUNCA exiba JSON ou logs técnicos a menos que solicitado.
B) Idioma: Português do Brasil (PT-BR).
C) CONCISÃO: Responda de forma direta e executiva, focando em parágrafos curtos.
D) ASSINATURA: NÃO incluir assinatura no final da resposta.
`;

    // Instrução Mestra LIMPA para MODO A (Troubleshooting Técnico)
    // Remove regra C (ACTION-FIRST) para evitar conflito com estrutura Achado/Evidência/Causa/Correção
    public static readonly TROUBLESHOOTING_MASTER_INSTRUCTION = `
42: PROTOCOLO OBRIGATÓRIO (A-L):
A) REGRA DE OURO: NUNCA exiba JSON ou logs técnicos a menos que solicitado.
B) Idioma: Português do Brasil (PT-BR).
C) CONCISÃO: Máximo 10 linhas no total. Cada seção máximo 2 linhas.
D) ASSINATURA: Não incluir "LIA | Luminnus" ou "Equipe Luminnus" no final desta resposta.
`;

    // Instrução Mestra para EMAILS (COM assinatura)
    public static readonly EMAIL_MASTER_INSTRUCTION = `
42: PROTOCOLO OBRIGATÓRIO PARA EMAILS:
A) REGRA DE OURO: NUNCA exiba JSON ou logs técnicos a menos que solicitado.
B) Idioma: Português do Brasil (PT-BR).
C) TOM PROFISSIONAL: Use linguagem executiva e cortês.
D) CONCISÃO: Máximo 3 parágrafos curtos.
E) ASSINATURA OBRIGATÓRIA (no final do email):
LIA | Luminnus
Equipe Luminnus
`;

    // Palavras-chave para detecção de intenção
    private static INTENT_KEYWORDS = {
        json_fix: [
            'traga um json', 'me mostre o json', 'formato json', 'payload', 'estrutura de dados',
            'gerar json', 'api response', 'raw data', 'json format'
        ],
        doc_validation: [
            'valide', 'valida', 'validar', 'balancete', 'contabil', 'contábil', 'auditoria',
            'onde não fecha', 'contas incoerentes', 'lançamentos errados', 'correção contábil',
            'fechar o balancete', 'balanço patrimonial', 'conferir', 'checar contas',
            'corrigir documento', 'versão corrigida', 'ajustar documento'
        ],
        doc_summary: [
            'resumo', 'resumir', 'summary', 'analise o documento', 'extrair dados',
            'principais pontos', 'pdf', 'documento', 'word', 'contrato'
        ],
        spreadsheet_analysis: [
            'analise a planilha', 'detalhe a tabela', 'estatísticas da planilha',
            'o que tem nesse excel', 'análise de dados'
        ],
        visual_troubleshooting: [
            'corrigir erro', 'diagnosticar', 'parou de funcionar', 'conserta', 'resolve isso'
        ],
        visual_analysis: [
            'o que você acha', 'qual sua opinião', 'analise', 'veja', 'dê sua opinião',
            'me diga', 'o que acha', 'comente', 'avalie', 'feedback', 'impressão'
        ],
        error_keywords: [
            'erro', 'problema', 'bug', 'não funciona', 'falha', 'quebrado', 'crash'
        ],
        action_keywords: [
            'criar doc', 'gerar doc', 'monta um relatório', 'faz um documento',
            'cria uma análise', 'replica esse layout', 'faz igual'
        ],
        layout_replication: [
            'queria assim', 'igual a esse print', 'replica esse layout', 'faz igual',
            'dashboard igual', 'planilha profissional', 'planilha pro', 'template'
        ],
        log_analysis: [
            'log', 'console', 'stack trace', 'exception', 'debug', 'warning', 'error log'
        ],
        email_standard: [
            'enviar email', 'envia o email', 'responde o email', 'cobra pagamento',
            'mandar email', 'encaminhar email', 'reenviar email', 'follow-up', 'agendar reunião',
            'marca uma call', 'link da reunião', 'marcar meet'
        ],
        report_generation: [
            'imprimir', 'pdf', 'baixar relatório', 'gerar pdf', 'exportar pdf',
            'criar relatório', 'gerar relatório', 'documento para impressão',
            'quero imprimir', 'preciso imprimir', 'fazer pdf'
        ],
        action_execution: [
            'criar planilha', 'gerar planilha', 'crie uma planilha', 'faz uma planilha',
            'criar documento', 'gerar doc', 'create spreadsheet', 'make a sheet',
            'sheets', 'docs', 'no excel', 'excel', 'listar emails', 'ver emails',
            'quais emails', 'emails de hoje', 'meus emails', 'procurar email',
            'buscar email', 'search emails', 'list emails',
            'o que está agendado', 'o que esta agendado', 'agenda de amanhã', 'agenda de amanha',
            'compromissos de amanhã', 'compromissos de amanha', 'mesmo horário', 'mesmo horario',
            'listar agenda', 'ver agenda', 'calendar events', 'list calendar'
        ],
        incident: [
            'está errado', 'não foi isso que eu pedi', 'corrija isso', 're-audite',
            'verifique novamente', 'você se confundiu'
        ]
    };

    /**
     * Detecta a intenção do usuário baseado no prompt e arquivos
     */
    static detectIntent(prompt: string, hasFiles?: boolean, fileTypes?: string[]): ContractType {
        const lowerPrompt = prompt.toLowerCase();

        // 1. Email Standard - Prioridade para comunicações
        if (this.INTENT_KEYWORDS.email_standard.some(kw => lowerPrompt.includes(kw))) {
            return 'email_standard';
        }

        // 2. Report Generation - Prioridade para impressão/PDF
        if (this.INTENT_KEYWORDS.report_generation.some(kw => lowerPrompt.includes(kw))) {
            return 'action_execution'; // Reutiliza o contrato action_execution para criar PDF
        }

        // 3. Action Execution
        if (this.INTENT_KEYWORDS.action_execution.some(kw => lowerPrompt.includes(kw))) {
            return 'action_execution';
        }

        // 3. JSON Fix
        if (this.INTENT_KEYWORDS.json_fix.some(kw => lowerPrompt.includes(kw))) {
            return 'json_fix';
        }

        // 4. Log Analysis
        if (this.INTENT_KEYWORDS.log_analysis.some(kw => lowerPrompt.includes(kw)) ||
            (hasFiles && fileTypes?.some(t => t.includes('text/') || t.includes('log')))) {
            return 'log_analysis';
        }

        // 5. Error Troubleshooting (MODO A para prints COM erro explícito)
        if (hasFiles && fileTypes?.some(t => t.startsWith('image/')) &&
            this.INTENT_KEYWORDS.error_keywords.some(kw => lowerPrompt.includes(kw))) {
            return 'error_troubleshooting';
        }

        // 6. Visual Troubleshooting (imagens COM solicitação de AÇÃO ou CRIAÇÃO)
        if (hasFiles && fileTypes?.some(t => t.startsWith('image/')) &&
            (this.INTENT_KEYWORDS.action_keywords.some(kw => lowerPrompt.includes(kw)) ||
                this.INTENT_KEYWORDS.layout_replication.some(kw => lowerPrompt.includes(kw)) ||
                this.INTENT_KEYWORDS.visual_troubleshooting.some(kw => lowerPrompt.includes(kw)))) {
            return 'visual_troubleshooting';
        }

        // 7. Visual Analysis (imagens GENÉRICAS - análise/opinião sem ação forçada)
        if (hasFiles && fileTypes?.some(t => t.startsWith('image/'))) {
            return 'visual_analysis';
        }

        // 8. Spreadsheet Analysis
        if (this.INTENT_KEYWORDS.spreadsheet_analysis.some(kw => lowerPrompt.includes(kw)) ||
            (hasFiles && fileTypes?.some(t => t.includes('spreadsheet') || t.includes('excel') || t.includes('csv')))) {
            return 'spreadsheet_analysis';
        }

        // 9. Doc Validation (PRIORITY over summary for validation/audit requests)
        if (this.INTENT_KEYWORDS.doc_validation.some(kw => lowerPrompt.includes(kw)) ||
            (hasFiles && fileTypes?.some(t => t.includes('word') || t.includes('document')) &&
                (lowerPrompt.includes('valida') || lowerPrompt.includes('corrig') || lowerPrompt.includes('auditoria') || lowerPrompt.includes('balancete')))) {
            return 'doc_validation';
        }

        // 10. Doc Summary (fallback for docs without validation intent)
        if (hasFiles && fileTypes?.some(t => t.includes('pdf') || t.includes('word') || t.includes('document'))) {
            return 'doc_summary';
        }

        return 'general';
    }

    /**
     * Verifica se o usuário pediu "somente JSON"
     */
    static isJsonRequested(prompt: string): boolean {
        const lowerPrompt = prompt.toLowerCase();
        return (
            lowerPrompt.includes('json') ||
            lowerPrompt.includes('formato de dados') ||
            lowerPrompt.includes('payload') ||
            lowerPrompt.includes('raw data')
        );
    }

    /**
     * Verifica se o prompt indica um INCIDENTE (questionamento do usuário)
     */
    static isIncident(prompt: string): boolean {
        const lowerPrompt = prompt.toLowerCase();
        return this.INTENT_KEYWORDS.incident.some(kw => lowerPrompt.includes(kw));
    }

    /**
     * Retorna o template de contrato para o tipo detectado
     */
    static getContract(type: ContractType, jsonOnly: boolean = false): ContractTemplate {
        const contracts: Partial<Record<ContractType, ContractTemplate>> = {
            json_fix: {
                type: 'json_fix',
                jsonOnly,
                systemInstructions: jsonOnly
                    ? `RESPONDA EXCLUSIVAMENTE COM JSON VÁLIDO. Sem texto, sem explicações.`
                    : `${this.MASTER_INSTRUCTION}\nRetorne o JSON final corrigido, seguido de um checklist curto (máx 6 itens) e validações recomendadas.`,
                outputRules: [
                    '100% snake_case em todas as chaves',
                    'Proibido: env_ref:CHAVE como string. Sempre usar *_env_ref: "CHAVE"',
                    'Chaves de pricing: input_per_1M e output_per_1M (exatos)',
                    'Campos obrigatórios (como client_id) nunca vazios',
                    'Nunca vazar tokens/JWT ou chaves sk- reais'
                ]
            },

            doc_summary: {
                type: 'doc_summary',
                jsonOnly: false,
                systemInstructions: `${this.MASTER_INSTRUCTION}

🎯 ANÁLISE DE DOCUMENTO INTELIGENTE:
Você deve analisar o documento e responder de forma natural, clara e profissional.

DIRETRIZES:
- Capture a essência do documento de forma executiva
- Destaque informações críticas e acionáveis
- Use estrutura apenas quando facilitar a compreensão
- Seja conciso mas completo nos pontos importantes
- Evite colar trechos longos do documento

FORMATO FLEXÍVEL:
- Para documentos simples: Resumo direto e objetivo
- Para documentos complexos: Organize por temas/seções relevantes
- Use bullets, tabelas ou texto corrido conforme mais apropriado
`,
                outputRules: [
                    'Análise executiva e clara do documento',
                    'Destaques acionáveis (não apenas descritivos)',
                    'Formato adaptado à complexidade do conteúdo',
                    'PROIBIDO: Colar o documento inteiro ou ser genérico demais'
                ]
            },

            doc_validation: {
                type: 'doc_validation',
                jsonOnly: false,
                systemInstructions: `${this.MASTER_INSTRUCTION}

🛠️ CONTRATO DOC VALIDATION INTELIGENTE:
Este contrato é para análise e validação de documentos financeiros (balancetes, balanços, demonstrativos).

⚠️ PRINCÍPIO DE OURO: ANÁLISE DINÂMICA E INTELIGENTE
Sua resposta deve se adaptar ao documento e ao que você encontrar. NÃO force estruturas rígidas.

🎯 INSTRUÇÕES DE ANÁLISE:

1) **Entenda o Documento Primeiro**:
   - Leia todo o conteúdo antes de responder
   - Identifique o tipo: balancete, balanço patrimonial, DRE, fluxo de caixa, etc.
   - Detecte automaticamente problemas, inconsistências ou pontos de atenção

2) **Responda de Forma Inteligente e Natural**:
   - Se encontrar erros GRAVES: Destaque-os claramente com análise profunda
   - Se o documento estiver OK: Confirme e aponte detalhes relevantes
   - Se precisar corrigir: Mostre CLARAMENTE o que era e o que deve ser
   - Use tabelas APENAS quando fizer sentido visual (ex: correções múltiplas)
   - Use listas quando for mais claro 
   - Use texto corrido quando for mais natural

3) **Seja Específico e Acionável**:
   - Cite valores exatos, contas específicas, linhas do documento
   - Se propor correções, seja CLARO sobre o antes/depois
   - Priorize os achados mais críticos primeiro

4) **Adaptabilidade**:
   - Para um documento com 1-2 erros: Análise direta e correção pontual
   - Para documento complexo: Organize por gravidade/impacto
   - Para documento correto: Validação executiva + insights

🚫 PROIBIÇÕES:
- NÃO force tabelas se não fizer sentido
- NÃO force checklists genéricos se não agregar valor
- NÃO use estruturas rígidas como "ETAPA 1, ETAPA 2, ETAPA 3"
- NÃO peça para o usuário "revisar manualmente" - VOCÊ faz a análise completa

✅ O QUE FAZER:
- Analise com profundidade e inteligência
- Adapte o formato da resposta ao contexto
- Seja claro, direto e profissional
- Entregue valor real, não apenas estrutura
`,
                outputRules: [
                    '1. ANÁLISE DINÂMICA: Adapte a resposta ao que encontrar no documento.',
                    '2. CLAREZA PROFISSIONAL: Seja específico com valores, contas e referências reais.',
                    '3. FORMATO FLEXÍVEL: Use tabelas/listas/texto conforme mais apropriado.',
                    '4. FOCO NO VALOR: Destaque o que importa, não encha linguiça.',
                    '5. PROIBIDO: Estruturas rígidas, checklists genéricos, etapas robotizadas.'
                ]
            },

            visual_troubleshooting: {
                type: 'visual_troubleshooting',
                jsonOnly: false,
                systemInstructions: `${this.MASTER_INSTRUCTION}
                
🎯 ANÁLISE E RESOLUÇÃO PROFISSIONAL:
Se o usuário enviar uma imagem com um pedido de ação ou reportando um problema, resolva de forma natural e executiva.

DIRETRIZES:
1. **Identificação Direta**: Explique o que foi detectado no print de forma profissional.
2. **Ação Imediata**: Informe o que você vai fazer ou já fez para resolver.
3. **Draft-First**: Se envolver comunicação (e-mail), apresente uma prévia clara e peça autorização.
4. **Sem Estruturas Rígidas**: Evite checklists genéricos ou seções numeradas se não agregarem valor real.
`,
                outputRules: [
                    'Entrega natural e profissional, focada na resolução.',
                    'Proibido: Linguagem técnica excessiva ou seções "Achado/Ação" forçadas.',
                    'NÃO mencione os botões no texto.',
                    'PROIBIDO usar assinaturas (Equipe Luminnus, etc.) nesta resposta de chat.'
                ]
            },

            visual_analysis: {
                type: 'visual_analysis',
                jsonOnly: false,
                systemInstructions: `${this.TROUBLESHOOTING_MASTER_INSTRUCTION}

🎯 MODO ANÁLISE VISUAL (OBRIGATÓRIO)
Este contrato é para ANÁLISE NEUTRA de imagens enviadas pelo usuário sem contexto de erro ou solicitação explícita de ação.

⚠️ REGRAS CRÍTICAS:
1. **ANÁLISE DIRETA**: Responda à pergunta do usuário de forma clara e útil, focando no conteúdo visual.
2. **SEM FORÇAR AÇÕES**: NÃO crie documentos, planilhas ou relatórios a menos que o usuário EXPLICITAMENTE solicite.
3. **SEM MODO A**: Esta não é uma situação de troubleshooting. Evite estrutura "Achado/Evidência/Causa/Correção".
4. **LINGUAGEM NATURAL**: Use tom conversacional e amigável. Imagine que está comentando sobre a imagem com um colega.
5. **RESPOSTA CURTA**: Máximo 5-8 linhas. Seja objetivo e direto.

📋 FORMATO DE RESPOSTA:
- Descreva o que você vê na imagem de forma relevante à pergunta
- Dê sua opinião/análise de forma clara
- Se aplicável, destaque pontos positivos e áreas de atenção
- Termine com uma pergunta ou sugestão leve, se apropriado

🚫 PROIBIÇÕES ABSOLUTAS:
- NÃO use ferramentas de criação (createGoogleDoc, createProFinancialSheet, etc.) neste modo
- NÃO force estruturas formais ou corporativas
- NÃO apresente "drafts" ou "previews" de documentos
- NÃO use emojis de ação (🚀) ou transformação profissional
- Sem assinatura "Equipe Luminnus" no final
`,
                outputRules: [
                    'Resposta conversacional e direta (5-8 linhas máximo)',
                    'Análise visual focada na pergunta do usuário',
                    'PROIBIDO criar documentos ou usar ferramentas de ação',
                    'PROIBIDO usar estrutura MODO A (Achado/Evidência/Causa)',
                    'Tom natural e amigável, sem formalidade excessiva',
                    'Sem assinatura corporativa no final'
                ]
            },

            error_troubleshooting: {
                type: 'error_troubleshooting',
                jsonOnly: false,
                systemInstructions: `${this.TROUBLESHOOTING_MASTER_INSTRUCTION}
                
🎯 ANÁLISE TÉCNICA NATURAL (MODO A):
Você deve analisar evidências de erros (faturas, mensagens, prints) e explicar de forma inteligente.

DIRETRIZES:
1. **O que aconteceu**: Identifique o erro ou inconsistência de forma clara.
2. **Causa e Evidência**: Explique a origem do problema baseando-se no que foi visualizado.
3. **Resolução**: Forneça a solução exata ou execute a correção se tiver a ferramenta.
4. **Naturalidade**: Não use labels rígidos como "Achado:", "Evidência:". Comunique-se como um engenheiro sênior para um colega.
`,
                outputRules: [
                    'Explicação técnica natural sem templates rígidos.',
                    'Máximo de 10 linhas no total.',
                    'Correção com código ou comando real se aplicável.',
                    'Proibido: placeholders genéricos.',
                    'Sem assinatura no final.'
                ]
            },

            spreadsheet_analysis: {
                type: 'spreadsheet_analysis',
                jsonOnly: false,
                systemInstructions: `${this.MASTER_INSTRUCTION
                    }\nSe o usuário pedir para 'detalhar', explique em texto rico e amigável.Não use JSON por padrão.`,
                outputRules: [
                    'Explique o conteúdo em linguagem natural (PT-BR)',
                    'Destaque tendências e insights sem IDs técnicos',
                    'Sugestões de melhoria acionáveis',
                    'JSON APENAS se solicitado explicitamente'
                ]
            },

            log_analysis: {
                type: 'log_analysis',
                jsonOnly: false,
                systemInstructions: `${this.MASTER_INSTRUCTION} \nIdentificar erro raiz e impacto.`,
                outputRules: [
                    'Erro raiz detectado',
                    'Contexto e Impacto',
                    'Correção exata e validação'
                ]
            },

            email_standard: {
                type: 'email_standard',
                jsonOnly: false,
                systemInstructions: `${this.EMAIL_MASTER_INSTRUCTION}
                
🎯 ROUTER DE INTENÇÃO (MODO OBRIGATÓRIO):
- MODO A — ENVIO / AÇÃO: Pedidos de enviar/responder/reenviar.
  -> Entrega: Execução direta quando houver comando explícito + confirmação objetiva com evidências (link/ID/status).
- MODO B — LEITURA: Buscar/Listar.
  -> Entrega: Resumo executivo (Quem/Assunto/Ação).

⚠️ TRANSFORMER CORPORATIVO:
Independente da simplicidade do pedido do usuário, a saída deve ser um e-mail pronto, polido, com Assunto, Saudação Formal, Corpo em Bullets e CTA claro.

🔐 PERMISSÕES E LINKS:
- Link-Safe: Proibido placeholders e proibido usar 'meet.google.com/new'. Busque o link real do Meet no histórico ou use a ferramenta de criação de evento antes de redigir.
- EXECUÇÃO DIRETA: Se o usuário já deu comando explícito de envio/agendamento e os dados mínimos estiverem presentes, EXECUTE sem pedir "posso prosseguir?".
- AGENDAR + MEET: Se o usuário pedir reunião com Meet, gere o link criando evento no Calendar; não pergunte qual opção prefere.
- Só peça confirmação adicional se faltar dado crítico real (destinatário, horário ou assunto).`,
                outputRules: [
                    'ESTRUTURA: Se já houver comando explícito de envio, EXECUTE e responda com status factual; não pare em prévia.',
                    'ASSUNTO: Verbo de Ação + Contexto Negócio',
                    'ASSINATURA E-MAIL: Apenas DENTRO do rascunho (LIA | Luminnus).',
                    'DRAFT SYNC: Se já apresentou um rascunho no histórico, REPLIQUE-O INTEGRALMENTE na tool `sendGmail`.',
                    'ZERO PLACEHOLDER: É PROIBIDO enviar "[Link]", "[Nome]" ou "[ID]". Falhe se o dado não existir.',
                    'PROIBIÇÃO MEET: Nunca use meet.google.com/new. Gere um link real via calendar se necessário.',
                    'INTERAÇÃO: Não exigir confirmação extra quando já houver comando explícito + dados mínimos.',
                    'TEMPO RELATIVO: Se usuário disser "amanhã/hoje", converta para data real automaticamente sem pedir dia/mês/ano.',
                    'CALENDAR QUERY: Se o usuário perguntar "o que está agendado" ou "mesmo horário", usar listCalendarEvents/searchCalendarEvents e responder com dados reais.',
                    'SEM CÓDIGO: Nunca responder com bloco de código (```), pseudocódigo ou scripts para tarefas de negócio.',
                    'GMAIL DO USUÁRIO: Para "meus e-mails"/"caixa de entrada", NUNCA pedir o endereço do próprio usuário; usar conta autenticada.'
                ]
            },

            action_execution: {
                type: 'action_execution',
                jsonOnly: false,
                systemInstructions: `${this.MASTER_INSTRUCTION}

🛠️ FERRAMENTAS DISPONÍVEIS:
        - createProFinancialSheet: PARA TUDO QUE FOR "PRO", "DASHBOARD", "PROFISSIONAL" ou "IGUAL AO PRINT".
- updateGoogleSheet: Para EDITAR, MELHORAR ou AJUSTAR planilhas existentes.
- createGoogleSheet: Apenas para listas BÁSICAS e SIMPLES (sem formatação).
- createGoogleDoc: Para criar documentos de texto estruturados no Google Docs.
- listGmailMessages / searchGmail: PARA QUALQUER BUSCA OU LISTAGEM DE E-MAILS.

⚠️ REGRAS CRÍTICAS DE EXECUÇÃO:
        1. GMAIL: Nunca simule e-mails. Se a ferramenta retornar lista vazia, informe exatamente isso.
2. GMAIL (CAIXA PRÓPRIA): Se o pedido for ver "meus e-mails"/"de hoje", use listGmailMessages/searchGmail direto sem pedir o e-mail do usuário.
3. LAYOUT: Se houver imagem, use analyzeFile + createProFinancialSheet.
4. DIRETO: Nunca dê passos manuais. EXECUTE e entregue o link.
5. REUTILIZAÇÃO: Use o spreadsheetId do contexto para edições (updateGoogleSheet).
6. DOCUMENTOS: Ao criar arquivos, use os dados discutidos. NÃO resuma o que vai fazer; FAÇA e entregue. Evite frases como "Aqui estão as próximas ações possíveis".
7. CALENDAR LISTAGEM: Quando o usuário perguntar "o que está agendado" ou "mesmo horário", use listCalendarEvents e responda com os eventos reais.
8. SEM CÓDIGO: É proibido responder com blocos de código, scripts Python, ou "tool_code" em contexto de negócio.

📋 COMO ENCONTRAR O spreadsheetId:
        - Procure no histórico da conversa por links do Google Sheets: https://docs.google.com/spreadsheets/d/XXXXXX
        - O spreadsheetId é a parte depois de / d / e antes da próxima barra.Exemplo:
        Link: https://docs.google.com/spreadsheets/d/1T79XgGex9-r58rquetc...
        spreadsheetId: 1T79XgGex9 - r58rquetc...
        - Se encontrar um link de planilha no histórico, use esse ID para editar ao invés de criar nova.

NÃO dê instruções manuais.USE A FERRAMENTA diretamente.
O usuário já conectou sua conta Google, então você pode criar e editar arquivos reais.`,
                outputRules: [
                    'USAR a ferramenta apropriada - NÃO dar instruções manuais',
                    'Confirmação CURTA da ação executada em PT-BR com link direto',
                    'É TERMINANTEMENTE PROIBIDO exibir JSON, payloads ou estruturas técnicas',
                    'Resposta máxima: 2 frases + link'
                ]
            },

            general: {
                type: 'general',
                jsonOnly: false,
                systemInstructions: this.MASTER_INSTRUCTION,
                outputRules: [
                    'Curto, estruturado e acionável',
                    'Sem respostas genéricas',
                    'Mascarar segredos'
                ]
            }
        };

        return contracts[type] || contracts.general!;
    }
    static buildContractPrompt(type: ContractType, options: { jsonOnly?: boolean; isIncident?: boolean; userPlan?: string } = {}): string {
        const { jsonOnly = false, isIncident = false, userPlan = 'free' } = options;
        const contract = this.getContract(type, jsonOnly);

        const isAdmin = ['admin', 'owner', 'ceo', 'enterprise'].includes(userPlan.toLowerCase());

        let prompt = `=== CONTRATO DE OUTPUT: ${type.toUpperCase()} ===\n`;

        if (isIncident) {
            prompt += `⚠️ PROTOCOLO DE INCIDENTE ATIVADO: O usuário questionou o resultado anterior.\n`;
            prompt += `Você deve: 1. Comparar input original vs sua última saída. 2. Rodar validação rigorosa. 3. Identificar lacunas. 4. Corrigir.\n\n`;
        }

        prompt += `USER_ROLE: ${isAdmin ? 'ADMIN/OWNER' : 'BASIC_USER'} \n`;
        if (!isAdmin) {
            prompt += `⚠️ RESTRIÇÃO DE SEGURANÇA: O usuário não tem permissões administrativas.NUNCA sugira validar DKIM, SPF, DMARC ou DNS.Foque em ações de usuário final.\n`;
        }

        prompt += contract.systemInstructions + '\n\n';
        prompt += 'REGRAS OBRIGATÓRIAS DE EXCELÊNCIA:\n';
        contract.outputRules.forEach((rule, i) => {
            prompt += `${i + 1}. ${rule} \n`;
        });

        if (contract.jsonOnly) {
            prompt += '\n⚠️ MODO JSON ONLY ATIVO: Retorne APENAS o JSON.';
        }

        return prompt;
    }

    static buildHumanizedPrompt(userPrompt: string, toolName: string, result: any): string {
        // Extrair link se disponível
        const link = result?.link || result?.url || result?.spreadsheetUrl || '';
        const title = result?.title || result?.description || 'sua solicitação';

        return `
Você é a LIA.O usuário pediu: "${userPrompt}"
A ferramenta ${toolName} retornou um resultado técnico.

=== REGRAS OBRIGATÓRIAS(VIOLAÇÃO = FALHA CRÍTICA) ===

            1. É TERMINANTEMENTE PROIBIDO retornar JSON, schemas, objetos, listas técnicas ou payloads.
2. JSON, logs e estruturas internas são APENAS para uso interno - NUNCA mostre ao usuário.
3. Sua resposta deve ser SOMENTE texto humano, curto e profissional em Português do Brasil.
4. NUNCA explique etapas técnicas, colunas, ou estrutura de dados.
5. NUNCA peça confirmação desnecessária.

=== FORMATO DE RESPOSTA OBRIGATÓRIO ===

            Se a ferramenta criou ou editou algo com sucesso, responda EXATAMENTE assim:
        "Pronto! ${title ? `A planilha "${title} " foi criada` : 'Tarefa concluída'}. ${link ? `Acesse aqui: ${link}` : ''}"

Se houve erro, responda:
        "Ops, tive um problema ao processar isso. Pode tentar novamente?"

            === O QUE VOCÊ TEM DISPONÍVEL ===
                - Link: ${link || '(não disponível)'}
        - Título: ${title || '(não disponível)'}

Agora responda ao usuário de forma CURTA e HUMANA.Sem JSON.Sem técnico.Apenas a confirmação.
        `.trim();
    }
}
