// ======================================================================
// 🔄 WRAPPER - Re-exporta do @luminnus/lia-runtime (SSOT)
// ======================================================================
// Este arquivo existe apenas para manter compatibilidade com imports existentes.
// A implementação real está em packages/lia-runtime.
// NÃO EDITE ESTE ARQUIVO - Edite packages/lia-runtime/src/live/geminiLiveService.ts
// ======================================================================

import {
  GeminiLiveService,
  createGeminiLiveService,
  ConnectionState,
  sanitizeForTTS,
  isMemoryWorthy,
  UpdateService,
} from '@luminnus/lia-runtime';

import type {
  GeminiLiveEvent,
  GeminiLiveSession,
  LiaRuntimeConfig,
  ToolResult,
  UpdateAvailableEvent,
} from '@luminnus/lia-runtime';

// Re-export types
export type { GeminiLiveEvent, GeminiLiveSession, LiaRuntimeConfig, ToolResult, UpdateAvailableEvent };
export { GeminiLiveService, createGeminiLiveService, ConnectionState, sanitizeForTTS, isMemoryWorthy, UpdateService };

// ======================================================================
// SINGLETON COMPATÍVEL COM INTERFACE EXISTENTE
// ======================================================================

const config: LiaRuntimeConfig = {
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  mode: 'admin',
  voiceName: 'Aoede',  // Voz feminina natural (mais expressiva que Kore)
  languageCode: 'pt-BR',
};

const _service = createGeminiLiveService(config);

// Wrapper com métodos compatíveis com a interface antiga
export const geminiLiveService = {
  // Métodos do serviço
  startSession: () => _service.startSession(),
  stopSession: () => _service.stopSession(),
  getSession: () => _service.getSession(),
  getConnectionState: () => _service.getConnectionState(),

  // ATENÇÃO: O código antigo usa setSessionConversationId, mas o novo usa setConversationId
  setSessionConversationId: (id: string) => _service.setConversationId(id),
  setConversationId: (id: string) => _service.setConversationId(id),

  // Modos de UI (armazenado localmente, não afeta o serviço de voz)
  _uiMode: 'chat' as 'chat' | 'multimodal' | 'live',
  setUIMode: function (mode: 'chat' | 'multimodal' | 'live') {
    this._uiMode = mode;
    console.log('[GeminiLiveService] UI Mode set to:', mode);
  },
  getUIMode: function () {
    return this._uiMode;
  },

  setMemoriesCache: (memories: Array<{ key: string; value: string }>) => _service.setMemoriesCache(memories),
  updateConfig: (newConfig: Partial<LiaRuntimeConfig>) => _service.updateConfig(newConfig),

  // Event listeners
  addEventListener: (callback: (event: GeminiLiveEvent) => void) => _service.addEventListener(callback),
  removeEventListener: (callback: (event: GeminiLiveEvent) => void) => _service.removeEventListener(callback),

  // Acesso direto ao serviço se necessário
  _raw: _service,
};
