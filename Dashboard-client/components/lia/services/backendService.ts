/**
 * ✅ LIA Backend Service - Serviço único de comunicação com backend
 * PARIDADE TOTAL com lia-live-view/src/services/backendService.ts
 * Todas as rotas do backend (porta 3000) são acessadas via proxy /api
 */

import { Message } from '../LIAContext';

// URL do backend via ENV (produção-ready)
// Em dev: http://localhost:3000 | Em prod: URL do Render
const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface Memory {
    id: string;
    content: string;
    category: string;
    timestamp: number;
    key?: string;
    value?: string;
}

export interface ChatResponse {
    reply: string;
    audio?: Uint8Array;
    memories?: Memory[];
    savedMemories?: any[];
}

class BackendService {
    /**
     * Recupera contexto de autenticação global e userId do localStorage
     */
    public getAuthContext(): { userId: string | null; tenantId: string | null; headers: HeadersInit } {
        const storedAuth = localStorage.getItem('sb-dashboard-client-auth');
        const headers: any = { 'Content-Type': 'application/json' };
        let userId: string | null = null;
        let tenantId: string | null = null;

        if (storedAuth) {
            try {
                const authData = JSON.parse(storedAuth);
                if (authData.access_token) {
                    headers['Authorization'] = `Bearer ${authData.access_token}`;
                }
                userId = authData.user?.id || null;
                tenantId = userId; // Por padrão usamos o mesmo ID para tenant
            } catch (e) {
                console.warn('[BackendService] Falha ao recuperar contexto de autenticação');
            }
        }

        return { userId, tenantId, headers };
    }

    private getUserId(): string {
        const uId = this.getAuthContext().userId;
        if (!uId || uId === 'null') {
            return '00000000-0000-0000-0000-000000000001';
        }
        return uId;
    }

    /**
     * Busca todas as conversas do usuário atual
     */
    async getConversations(): Promise<any[]> {
        const { headers } = this.getAuthContext();
        const userId = this.getUserId();
        try {
            const response = await fetch(`${BACKEND_URL}/api/conversations?userId=${userId}`, {
                method: 'GET',
                headers,
            });
            if (!response.ok) throw new Error('Falha ao buscar conversas');
            const data = await response.json();
            return data.conversations || [];
        } catch (error) {
            console.error('❌ Erro ao buscar conversas:', error);
            return [];
        }
    }

    /**
     * Busca mensagens de uma conversa específica
     */
    async getMessages(conversationId: string): Promise<any[]> {
        const { headers } = this.getAuthContext();
        const userId = this.getUserId();
        try {
            const response = await fetch(`${BACKEND_URL}/api/conversations/${conversationId}?userId=${userId}`, {
                method: 'GET',
                headers,
            });
            if (!response.ok) throw new Error('Falha ao buscar mensagens');
            const data = await response.json();
            // O backend retorna { ok: true, conversation: { id, messages: [] } }
            return data.conversation?.messages || [];
        } catch (error) {
            console.error(`❌ Erro ao buscar mensagens da conversa ${conversationId}:`, error);
            return [];
        }
    }

    /**
     * Persiste uma mensagem no banco de dados (via backend)
     */
    async saveMessage(conversationId: string, role: 'user' | 'assistant', content: string, origin: 'text' | 'voice' = 'text', attachments: any[] = []): Promise<boolean> {
        try {
            const response = await fetch(`${BACKEND_URL}/api/messages/save`, {
                method: 'POST',
                headers: this.getAuthContext().headers,
                body: JSON.stringify({
                    conversationId,
                    role,
                    content,
                    origin,
                    attachments,
                    userId: this.getUserId()
                }),
            });

            return response.ok;
        } catch (error) {
            console.error('❌ Erro ao persistir mensagem:', error);
            return false;
        }
    }

    /**
     * Envia mensagem de chat para o backend
     * Backend: POST /chat
     */
    async sendChatMessage(
        message: string,
        conversationId: string,
        personality: 'clara' | 'viva' | 'firme' = 'viva'
    ): Promise<ChatResponse | null> {
        try {
            console.log('📤 Enviando mensagem para backend (3000):', message.substring(0, 50));

            // Persistir mensagem do usuário antes de enviar (opcional, mas bom para UX)
            this.saveMessage(conversationId, 'user', message, 'text').catch(console.error);

            // Rota no servidor 3000 é /chat diretamente
            const response = await fetch(`${BACKEND_URL}/chat`, {
                method: 'POST',
                headers: this.getAuthContext().headers,
                body: JSON.stringify({
                    message,
                    conversationId,
                    personality,
                    userId: this.getUserId(),
                    tenantId: this.getUserId()
                }),
            });

            if (!response.ok) {
                throw new Error(`Chat request failed: ${response.status}`);
            }

            const data = await response.json();
            console.log('✅ Resposta recebida do backend');

            // Persistir resposta da LIA
            if (data.reply) {
                this.saveMessage(conversationId, 'assistant', data.reply, 'text').catch(console.error);
            }

            return {
                reply: data.reply || data.text || '',
                audio: data.audio ? new Uint8Array(data.audio) : undefined,
                memories: data.memories || [],
                savedMemories: data.savedMemories || [],
            };
        } catch (error) {
            console.error('❌ Erro ao enviar mensagem:', error);
            return null;
        }
    }

