// ===========================================================
// 🔌 Socket.IO Service - Dashboard-client (Produção-Ready)
// ===========================================================
// Usa VITE_SOCKET_URL para conectar ao backend
// Implementa readiness guard e autenticação no handshake
// Pronto para Render (sem dependência de proxy Vite)
// ===========================================================

import { io, Socket } from 'socket.io-client';
import { getApiUrl, getSocketUrl } from '../../../config/api';

// URLs do backend via ENV
// v2.0.0: Removido fallback silencioso para localhost em produção
const isProd = import.meta.env.PROD;
const apiUrl = getApiUrl();
const socketUrl = getSocketUrl();

class SocketService {
    private socket: Socket | null = null;
    private conversationId: string | null = null;
    private isConnecting: boolean = false;
    private authParams: {
        token: string;
        tenantId: string;
        userId: string;
        plan?: string;
        connections?: { gmail?: boolean; workspace?: boolean; calendar?: boolean };
    } | null = null;

    /**
     * Readiness Check: Aguarda backend estar pronto
     */
    private async waitForBackend(): Promise<boolean> {
        console.log('🔍 [Socket] Verificando disponibilidade do backend no health check...');
        try {
            const res = await fetch(`${apiUrl}/api/health`, {
                method: 'GET',
                signal: AbortSignal.timeout(2000)
            });
            return res.ok;
        } catch (e) {
            console.warn('⚠️ [Socket] Backend não respondeu ao health check');
            return false;
        }
    }

    /**
     * Define parâmetros de autenticação
     * v1.3.0: Adicionado suporte a connections
     */
    setAuthParams(params: { token: string; tenantId: string; userId: string; plan?: string; connections?: { gmail?: boolean; workspace?: boolean; calendar?: boolean } }) {
        this.authParams = params;
        console.log('🔐 [Socket] Parâmetros de autenticação configurados. Plan:', params.plan || 'não definido');
    }

    /**
     * Conecta ao Socket.IO com autenticação real
     * Segue o plano de governança - retorna Promise<Socket>
     */
    async connectSocket(params?: { token: string, tenantId: string, userId: string, conversationId?: string }): Promise<Socket> {
        if (params) {
            this.setAuthParams({
                token: params.token,
                tenantId: params.tenantId,
                userId: params.userId
            });
            if (params.conversationId) this.conversationId = params.conversationId;
        }

        // v1.1.1: Detecção de troca de usuário (Fator Crítico de Identidade)
        const hasIdChanged = params?.userId && this.authParams?.userId && params.userId !== this.authParams.userId;

        // Se já está conectado e o ID não mudou, retornar socket existente
        if (this.socket?.connected && !hasIdChanged) {
            return this.socket;
        }

        // Se o ID mudou, forçamos o encerramento da conexão anterior antes de criar a nova
        if (hasIdChanged && this.socket) {
            console.log('🔄 [Socket] Identidade mudou. Reiniciando conexão para o novo usuário...');
            this.socket.disconnect();
            this.socket = null;
        }

        if (this.isConnecting && !hasIdChanged) {
            console.log('⏳ [Socket] Conexão já em andamento...');
            // Aguarda um pouco e tenta retornar o que foi criado
            await new Promise(r => setTimeout(r, 500));
            if (this.socket) return this.socket;
        }

        this.isConnecting = true;

        try {
            // Check opcional em produção, obrigatório em dev para evitar loop de reconexão
            await this.waitForBackend();

            console.log('🔌 [Socket] Iniciando conexão em:', socketUrl);

            const authData = this.authParams || {
                token: '',
                tenantId: 'anonymous',
                userId: 'anonymous'
            };

            this.socket = io(socketUrl, {
                path: '/socket.io',
                transports: ['polling', 'websocket'],
                auth: {
                    token: authData.token,
                    tenantId: authData.tenantId,
                    userId: authData.userId,
                    conversationId: this.conversationId,
                    plan: authData.plan
                },
                reconnection: true,
                reconnectionAttempts: 20, // Aumentado para lidar com instabilidades em dev
                reconnectionDelay: 1500,  // Delay suave
                reconnectionDelayMax: 10000,
                timeout: 30000,
            });

            this.socket!.on('system:update', (data: any) => {
                console.log('🚀 [Socket] Recebido sinal de atualização do sistema:', data);
                // Emitir evento customizado ou despachar para window
                window.dispatchEvent(new CustomEvent('lia-system-update', { detail: data }));
            });

            return new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    console.error('❌ [Socket] Timeout de conexão');
                    resolve(this.socket!); // Resolvemos com o socket mesmo assim para não travar a UI
                }, 10000);

