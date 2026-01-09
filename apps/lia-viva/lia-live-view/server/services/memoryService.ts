import { loadRecentMessages, loadImportantMemories } from '../config/supabase.js';
import { OpenAIService } from './openAIService.js';
import { LIA_FULL_PERSONALITY } from '@luminnus/shared';
import { geospatialService } from './geospatialService.js';

// O arquivo JSON local foi descontinuado em favor do Supabase (SSOT v1.1)

// ======================================================================
// FUNÇÕES
// ======================================================================

/**
 * Obtém o contexto unificado (Histórico + Memórias + Resumo + Busca) de uma conversa
 */
export async function getContext(
  conversationId: string,
  userId: string = '00000000-0000-0000-0000-000000000001',
  userPrompt?: string,
  userLocation?: any
) {
  try {
    const {
      loadRecentMessages,
      loadImportantMemories,
      getConversationSummary,
      searchMessagesByKeyword,
      getUserProfile,
      saveMemory: saveToDB
    } = await import('../config/supabase.js');

    console.log(`🧠[MemoryService] Carregando contexto para conv = ${conversationId}, user = ${userId} `);

    // 1. Carregar histórico do banco (últimas 15 mensagens)
    const history = await loadRecentMessages(conversationId, 15);

    // 2. Carregar memórias importantes do banco
    let memories = await loadImportantMemories(userId);

    // ======================================================================
    // 3. PROFILE SEED (v3.0) - Semente de Perfil Automática
    // ======================================================================
    const DEFAULT_ID = "00000000-0000-0000-0000-000000000001";
    if (userId && userId !== DEFAULT_ID) {
      const hasBasicInfo = memories.some((m: any) =>
        m.key === 'nome_usuario' || m.key === 'empresa' || m.key === 'segmento'
      );

      if (!hasBasicInfo) {
        const profile = await getUserProfile(userId);
        if (profile) {
          const seeds = [];
          if (profile.full_name) seeds.push(saveToDB(userId, "nome_usuario", profile.full_name, true));
          if (profile.company_name) seeds.push(saveToDB(userId, "empresa", profile.company_name, true));
          if (profile.segment) seeds.push(saveToDB(userId, "segmento", profile.segment, true));

          if (seeds.length > 0) {
            await Promise.all(seeds);
            memories = await loadImportantMemories(userId);
          }
        }
      }
    }

    // 3. Carregar resumo da conversa (Enterprise v1.2)
    const summary = await getConversationSummary(conversationId);

    // 4. Smart Search: Se o usuário perguntar algo antigo, buscar no banco
    let searchResultsString = "";
    if (userPrompt) {
      const searchKeywords = ["como definimos", "plano anterior", "você falou antes", "decidimos", "qual era", "onde está"];
      const lowerPrompt = userPrompt.toLowerCase();
      const needsSearch = searchKeywords.some(kw => lowerPrompt.includes(kw));

      if (needsSearch) {
        console.log(`🔍[MemoryService] Smart Search detectado para: "${userPrompt}"`);
        const query = userPrompt.replace(/como definimos|onde está|qual era|plano anterior/gi, "").trim();
        if (query.length > 3) {
          const searchResults = await searchMessagesByKeyword(conversationId, query, 5);
          if (searchResults.length > 0) {
            searchResultsString = "\n\n=== CONTEXTO EXTRAÍDO DO HISTÓRICO (BUSCA) ===\n";
            searchResults.reverse().forEach((res: any) => {
              searchResultsString += `[${new Date(res.created_at).toLocaleDateString()}] ${res.role}: ${res.content} \n`;
            });
            searchResultsString += "==============================================\n";
          }
        }
      }
    }

    // 5. Formatar contexto de memórias para o sistema
    let memoriesString = "";
    if (memories && memories.length > 0) {
      memoriesString = "\n\n=== CONHECIMENTO DE LONGO PRAZO SOBRE O USUÁRIO ===\n";
      memoriesString += "As informações abaixo são fatos salvos de conversas anteriores. \n";
      memoriesString += "Elas servem apenas como contexto para Personalizar sua resposta ao pedido ATUAL do usuário.\n\n";

      const blacklist = ["consegue", "pode", "traga", "busque", "gere", "crie", "que horas", "nome"];
      const familyKeys = ["filho", "filha", "esposa", "esposo", "marido", "pai", "mae", "mãe", "irmao", "irmã", "irmão"];
      let userName = "";
      let userAddress = "";
      let familyMembers: string[] = [];

      memories.forEach((mem: any) => {
        const keyLower = (mem.key || "").toLowerCase();
        const content = mem.content || "";

        // v5.2: Separar nome do usuário de nomes de familiares
        const isFamilyRelated = familyKeys.some(fk => keyLower.includes(fk));

        // v5.3: Extrair nome de keys diretas OU de conteúdo com padrão "Nome tem..."
        if ((keyLower.includes('nome_usuario') || keyLower === 'nome') && !isFamilyRelated) {
          userName = content;
        } else if (keyLower === 'personal' && content && !userName) {
          // v5.3: Extrair nome do padrão "Wendell tem um filho..."
          const match = content.match(/^([A-Z][a-záàâãéèêíïóôõöúç]+)\s+(tem|é|mora|trabalha)/i);
          if (match && match[1]) {
            userName = match[1];
          }
        } else if (isFamilyRelated && content) {
          familyMembers.push(`${mem.key}: ${content}`);
        }

        // v5.4: Extrair endereço de keys específicas (agora inclui endereco_usuario)
        if ((keyLower.includes('endereco') || keyLower.includes('endereço') || keyLower.includes('localizacao') || keyLower === 'endereco_usuario') && content.length > 10) {
          userAddress = content;
        }

        const lowerValue = content.toLowerCase();
        const isRequest = blacklist.some(word => lowerValue.includes(word));
        if (!isRequest) {
          memoriesString += `• ${mem.key}: ${content} \n`;
        }
      });

      if (userName) {
        memoriesString = `[DADO VITAL - IDENTIDADE DO USUÁRIO] VOCÊ ESTÁ CONVERSANDO COM: ${userName}. Este é O NOME DO USUÁRIO. Sempre chame-o por este nome.\n` + memoriesString;
      }
      if (userAddress) {
        memoriesString += `\n[ENDEREÇO DO USUÁRIO] O endereço do usuário é: ${userAddress}\n`;
      }
      if (familyMembers.length > 0) {
        memoriesString += `\n[FAMILIARES DO USUÁRIO - NÃO CONFUNDIR COM O USUÁRIO]\n${familyMembers.join('\n')}\nATENÇÃO: Os nomes acima são de FAMILIARES, não do usuário. O usuário é ${userName || 'desconhecido'}.\n`;
      }

      memoriesString += "===================================================\n";
    }

    // 6. Formatar o resumo (Enterprise)
    let summaryString = "";
    if (summary) {
      summaryString = "\n\n=== RESUMO DAS INTERAÇÕES ANTERIORES (CONVERSA ATUAL) ===\n";
      summaryString += `Configurações: ${summary.settings || 'N/A'} \n`;
      summaryString += `Decisões: ${summary.decisions || 'N/A'} \n`;
      summaryString += `Pendências: ${summary.pending || 'N/A'} \n`;
      summaryString += `IDs / Links Importantes: ${summary.refs || 'N/A'} \n`;
      summaryString += "========================================================\n\n";
    }

    // 7. Gerar contexto de data/hora ATUAL (DINAMICO)
    const now = new Date();
    let timeZone = 'Europe/Lisbon';
    let locationMsg = "Localização não fornecida.";

    if (userLocation) {
      if (userLocation.address) {
        locationMsg = `Usuário está em: ${userLocation.address} `;
        if (userLocation.address.toLowerCase().includes('brasil') || userLocation.address.toLowerCase().includes('br')) {
          timeZone = 'America/Sao_Paulo';
        }
      } else if (userLocation.latitude && userLocation.longitude) {
        locationMsg = `Coordenadas: ${userLocation.latitude}, ${userLocation.longitude} `;
        if (userLocation.longitude < -30) {
          timeZone = 'America/Sao_Paulo';
        }
      }
    }

    // [NOVO] Inteligência Geoespacial via Google Maps
    let geospatialContext = "";
    const userAddressMemory = memories.find((m: any) => m.key === 'localizacao' || m.key === 'endereco_usuario');

    if (userAddressMemory && !userLocation?.latitude) {
      console.log(`📍[MemoryService] Geocodificando endereço da memória: ${userAddressMemory.content}`);
      const coords = await geospatialService.geocodeAddress(userAddressMemory.content);
      if (coords) {
        geospatialContext = `[INTELIGÊNCIA GEOESPACIAL]
O endereço salvo do usuário (${userAddressMemory.content}) corresponde às coordenadas: ${coords.lat}, ${coords.lng}.
Utilize isso para cálculos de distância e serviços locais.
`;
      }
    }

    const dateTimeContext = `[CONTEXTO TEMPORAL E ESPACIAL OBRIGATÓRIO]
Data atual: ${now.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone })}
Hora atual: ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone })}
Timezone: ${timeZone}
${locationMsg}
${geospatialContext}
IMPORTANTE: Use estas informações de localização e tempo para ser um Assistente Pessoal proativo (agendamentos, clima, distâncias).
`;


    // 8. Regra CRÍTICA para busca em tempo real
    const realTimeSearchRule = `[REGRA CRÍTICA - INFORMAÇÕES EM TEMPO REAL]
⚠️ PROIBIÇÃO ABSOLUTA DE INVENTAR DADOS:
1. Para QUALQUER informação de mercado(preços, cotações, criptomoedas, ações, câmbio), VOCÊ DEVE usar a ferramenta searchWeb.
2. NUNCA cite valores numéricos de preços / cotações do seu conhecimento interno - eles estão DESATUALIZADOS.
3. Quando a ferramenta searchWeb retornar resultados, USE EXATAMENTE os dados retornados.
4. Se não encontrar dados atualizados, diga: "Não consegui obter a cotação em tempo real agora. Posso tentar novamente?"
5. NUNCA afirme ter pesquisado se não usou a ferramenta searchWeb - isso é MENTIRA.
6. Para preços de Bitcoin, ações, moedas: SEMPRE use searchWeb com query específica como "bitcoin price USD today".

EXEMPLOS DE PERGUNTAS QUE EXIGEM BUSCA WEB:
- Preço do Bitcoin, Ethereum, qualquer criptomoeda
  - Cotação do dólar, euro, qualquer moeda
    - Preço de ações
      - Qualquer valor de mercado
        - Notícias recentes
          - Eventos atuais
            - Previsões e projeções de mercado

SEU CONHECIMENTO INTERNO SOBRE PREÇOS ESTÁ DESATUALIZADO - NÃO CONFIE NELE!\n\n`;

    // v5.4: Regra CRÍTICA para rotas e distâncias
    const routeDirectionsRule = `[REGRA CRÍTICA - ROTAS E DISTÂNCIAS]
⚠️ QUANDO O USUÁRIO PERGUNTAR SOBRE DISTÂNCIA, ROTA, TEMPO DE VIAGEM OU DESLOCAMENTO:
1. VOCÊ DEVE USAR a ferramenta getDirections OBRIGATORIAMENTE.
2. USE o endereço do usuário salvo na memória como 'origin' se ele disser "meu endereço" ou "de casa".
3. O resultado incluirá um link para o Google Maps que você DEVE incluir na resposta.
4. NUNCA responda sobre distâncias ou tempos de viagem sem usar getDirections.
5. Se não souber o endereço do usuário, pergunte ANTES de tentar calcular.

EXEMPLOS DE PERGUNTAS QUE EXIGEM getDirections:
- "Qual a distância do meu endereço para X?"
- "Quanto tempo de carro até Y?"
- "Como chegar em Z?"
- "Qual o trajeto de A para B?"
\n\n`;

    // v5.5: Regra CRÍTICA para compreensão contextual e follow-up
    const contextualUnderstandingRule = `[REGRA CRÍTICA - COMPREENSÃO CONTEXTUAL E FOLLOW-UP]
⚠️ VOCÊ DEVE SER ESPECIALISTA EM CONTEXTO, PROBLEMAS E QUESTIONAMENTOS:

## REGRAS DE FOLLOW-UP:
1. Perguntas curtas como "qual a distância?", "e agora?", "quanto custa?", "onde fica?" SEMPRE se referem à última resposta ou pergunta anterior.
2. NUNCA responda "não entendi" ou "não sei do que você está falando" se houver contexto na conversa.
3. Se o usuário fizer uma correção (ex: "eu disse X, não Y"), releia a conversa e corrija imediatamente.
4. Pronomes como "ele", "ela", "isso", "aquilo", "lá" referem-se a entidades mencionadas anteriormente.

## PRECISÃO GEOGRÁFICA:
1. Quando o usuário especificar uma localização (ex: "em Aveiro", "no centro", "em Lisboa"), USE EXATAMENTE essa localização.
2. NUNCA traga resultados de localidades diferentes do que foi especificado.
3. Se houver ambiguidade, PERGUNTE antes de trazer um resultado errado.
4. Se não encontrar exatamente o que foi pedido, diga claramente: "Não encontrei [X] em [localização]. Posso buscar em outra área?"

## RESOLUÇÃO DE PROBLEMAS:
1. Quando o usuário reportar um erro ou problema, sua primeira resposta deve ser ENTENDER o problema.
2. Faça perguntas clarificadoras se necessário antes de propor soluções.
3. NUNCA assuma que entendeu algo que não foi dito explicitamente.
4. Quando corrigir um erro, RECONHEÇA o erro anterior e forneça a correção.

## EXEMPLOS DE FOLLOW-UP CORRETO:
- Usuário: "Qual a farmácia mais próxima?" → Você responde: "Farmácia X em Y."
- Usuário: "Qual a distância?" → Entenda como: "Qual a distância até a Farmácia X?" (NÃO peça clarificação!)
- Usuário: "E o horário de funcionamento?" → Entenda como referindo-se à Farmácia X.

## PROIBIÇÕES ABSOLUTAS:
❌ NUNCA diga "A resposta anterior não está no formato correto" - isso é confuso para o usuário.
❌ NUNCA diga "Não há correção necessária" quando o usuário faz uma pergunta.
❌ NUNCA ignore o contexto da conversa para dar respostas genéricas.
\n\n`;

    const finalSystemInstruction =
      dateTimeContext +
      realTimeSearchRule +
      routeDirectionsRule +
      contextualUnderstandingRule +
      LIA_FULL_PERSONALITY + "\n\n" +
      (summaryString || "") +
      (memoriesString ? `\n\n${memoriesString} ` : "") +
      (searchResultsString || "") +
      "\n\nINSTRUÇÃO CRÍTICA: Foque no pedido atual. Use o histórico da conversa para entender referências e follow-ups.";



    return {
      history,
      memories,
      summary,
      systemInstruction: finalSystemInstruction
    };

  } catch (error) {
    console.error('❌ [MemoryService] Erro ao obter contexto:', error);
    return {
      history: [],
      memories: [],
      summary: null,
      systemInstruction: ""
    };
  }
}

