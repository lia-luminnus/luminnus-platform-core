import { Express } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { listConversations, saveConversation, loadConversation, deleteMessagesByConversation } from '../config/supabase.js';

// Interface para Conversa
export interface Conversation {
    id: string;
    title: string;
    messages: any[];
    mode: 'chat' | 'multi-modal' | 'live';
    createdAt: number;
    updatedAt: number;
    userId?: string;
}

export function setupConversationRoutes(app: Express) {

    // GET /api/conversations - Lista todas as conversas
    app.get('/api/conversations', async (req, res) => {
        try {
            const userId = (req.query.userId || req.headers['x-user-id']) as string;
            const convList = await listConversations(userId);

            console.log(`📋 Listando ${convList.length} conversas para o usuário ${userId}`);
            res.json({ ok: true, conversations: convList });
        } catch (error) {
            console.error('❌ Erro ao listar conversas:', error);
            res.status(500).json({ ok: false, error: String(error) });
        }
    });

    // POST /api/conversations - Criar nova conversa
    app.post('/api/conversations', async (req, res) => {
        try {
            const { mode = 'chat', title, userId } = req.body;

            const now = Date.now();
            const newConv: Conversation = {
                id: uuidv4(),
                title: title || `Conversa de ${new Date(now).toLocaleDateString('pt-BR')} - ${new Date(now).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
                messages: [],
                mode,
                createdAt: now,
                updatedAt: now,
                userId
            };

            await saveConversation(newConv);
            console.log(`✅ Nova conversa criada: ${newConv.title} (${newConv.id})`);

            res.json({ ok: true, conversation: newConv });
        } catch (error) {
            console.error('❌ Erro ao criar conversa:', error);
            res.status(500).json({ ok: false, error: String(error) });
        }
    });

    // GET /api/conversations/:id - Buscar conversa específica
    app.get('/api/conversations/:id', async (req, res) => {
        try {
            const { id } = req.params;
            // Carregar metadados (neste backend simplificado, o GET do Supabase de msgs já traz quase tudo)
            // mas vamos carregar as mensagens como "conversa"
            const messages = await loadConversation(id, 50);

            console.log(`📖 Carregando ${messages.length} mensagens para a conversa ${id}`);
            res.json({
                ok: true,
                conversation: {
                    id,
                    messages: messages.reverse() // Supabase order desc -> reverse to asc
                }
            });
        } catch (error) {
            console.error('❌ Erro ao buscar conversa:', error);
            res.status(500).json({ ok: false, error: String(error) });
        }
    });

    // PATCH /api/conversations/:id - Atualizar conversa (renomear)
    app.patch('/api/conversations/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { title, userId } = req.body;

            await saveConversation({ id, title, userId });
            console.log(`✏️ Metadados da conversa atualizados: ${id}`);

            res.json({ ok: true });
        } catch (error) {
            console.error('❌ Erro ao atualizar conversa:', error);
            res.status(500).json({ ok: false, error: String(error) });
        }
    });

    // DELETE /api/conversations/:id - Excluir conversa
    app.delete('/api/conversations/:id', async (req, res) => {
        try {
            const { id } = req.params;

            console.log(`🗑️ Excluindo conversa e mensagens: ${id}`);

            // v1.1.2: Hard Delete - Limpar histórico do banco
            await deleteMessagesByConversation(id);

            // Também deletar metadados
            const { supabase } = await import('../config/supabase.js');
            if (supabase) {
                await supabase.from('conversations').delete().eq('id', id);
            }

            res.json({ ok: true, deleted: true });
        } catch (error) {
            console.error('❌ Erro ao excluir conversa:', error);
            res.status(500).json({ ok: false, error: String(error) });
        }
    });

    // POST /api/conversations/:id/messages - Adicionar mensagem (Legado)
    app.post('/api/conversations/:id/messages', async (req, res) => {
        try {
            const { id } = req.params;
            const { message, role, content, origin } = req.body;

            const { saveMessage } = await import('../config/supabase.js');
            await saveMessage(id, role || message.type || 'user', content || message.content, origin || 'text');

            res.json({ ok: true });
        } catch (error) {
            console.error('❌ Erro ao adicionar mensagem:', error);
            res.status(500).json({ ok: false, error: String(error) });
        }
    });

    // POST /api/messages/save - Persistir mensagem diretamente no Supabase
    app.post('/api/messages/save', async (req, res) => {
        try {
            const { conversationId, role, content, origin = 'text', userId } = req.body;

            if (!conversationId || !content) {
                return res.status(400).json({ ok: false, error: 'ID da conversa e conteúdo são obrigatórios' });
            }

            console.log(`💾 Persistindo mensagem ${origin}: ${content.substring(0, 30)}...`);

            const { saveMessage } = await import('../config/supabase.js');
            await saveMessage(conversationId, role, content, origin);

            res.json({ ok: true, saved: true });
        } catch (error) {
            console.error('❌ Erro ao persistir mensagem:', error);
            res.status(500).json({ ok: false, error: String(error) });
        }
    });

}
