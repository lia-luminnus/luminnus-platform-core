"use client"

/**
 * ✅ LIVE FULL-BODY MODE - Interface Corporativa Premium
 *
 * CARACTERÍSTICAS:
 * - LIA como apresentadora/consultora/avatar de marca
 * - 5 estados reativos (standby, listening, presenting_lia, presenting_content, processing)
 * - Tracking 3D do avatar
 * - Painéis dinâmicos que expandem/recolhem
 * - HUD flutuante com auto-hide
 * - Design cinematográfico premium
 */

import { useState, useEffect, useRef, useCallback } from "react"
import { useLIA } from "@/context/LIAContext"

// Componentes FullBody
import {
  DynamicContentPanel,
  SmartHUD,
  InteractionBar,
  type LIAState,
  type ContentItem
} from "./FullBody"

// Novo Avatar Engine (Frame-Based) - LEGADO
import { AvatarEngine, AvatarRenderer } from "@/avatar-engine"

// ============================================
// 3D AVATAR - ISOLATED LAYER (NEVER UNMOUNTS)
// ============================================
import { AvatarLayer } from "./avatar/AvatarLayer"

// Loading animado
import { LuminnusLoading } from "./LuminnusLoading"
import { MarkdownRenderer } from "./MarkdownRenderer"

// Feature flag para alternar entre avatar PNG e 3D
// NOTA: Vite requer reiniciar o dev server após mudar .env
const envValue = import.meta.env.VITE_USE_3D_AVATAR;
const USE_3D_AVATAR = envValue === 'true';
console.log('🎭 [Avatar Config] USE_3D_AVATAR:', USE_3D_AVATAR, '| raw env:', envValue, '| type:', typeof envValue);

// ================================================================
// COMPONENTE PRINCIPAL
// ================================================================