/**
 * Obtém todas as memórias ativas do usuário no Supabase
 */
export async function getMemories(userId = '00000000-0000-0000-0000-000000000001') {
  try {
    const { loadImportantMemories } = await import('../config/supabase.js');
    return await loadImportantMemories(userId);
  } catch (error) {
    console.error('❌ [MemoryService] Erro ao obter memórias:', error);
    return [];
  }
}

/**
 * Salva uma nova memória
 */
export async function saveMemory(content: string, category = 'general', userId = '00000000-0000-0000-0000-000000000001') {
  try {
    const { saveMemory: saveToDB } = await import('../config/supabase.js');

    let key = category !== 'general' ? category : 'info_importante';
    let value = content;

    // Se o conteúdo vier no formato "chave: valor", extrair a chave
    if (content.includes(':')) {
      const parts = content.split(':');
      const potentialKey = parts[0].trim().toLowerCase().replace(/ /g, '_');
      // Validar se potentialKey é algo útil
      if (potentialKey.length > 0 && potentialKey.length < 30) {
        key = potentialKey;
        value = parts.slice(1).join(':').trim();
      }
    }

    const result = await saveToDB(userId, key, value, true);
    return result;
  } catch (error) {
    console.error('❌ [MemoryService] Erro ao salvar memória:', error);
    throw error;
  }
}

