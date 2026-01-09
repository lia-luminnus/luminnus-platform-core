// ======================================================================
// MEMORY SERVICE - Sistema de Memória Persistente da LIA
// ======================================================================

import { supabase } from '../config/supabase.js';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Tipos válidos de memória
const MEMORY_TYPES = [
    'personal',
    'family',
    'company',
    'business',
    'preference',
    'address',
    'reminder',
    'misc'
];

// ======================================================================
// 1. Classificar tipo de memória usando GPT-4o
// ======================================================================
export async function classifyMemory(text) {
    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            temperature: 0.3,
            messages: [
                {
                    role: 'system',
                    content: `Você é um classificador de memórias. Classifique o texto em UMA das categorias:
          
- personal: informações pessoais (idade, gostos, hobbies, personalidade)
- family: informações familiares (esposa, filhos, pais, relacionamentos)
- company: informações sobre empresas (nome, setor, produtos)
- business: informações de negócios (parcerias, clientes, projetos)
- preference: preferências pessoais (odeio/amo fazer X, não gosto de Y)
- address: endereços, localizações, lugares importantes
- reminder: lembretes, compromissos, tarefas futuras
- misc: outros tipos de informação relevante

Responda APENAS com o nome da categoria, nada mais.`
                },
                {
                    role: 'user',
                    content: text
                }
            ]
        });

        const type = response.choices[0].message.content.trim().toLowerCase();

        // Validar se retornou um tipo válido
        if (!MEMORY_TYPES.includes(type)) {
            console.warn(`⚠️ Tipo inválido retornado: ${type}, usando 'misc'`);
            return 'misc';
        }

        return type;

    } catch (error) {
        console.error('❌ Erro ao classificar memória:', error);
        return 'misc';
    }
}

// ======================================================================
// 2. Detectar se há informação importante para salvar
// ======================================================================
export async function detectImportantInfo(text) {
    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            temperature: 0.3,
            messages: [
                {
                    role: 'system',
                    content: `Você detecta informações importantes em conversas que devem ser lembradas.

Analise o texto e decida:
1. Se contém informação digna de memória (facts sobre a pessoa, família, empresa, preferências)
2. Qual o tipo (personal, family, company, business, preference, address, reminder, misc)
3. Extraia o conteúdo limpo e estruturado

Exemplos de informações DIGNAS de memória:
- "Minha empresa é a Luminnus" → company
- "Minha esposa Ana trabalha comigo" → family
- "Eu odeio reuniões de manhã" → preference
- "Moro na Rua 123, São Paulo" → address
- "Tenho 35 anos" → personal

Exemplos de informações NÃO dignas de memória:
- "Oi, tudo bem?" → perguntas casuais
- "Qual o clima hoje?" → perguntas de informação
- "Me conte uma piada" → solicitações sem contexto pessoal

Responda APENAS em JSON válido:
{
  "shouldSave": true/false,
  "type": "categoria" ou null,
  "content": "informação limpa e estruturada" ou null
}

NÃO adicione texto antes ou depois do JSON.`
                },
                {
                    role: 'user',
                    content: text
                }
            ]
        });

        const jsonText = response.choices[0].message.content.trim();

        // Tentar parsear JSON
        try {
            const result = JSON.parse(jsonText);

            // Validar estrutura
            if (typeof result.shouldSave !== 'boolean') {
                return { shouldSave: false, type: null, content: null };
            }

            // Se não deve salvar, retornar imediatamente
            if (!result.shouldSave) {
                return { shouldSave: false, type: null, content: null };
            }

            // Validar tipo
            if (!MEMORY_TYPES.includes(result.type)) {
                console.warn(`⚠️ Tipo inválido detectado: ${result.type}, usando 'misc'`);
                result.type = 'misc';
            }

            return result;

        } catch (parseError) {
            console.error('❌ Erro ao parsear JSON da detecção:', jsonText);
            return { shouldSave: false, type: null, content: null };
        }

    } catch (error) {
        console.error('❌ Erro ao detectar informação importante:', error);
        return { shouldSave: false, type: null, content: null };
    }
}

