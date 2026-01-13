import { createClient } from "@supabase/supabase-js";
import dotenv from 'dotenv';

// Garantir que as variáveis de ambiente estejam carregadas
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

// Priorizar chave de serviço para bypass de RLS no backend
const supabaseKey = supabaseServiceKey || supabaseAnonKey;

let supabase = null;

if (!supabaseUrl || !supabaseKey) {
    console.warn(
        "⚠️ SUPABASE_URL e SUPABASE_ANON_KEY não estão definidas — recursos de memória serão desativados, mas o servidor continua rodando."
    );
} else {
    try {
        supabase = createClient(supabaseUrl, supabaseKey);
        const keyType = supabaseServiceKey ? "SERVICE_ROLE" : "ANON";
    } catch (err) {
        console.error("❌ Erro ao inicializar Supabase:", err);
        supabase = null;
    }
}

export { supabase };

export async function saveConversation(conversation) {
    if (!supabase) return;
    try {
        const userId = conversation.userId || '00000000-0000-0000-0000-000000000001';

        // v1.2: Proteção Crítica contra Perda de Histórico (Data Loss Prevention)
        // Se a conversa já existe, não permitimos que ela mude de dono (userId)
        // Isso impede que um refresh rápido sem auth carregado "sequestre" a conversa para o guest.
        const { data: existing } = await supabase
            .from("conversations")
            .select("user_id")
            .eq("id", conversation.id)
            .maybeSingle();

        if (existing && existing.user_id !== userId && userId === '00000000-0000-0000-0000-000000000001') {
            console.warn(`🛑 [saveConversation] Bloqueada tentativa de mover conversa ${conversation.id} para GUEST.`);
            return;
        }

        const { error } = await supabase.from("conversations").upsert({
            id: conversation.id,
            title: conversation.title,
            mode: conversation.mode,
            user_id: userId,
            updated_at: new Date().toISOString()
        }, { onConflict: 'id' });

        if (error) {
            console.error("❌ [saveConversation] Erro ao salvar metadados:", error);
            throw error;
        }
        console.log(`✅ [saveConversation] Metadados da conversa ${conversation.id} salvos com sucesso.`);
    } catch (err) {
        console.error("❌ [saveConversation] Exceção:", err);
    }
}

export async function listConversations(userId) {
    if (!supabase) return [];
    try {
        const { data, error } = await supabase
            .from("conversations")
            .select("*")
            .eq("user_id", userId || '00000000-0000-0000-0000-000000000001')
            .order("updated_at", { ascending: false });

        if (error) {
            console.error("❌ [listConversations] Erro:", error);
            return [];
        }
        return data || [];
    } catch (err) {
        return [];
    }
}

export async function getUserProfile(userId) {
    if (!supabase) return null;
    try {
        const { data, error } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", userId)
            .maybeSingle();

        if (error) {
            console.error("❌ [getUserProfile] Erro ao carregar perfil:", error);
            return null;
        }
        return data;
    } catch (err) {
        console.error("❌ [getUserProfile] Exceção:", err);
        return null;
    }
}

export async function saveMessage(conversationId, role, content, origin = "text", attachments = []) {
    if (!supabase) {
        console.warn("⚠️ [saveMessage] Supabase não configurado — mensagem não foi persistida.");
        return;
    }

    try {
        const { error } = await supabase.from("messages").insert({
            conversation_id: conversationId,
            role,
            content,
            origin,
            attachments: Array.isArray(attachments) ? attachments : [],
        });


        if (error) {
            console.error("❌ [saveMessage] Erro ao salvar mensagem:", error);
            throw new Error(`Error saving message: ${error.message}`);
        }
    } catch (err) {
        console.error("❌ [saveMessage] Exceção ao salvar mensagem:", err);
        throw err;
    }
}