export function LiveMode() {
  // LIA Context
  const {
    messages, // LEGADO - mantido para compatibilidade
    isConnected,
    isSpeaking,
    isLiveActive,
    isListening,
    sendTextMessage,
    dynamicContent,
    isProcessingUpload, // Para overlay de geração
    // Sistema de Escopo
    getScopeKey,
    messagesByScope, // Observar diretamente para re-render
    setActiveScope,
    currentConversationId,
    activeConversationIdByMode,
    createConversation,
    conversations,
    // Estados por escopo
    typingByScope,
  } = useLIA()

  // Criar ou obter conversa Live ao montar
  const [liveConversationId, setLiveConversationId] = useState<string | null>(null);
  const initRef = useRef<{ done: boolean; convId: string | null }>({ done: false, convId: null });
  const conversationsRef = useRef(conversations);
  conversationsRef.current = conversations;

  // SINCRONIZAR com activeConversationIdByMode quando sidebar troca/cria conversa
  useEffect(() => {
    const globalActiveId = activeConversationIdByMode?.live;
    if (globalActiveId && globalActiveId !== liveConversationId) {
      setLiveConversationId(globalActiveId);
      setActiveScope(getScopeKey('live', globalActiveId));
      console.log('🔄 [LiveMode] Sincronizado com conversa global:', globalActiveId);
    }
  }, [activeConversationIdByMode?.live, liveConversationId, getScopeKey, setActiveScope]);

  // EFFECT A: Inicializar conversa Live UMA VEZ
  useEffect(() => {
    if (initRef.current.done) return;
    if (activeConversationIdByMode?.live) {
      initRef.current = { done: true, convId: activeConversationIdByMode.live };
      setLiveConversationId(activeConversationIdByMode.live);
      setActiveScope(getScopeKey('live', activeConversationIdByMode.live));
      return;
    }

    const tryInit = () => {
      const convs = conversationsRef.current;
      if (Object.keys(convs).length === 0) return false;

      const existingLiveConv = Object.values(convs).find(c => c.mode === 'live');
      if (existingLiveConv) {
        initRef.current = { done: true, convId: existingLiveConv.id };
        setLiveConversationId(existingLiveConv.id);
        setActiveScope(getScopeKey('live', existingLiveConv.id));
        return true;
      } else {
        const newConv = createConversation('live');
        initRef.current = { done: true, convId: newConv.id };
        setLiveConversationId(newConv.id);
        setActiveScope(getScopeKey('live', newConv.id));
        return true;
      }
    };

    if (tryInit()) return;
    const timer = setTimeout(() => { tryInit(); }, 100);
    return () => clearTimeout(timer);
  }, [activeConversationIdByMode?.live, createConversation, getScopeKey, setActiveScope]);

  // Obter mensagens do escopo Live (observando messagesByScope para re-render)
  const scopeKey = liveConversationId ? getScopeKey('live', liveConversationId) : null;
  const scopeMessages = scopeKey ? (messagesByScope[scopeKey] || []) : [];

  // Typing por escopo (NÃO global)
  const isTyping = scopeKey ? (typingByScope[scopeKey] || false) : false;

  // SEMPRE setar escopo ativo quando este componente renderiza
  useEffect(() => {
    if (scopeKey) {
      setActiveScope(scopeKey);
    }
  }, [scopeKey, setActiveScope]);

  // ================================================================
  // ESTADOS LOCAIS
  // ================================================================

  // Estado reativo da interface
  const [liaState, setLiaState] = useState<LIAState>('standby')

  // Refs para Scroll
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Timer da sessão
  const [timeElapsed, setTimeElapsed] = useState("00:00:00")
  const sessionStartTime = useRef(Date.now())

  // Conteúdo dinâmico
  const [contentItems, setContentItems] = useState<ContentItem[]>([])

  // Mute
  const [isMuted, setIsMuted] = useState(false)

  // Fallback para avatar legado quando GLB falha
  const [avatarFallbackToLegacy, setAvatarFallbackToLegacy] = useState(false)

  // ================================================================
  // EFEITOS
  // ================================================================

  // Debug: Log quando isLiveActive muda
  useEffect(() => {
    console.log('🎭 [Avatar] isLiveActive:', isLiveActive, '| USE_3D_AVATAR:', USE_3D_AVATAR, '| avatarFallbackToLegacy:', avatarFallbackToLegacy);
  }, [isLiveActive, avatarFallbackToLegacy]);

  // Atualizar timer
  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - sessionStartTime.current) / 1000)
      const h = Math.floor(elapsed / 3600)
      const m = Math.floor((elapsed % 3600) / 60)
      const s = elapsed % 60
      setTimeElapsed(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`)
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // Atualizar estado da LIA baseado no contexto
  useEffect(() => {
    if (isSpeaking) {
      setLiaState('presenting_lia')
      AvatarEngine.onSpeakingStart()
    } else if (isTyping) {
      setLiaState('processing')
      AvatarEngine.onThinking()
    } else if (isListening) {
      setLiaState('listening')
      AvatarEngine.onListeningStart()
    } else if (contentItems.length > 0) {
      setLiaState('presenting_content')
      AvatarEngine.onIdle()
    } else {
      setLiaState('standby')
      AvatarEngine.onIdle()
    }
  }, [isSpeaking, isTyping, isListening, contentItems.length])

  // Auto-scroll para novas mensagens
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [scopeMessages]);

  // Processar conteúdo dinâmico do LIAContext
  useEffect(() => {
    if (dynamicContent && dynamicContent.type !== 'none') {
      const newItem: ContentItem = {
        id: `content_${Date.now()}`,
        type: dynamicContent.type as ContentItem['type'],
        title: dynamicContent.title || 'Conteúdo',
        data: dynamicContent.data,
        priority: 'high'
      }
      setContentItems(prev => [newItem, ...prev.slice(0, 9)]) // Máximo 10 items
    }
  }, [dynamicContent])

  // ================================================================
  // HANDLERS
  // ================================================================

  const handleSendMessage = useCallback((text: string) => {
    if (text.trim()) {
      sendTextMessage(text)
    }
  }, [sendTextMessage])

  const handleRemoveContent = useCallback((id: string) => {
    setContentItems(prev => prev.filter(item => item.id !== id))
  }, [])

  const handleFocusLIA = useCallback(() => {
    setLiaState('presenting_lia')
    // Auto-reset após 3s se não houver atividade
    setTimeout(() => {
      if (!isSpeaking && !isTyping) {
        setLiaState('standby')
      }
    }, 3000)
  }, [isSpeaking, isTyping])

  const handleToggleMute = useCallback(() => {
    setIsMuted(prev => !prev)
  }, [])

  // Determinar posição do avatar
  const getAvatarPosition = (): 'center' | 'left' | 'right' => {
    if (liaState === 'presenting_content') return 'right'
    return 'center'
  }

  // Determinar tamanho do avatar
  const getAvatarSize = (): 'normal' | 'large' | 'small' => {
    if (liaState === 'presenting_lia') return 'large'
    if (liaState === 'presenting_content') return 'small'
    return 'normal'
  }

  // ================================================================
  // RENDER
  // ================================================================

  return (
    <div className="relative h-full w-full overflow-hidden bg-gradient-to-b from-[#0a0a1a] via-[#0d1025] to-[#0a0a1a]">

      {/* ============================================ */}
      {/* BACKGROUND - Grid Perspectiva 3D */}
      {/* ============================================ */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Floor Grid */}
        <div
          className="absolute left-1/2 bottom-0 w-[200%] h-[60%] -translate-x-1/2"
          style={{
            background: `linear-gradient(to top, rgba(0,243,255,0.15) 0%, rgba(188,19,254,0.05) 50%, transparent 100%)`,
            transform: "perspective(500px) rotateX(60deg) translateX(-50%)",
            transformOrigin: "bottom center",
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `
                linear-gradient(to right, rgba(0,243,255,0.3) 1px, transparent 1px),
                linear-gradient(to top, rgba(188,19,254,0.2) 1px, transparent 1px)
              `,
              backgroundSize: "60px 40px",
            }}
          />
        </div>

        {/* Ambient Glow */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-40 bg-gradient-to-t from-[rgba(0,243,255,0.25)] via-[rgba(188,19,254,0.1)] to-transparent blur-2xl" />

        {/* Vignette overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)]" />
      </div>

      {/* ============================================ */}
      {/* HEADER - Título Premium */}
      {/* ============================================ */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30">
        <h1 className="text-xl md:text-2xl font-bold tracking-wide flex items-center gap-3">
          <span className="text-[#00f3ff] drop-shadow-[0_0_20px_rgba(0,243,255,0.8)]">LIA VIVA</span>
          <span className="text-[rgba(224,247,255,0.3)]">|</span>
          <span className="text-[#bc13fe] drop-shadow-[0_0_20px_rgba(188,19,254,0.8)]">LIVE FULL-BODY MODE</span>
          <div className="flex items-center gap-2 ml-4">
            <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.6)]" : "bg-red-500"}`} />
            <span className="text-sm font-mono text-[rgba(224,247,255,0.5)]">{timeElapsed}</span>
          </div>
        </h1>
      </div>

      {/* ============================================ */}
      {/* DYNAMIC CONTENT PANEL - Esquerda */}
      {/* ============================================ */}
      <DynamicContentPanel
        items={contentItems}
        state={liaState}
        onRemoveItem={handleRemoveContent}
      />

      {/* ============================================ */}
      {/* CHAT LOG - AMPLIADO para melhor leitura */}
      {/* ============================================ */}
      <div className={`absolute right-4 md:right-8 top-20 z-20 transition-all duration-500 ${liaState === 'presenting_content' ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}>
        <div className="w-80 md:w-96 max-h-[450px] rounded-2xl overflow-hidden border border-[rgba(188,19,254,0.2)] bg-[rgba(10,20,40,0.7)] backdrop-blur-xl shadow-xl">
          {/* Chat Header */}
          <div className="px-4 py-3 border-b border-[rgba(188,19,254,0.15)] bg-[rgba(0,0,0,0.3)] flex justify-between items-center">
            <h3 className="text-sm font-bold text-[#bc13fe]">💬 CHAT LOG</h3>
            {scopeMessages.length > 0 && (
              <span className="text-[10px] text-[rgba(224,247,255,0.4)]">
                {scopeMessages.length} msgs
              </span>
            )}
          </div>

          {/* Messages - Usando escopo isolado */}
          <div className="max-h-[350px] md:max-h-[400px] overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-[rgba(188,19,254,0.3)] scrollbar-track-transparent">
            {scopeMessages.length === 0 ? (
              <p className="text-xs text-[rgba(224,247,255,0.4)] text-center py-6">
                Nenhuma mensagem ainda
              </p>
            ) : (
              scopeMessages.slice(-12).map((msg) => (
                <div
                  key={msg.id}
                  className={`text-sm leading-relaxed p-2 rounded-lg ${msg.type === "lia"
                    ? "bg-[rgba(0,243,255,0.05)] text-[rgba(0,243,255,0.95)]"
                    : "bg-[rgba(188,19,254,0.05)] text-[rgba(188,19,254,0.95)]"
                    }`}
                >
                  <span className="font-bold text-xs opacity-70 block mb-1">
                    {msg.type === "lia" ? "🤖 LIA" : "👤 VOCÊ"}
                  </span>
                  <div className="text-[rgba(224,247,255,0.9)] max-h-[150px] overflow-y-auto">
                    {msg.type === 'lia' ? (
                      <MarkdownRenderer content={msg.content} />
                    ) : (
                      <span className="whitespace-pre-wrap">{msg.content}</span>
                    )}
                  </div>

                  {/* Renderizar thumbnails de imagens */}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {msg.attachments.map((att, i) => (
                        att.type === 'image' && att.url ? (
                          <img
                            key={i}
                            src={att.url}
                            alt={att.name || 'Imagem'}
                            className="w-20 h-20 object-cover rounded-lg border-2 border-[rgba(0,243,255,0.3)] hover:border-[#00f3ff] cursor-pointer transition-all hover:scale-105"
                            onClick={() => setContentItems(prev => [{
                              id: `img_${Date.now()}`,
                              type: 'image',
                              title: att.name || 'Imagem',
                              data: { url: att.url },
                              priority: 'high'
                            }, ...prev.slice(0, 9)])}
                            title="Clique para ver maior"
                          />
                        ) : (
                          <div key={i} className="flex items-center gap-1 text-xs bg-[rgba(0,243,255,0.1)] px-2 py-1 rounded">
                            📎 {att.name}
                          </div>
                        )
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* LIA AVATAR - 3D durante chamada, PNG durante texto */}
      {/* ============================================ */}

      {/* 3D Avatar: Carrega APENAS quando chamada de voz está ativa */}
      {USE_3D_AVATAR && isLiveActive && !avatarFallbackToLegacy && (
        <AvatarLayer
          visible={true}
          mode="live"
          isSpeaking={isSpeaking}
        />
      )}

      {/* PNG Avatar: Mostra quando NÃO está em chamada de voz OU 3D falhou */}
      {(!isLiveActive || !USE_3D_AVATAR || avatarFallbackToLegacy) && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <AvatarRenderer
            size="full"
            showStatus={false}
            className="max-w-2xl"
          />
        </div>
      )}

      {/* ============================================ */}
      {/* SMART HUD - Status Flutuante */}
      {/* ============================================ */}
      <SmartHUD
        state={liaState}
        isConnected={isConnected}
        timeElapsed={timeElapsed}
        onFocusLIA={handleFocusLIA}
        onToggleMute={handleToggleMute}
        isMuted={isMuted}
      />

      {/* ============================================ */}
      {/* PROCESSING OVERLAY - Logo Luminnus Animado */}
      {/* ============================================ */}
      {/* OVERLAY: Só aparece para geração real, NÃO para isTyping simples */}
      {isProcessingUpload && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,0.6)] backdrop-blur-sm transition-all duration-500">
          <div className="relative">
            {/* Glow de fundo */}
            <div className="absolute inset-0 -m-10 bg-gradient-radial from-[rgba(0,243,255,0.2)] to-transparent blur-2xl animate-pulse" />

            {/* Loading Component */}
            <LuminnusLoading className="relative z-10" />
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* INTERACTION BAR - Chat/Voz */}
      {/* ============================================ */}
      <InteractionBar
        state={liaState}
        isConnected={isConnected}
        onSendMessage={handleSendMessage}
      />
    </div>
  )
}

export default LiveMode
