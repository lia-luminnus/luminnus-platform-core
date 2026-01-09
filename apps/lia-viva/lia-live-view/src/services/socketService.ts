// ======================================================================
// 🔌 Socket.IO Service - Instância única e centralizada
// ======================================================================

import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;
  private conversationId: string | null = null;

  /**
   * Obtém ou cria a instância única do socket
   */
  getSocket(): Socket {
    if (!this.socket) {
      // v3.0: Forçar URL do backend via ENV (OBRIGATÓRIO)
      let socketUrl = import.meta.env.VITE_SOCKET_URL;
      const fallback = `${window.location.protocol}//${window.location.hostname}:3000`;

      if (!socketUrl) {
        // v3.1: Silenciar erro irritante e usar fallback inteligente baseada no host atual
        console.log(`ℹ️ [Socket] VITE_SOCKET_URL não definida, usando fallback: ${fallback}`);
        socketUrl = fallback;
      }

      const isFirstBoot = !this.socket;
      if (isFirstBoot) {
        console.log(`🔌 Socket.IO URL: ${socketUrl}`);
      }

      // v2.7: Passar token de auth no handshake para MENTE ÚNICA
      let authToken = '';
      try {
        const storedAuth = localStorage.getItem('sb-xkemqhamutmremgfwyqz-auth-token');
        if (storedAuth) {
          const authData = JSON.parse(storedAuth);
          authToken = authData.access_token || authData.token || '';
        }
      } catch (e) { /* ignore */ }

      this.socket = io(socketUrl, {
        path: '/socket.io',
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
        auth: {
          token: authToken
        }
      });

      // Eventos de conexão
      this.socket.on('connect', () => {
        console.log('✅ Socket.IO conectado:', this.socket?.id);
        // Registrar conversação automaticamente
        if (this.conversationId) {
          this.registerConversation(this.conversationId);
        } else {
          // Criar nova conversação
          const newConvId = `conv_${Date.now()}`;
          this.registerConversation(newConvId);
        }
      });

      this.socket.on('disconnect', (reason) => {
        console.log('❌ Socket.IO desconectado:', reason);
      });

      this.socket.on('connect_error', (error) => {
        console.error('❌ Erro de conexão Socket.IO:', error.message);
      });

      this.socket.on('reconnect', (attemptNumber) => {
        console.log('🔄 Socket.IO reconectado após', attemptNumber, 'tentativas');
      });
    }

    return this.socket;
  }

  /**
   * Entra em uma sala específica (escopo:conversa)
   */
  joinRoom(scope: string, convId: string) {
    const socket = this.getSocket();
    const room = `${scope}:${convId}`;
    socket.emit('join-room', room);
    console.log(`🔌 Entrou na sala: ${room}`);
  }

  /**
   * Sai de uma sala
   */
  leaveRoom(scope: string, convId: string) {
    const socket = this.getSocket();
    const room = `${scope}:${convId}`;
    socket.emit('leave-room', room);
    console.log(`🔌 Saiu da sala: ${room}`);
  }

  /**
   * Registra uma conversação no backend
   */
  registerConversation(convId: string, userId?: string, tenantId?: string) {
    this.conversationId = convId;
    const socket = this.getSocket();

    // v2.6: Tentar recuperar do localStorage se não veio via parâmetro
    let effectiveUserId = userId;
    let effectiveTenantId = tenantId;

    if (!effectiveUserId) {
      try {
        const storedAuth = localStorage.getItem('supabase.auth.token');
        if (storedAuth) {
          const authData = JSON.parse(storedAuth);
          effectiveUserId = authData.user?.id;
          effectiveTenantId = authData.user?.id; // Em dev tenant = user
        }
      } catch (e) { /* ignore */ }
    }

    socket.emit('register-conversation', {
      conversationId: convId,
      userId: effectiveUserId,
      tenantId: effectiveTenantId
    });

    console.log(`📋 [Socket] Registrando conversa: ${convId} | User: ${effectiveUserId || 'guest'}`);
  }

  /**
   * Envia mensagem de texto
   */
  sendTextMessage(text: string, convId?: string, userId?: string, tenantId?: string) {
    const socket = this.getSocket();
    socket.emit('text-message', {
      text,
      conversationId: convId || this.conversationId,
      userId,
      tenantId
    });
  }

  /**
   * Envia chunk de áudio
   */
  sendAudioChunk(chunk: Uint8Array, convId?: string, userId?: string, tenantId?: string) {
    const socket = this.getSocket();
    socket.emit('audio-chunk', {
      conversationId: convId || this.conversationId,
      chunk: Array.from(chunk),
      userId,
      tenantId
    });
  }

  /**
   * Sinaliza fim de áudio
   */
  sendAudioEnd(convId?: string) {
    const socket = this.getSocket();
    socket.emit('audio-end', {
      conversationId: convId || this.conversationId,
    });
  }

  /**
   * Define personalidade de voz
   */
  setVoicePersonality(personality: 'clara' | 'viva' | 'firme') {
    const socket = this.getSocket();
    socket.emit('set-voice-personality', personality);
  }

  /**
   * Verifica se está conectado
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Obtém ID da conversação atual
   */
  getConversationId(): string | null {
    return this.conversationId;
  }

  /**
   * Desconecta o socket (cleanup)
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

// Exportar instância única (singleton)
export const socketService = new SocketService();