export async function loadRecentMessages(conversationId, limit = 6) {
    if (!supabase) {
        console.warn("⚠️ [loadRecentMessages] Supabase não configurado — retornando [].");
        return [];
    }

    try {
        const { data, error } = await supabase
            .from("messages")
            .select("role, content")
            .eq("conversation_id", conversationId)
            .order("created_at", { ascending: false })
            .limit(limit);

        if (error) {
            console.error("❌ [loadRecentMessages] Erro ao carregar mensagens:", error);
            throw new Error(`Error loading recent messages: ${error.message}`);
        }

        return (data || []).reverse();
    } catch (err) {
        console.error("❌ [loadRecentMessages] Exceção ao carregar mensagens:", err);
        return [];
    }
}

export async function loadConversation(conversationId, limit = 10) {
    if (!supabase) {
        console.warn("⚠️ [loadConversation] Supabase não configurado — retornando [].");
        return [];
    }

    try {
        const { data, error } = await supabase
            .from("messages")
            .select("*")
            .eq("conversation_id", conversationId)
            .order("created_at", { ascending: false })
            .limit(limit);

        if (error) {
            console.error("❌ [loadConversation] Erro ao carregar conversa:", error);
            throw new Error(`Error loading conversation: ${error.message}`);
        }

        return data || [];
    } catch (err) {
        console.error("❌ [loadConversation] Exceção ao carregar conversa:", err);
        return [];
    }
}

// Mapeamento de categorias e importância para o sistema cognitivo (v1.1)
const typeMap = {
    nome_usuario: 'identity',
    idade: 'identity',
    localizacao: 'address',
    email_usuario: 'identity',
    empresa: 'company',
    cargo: 'business',
    segmento: 'business',
    preferencia: 'preference',
    restricao: 'preference',
    nome_filho: 'family',
    nome_esposa: 'family',
    nome_marido: 'family',
    nome_cachorro: 'family',
    nome_gato: 'family',
    relacao_lia: 'identity',
    info_importante: 'misc'
};

const importanceMap = {
    nome_usuario: 5,
    empresa: 4,
    segmento: 4,
    cargo: 3,
    localizacao: 3,
    identidade: 5,
    familia: 3
};