    async saveConversation(conversation: { id: string; title: string; mode: string; userId?: string }): Promise<boolean> {
        try {
            const response = await fetch(`${BACKEND_URL}/api/conversations/${conversation.id}`, {
                method: 'PATCH',
                headers: this.getAuthContext().headers,
                body: JSON.stringify(conversation),
            });
            return response.ok;
        } catch (error) {
            console.error('❌ Erro ao salvar conversa:', error);
            return false;
        }
    }

    /**
     * Deleta uma conversa no backend
     */
    async deleteConversation(id: string): Promise<boolean> {
        try {
            const response = await fetch(`${BACKEND_URL}/api/conversations/${id}`, {
                method: 'DELETE',
                headers: this.getAuthContext().headers,
            });
            return response.ok;
        } catch (error) {
            console.error('❌ Erro ao deletar conversa:', error);
            return false;
        }
    }

    /**
     * Busca memórias salvas
     */
    async getMemories(): Promise<Memory[]> {
        try {
            // Rota no servidor 3000 é /api/memory/load?userId=...
            const response = await fetch(`${BACKEND_URL}/api/memory/load?userId=${this.getUserId()}`, {
                method: 'GET',
                headers: this.getAuthContext().headers,
            });

            if (!response.ok) {
                console.warn('⚠️ Memórias não disponíveis');
                return [];
            }

            const data = await response.json();
            return data.memories || [];
        } catch (error) {
            console.error('❌ Erro ao buscar memórias:', error);
            return [];
        }
    }

    /**
     * Salva memória manualmente
     */
    async saveMemory(content: string, category: string = 'general'): Promise<boolean> {
        try {
            const response = await fetch(`${BACKEND_URL}/api/memory/save`, {
                method: 'POST',
                headers: this.getAuthContext().headers,
                body: JSON.stringify({
                    content,
                    category,
                    userId: this.getUserId(),
                    tenantId: this.getUserId()
                }),
            });

            if (response.ok) {
                console.log(`✅ Memória salva: ${content.substring(0, 50)}`);
                return true;
            }

            return false;
        } catch (error) {
            console.error('❌ Erro ao salvar memória:', error);
            return false;
        }
    }

