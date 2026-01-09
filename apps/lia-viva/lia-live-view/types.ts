
export interface VisualEvent {
  id: string;
  timestamp: number;
  type: 'image' | 'text' | 'chart' | 'video' | 'map' | 'search';
  role?: 'user' | 'agent';
  content: any;
}

export interface VisualImagePayload {
  title: string;
  url: string;
  altText?: string;
  isHighRes?: boolean; // For Imagen 3
}

export interface VisualVideoPayload {
  title: string;
  videoUri: string; // URL to the generated MP4
  thumbnail?: string;
}

export interface VisualTextPayload {
  text: string;
}

export interface VisualMapPayload {
  title: string;
  location: { lat: number; lng: number };
  query: string;
}

export interface VisualSearchPayload {
  query: string;
  results: Array<{ title: string; uri: string; snippet: string }>;
}

export interface VisualChartPayload {
  chartType: 'bar' | 'line' | 'area';
  title: string;
  data: Array<{ name: string; value: number }>;
}

export interface LIAState {
  isConnected: boolean;
  isSpeaking: boolean;
  isAgentSpeaking: boolean;
  volume: number;
}

// ========== NOVAS INTERFACES PARA PAINEL UNIFICADO ==========

export interface Memory {
  id: string;
  content: string;
  timestamp: number;
  category?: string;
  importance?: 'low' | 'medium' | 'high';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  emotion?: string;
  audioUrl?: string;
}

export interface SystemLog {
  id: string;
  timestamp: number;
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
  details?: any;
}

export interface BackendSession {
  conversationId: string;
  systemInstruction: string;
  messages: ChatMessage[];
}

export type PersonalityType = 'viva' | 'clara' | 'firme';

export interface VoiceState {
  isVoiceActive: boolean;
  isMicEnabled: boolean;
  isTTSEnabled: boolean;
  isWebRTCConnected: boolean;
  volume: number;
  ephemeralToken?: string;
}

export interface ToolAction {
  id: string;
  name: string;
  icon: string;
  action: () => void;
  description: string;
}