                this.socket!.once('connect', () => {
                    clearTimeout(timeout);
                    console.log('✅ [Socket] Conectado:', this.socket?.id);
                    if (this.conversationId) {
                        this.registerConversation(this.conversationId);
                    }
                    resolve(this.socket!);
                });

                this.socket!.once('connect_error', (err) => {
                    console.error('❌ [Socket] Erro de conexão inicial:', err.message);
                    // Não damos reject para evitar crash, deixamos o socket tentar reconectar
                    resolve(this.socket!);
                });
            });

        } finally {
            this.isConnecting = false;
        }
    }

    /**
     * Retorna o socket atual ou null (não bloqueante)
     */
    getSocket(): Socket | null {
        return this.socket;
    }

    /**
     * Retorna o ID da conversa atual registrada
     */
    getConversationId(): string | null {
        return this.conversationId;
    }

    /**
     * Define a personalidade de voz (envia para o backend via socket)
     */
    setVoicePersonality(personality: 'clara' | 'viva' | 'firme') {
        if (!this.socket?.connected) return;
        this.socket.emit('set-voice-personality', { personality });
        console.log('🎤 [Socket] Personalidade de voz:', personality);
    }

    /**
     * Registra conversa no backend
     */
    registerConversation(convId: string) {
        this.conversationId = convId;
        if (!this.socket?.connected) return;

        this.socket.emit('register-conversation', {
            conversationId: convId,
            userId: this.authParams?.userId,
            tenantId: this.authParams?.tenantId
        });
        console.log('📋 [Socket] Conversa registrada:', convId);
    }

    /**
     * Envia mensagem de texto
     * v1.3.0: Incluir userPlan e connections para plan awareness
     * v6.0: Incluir clientMessageId para idempotência
     */
    sendTextMessage(text: string, convId?: string, clientMessageId?: string) {
        if (!this.socket?.connected) {
            console.warn('⚠️ [Socket] Tentativa de envio sem conexão');
            return;
        }

        this.socket.emit('text-message', {
            text,
            conversationId: convId || this.conversationId,
            userId: this.authParams?.userId,
            tenantId: this.authParams?.tenantId,
            userPlan: this.authParams?.plan,
            connections: this.authParams?.connections,
            clientMessageId // v6.0: Pass stable ID for idempotent saves
        });
    }


    /**
     * Envia chunk de áudio para Live Mode
     */
    sendAudioChunk(chunk: Uint8Array, convId?: string) {
        if (!this.socket?.connected) return;

        this.socket.emit('audio-chunk', {
            conversationId: convId || this.conversationId,
            chunk: Array.from(chunk),
            userId: this.authParams?.userId,
            tenantId: this.authParams?.tenantId
        });
    }

    /**
     * Finaliza envio de áudio
     */
    sendAudioEnd(convId?: string) {
        if (!this.socket?.connected) return;

        this.socket.emit('audio-end', {
            conversationId: convId || this.conversationId,
        });
    }

    /**
     * Cleanup
     */
    disconnectSocket() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            console.log('🔌 [Socket] Desconectado manualmente');
        }
    }
}

export const socketService = new SocketService();