    /**
     * Deleta memória
     */
    async deleteMemory(id: string): Promise<boolean> {
        try {
            // Rota no servidor 3000 é /api/memory/delete?id=... (verificar memória.ts se necessário)
            // Por enquanto mantendo padrão /api/...
            const response = await fetch(`${BACKEND_URL}/api/memory/delete/${id}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
            });

            if (response.ok) {
                console.log(`🗑️ Memória deletada: ${id}`);
                return true;
            }

            return false;
        } catch (error) {
            console.error('❌ Erro ao deletar memória:', error);
            return false;
        }
    }

    /**
     * Busca sessão do Gemini
     */
    async getSession(): Promise<any | null> {
        try {
            // Rota no servidor 3000 é /api/session
            const response = await fetch(`${BACKEND_URL}/api/session`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            });

            if (!response.ok) {
                console.warn('⚠️ Sessão não disponível');
                return null;
            }

            return await response.json();
        } catch (error) {
            console.warn('⚠️ Erro ao buscar sessão:', error);
            return null;
        }
    }

    /**
     * Busca na web
     */
    async searchWeb(query: string): Promise<any> {
        try {
            // Rota no servidor 3000 é /api/web-search
            const response = await fetch(`${BACKEND_URL}/api/web-search`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query }),
            });

            if (!response.ok) {
                throw new Error(`Web search failed: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('❌ Erro na busca web:', error);
            return null;
        }
    }

    /**
     * Captura e envia localização do usuário
     */
    async captureAndSendLocation(): Promise<boolean> {
        try {
            if (!navigator.geolocation) {
                console.warn('⚠️ Geolocalização não suportada');
                return false;
            }

            return new Promise((resolve) => {
                navigator.geolocation.getCurrentPosition(
                    async (position) => {
                        const { latitude, longitude } = position.coords;

                        let address = null;
                        try {
                            const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=pt`;
                            const response = await fetch(url, {
                                headers: { 'User-Agent': 'LIA-Assistant/1.0' },
                            });
                            if (response.ok) {
                                const data = await response.json();
                                address = data.display_name;
                            }
                        } catch (e) {
                            console.warn('⚠️ Não foi possível obter endereço:', e);
                        }

                        try {
                            const response = await fetch(`${BACKEND_URL}/api/location`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ latitude, longitude, address }),
                            });

                            if (response.ok) {
                                console.log(`📍 Localização enviada: ${address || `${latitude}, ${longitude}`}`);
                                resolve(true);
                            } else {
                                resolve(false);
                            }
                        } catch (error) {
                            console.error('❌ Erro ao enviar localização:', error);
                            resolve(false);
                        }
                    },
                    (error) => {
                        console.warn('⚠️ Erro de geolocalização:', error.message);
                        resolve(false);
                    },
                    {
                        enableHighAccuracy: true,
                        timeout: 10000,
                        maximumAge: 300000,
                    }
                );
            });
        } catch (error) {
            console.error('❌ Erro ao capturar localização:', error);
            return false;
        }
    }

    /**
     * Reseta a sessão
     */
    async resetSession(): Promise<boolean> {
        try {
            const response = await fetch(`${BACKEND_URL}/api/session/reset`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });

            return response.ok;
        } catch (error) {
            console.error('❌ Erro ao resetar sessão:', error);
            return false;
        }
    }

    async generateChart(message: string, chartType: 'bar' | 'line' | 'pie' = 'bar'): Promise<any> {
        const response = await fetch(`${BACKEND_URL}/api/generateChart`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, chartType })
        });
        return await response.json();
    }

    async generateTable(message: string): Promise<any> {
        const response = await fetch(`${BACKEND_URL}/api/generateTable`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message })
        });
        return await response.json();
    }

    async generateImage(prompt: string): Promise<any> {
        const response = await fetch(`${BACKEND_URL}/api/generateImage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt })
        });
        return await response.json();
    }

    async createDocument(prompt: string, format: 'pdf' | 'excel' | 'csv', data?: any): Promise<any> {
        const response = await fetch(`${BACKEND_URL}/api/documents/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt, format, data })
        });
        return await response.json();
    }

    async analyzeFile(file: File, userMessage?: string, conversationId?: string, analysisType?: string): Promise<any> {
        const formData = new FormData();
        formData.append('file', file);
        if (userMessage) formData.append('userMessage', userMessage);
        if (conversationId) formData.append('conversationId', conversationId);
        if (analysisType) formData.append('analysisType', analysisType);
        const response = await fetch(`${BACKEND_URL}/api/multimodal/analyze`, {
            method: 'POST',
            body: formData
        });
        return await response.json();
    }

    /**
     * Transcreve áudio usando Whisper API
     */
    async transcribeAudio(audioBlob: Blob): Promise<string> {
        try {
            const formData = new FormData();
            formData.append('file', audioBlob, 'audio.webm');

            // Servidor 3000 usa /api/stt ou /api/transcribe
            const response = await fetch(`${BACKEND_URL}/api/transcribe`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`Transcribe failed: ${response.status}`);
            }

            const data = await response.json();
            return data.text || '';
        } catch (error) {
            console.error('❌ Erro ao transcrever áudio:', error);
            return '';
        }
    }

    /**
     * Envia mensagem multimodal (com arquivo)
     */
    async sendMultimodalMessage(
        message: string,
        file: File,
        conversationId: string
    ): Promise<ChatResponse | null> {
        try {
            const formData = new FormData();
            formData.append('message', message);
            formData.append('file', file);
            formData.append('conversationId', conversationId);

            // Verificar no backend se é /chat/multimodal ou /api/chat/multimodal
            const response = await fetch(`${BACKEND_URL}/api/multimodal/analyze`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`Multimodal request failed: ${response.status}`);
            }

            const data = await response.json();
            return {
                reply: data.reply || data.text || 'Arquivo analisado.',
                memories: data.memories || [],
            };
        } catch (error) {
            console.error('❌ Erro ao enviar mensagem multimodal:', error);
            return null;
        }
    }

    /**
     * Envia mensagem com arquivos (wrapper para LIAContext)
     */
    async sendMessageWithFiles(
        text: string,
        files: File[]
    ): Promise<{ text: string; analysis?: any } | null> {
        try {
            if (files.length === 0) {
                // Sem arquivos, faz chat normal
                const result = await this.sendChatMessage(text, `conv_${Date.now()}`, 'viva');
                return result ? { text: result.reply } : null;
            }

            // Com arquivo, usa analyze
            const file = files[0];
            const result = await this.analyzeFile(file, text);
            return {
                text: result?.analysis?.text || result?.text || 'Análise concluída!',
                analysis: result?.analysis
            };
        } catch (error) {
            console.error('❌ Erro ao enviar com arquivos:', error);
            return null;
        }
    }

    /**
     * Obtém token efêmero para Gemini Live
     */
    async getLiveToken(): Promise<string | null> {
        try {
            const response = await fetch(`${BACKEND_URL}/api/live-token`, {
                method: 'GET',
                headers: this.getAuthContext().headers,
            });

            if (!response.ok) {
                throw new Error(`Live token request failed: ${response.status}`);
            }

            const data = await response.json();
            return data.token || null;
        } catch (error) {
            console.error('❌ Erro ao obter live token:', error);
            return null;
        }
    }
}

// Exportar instância única (singleton)
export const backendService = new BackendService();