/**
 * Deleta uma memória (Hard Delete)
 */
export async function deleteMemory(id: string, userId = '00000000-0000-0000-0000-000000000001') {
  try {
    const { deleteMemory: removeFromDB } = await import('../config/supabase.js');
    // Assume-se que 'id' no frontend pode agora ser a 'key' semântica
    return await removeFromDB(userId, id);
  } catch (error) {
    console.error('❌ Erro ao deletar memória:', error);
    throw error;
  }
}

/**
 * Gera um resumo incremental da conversa (Enterprise v1.2)
 */
export async function summarizeConversation(conversationId: string, messages: any[]) {
  try {
    const { OpenAIService } = await import('./openAIService.js');
    const { saveConversationSummary } = await import('../config/supabase.js');

    // Filtrar mensagens para o resumo (limitar tamanho)
    const chatContext = messages
      .filter(m => m.role !== 'system')
      .map(m => `${m.role}: ${m.content} `)
      .join('\n');

    const summaryPrompt = `Você é um assistente de documentação técnica. 
RESUMA esta conversa até o momento focando em:
1. Decisões tomadas(o que foi escolhido / definido)
2. Pendências(o que falta ser feito)
3. Configurações escolhidas(tecnologias, versões, parâmetros)
4. Refs Importantes(IDs, links, nomes de pastas)

FORMATO DE RESPOSTA(JSON estrito):
{
  "decisions": "...",
    "pending": "...",
      "settings": "...",
        "refs": "..."
}

HISTÓRICO:
${chatContext}

RESPONDA APENAS O JSON.`;

    const response = await OpenAIService.chat(summaryPrompt, [], 'gpt-4o-mini');
    const cleanedText = response.text.replace(/```json|```/g, '').trim();
    const summaryData = JSON.parse(cleanedText);

    await saveConversationSummary(conversationId, summaryData);
    console.log(`📝[MemoryService] Resumo atualizado para a conversa ${conversationId} `);
    return summaryData;
  } catch (err) {
    console.error('❌ [MemoryService] Erro ao resumir conversa:', err);
    return null;
  }
}

/**
 * Dispara atualização de resumo se for a cada 10 mensagens (incremental)
 */
export async function updateSummaryIfNeeded(conversationId: string, messageCount: number) {
  // Disparamos a cada 10 mensagens
  if (messageCount > 0 && messageCount % 10 === 0) {
    console.log(`🔄[MemoryService] Disparando atualização de resumo para conv ${conversationId} (${messageCount} mensagens)`);
    const { loadRecentMessages } = await import('../config/supabase.js');
    const history = await loadRecentMessages(conversationId, 30); // Pega as últimas 30 para um resumo completo do contexto atual

    // Chamada assíncrona em background
    summarizeConversation(conversationId, history).catch(err => {
      console.error('⚠️ [MemoryService] Falha no resumo em background:', err);
    });
  }
}
