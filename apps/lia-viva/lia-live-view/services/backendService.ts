/**
 * LIA Backend Service — Versão alinhada ao server.js atual
 * Comunicação com o backend na porta 5000
 */

import { ChatMessage, Memory } from '../types';

// UNIFIED ARCHITECTURE: Frontend and Backend on same port (3000)
// Use relative URLs for all API calls
const BACKEND_URL = '';


export class BackendService {

  /**
   * Busca sessão do Gemini (api/session)
   * — Essa sessão retorna apenas: apiKey, project, location
   */
  async getSession(): Promise<any | null> {
    try {
      const response = await fetch(`${BACKEND_URL}/api/session`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        console.warn('[BackendService] Session not available:', response.status);
        return null;
      }

      return await response.json();
    } catch (error) {
      console.warn('[BackendService] Get session error:', error);
      return null;
    }
  }

  /**
   * Busca histórico de mensagens de uma conversa
   * Backend espera ?conversationId=xxx
   */
  async getHistory(conversationId: string): Promise<ChatMessage[]> {
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/history?conversationId=${conversationId}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        }
      );

      if (!response.ok) {
        console.warn('[BackendService] History not available:', response.status);
        return [];
      }

      return await response.json();
    } catch (error) {
      console.warn('[BackendService] Get history error:', error);
      return [];
    }
  }

  /**
   * Salva mensagem no histórico
   * Backend espera: { conversationId, role, content, origin }
   */
  async saveHistory(
    conversationId: string,
    role: string,
    content: string,
    origin: string = 'text'
  ): Promise<boolean> {
    try {
      const response = await fetch(`${BACKEND_URL}/api/history/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, role, content, origin })
      });

      return response.ok;
    } catch (error) {
      console.error('[BackendService] Save history error:', error);
      return false;
    }
  }

  /**
   * Envia mensagem para o /chat (GPT + TTS)
   * Backend espera: { message, conversationId, personality }
   */
  async sendChatMessage(
    message: string,
    conversationId: string,
    personality?: string
  ): Promise<{ reply: string; audio?: string; memories?: Memory[] } | null> {
    try {
      const response = await fetch(`${BACKEND_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          conversationId,
          personality: personality || 'clara'
        })
      });

      if (!response.ok) {
        throw new Error(`Chat failed: ${response.status}`);
      }

      const data = await response.json();

      // Backend pode retornar memórias criadas automaticamente via function calling
      return {
        reply: data.reply,
        audio: data.audio,
        memories: data.memories
      };
    } catch (error) {
      console.error('[BackendService] Chat error:', error);
      return null;
    }
  }

  /**
   * Salva memória
   */
  async saveMemory(content: string, category?: string): Promise<boolean> {
    try {
      const response = await fetch(`${BACKEND_URL}/api/memory/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, category })
      });

      return response.ok;
    } catch (error) {
      console.error('[BackendService] Save memory error:', error);
      return false;
    }
  }

  /**
   * Busca na web
   */
  async searchWeb(query: string): Promise<any> {
    try {
      const response = await fetch(`${BACKEND_URL}/api/web-search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });

      if (!response.ok) {
        throw new Error(`Web search failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[BackendService] Web search error:', error);
      return null;
    }
  }

  /**
   * Lista as memórias
   * OBS: Seu backend AINDA NÃO TEM ESSA ROTA
   */
  async getMemories(): Promise<Memory[]> {
    try {
      const response = await fetch(`${BACKEND_URL}/api/memories`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      return data.memories || [];
    } catch (error) {
      console.error('[BackendService] Get memories error:', error);
      return [];
    }
  }

  /**
   * Deleta memória
   * Backend tem rota DELETE /api/memories/:id
   */
  async deleteMemory(id: string): Promise<boolean> {
    try {
      const response = await fetch(`${BACKEND_URL}/api/memories/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return data.deleted || false;
    } catch (error) {
      console.error('[BackendService] Delete memory error:', error);
      return false;
    }
  }

  /**
   * Capture and send user's geolocation to backend
   */
  async captureAndSendLocation(): Promise<boolean> {
    try {
      if (!navigator.geolocation) {
        console.warn('[BackendService] Geolocation not supported');
        return false;
      }

      return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            // v9.6: Avoid browser-side reverse geocode (Nominatim blocks CORS in production).
            // Send raw coordinates and let backend resolve address when needed.
            const address = null;

            // Send to backend
            try {
              const response = await fetch(`${BACKEND_URL}/api/location`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ latitude, longitude, address })
              });

              if (response.ok) {
                console.log(`📍 Localização enviada: ${address || `${latitude}, ${longitude}`}`);
                resolve(true);
              } else {
                resolve(false);
              }
            } catch (error) {
              console.error('[BackendService] Error sending location:', error);
              resolve(false);
            }
          },
          (error) => {
            console.warn('[BackendService] Geolocation error:', error.message);
            resolve(false);
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000 // 5 minutes
          }
        );
      });
    } catch (error) {
      console.error('[BackendService] Capture location error:', error);
      return false;
    }
  }

  /**
   * Sincroniza memórias do backend
   */
  async syncMemories(): Promise<Memory[]> {
    return await this.getMemories();
  }

  /**
   * Reseta a sessão
   */
  async resetSession(): Promise<boolean> {
    try {
      const response = await fetch(`${BACKEND_URL}/api/session/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      return response.ok;
    } catch (error) {
      console.error('[BackendService] Reset session error:', error);
      return false;
    }
  }
}