export async function saveMemory(userId, key, value, isImportant = false) {
    if (!supabase) return null;

    const memoryType = typeMap[key] || "misc";
    const importance = isImportant ? (importanceMap[key] || 3) : 1;

    try {
        // v1.1: Uso de UPSERT (Garantido pela constraint memories_user_id_key_unique)
        const payload = {
            user_id: userId,
            key: key,
            content: value,
            type: memoryType,
            importance: importance,
            status: 'active',
            updated_at: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from("memories")
            .upsert(payload, {
                onConflict: 'user_id, key',
                ignoreDuplicates: false
            })
            .select();

        if (error) {
            console.error("❌ [saveMemory] Erro no Upsert:", error);
            // FALLBACK: Tentar insert simples se o upsert falhar por constraint unique
            if (error.code === '23505') {
                console.log("🔄 [saveMemory] Tentando DELETE + INSERT como fallback...");
                await supabase.from("memories").delete().eq("user_id", userId).eq("key", key);
                await supabase.from("memories").insert(payload);
                return { key, value, status: 'synced_fallback' };
            }
            throw error;
        }

        console.log(`✅ [saveMemory] Memória sincronizada (Upsert): ${key} = ${value}`);
        return { key, value, status: 'synced', data };
    } catch (err) {
        console.error("❌ [saveMemory] Exceção crítica:", err);
        // COGNITIVE CACHE: Se tudo falhar, retornar sucesso simulado para não quebrar o fluxo
        // A informação ficará no histórico da conversa pelo menos.
        return { key, value, status: 'cached_locally' };
    }
}


export async function loadImportantMemories(userId) {
    if (!supabase) {
        console.warn("⚠️ [loadImportantMemories] Supabase não configurado — retornando [].");
        return [];
    }

    console.log(`🔍 [loadImportantMemories] Buscando memórias para userId: ${userId}`);

    try {
        const { data, error } = await supabase
            .from("memories")
            .select("key, content")
            .eq("user_id", userId)
            .eq("status", "active")
            .order("updated_at", { ascending: false })
            .limit(15);

        if (error) {
            console.error("❌ [loadImportantMemories] Erro:", error);
            throw new Error(`Error loading memories: ${error.message}`);
        }

        const DEFAULT_ID = "00000000-0000-0000-0000-000000000001";
        if ((!data || data.length === 0) && userId !== DEFAULT_ID) {
            console.log(`🔄 [loadImportantMemories] Nenhuma memória para ${userId}. Tentando fallback no ID default...`);
            const { data: fallbackData } = await supabase
                .from("memories")
                .select("key, content")
                .eq("user_id", DEFAULT_ID)
                .eq("status", "active")
                .order("updated_at", { ascending: false })
                .limit(10);

            if (fallbackData && fallbackData.length > 0) {
                console.log(`✅ [loadImportantMemories] Fallback bem-sucedido: ${fallbackData.length} memórias recuperadas.`);
                return fallbackData;
            }
        }

        // v5.2: Dedup por chave para evitar que múltiplas versões da mesma memória confundam a LIA
        const uniqueMemories = new Map();
        (data || []).forEach(mem => {
            if (!uniqueMemories.has(mem.key)) {
                uniqueMemories.set(mem.key, mem);
            }
        });

        const filteredData = Array.from(uniqueMemories.values()).filter(mem => {
            const content = (mem.content || "").toLowerCase();
            const isNegative =
                content.includes("não tenho a capacidade") ||
                content.includes("não consigo lembrar") ||
                content.includes("não armazeno") ||
                content.includes("não posso guardar") ||
                content.includes("não tenho acesso") ||
                content.includes("minha memória é limitada") ||
                content.includes("não sei o seu nome") ||
                content.includes("não guardo informações") ||
                content.includes("por questão de privacidade") ||
                content.includes("cada interação é considerada isoladamente") ||
                content.includes("não tenho como saber") ||
                content.includes("posso ajudar com mais alguma coisa") ||
                content.includes("como posso te ajudar hoje") ||
                content.includes("posso ajudar em algo mais") ||
                content.includes("bom dia! como posso");
            return !isNegative;
        });

        console.log(
            `✅ [loadImportantMemories] Memórias encontradas: ${filteredData.length} (Filtradas: ${(data || []).length - filteredData.length}, Originais: ${(data || []).length})`
        );

        if (filteredData.length > 0) {
            console.log("📝 [loadImportantMemories] Memórias:", filteredData);
        }

        return filteredData;
    } catch (err) {
        console.error("❌ [loadImportantMemories] Exceção ao carregar memórias:", err);
        return [];
    }
}

// ============================================================
// DELETAR MEMÓRIA (v2.2)
// Remove uma memória específica do Supabase pela chave
// ============================================================
export async function deleteMemory(userId, key) {
    if (!supabase) {
        console.warn("⚠️ [deleteMemory] Supabase não configurado.");
        return null;
    }

    console.log(`🗑️ [deleteMemory] Deletando: key="${key}", userId=${userId}`);

    try {
        const { data, error } = await supabase
            .from("memories")
            .delete()
            .eq("user_id", userId)
            .eq("key", key);

        if (error) {
            console.error("❌ [deleteMemory] Erro ao deletar memória:", error);
            throw new Error(`Error deleting memory: ${error.message}`);
        }

        console.log(`✅ [deleteMemory] Memória '${key}' deletada com sucesso.`);
        return { deleted: true, key };
    } catch (err) {
        console.error("❌ [deleteMemory] Exceção ao deletar memória:", err);
        return null;
    }
}

// ============================================================
// SOFT DELETE MEMÓRIA (v3.0 - Memória Cognitiva)
// Marca a memória como 'deleted' sem remover do banco (auditoria)
// ============================================================
export async function forgetMemory(userId, key, tenantId = null) {
    if (!supabase) {
        console.warn("⚠️ [forgetMemory] Supabase não configurado.");
        return null;
    }

    console.log(`🧹 [forgetMemory] Soft delete: key="${key}", userId=${userId}`);

    try {
        let query = supabase
            .from("memories")
            .update({
                status: 'deleted',
                updated_at: new Date().toISOString()
            })
            .eq("user_id", userId)
            .eq("key", key);

        if (tenantId) {
            query = query.eq("tenant_id", tenantId);
        }

        const { data, error } = await query;

        if (error) {
            console.error("❌ [forgetMemory] Erro:", error);
            throw new Error(`Error forgetting memory: ${error.message}`);
        }

        console.log(`✅ [forgetMemory] Memória '${key}' marcada como deleted.`);
        return { forgotten: true, key };
    } catch (err) {
        console.error("❌ [forgetMemory] Exceção:", err);
        return null;
    }
}

// ============================================================
// CORRIGIR MEMÓRIA (v3.0 - Memória Cognitiva)
// Atualiza o valor de uma memória existente e marca a origem como 'explicit_user'
// ============================================================
export async function correctMemory(userId, key, newValue, tenantId = null) {
    if (!supabase) {
        console.warn("⚠️ [correctMemory] Supabase não configurado.");
        return null;
    }

    console.log(`✏️ [correctMemory] Corrigindo: key="${key}" para "${newValue}"`);

    try {
        let query = supabase
            .from("memories")
            .update({
                content: newValue,
                source: 'explicit_user',
                updated_at: new Date().toISOString()
            })
            .eq("user_id", userId)
            .eq("key", key)
            .eq("status", "active"); // Só corrige memórias ativas

        if (tenantId) {
            query = query.eq("tenant_id", tenantId);
        }

        const { data, error } = await query;

        if (error) {
            console.error("❌ [correctMemory] Erro:", error);
            throw new Error(`Error correcting memory: ${error.message}`);
        }

        console.log(`✅ [correctMemory] Memória '${key}' corrigida para: ${newValue}`);
        return { corrected: true, key, newValue };
    } catch (err) {
        console.error("❌ [correctMemory] Exceção:", err);
        return null;
    }
}

// ============================================================
// DETECÇÃO AUTOMÁTICA DE MEMÓRIAS (v2.2)
// Agora respeita negações e não sobrescreve chaves críticas.
// ============================================================
export async function detectAndSaveMemory(text, userId) {
    // Nota: O processamento pesado de extração deve ser feito pelo LLM.
    // Esta função serve como um extrator de fallback baseado em padrões.
    const lowerText = text.toLowerCase();
    const savedMemories = [];

    // ============================================================
    // VALIDAÇÃO ANTI-PERGUNTAS: Não salvar perguntas como memórias
    // ============================================================
    const isQuestionOrRequest =
        text.includes('?') ||
        lowerText.startsWith('qual') ||
        lowerText.startsWith('quem') ||
        lowerText.startsWith('onde') ||
        lowerText.startsWith('quando') ||
        lowerText.startsWith('como') ||
        lowerText.startsWith('por que') ||
        lowerText.startsWith('porque') ||
        lowerText.startsWith('o que') ||
        lowerText.includes('você pode') ||
        lowerText.includes('você consegue') ||
        lowerText.includes('consegue trazer') ||
        lowerText.includes('consegue buscar') ||
        lowerText.includes('pode buscar') ||
        lowerText.includes('pode trazer') ||
        lowerText.includes('me diz') ||
        lowerText.includes('me diga') ||
        lowerText.includes('me fala') ||
        lowerText.includes('que horas') ||
        lowerText.includes('traga informações') ||
        lowerText.includes('busque informações') ||
        lowerText.includes('pesquisa') ||
        lowerText.includes('gere um') ||
        lowerText.includes('crie um') ||
        lowerText.includes('faça um');

    // ============================================================
    // VALIDAÇÃO ANTI-NEGAÇÃO: "Não sou o Andy" não deve salvar "Andy"
    // ============================================================
    const isNegation =
        lowerText.includes(' não ') ||
        lowerText.startsWith('não ') ||
        lowerText.includes(' nada de ') ||
        lowerText.includes(' esqueça ') ||
        lowerText.includes(' pare de ');

    // ============================================================
    // v4.23: Detectar se é declaração de nome ANTES da validação trivial
    const isNameDeclaration =
        lowerText.includes("meu nome é") ||
        lowerText.includes("me chamo") ||
        lowerText.includes("sou o") ||
        lowerText.includes("sou a") ||
        lowerText.includes("pode me chamar");

    // VALIDAÇÃO ANTI-TRIVIAL: Não salvar frases genéricas/conversacionais
    // Isso evita poluição da mente única com conteúdo sem valor de memória.
    // ============================================================
    const isTrivialContent =
        lowerText.length < 15 || // v4.22: Reduzido de 30 para 15 para permitir declarações curtas de nome
        lowerText.includes('tá ouvindo') ||
        lowerText.includes('ta ouvindo') ||
        lowerText.includes('tudo bem') ||
        lowerText.includes('como você está') ||
        lowerText.includes('bom dia') ||
        lowerText.includes('boa tarde') ||
        lowerText.includes('boa noite') ||
        lowerText.includes('olá') ||
        lowerText.includes('oi lia') ||
        lowerText.includes('muito obrigado') ||
        lowerText.includes('valeu') ||
        lowerText.includes('ok') ||
        lowerText.includes('certo') ||
        lowerText.includes('entendi') ||
        lowerText.includes('você tem que ir') ||
        lowerText.includes('você está aí') ||
        lowerText.includes('posso falar') ||
        lowerText.includes('estou esperando') ||
        lowerText.includes('tô esperando') ||
        lowerText.includes('um momento') ||
        lowerText.includes('espera aí') ||
        /^(sim|não|ok|certo|entendi|combinado|beleza|tá|ta|bom|legal)[.!?]?$/i.test(lowerText.trim());

    // v4.23: Se for declaração de nome, ignorar trava de trivialidade (bypass)
    if ((isQuestionOrRequest || isNegation || isTrivialContent) && !isNameDeclaration) {
        // console.log(`ℹ️ [detectAndSaveMemory] Conteúdo ignorado - Razões: (Questão=${isQuestionOrRequest}, Negação=${isNegation}, Trivial=${isTrivialContent}) | Texto: "${text.substring(0, 30)}..."`);
        return [];
    }

    // NOME DO USUÁRIO
    if (
        lowerText.includes("meu nome é") ||
        lowerText.includes("me chamo") ||
        lowerText.includes("sou o") ||
        lowerText.includes("sou a") ||
        lowerText.includes("eu sou o") ||
        lowerText.includes("eu sou a") ||
        lowerText.includes("pode me chamar")
    ) {
        // v4.22: Ignorar se for correção ortográfica (ex: "meu nome é com dois L")
        // Isso não é o nome, é uma instrução de grafia
        const isSpellingCorrection =
            lowerText.includes('dois l') ||
            lowerText.includes('dois r') ||
            lowerText.includes('dois s') ||
            lowerText.includes('com ll') ||
            lowerText.includes('no final') ||
            lowerText.includes('letras');

        if (isSpellingCorrection) {
            console.log('ℹ️ [detectAndSaveMemory] Correção ortográfica detectada - buscando nome antes da correção...');
        }

        // v4.23: Regex Robusto - Parar em delimitadores: "com", "e", "mas", "só que", vírgula, ponto
        const match = text.match(
            /(?:meu nome é|me chamo|(?:eu )?sou (?:o |a )?|pode me chamar de?\s*)([A-Za-zÀ-ÿ]+(?:\s+[A-Za-zÀ-ÿ]+)?)(?:\.|,|$|\s+com\s+|\s+e\s+|\s+mas\s+|\s+só que\s+|fundador|criador|sou)/i
        );

        if (match && match[1].trim().length > 2) {
            const nome = match[1].trim();
            // Filtrar palavras que não são nomes (ex: "fundador", "o", "a")
            const invalidNames = ['fundador', 'criador', 'dono', 'ceo', 'desenvolvedor'];
            if (!invalidNames.includes(nome.toLowerCase())) {
                console.log(`✅ [detectAndSaveMemory] Nome detectado: ${nome}`);
                const result = await saveMemory(userId, "nome_usuario", nome);
                if (result) savedMemories.push(result);
            }
        }
    }

    // E-MAIL DO USUÁRIO
    if (
        lowerText.includes("meu e-mail") ||
        lowerText.includes("meu email") ||
        lowerText.includes("meu contato é") ||
        lowerText.includes("@")
    ) {
        // Regex para capturar e-mail padrão
        const emailMatch = text.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/i);
        if (emailMatch) {
            const email = emailMatch[1].trim();
            const result = await saveMemory(userId, "email_usuario", email);
            if (result) savedMemories.push(result);
        }
    }

    // IDADE
    if (lowerText.includes("tenho") && lowerText.includes("anos")) {
        const match = text.match(/tenho\s+(\d+)\s+anos/i);
        if (match) {
            const idade = match[1];
            const result = await saveMemory(userId, "idade", idade);
            if (result) savedMemories.push(result);
        }
    }

    // LOCALIZAÇÃO
    if (
        lowerText.includes("moro em") ||
        lowerText.includes("vivo em") ||
        lowerText.includes("estou em") ||
        lowerText.includes("sou de")
    ) {
        const match = text.match(
            /(?:moro|vivo|estou|sou)\s+(?:em|de)\s+([A-Za-zÀ-ÿ\s]+?)(?:\.|,|$| e )/i
        );
        if (match && match[1].trim().length > 2) {
            const localizacao = match[1].trim();
            const result = await saveMemory(userId, "localizacao", localizacao);
            if (result) savedMemories.push(result);
        }
    }

    // EMPRESA
    if (
        lowerText.includes("trabalho na") ||
        lowerText.includes("trabalho no") ||
        lowerText.includes("minha empresa é") ||
        lowerText.includes("sou da empresa")
    ) {
        const match = text.match(
            /(?:trabalho n[oa]|minha empresa é|sou da empresa)\s+([A-Za-zÀ-ÿ0-9\s]+?)(?:\.|,|$| e )/i
        );
        if (match && match[1].trim().length > 2) {
            const empresa = match[1].trim();
            const result = await saveMemory(userId, "empresa", empresa);
            if (result) savedMemories.push(result);
        }
    }

    // CARGO / PROFISSÃO
    if (
        lowerText.includes("sou engenheiro") ||
        lowerText.includes("sou médico") ||
        lowerText.includes("sou advogado") ||
        lowerText.includes("sou gerente") ||
        lowerText.includes("sou diretor") ||
        lowerText.includes("sou programador") ||
        lowerText.includes("trabalho como") ||
        lowerText.includes("meu cargo é")
    ) {
        const match = text.match(
            /(?:sou|trabalho como|meu cargo é)\s+([A-Za-zÀ-ÿ\s]+?)(?:\.|,|$| e )/i
        );
        if (match && match[1].trim().length > 2) {
            const cargo = match[1].trim();
            const result = await saveMemory(userId, "cargo", cargo);
            if (result) savedMemories.push(result);
        }
    }

    // PREFERÊNCIAS / HOBBIES
    if (
        lowerText.includes("gosto de") ||
        lowerText.includes("adoro") ||
        lowerText.includes("amo") ||
        lowerText.includes("prefiro")
    ) {
        const match = text.match(
            /(?:gosto de|adoro|amo|prefiro)\s+(.+?)(?:\.|,|$| e )/i
        );
        if (match && match[1].trim().length > 3) {
            const preferencia = match[1].trim();
            const result = await saveMemory(userId, "preferencia", preferencia);
            if (result) savedMemories.push(result);
        }
    }

    // DADOS DE FUNÇÃO / EMPRESA
    if (
        lowerText.includes("fundador") ||
        lowerText.includes("criador") ||
        lowerText.includes("dono") ||
        lowerText.includes("ceo") ||
        lowerText.includes("desenvolvedor") ||
        lowerText.includes("trabalho")
    ) {
        const empresaMatch = text.match(
            /(?:fundador|criador|dono|ceo|desenvolvedor|trabalho)\s+(?:da|do|de|na|no)\s+([A-Za-zÀ-ÿ0-9\s]+?)(?:\.|,|$| e | que)/i
        );

        if (empresaMatch) {
            const empresaResult = await saveMemory(
                userId,
                "empresa",
                empresaMatch[1].trim()
            );
            if (empresaResult) savedMemories.push(empresaResult);

            const cargo = lowerText.includes("desenvolvedor") ? "desenvolvedor" : "fundador";
            const cargoResult = await saveMemory(userId, "cargo", cargo);
            if (cargoResult) savedMemories.push(cargoResult);
        }
    }

    // RELAÇÃO COM LIA
    if (
        (lowerText.includes("desenvolve você") ||
            lowerText.includes("desenvolvi você") ||
            lowerText.includes("construí você") ||
            lowerText.includes("criei você") ||
            lowerText.includes("quem te criou") ||
            lowerText.includes("quem te desenvolveu")) &&
        (lowerText.includes("eu sou") ||
            lowerText.includes("sou quem") ||
            lowerText.includes("fui eu") ||
            lowerText.includes("eu te"))
    ) {
        const result = await saveMemory(
            userId,
            "relacao_lia",
            "desenvolvedor e criador da LIA"
        );
        if (result) savedMemories.push(result);
    }

    // FRASE COMPLETA — FILHO, MÃE, LOCAL, CASAMENTO
    const filhoRegex =
        /(tenho um filho chamado|meu filho se chama)\s+([A-Za-zÀ-ÿ]+)\s+(.*)/i;
    const filhoMatch = text.match(filhoRegex);

    if (filhoMatch) {
        const nomeFilho = filhoMatch[2].trim();
        const detalhes = filhoMatch[3].trim();

        const r1 = await saveMemory(userId, "nome_filho", nomeFilho);
        if (r1) savedMemories.push(r1);

        if (detalhes.length > 5) {
            const r2 = await saveMemory(userId, "detalhes_filho", detalhes);
            if (r2) savedMemories.push(r2);
        }
    }

    // ESPOSA / MARIDO
    if (lowerText.includes("esposa") || lowerText.includes("sou casado")) {
        const match = text.match(
            /(?:minha esposa|sou casado com|esposa se chama)\s+([A-Za-zÀ-ÿ]+)/i
        );
        if (match) {
            const result = await saveMemory(userId, "nome_esposa", match[1].trim());
            if (result) savedMemories.push(result);
        }
    }

    if (lowerText.includes("marido") || lowerText.includes("sou casada")) {
        const match = text.match(
            /(?:meu marido|sou casada com|marido se chama)\s+([A-Za-zÀ-ÿ]+)/i
        );
        if (match) {
            const result = await saveMemory(userId, "nome_marido", match[1].trim());
            if (result) savedMemories.push(result);
        }
    }

    // PETS (CACHORRO, GATO)
    if (
        lowerText.includes("cachorro") ||
        lowerText.includes("gato") ||
        lowerText.includes("pet")
    ) {
        const match = text.match(
            /(?:tenho um|meu)\s+(cachorro|gato|pet)\s+(?:chamado|de nome|que se chama)\s+([A-Za-zÀ-ÿ]+)/i
        );
        if (match) {
            const tipoPet = match[1].toLowerCase();
            const nomePet = match[2].trim();
            const result = await saveMemory(userId, `nome_${tipoPet}`, nomePet);
            if (result) savedMemories.push(result);
        }
    }

    // ENDEREÇO DO USUÁRIO
    if (
        lowerText.includes("salve esse endereço") ||
        lowerText.includes("salva esse endereço") ||
        lowerText.includes("meu endereço é") ||
        lowerText.includes("meu endereço:") ||
        lowerText.includes("endereço:") ||
        lowerText.includes("moro na rua") ||
        lowerText.includes("moro no") ||
        lowerText.includes("salve essa informação:")
    ) {
        // Padrão para capturar endereços como "Rua X, Número Y, Cidade"
        const enderecoMatch = text.match(
            /(?:endereço[:\s]+|informação[:\s]+|moro (?:na|no|em)\s+)(.+?)(?:\.|$)/i
        );
        if (enderecoMatch && enderecoMatch[1].trim().length > 5) {
            const endereco = enderecoMatch[1].trim();
            console.log(`📍 [autoExtractMemories] Endereço detectado: ${endereco}`);
            const result = await saveMemory(userId, "endereco_usuario", endereco);
            if (result) savedMemories.push(result);
        }
    }

    // INFORMAÇÃO GENÉRICA
    if (
        lowerText.includes("guarda") ||
        lowerText.includes("lembra") ||
        lowerText.includes("salva") ||
        lowerText.includes("memoriza")
    ) {
        const infoMatch = text.match(
            /(?:guarda|lembra|salva|memoriza)\s*:?\s*(.+?)(?:\.|$)/i
        );

        if (infoMatch && infoMatch[1].trim().length > 10) {
            const result = await saveMemory(
                userId,
                "info_importante",
                infoMatch[1].trim()
            );
            if (result) savedMemories.push(result);
        }
    }

    return savedMemories;
}

