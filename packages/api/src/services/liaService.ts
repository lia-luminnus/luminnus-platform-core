import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import { LIA_FULL_PERSONALITY as LIA_PERSONALITY_V4 } from '@luminnus/shared';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '');
const supabase = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_SERVICE_KEY || '');

export class LiaService {
    /**
     * Responde a uma mensagem de texto usando Gemini
     */
    static async getResponse(text: string, conversationId?: string, userId?: string) {
        try {
            console.log(`🧠 [LiaService] Pensando sobre: "${text}" (conv: ${conversationId})`);

            const model = genAI.getGenerativeModel({
                model: 'gemini-2.5-flash', // Modelo específico solicitado pelo usuário
                systemInstruction: LIA_PERSONALITY_V4
            });

            // v1.0: Recuperar histórico se houver conversationId
            let fullPrompt = text;
            if (conversationId) {
                const { data: messages } = await supabase
                    .from('messages')
                    .select('content, type')
                    .eq('conversation_id', conversationId)
                    .order('created_at', { ascending: false })
                    .limit(10);

                if (messages && messages.length > 0) {
                    // Formatar histórico para o Gemini (User/Model)
                    const history = messages.reverse().map(m =>
                        `${m.type === 'user' ? 'User' : 'Model'}: ${m.content}`
                    ).join('\n');

                    fullPrompt = `Consider the following conversation history:\n${history}\n\nUser: ${text}`;
                }
            }

            const result = await model.generateContent(fullPrompt);
            const responseText = result.response.text();

            // Salvar no Supabase se houver contexto
            if (conversationId && userId) {
                // Salvar mensagem do usuário
                await supabase.from('messages').insert({
                    conversation_id: conversationId,
                    user_id: userId,
                    content: text,
                    type: 'user'
                });

                // Salvar resposta da LIA
                await supabase.from('messages').insert({
                    conversation_id: conversationId,
                    user_id: userId,
                    content: responseText,
                    type: 'lia'
                });

                // Atualizar updated_at da conversa
                await supabase.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', conversationId);
            }

            return responseText;
        } catch (error) {
            console.error('❌ [LiaService] Erro ao gerar resposta:', error);
            return 'Desculpe, tive um pequeno problema no meu processamento central. Pode repetir?';
        }
    }
}
