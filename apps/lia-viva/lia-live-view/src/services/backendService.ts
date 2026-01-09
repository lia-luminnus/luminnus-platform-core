/**
 * ✅ LIA Backend Service - Serviço único de comunicação com backend
 * Todas as rotas do backend (porta 3000) são acessadas daqui
 */

import { Message } from '../context/LIAContext';

// Use relative path to let the Vite proxy handle redirection to port 3000 in dev
const BACKEND_URL = '';

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
  savedMemories?: any[]; // Memórias salvas automaticamente nesta requisição
}

class BackendService {
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Tentar obter token do localStorage (salvo pelo handshake ou login direto)
    const storedAuth = localStorage.getItem('supabase.auth.token');
    if (storedAuth) {
      try {
        const { access_token } = JSON.parse(storedAuth);
        if (access_token) {
          headers['Authorization'] = `Bearer ${access_token}`;
        }
      } catch (e) {
        console.warn('[BackendService] Erro ao parsear token:', e);
      }
    }

    return headers;
  }

  private getUserId(): string | null {
    const storedAuth = localStorage.getItem('supabase.auth.token');
    if (storedAuth) {
      try {
        const { user } = JSON.parse(storedAuth);
        return user?.id || null;
      } catch (e) {
        return null;
      }
    }
    return null;
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
      console.log('📤 Enviando mensagem para backend:', message.substring(0, 50));

      const response = await fetch(`${BACKEND_URL}/chat`, {
        method: 'POST',
        headers: this.getHeaders(),
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

      // Se backend retornar memórias criadas via function calling
      if (data.memories && data.memories.length > 0) {
        console.log(`💾 ${data.memories.length} memórias retornadas pelo backend`);
      }

      // Se backend retornar memórias salvas automaticamente
      if (data.savedMemories && data.savedMemories.length > 0) {
        console.log(`✅ ${data.savedMemories.length} memória(s) salva(s):`, data.savedMemories.map((m: any) => `${m.key}=${m.value}`).join(', '));
      }

      return {
        reply: data.reply || '',
        audio: data.audio ? new Uint8Array(data.audio) : undefined,
        memories: data.memories || [],
        savedMemories: data.savedMemories || [],
      };
    } catch (error) {
      console.error('❌ Erro ao enviar mensagem:', error);
      return null;
    }
  }

  /**
   * Busca memórias salvas
   * Backend: GET /api/memories
   */
  async getMemories(): Promise<Memory[]> {
    try {
      const response = await fetch(`${BACKEND_URL}/api/memory/load?userId=${this.getUserId() || ''}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        console.warn('⚠️ Memórias não disponíveis');
        return [];
      }

      const data = await response.json();
      console.log(`💾 ${data.memories?.length || 0} memórias carregadas`);

      return data.memories || [];
    } catch (error) {
      console.error('❌ Erro ao buscar memórias:', error);
      return [];
    }
  }

  /**
   * Salva memória manualmente
   * Backend: POST /api/memory/save
   */
  async saveMemory(content: string, category: string = 'general'): Promise<boolean> {
    try {
      const response = await fetch(`${BACKEND_URL}/api/memory/save`, {
        method: 'POST',
        headers: this.getHeaders(),
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
   * Backend: DELETE /api/memories/:id
   */
  async deleteMemory(id: string): Promise<boolean> {
    try {
      const response = await fetch(`${BACKEND_URL}/api/memories/${id}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
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
   * Backend: GET /api/session
   */
  async getSession(): Promise<any | null> {
    try {
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
   * Backend: POST /api/web-search
   */
  async searchWeb(query: string): Promise<any> {
    try {
      const response = await fetch(`${BACKEND_URL}/api/web-search`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          query,
          userId: this.getUserId(),
          tenantId: this.getUserId()
        }),
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
   * Backend: POST /api/location
   */
  async captureAndSendLocation(conversationId?: string, userId?: string | null): Promise<boolean> {
    try {
      if (!navigator.geolocation) {
        console.warn('⚠️ Geolocalização não suportada');
        return false;
      }

      return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;

            // Tentar obter endereço via Nominatim
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

            // Enviar para backend
            try {
              const response = await fetch(`${BACKEND_URL}/api/location`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  latitude,
                  longitude,
                  address,
                  conversationId,
                  userId: userId || this.getUserId()
                }),
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
            enableHighAccuracy: false, // Desabilitado para maior velocidade em desktops
            timeout: 20000, // Aumentado para 20 segundos
            maximumAge: 300000, // 5 minutos
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
   * Backend: POST /api/session/reset
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
      headers: this.getHeaders(),
      body: JSON.stringify({
        message,
        chartType,
        userId: this.getUserId(),
        tenantId: this.getUserId()
      })
    });
    return await response.json();
  }

  async generateTable(message: string): Promise<any> {
    const response = await fetch(`${BACKEND_URL}/api/generateTable`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        message,
        userId: this.getUserId(),
        tenantId: this.getUserId()
      })
    });
    return await response.json();
  }

  async generateImage(prompt: string): Promise<any> {
    const response = await fetch(`${BACKEND_URL}/api/generateImage`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        prompt,
        userId: this.getUserId(),
        tenantId: this.getUserId()
      })
    });
    return await response.json();
  }

  async createDocument(prompt: string, format: 'pdf' | 'excel' | 'csv', data?: any): Promise<any> {
    const response = await fetch(`${BACKEND_URL}/api/documents/create`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        prompt,
        format,
        data,
        userId: this.getUserId(),
        tenantId: this.getUserId()
      })
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
   * v2.4: Salva uma mensagem no banco de dados sem processamento AI
   * Usado para persistir transcrições do modo Live
   */
  async saveMessage(conversationId: string, role: 'user' | 'assistant' | 'lia', content: string, origin: string = 'voice'): Promise<boolean> {
    try {
      const response = await fetch(`${BACKEND_URL}/api/messages/save`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          conversationId,
          role: role === 'lia' ? 'assistant' : role,
          content,
          origin,
          userId: this.getUserId()
        }),
      });
      return response.ok;
    } catch (error) {
      console.error('❌ Erro ao salvar mensagem:', error);
      return false;
    }
  }

  // ============== CONVERSATION PERSISTENCE (v2.0) ==============

  /**
   * Creates a conversation in the database
   */
  async createConversationInDB(
    id: string,
    mode: 'chat' | 'multimodal' | 'live',
    title: string
  ): Promise<boolean> {
    try {
      const userId = this.getUserId();
      if (!userId) {
        console.warn('⚠️ [BackendService] No userId, skipping DB save for conversation');
        return false;
      }

      const response = await fetch(`${BACKEND_URL}/api/conversations`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          id,
          mode,
          title,
          user_id: userId,
          metadata: { messageCount: 0 }
        }),
      });

      if (response.ok) {
        console.log(`✅ [BackendService] Conversa ${id} salva no Supabase`);
        return true;
      } else {
        const error = await response.text();
        console.error('❌ Erro ao criar conversa no DB:', error);
        return false;
      }
    } catch (error) {
      console.error('❌ Erro ao criar conversa no DB:', error);
      return false;
    }
  }

  /**
   * Loads all conversations for the current user from the database
   */
  async loadConversationsFromDB(): Promise<{
    id: string;
    mode: string;
    title: string;
    created_at: string;
    updated_at: string;
    metadata: any;
  }[]> {
    try {
      const userId = this.getUserId();
      if (!userId) {
        console.warn('⚠️ [BackendService] No userId, skipping DB load for conversations');
        return [];
      }

      const response = await fetch(`${BACKEND_URL}/api/conversations?user_id=${userId}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`📋 [BackendService] ${data.length} conversas carregadas do Supabase`);
        return data;
      } else {
        console.error('❌ Erro ao carregar conversas do DB');
        return [];
      }
    } catch (error) {
      console.error('❌ Erro ao carregar conversas do DB:', error);
      return [];
    }
  }

  /**
   * Updates a conversation's title or metadata in the database
   */
  async updateConversationInDB(
    id: string,
    updates: { title?: string; metadata?: any }
  ): Promise<boolean> {
    try {
      const response = await fetch(`${BACKEND_URL}/api/conversations/${id}`, {
        method: 'PATCH',
        headers: this.getHeaders(),
        body: JSON.stringify(updates),
      });
      return response.ok;
    } catch (error) {
      console.error('❌ Erro ao atualizar conversa no DB:', error);
      return false;
    }
  }

  /**
   * Deletes a conversation from the database
   */
  async deleteConversationFromDB(id: string): Promise<boolean> {
    try {
      const response = await fetch(`${BACKEND_URL}/api/conversations/${id}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });
      return response.ok;
    } catch (error) {
      console.error('❌ Erro ao deletar conversa do DB:', error);
      return false;
    }
  }

}

// Exportar instância única (singleton)
export const backendService = new BackendService();