// ======================================================================
// 3. Salvar ou atualizar memória
// ======================================================================
export async function saveMemory(userId, type, content, rawInput = null) {
    try {
        // Validar tipo
        if (!MEMORY_TYPES.includes(type)) {
            throw new Error(`Tipo inválido: ${type}`);
        }

        // Verificar se já existe uma memória similar do mesmo tipo
        const { data: existing, error: searchError } = await supabase
            .from('memories')
            .select('*')
            .eq('user_id', userId)
            .eq('type', type)
            .ilike('content', `%${content.substring(0, 50)}%`)
            .limit(1);

        if (searchError) throw searchError;

        if (existing && existing.length > 0) {
            // Atualizar memória existente
            const memory = existing[0];
            const newImportance = Math.min(memory.importance + 1, 10); // Max 10

            const { data: updated, error: updateError } = await supabase
                .from('memories')
                .update({
                    content,
                    raw_input: rawInput || memory.raw_input,
                    importance: newImportance,
                    updated_at: new Date().toISOString()
                })
                .eq('id', memory.id)
                .select()
                .single();

            if (updateError) throw updateError;

            console.log(`🔄 Memória atualizada (${type}):`, content);
            console.log(`   Importância: ${memory.importance} → ${newImportance}`);

            return { action: 'updated', memory: updated };

        } else {
            // Criar nova memória
            const { data: created, error: insertError } = await supabase
                .from('memories')
                .insert({
                    user_id: userId,
                    type,
                    content,
                    raw_input: rawInput,
                    importance: 1,
                    metadata: {}
                })
                .select()
                .single();

            if (insertError) throw insertError;

            console.log(`💾 Memória salva (${type}):`, content);
            console.log(`   ID: ${created.id}`);

            return { action: 'created', memory: created };
        }

    } catch (error) {
        console.error('❌ Erro ao salvar memória:', error);
        throw error;
    }
}

// ======================================================================
// 4. Recuperar memórias do usuário
// ======================================================================
export async function getMemories(userId, limit = 50) {
    try {
        const { data: memories, error } = await supabase
            .from('memories')
            .select('*')
            .eq('user_id', userId)
            .order('importance', { ascending: false })
            .order('updated_at', { ascending: false })
            .limit(limit);

        if (error) throw error;

        console.log(`📚 Memórias carregadas: ${memories.length} itens para user ${userId}`);

        // Agrupar por tipo para facilitar uso
        const grouped = memories.reduce((acc, memory) => {
            if (!acc[memory.type]) {
                acc[memory.type] = [];
            }
            acc[memory.type].push({
                content: memory.content,
                importance: memory.importance,
                updatedAt: memory.updated_at
            });
            return acc;
        }, {});

        return {
            total: memories.length,
            memories,
            grouped
        };

    } catch (error) {
        console.error('❌ Erro ao carregar memórias:', error);
        return { total: 0, memories: [], grouped: {} };
    }
}

// ======================================================================
// 5. Formatar memórias para contexto da LIA
// ======================================================================
export function formatMemoriesForContext(memoriesData) {
    const { grouped, total } = memoriesData;

    if (total === 0) {
        return 'Nenhuma informação prévia sobre o usuário.';
    }

    let context = `Você possui ${total} memórias sobre este usuário:\n\n`;

    for (const [type, items] of Object.entries(grouped)) {
        const label = {
            personal: '👤 Informações Pessoais',
            family: '👨‍👩‍👧‍👦 Família',
            company: '🏢 Empresa',
            business: '💼 Negócios',
            preference: '⭐ Preferências',
            address: '📍 Endereços',
            reminder: '⏰ Lembretes',
            misc: '📝 Diversos'
        }[type] || type;

        context += `${label}:\n`;
        items.forEach(item => {
            context += `  - ${item.content}\n`;
        });
        context += '\n';
    }

    return context;
}

// ======================================================================
// 6. Deletar memória
// ======================================================================
export async function deleteMemory(memoryId, userId) {
    try {
        const { error } = await supabase
            .from('memories')
            .delete()
            .eq('id', memoryId)
            .eq('user_id', userId);

        if (error) throw error;

        console.log(`🗑️ Memória deletada: ${memoryId}`);
        return true;

    } catch (error) {
        console.error('❌ Erro ao deletar memória:', error);
        return false;
    }
}

export default {
    classifyMemory,
    detectImportantInfo,
    saveMemory,
    getMemories,
    formatMemoriesForContext,
    deleteMemory
};