export async function deleteMessagesByConversation(conversationId) {
    if (!supabase) return;
    try {
        const { error } = await supabase
            .from("messages")
            .delete()
            .eq("conversation_id", conversationId);

        if (error) {
            console.error("❌ [deleteHistory] Erro ao excluir histórico:", error);
            throw error;
        }
        console.log(`🗑️ [deleteHistory] Histórico da conversa ${conversationId} removido do banco.`);
    } catch (err) {
        console.error("❌ [deleteHistory] Exceção:", err);
    }
}

export async function searchMessagesByKeyword(conversationId, query, limit = 5) {
    if (!supabase) return [];
    try {
        const { data, error } = await supabase
            .from("messages")
            .select("role, content, created_at")
            .eq("conversation_id", conversationId)
            .ilike("content", `%${query}%`)
            .order("created_at", { ascending: false })
            .limit(limit);

        if (error) {
            console.error("❌ [searchMessages] Erro:", error);
            return [];
        }
        return data || [];
    } catch (err) {
        console.error("❌ [searchMessages] Exceção:", err);
        return [];
    }
}

export async function saveConversationSummary(conversationId, summaryData) {
    if (!supabase) return;
    try {
        // v2.4: Simplificado para evitar erro de constraint única
        // Como o getConversationSummary pega o 'limit(1).single()' ordenado por data,
        // apenas inserir um novo resumo é o suficiente e mais seguro.
        const { error } = await supabase
            .from("messages")
            .insert({
                conversation_id: conversationId,
                role: "system_summary",
                content: JSON.stringify(summaryData),
                created_at: new Date().toISOString()
            });

        if (error) {
            console.error("❌ [saveSummary] Erro ao salvar resumo:", error);
        } else {
            console.log(`📝 [Supabase] Resumo persistido para conv: ${conversationId}`);
        }
    } catch (err) {
        console.error("❌ [saveSummary] Exceção:", err);
    }
}

export async function getConversationSummary(conversationId) {
    if (!supabase) return null;
    try {
        const { data, error } = await supabase
            .from("messages")
            .select("content")
            .eq("conversation_id", conversationId)
            .eq("role", "system_summary")
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

        if (error || !data) return null;
        return JSON.parse(data.content);
    } catch (err) {
        return null;
    }
}
