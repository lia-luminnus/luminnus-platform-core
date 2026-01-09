/**
 * LIA UNIFIED PANEL - Complete Integration
 * Combines all LIA functionality in a single interface
 * Port 3000 - Official LIA Panel
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';

// Existing Components
import AvatarDisplay from './components/AvatarDisplay';
import MicrophoneButton from './components/MicrophoneButton';

// New Unified Components
import HeaderLIA from './components/HeaderLIA';
import ChatMessages from './components/ChatMessages';
import VoiceControls from './components/VoiceControls';
import MemoryPanel from './components/MemoryPanel';
import ToolsPanel from './components/ToolsPanel';
import LogsPanel from './components/LogsPanel';
import PersonalitySelector from './components/PersonalitySelector';
import ModeSwitch from './components/ModeSwitch';

// Services
import { GeminiLiveService } from './services/geminiLiveService';
import { MultimodalService } from './services/multimodalService';
import { BackendService } from './services/backendService';

// Types
import { ChatMessage, Memory, SystemLog, PersonalityType, VisualEvent } from './types';
import { v4 as uuidv4 } from 'uuid';

type AvatarState = 'idle' | 'listening' | 'thinking' | 'responding' | 'emotion';

const AppUnified: React.FC = () => {
  // ========== CORE STATE ==========
  const [isConnected, setIsConnected] = useState(false);
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  const [inputVolume, setInputVolume] = useState(0);
  const [conversationId, setConversationId] = useState<string>('');

  // Avatar State
  const [avatarState, setAvatarState] = useState<AvatarState>('idle');
  const [avatarEmotion, setAvatarEmotion] = useState<string | undefined>(undefined);
  const emotionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Chat & Messages
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [visualEvents, setVisualEvents] = useState<VisualEvent[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Voice State
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [isTTSEnabled, setIsTTSEnabled] = useState(true);

  // Memories & Logs
  const [memories, setMemories] = useState<Memory[]>([]);
  const [logs, setLogs] = useState<SystemLog[]>([]);

  // Personality
  const [personality, setPersonality] = useState<PersonalityType>('clara');

  // UI State
  const [showMemories, setShowMemories] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [mode, setMode] = useState<'chat' | 'live'>('live'); // Lia Live é o modo principal

  // Service Refs
  const serviceRef = useRef<GeminiLiveService | null>(null);
  const multimodalRef = useRef<MultimodalService>(new MultimodalService());
  const backendRef = useRef<BackendService>(new BackendService());

  // ========== LOGGING ==========
  const addLog = useCallback((type: SystemLog['type'], message: string, details?: any) => {
    const log: SystemLog = {
      id: uuidv4(),
      timestamp: Date.now(),
      type,
      message,
      details
    };
    setLogs(prev => [...prev, log]);
  }, []);

  // ========== AVATAR CONTROL ==========
  const setListening = useCallback(() => {
    setAvatarState('listening');
    setAvatarEmotion(undefined);
  }, []);

  const setThinking = useCallback(() => {
    setAvatarState('thinking');
    setAvatarEmotion(undefined);
  }, []);

  const setResponding = useCallback(() => {
    setAvatarState('responding');
    setAvatarEmotion(undefined);
  }, []);

  const setIdle = useCallback(() => {
    setAvatarState('idle');
    setAvatarEmotion(undefined);
  }, []);

  const setEmotion = useCallback((emotion: string, duration: number = 2500) => {
    if (emotionTimeoutRef.current) {
      clearTimeout(emotionTimeoutRef.current);
    }

    setAvatarState('emotion');
    setAvatarEmotion(emotion);

    emotionTimeoutRef.current = setTimeout(() => {
      setIdle();
      emotionTimeoutRef.current = null;
    }, duration);
  }, [setIdle]);

  useEffect(() => {
    return () => {
      if (emotionTimeoutRef.current) {
        clearTimeout(emotionTimeoutRef.current);
      }
    };
  }, []);

  // ========== VISUAL EVENTS ==========
  // MOVED BEFORE handleUserTranscription to fix initialization error
  const addEvent = useCallback((type: any, role: 'user' | 'agent', content: any) => {
    const newEvent: VisualEvent = {
      id: uuidv4(),
      timestamp: Date.now(),
      type,
      role,
      content
    };
    setVisualEvents(prev => [...prev, newEvent]);
  }, []);

  // ========== ERROR HANDLER ==========
  // MOVED BEFORE handleUserTranscription to fix initialization error
  const handleError = useCallback((error: string) => {
    console.error("System Error:", error);
    setIsLoading(false);
    addLog('error', error);
  }, [addLog]);

  // ========== GEMINI SERVICE CALLBACKS ==========
  const handleStartListening = useCallback(() => {
    setListening();
    addLog('info', 'Microphone activated');
  }, [setListening, addLog]);

  const handleStopListening = useCallback(() => {
    setIdle();
    addLog('info', 'Microphone deactivated');
  }, [setIdle, addLog]);

  const handleUserSpeech = useCallback((transcript: string) => {
    console.log('User said:', transcript);
  }, []);

  const handleAssistantThinking = useCallback(() => {
    setThinking();
  }, [setThinking]);

  const handleAssistantSpeakingStart = useCallback(() => {
    setResponding();
  }, [setResponding]);

  const handleAssistantSpeakingEnd = useCallback(() => {
    setIdle();
  }, [setIdle]);

  // CRÍTICO: Handler para transcrição do usuário (Gemini STT → GPT → Gemini TTS)
  const handleUserTranscription = useCallback(async (transcript: string) => {
    console.log('[AppUnified] 🎤 USER TRANSCRIPTION RECEIVED:', transcript);
    addLog('info', `User (voice): ${transcript}`);

    // Adiciona mensagem do usuário
    const userMessage: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content: transcript,
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, userMessage]);

    // CRÍTICO: Muda estado para "thinking" (GPT está processando)
    setAvatarState('thinking');
    setIsLoading(true);

    try {
      console.log('[AppUnified] 🧠 Calling GPT with:', { transcript, conversationId, personality });

      // Envia para GPT (cérebro)
      const response = await backendRef.current.sendChatMessage(transcript, conversationId, personality);

      console.log('[AppUnified] 🤖 GPT Response:', response);

      if (response) {
        const assistantMessage: ChatMessage = {
          id: uuidv4(),
          role: 'assistant',
          content: response.reply,
          timestamp: Date.now(),
          audioUrl: response.audio ? `data:audio/mp3;base64,${response.audio}` : undefined
        };

        setMessages(prev => [...prev, assistantMessage]);

        // CRÍTICO: Memórias vêm do GPT
        if (response.memories) {
          setMemories(prev => [...prev, ...response.memories as Memory[]]);
          console.log('[AppUnified] 💾 Memories updated:', response.memories);
        }

        // CRÍTICO: Se tem áudio (Gemini TTS), muda estado para "responding"
        if (response.audio) {
          console.log('[AppUnified] 🔊 Audio received, setting avatar to responding');
          setAvatarState('responding');
          // Gemini vai falar, quando terminar, volta para idle (via onAssistantSpeakingEnd)
        } else {
          console.log('[AppUnified] ⚠️ No audio in response');
          setAvatarState('idle');
        }

        addLog('success', 'GPT responded, Gemini rendering');
      } else {
        console.error('[AppUnified] ❌ No response from GPT!');
      }
    } catch (error: any) {
      console.error('[AppUnified] ❌ Voice chat error:', error);
      handleError(`Voice chat error: ${error.message}`);
      setAvatarState('idle');
    } finally {
      setIsLoading(false);
    }
  }, [personality, conversationId, addLog, handleError]);

  // CRÍTICO: Handler para mudança de estado da conexão WebRTC
  const handleConnectionStateChange = useCallback((state: 'connecting' | 'connected' | 'disconnected' | 'error') => {
    console.log('[AppUnified] WebRTC state changed:', state);
    addLog('info', `WebRTC: ${state}`);

    // Atualiza estado de conexão
    if (state === 'connected') {
      setIsConnected(true);
      addLog('success', 'WebRTC connection established');
    } else if (state === 'disconnected') {
      setIsConnected(false);
    } else if (state === 'error') {
      setIsConnected(false);
      addLog('error', 'WebRTC connection error');
    }
  }, [addLog]);

  // ========== HANDLE VISUAL EVENTS ==========
  const handleVisualEvent = useCallback((action: string, payload: any) => {
    setIsLoading(false);
    try {
      switch (action) {
        case 'show_image':
          addEvent('image', 'agent', { title: payload.title || 'Image', url: payload.url });
          break;
        case 'render_chart':
          let chartData = payload.chartData;
          if (typeof chartData === 'string') {
            try { chartData = JSON.parse(chartData); } catch (e) { }
          }
          addEvent('chart', 'agent', {
            title: payload.title || 'Data Visualization',
            chartType: payload.chartType || 'bar',
            data: chartData
          });
          break;
        case 'show_text':
          const emotionRegex = /<emotion\s+type=["']([^"']+)["']\s*\/>/gi;
          const match = emotionRegex.exec(payload.text);

          if (match && match[1]) {
            setEmotion(match[1].toLowerCase());
            const cleanText = payload.text.replace(emotionRegex, '').trim();
            if (cleanText) {
              addEvent('text', 'agent', { text: cleanText });
            }
          } else {
            addEvent('text', 'agent', { text: payload.text });
          }
          break;
        default:
          addEvent('text', 'agent', { text: `[${action}] ${JSON.stringify(payload)}` });
      }
    } catch (error: any) {
      addEvent('text', 'agent', { text: `Visual Render Error: ${error.message}` });
    }
  }, [addEvent, setEmotion]);

  // ========== HANDLE TOOL CALLS ==========
  const handleToolCall = useCallback(async (name: string, args: any) => {
    setIsLoading(true);

    try {
      if (name === 'generate_media') {
        const { mediaType, prompt } = args;
        addEvent('text', 'agent', { text: `Initiating ${mediaType === 'video' ? 'Veo' : 'Imagen'} generation: "${prompt}"...` });

        if (mediaType === 'video') {
          const videoUrl = await multimodalRef.current.generateVideo(prompt);
          if (videoUrl) {
            addEvent('video', 'agent', { title: prompt, videoUri: videoUrl });
          } else {
            throw new Error("Video generation returned no URL.");
          }
        } else if (mediaType === 'image') {
          const imageUrl = await multimodalRef.current.generateImage(prompt);
          if (imageUrl) {
            addEvent('image', 'agent', { title: prompt, url: imageUrl, isHighRes: true });
          } else {
            throw new Error("Image generation returned no data.");
          }
        }
      }
      else if (name === 'search_grounding') {
        const { query } = args;
        addEvent('text', 'agent', { text: `Searching web for: "${query}"...` });
        const results = await multimodalRef.current.searchWeb(query);
        if (results.length > 0) {
          addEvent('search', 'agent', { query, results });
        } else {
          addEvent('text', 'agent', { text: `No search results found for: ${query}` });
        }
      }
      else if (name === 'map_grounding') {
        addEvent('text', 'agent', { text: `📍 Location data for "${args.locationQuery}" would be displayed here (Map Component Integration).` });
      }

    } catch (e: any) {
      handleError(`Action Failed: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [addEvent, handleError]);

  // ========== VOICE CONNECTION ==========
  const lockRef = useRef(false); // CRITICAL: Prevent multiple toggle calls

  const toggleVoiceConnection = useCallback(async () => {
    // CRITICAL: Prevent multiple simultaneous toggle operations
    if (lockRef.current) {
      console.warn('[AppUnified] ⚠️ Toggle already in progress. Skipping.');
      return;
    }

    lockRef.current = true;

    try {
      if (isVoiceActive) {
        console.log('[AppUnified] 🔌 Stopping voice...');
        serviceRef.current?.disconnect();
        setIsVoiceActive(false);
        addLog('info', 'Voice session ended');
      } else {
        console.log('[AppUnified] 🔌 Starting voice...');

        // CRITICAL: Clean up any existing service first
        if (serviceRef.current) {
          console.warn('[AppUnified] ⚠️ Cleaning up previous service...');
          serviceRef.current.disconnect();
          serviceRef.current = null;
          await new Promise(resolve => setTimeout(resolve, 200));
        }

        // Create new service
        serviceRef.current = new GeminiLiveService({
        onStatusChange: setIsConnected,
        onVisualEvent: handleVisualEvent,
        onToolCall: handleToolCall,
        onAudioVolume: setInputVolume,
        onAgentTalking: setIsAgentSpeaking,
        onError: handleError,
        onStartListening: handleStartListening,
        onStopListening: handleStopListening,
        onUserSpeech: handleUserSpeech,
        onAssistantThinking: handleAssistantThinking,
        onAssistantSpeakingStart: handleAssistantSpeakingStart,
        onAssistantSpeakingEnd: handleAssistantSpeakingEnd,
        // CRÍTICO: Novos callbacks
        onUserTranscription: handleUserTranscription,
        onConnectionStateChange: handleConnectionStateChange
      });

        try {
          await serviceRef.current.connect();
          setIsVoiceActive(true);
          addLog('success', 'Voice session started - WebRTC connected');
        } catch (e: any) {
          handleError(`Voice Connection Failed: ${e.message}`);
          serviceRef.current = null;
        }
      }
    } catch (err: any) {
      console.error('[AppUnified] ❌ Toggle error:', err);
      handleError(`Voice toggle error: ${err.message}`);
    } finally {
      // CRITICAL: Always release the toggle lock
      lockRef.current = false;
    }
  }, [isVoiceActive, handleVisualEvent, handleToolCall, handleError, handleStartListening, handleStopListening, handleUserSpeech, handleAssistantThinking, handleAssistantSpeakingStart, handleAssistantSpeakingEnd, handleUserTranscription, handleConnectionStateChange, addLog]);

  // ========== TEXT MESSAGE ==========
  const handleSendMessage = useCallback(async () => {
    if (!inputText.trim()) return;

    const userMessage: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content: inputText,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    addEvent('text', 'user', { text: inputText });
    setInputText('');
    setIsLoading(true);
    addLog('info', `User: ${inputText.substring(0, 50)}...`);

    try {
      const response = await backendRef.current.sendChatMessage(inputText, conversationId, personality);

      if (response) {
        const assistantMessage: ChatMessage = {
          id: uuidv4(),
          role: 'assistant',
          content: response.reply,
          timestamp: Date.now(),
          audioUrl: response.audio ? `data:audio/mp3;base64,${response.audio}` : undefined
        };

        setMessages(prev => [...prev, assistantMessage]);
        addEvent('text', 'agent', { text: response.reply });

        if (response.memories) {
          setMemories(prev => [...prev, ...response.memories as Memory[]]);
        }

        addLog('success', 'Response received from backend');
      } else {
        throw new Error('No response from backend');
      }
    } catch (error: any) {
      handleError(`Chat error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [inputText, personality, addEvent, addLog, handleError]);

  // ========== HEADER ACTIONS ==========
  const handleResetSession = useCallback(async () => {
    if (confirm('Reset entire session? This will clear all history and memories.')) {
      await backendRef.current.resetSession();
      setMessages([]);
      setVisualEvents([]);
      setMemories([]);
      setLogs([]);
      setConversationId('');
      addLog('warning', 'Session reset');
      localStorage.removeItem('lia_visual_history');
    }
  }, [addLog]);

  const handleClearHistory = useCallback(() => {
    setVisualEvents([]);
    setMessages([]);
    localStorage.removeItem('lia_visual_history');
    addLog('info', 'Visual history cleared');
  }, [addLog]);

  const handleSyncMemories = useCallback(async () => {
    addLog('info', 'Syncing memories...');
    const syncedMemories = await backendRef.current.syncMemories();
    setMemories(syncedMemories);
    addLog('success', `${syncedMemories.length} memories synced`);
  }, [addLog]);

  // ========== MEMORY ACTIONS ==========
  const handleAddMemory = useCallback(async (content: string, category?: string) => {
    const success = await backendRef.current.saveMemory(content, category);
    if (success) {
      const newMemory: Memory = {
        id: uuidv4(),
        content,
        category,
        timestamp: Date.now()
      };
      setMemories(prev => [...prev, newMemory]);
      addLog('success', 'Memory saved');
    } else {
      addLog('error', 'Failed to save memory');
    }
  }, [addLog]);

  const handleDeleteMemory = useCallback(async (id: string) => {
    const success = await backendRef.current.deleteMemory(id);
    if (success) {
      setMemories(prev => prev.filter(m => m.id !== id));
      addLog('success', 'Memory deleted');
    } else {
      addLog('error', 'Failed to delete memory');
    }
  }, [addLog]);

  // ========== TOOL ACTIONS ==========
  const handleWebSearch = useCallback(async (query: string) => {
    addLog('info', `Web search: ${query}`);
    setIsLoading(true);
    try {
      const results = await backendRef.current.searchWeb(query);
      if (results) {
        addEvent('search', 'agent', { query, results: results.results || [] });
        addLog('success', `Found ${results.results?.length || 0} results`);
      }
    } catch (error: any) {
      addLog('error', `Search failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [addEvent, addLog]);

  const handleCreateImage = useCallback(async (prompt: string) => {
    addLog('info', `Generating image: ${prompt}`);
    setIsLoading(true);
    try {
      const imageUrl = await multimodalRef.current.generateImage(prompt);
      if (imageUrl) {
        addEvent('image', 'agent', { title: prompt, url: imageUrl, isHighRes: true });
        addLog('success', 'Image generated');
      }
    } catch (error: any) {
      addLog('error', `Image generation failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [addEvent, addLog]);

  const handleSummarize = useCallback(() => {
    addLog('info', 'Summarize feature - coming soon');
  }, [addLog]);

  // ========== LOAD INITIAL DATA ==========
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        addLog('info', 'Loading session data...');
        const session = await backendRef.current.getSession();
        if (session) {
          setConversationId(session.conversationId);
          setMessages(session.messages || []);
          addLog('success', 'Session loaded');
        } else {
          addLog('warning', 'Session not available - starting fresh');
        }

        const history = await backendRef.current.getHistory();
        if (history && history.length > 0) {
          setMessages(history);
          addLog('success', `${history.length} messages loaded`);
        }

        // CRITICAL: Load memories on initialization
        const loadedMemories = await backendRef.current.getMemories();
        if (loadedMemories && loadedMemories.length > 0) {
          setMemories(loadedMemories);
          addLog('success', `${loadedMemories.length} memories loaded`);
        }
      } catch (error: any) {
        addLog('warning', `Backend not ready: ${error.message || 'Connection failed'}`);
        // Não quebra o app se o backend não estiver disponível
      }
    };

    loadInitialData();
  }, [addLog]);

  // ========== RENDER ==========
  return (
    <div className="flex flex-col h-screen w-screen bg-black text-white overflow-hidden font-sans">

      {/* Header */}
      <HeaderLIA
        isConnected={isConnected}
        conversationId={conversationId}
        onResetSession={handleResetSession}
        onClearHistory={handleClearHistory}
        onSyncMemories={handleSyncMemories}
      />

      {/* Mode Switch */}
      <div className="px-4 py-2">
        <ModeSwitch currentMode={mode} onModeChange={setMode} />
      </div>

      {/* Main Content - Conditional Layout */}
      {mode === 'chat' ? (
        // MODO CHAT - Layout atual (3 colunas)
        <div className="flex-1 flex overflow-hidden">

          {/* Left Sidebar - Controls */}
          <aside className="w-80 bg-[#0a0a0a] border-r border-gray-800 p-4 overflow-y-auto space-y-4 scrollbar-thin scrollbar-thumb-neon-blue/20">

            <VoiceControls
              isVoiceActive={isVoiceActive}
              isMicEnabled={isMicEnabled}
              isTTSEnabled={isTTSEnabled}
              isWebRTCConnected={isConnected}
              volume={inputVolume}
              onToggleVoice={toggleVoiceConnection}
              onToggleMic={() => setIsMicEnabled(!isMicEnabled)}
              onToggleTTS={() => setIsTTSEnabled(!isTTSEnabled)}
            />

            <PersonalitySelector
              current={personality}
              onChange={setPersonality}
            />

            <button
              onClick={() => setShowTools(!showTools)}
              className="w-full p-2 bg-neon-panel/50 border border-neon-blue/20 rounded-lg text-xs font-mono text-neon-blue hover:bg-neon-panel/70 transition-all"
            >
              {showTools ? '▼' : '▶'} QUICK TOOLS
            </button>
            {showTools && (
              <ToolsPanel
                onWebSearch={handleWebSearch}
                onCreateImage={handleCreateImage}
                onSummarize={handleSummarize}
              />
            )}

            <button
              onClick={() => setShowMemories(!showMemories)}
              className="w-full p-2 bg-neon-panel/50 border border-neon-blue/20 rounded-lg text-xs font-mono text-neon-blue hover:bg-neon-panel/70 transition-all"
            >
              {showMemories ? '▼' : '▶'} MEMORIES ({memories.length})
            </button>
            {showMemories && (
              <MemoryPanel
                memories={memories}
                onAddMemory={handleAddMemory}
                onDeleteMemory={handleDeleteMemory}
              />
            )}

            <button
              onClick={() => setShowLogs(!showLogs)}
              className="w-full p-2 bg-neon-panel/50 border border-neon-blue/20 rounded-lg text-xs font-mono text-neon-blue hover:bg-neon-panel/70 transition-all"
            >
              {showLogs ? '▼' : '▶'} SYSTEM LOGS ({logs.length})
            </button>
            {showLogs && <LogsPanel logs={logs} />}

          </aside>

          {/* Center - Chat */}
          <main className="flex-1 flex flex-col bg-black">
            <ChatMessages messages={messages} isLoading={isLoading} />

            {/* Input Area */}
            <div className="border-t border-gray-800 bg-[#0a0a0a] p-4">
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="Message LIA..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-neon-green transition-colors font-mono"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!inputText.trim() || isLoading}
                  className="px-6 py-3 bg-neon-green/20 border border-neon-green text-neon-green hover:bg-neon-green/30 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-mono font-bold transition-all"
                >
                  SEND
                </button>
                <MicrophoneButton
                  isActive={isVoiceActive}
                  onClick={toggleVoiceConnection}
                  volumeLevel={inputVolume}
                />
              </div>
            </div>
          </main>

          {/* Right Sidebar - Avatar */}
          <aside className="w-96 bg-[#080808] border-l border-gray-800 flex flex-col">
            <div className="flex-1 flex items-center justify-center p-6">
              <AvatarDisplay
                state={avatarState}
                emotion={avatarEmotion}
                isAgentSpeaking={isAgentSpeaking}
                size="medium"
              />
            </div>
          </aside>

        </div>
      ) : (
        // MODO LIA LIVE - Avatar grande central
        <div className="flex-1 flex overflow-hidden">
          {/* Avatar central grande */}
          <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-b from-black to-gray-900">
            <AvatarDisplay
              state={avatarState}
              emotion={avatarEmotion}
              isAgentSpeaking={isAgentSpeaking}
              size="large"
            />

            {/* Controles de voz na parte inferior */}
            <div className="w-full border-t border-gray-800 bg-[#0a0a0a] p-4 mt-8">
              <div className="flex justify-center gap-4">
                <button
                  onClick={toggleVoiceConnection}
                  className={`px-8 py-4 rounded-full font-mono text-lg transition-all ${isVoiceActive
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-neon-green hover:bg-green-600 text-black'
                    }`}
                >
                  {isVoiceActive ? '🔴 Stop Voice' : '🎤 Start Voice'}
                </button>
              </div>
            </div>
          </div>

          {/* Chat lateral (minimalista) */}
          <aside className="w-96 bg-[#080808] border-l border-gray-800 flex flex-col">
            <div className="p-4 border-b border-gray-800">
              <h3 className="text-sm font-mono text-neon-blue uppercase tracking-wider">Chat Log</h3>
            </div>
            <ChatMessages messages={messages} isLoading={isLoading} compact />
          </aside>
        </div>
      )}

    </div>
  );
};

export default AppUnified;
