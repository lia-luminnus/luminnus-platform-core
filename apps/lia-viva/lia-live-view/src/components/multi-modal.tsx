"use client"

/**
 * ✅ MULTI-MODAL MODE - Layout igual à imagem de referência
 *
 * ESTRUTURA (conforme imagem):
 * - HEADER: Título "LIA VIVA | LIVE MODE (AÇÃO)"
 * - ESQUERDA: Avatar LIA grande (ocupa altura total)
 * - DIREITA SUPERIOR: Área de gráficos/Dynamic Content (GRANDE)
 * - DIREITA INFERIOR: Chat log com mensagens
 * - FOOTER: Input com microfone e enviar
 */

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Upload, Send, Mic, MicOff, X, FileText, ImageIcon, Video, File, Loader2, TrendingUp } from "lucide-react"
import { useLIA } from "@/context/LIAContext"
import { StartVoiceButton } from "@/components/StartVoiceButton"
import { DynamicContentRenderer } from "@/components/DynamicContentRenderer"
import { AvatarEngine, AvatarRenderer } from "@/avatar-engine"
import { MarkdownRenderer } from "./MarkdownRenderer"

const LIA_BUST_URL = "/images/lia-bust.png"

// Avatar agora é controlado pelo novo AvatarEngine (frame-based)

function getFileIcon(type: string) {
  switch (type) {
    case "image":
      return <ImageIcon className="w-4 h-4" />
    case "document":
      return <FileText className="w-4 h-4" />
    case "video":
      return <Video className="w-4 h-4" />
    default:
      return <File className="w-4 h-4" />
  }
}

function getFileType(fileName: string): "image" | "document" | "video" | "other" {
  const ext = fileName.split(".").pop()?.toLowerCase() || ""
  if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext)) return "image"
  if (["pdf", "doc", "docx", "txt", "xls", "xlsx", "csv"].includes(ext)) return "document"
  if (["mp4", "mov", "avi", "webm"].includes(ext)) return "video"
  return "other"
}

// Componente de gráfico animado (igual à imagem de referência)
function LiveMarketChart() {
  const [points1, setPoints1] = useState<number[]>([])
  const [points2, setPoints2] = useState<number[]>([])
  const [liveFeed, setLiveFeed] = useState(1.24)

  useEffect(() => {
    const generatePoints = () => {
      const newPoints1: number[] = []
      const newPoints2: number[] = []
      for (let i = 0; i <= 12; i++) {
        newPoints1.push(50 + Math.sin(i * 0.4 + Date.now() / 1000) * 25 + Math.random() * 10)
        newPoints2.push(55 + Math.cos(i * 0.5 + Date.now() / 1200) * 20 + Math.random() * 8)
      }
      setPoints1(newPoints1)
      setPoints2(newPoints2)
      setLiveFeed(+(0.5 + Math.random() * 1.5).toFixed(2))
    }

    generatePoints()
    const interval = setInterval(generatePoints, 2000)
    return () => clearInterval(interval)
  }, [])

  const createPath = (pts: number[]) => {
    if (pts.length === 0) return ""
    return pts.map((y, i) => `${i === 0 ? "M" : "L"} ${i * 35} ${y}`).join(" ")
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-[#00f3ff] tracking-wider uppercase">
          Real-Time Market Pulse
        </h3>
        <div className="flex items-center gap-2 bg-[rgba(0,255,136,0.2)] border border-[#00ff88] rounded-full px-3 py-1">
          <div className="w-2 h-2 bg-[#00ff88] rounded-full animate-pulse" />
          <span className="text-xs font-bold text-[#00ff88]">Live Feed: +{liveFeed}%</span>
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1 relative">
        <svg viewBox="0 0 420 100" className="w-full h-full" preserveAspectRatio="none">
          {/* Grid lines */}
          {[20, 40, 60, 80].map((y) => (
            <line key={y} x1="0" y1={y} x2="420" y2={y} stroke="rgba(0,243,255,0.1)" strokeWidth="1" />
          ))}

          {/* Cyan wave */}
          <path
            d={createPath(points1)}
            fill="none"
            stroke="#00f3ff"
            strokeWidth="3"
            className="drop-shadow-[0_0_10px_rgba(0,243,255,0.8)]"
          />

          {/* Magenta wave */}
          <path
            d={createPath(points2)}
            fill="none"
            stroke="#bc13fe"
            strokeWidth="3"
            className="drop-shadow-[0_0_10px_rgba(188,19,254,0.8)]"
          />

          {/* Points */}
          {points1.map((y, i) => (
            <circle key={`c1-${i}`} cx={i * 35} cy={y} r="4" fill="#00f3ff" className="drop-shadow-[0_0_6px_#00f3ff]" />
          ))}
          {points2.map((y, i) => (
            <circle key={`c2-${i}`} cx={i * 35} cy={y} r="4" fill="#bc13fe" className="drop-shadow-[0_0_6px_#bc13fe]" />
          ))}
        </svg>
      </div>

      {/* Status */}
      <div className="mt-4 text-center">
        <p className="text-sm text-[#bc13fe] font-medium italic animate-pulse">
          Generating Visual Report...
        </p>
      </div>
    </div>
  )
}

// Componente de texto com efeito de streaming/digitação rápida
function StreamingText({ text, speed = 5 }: { text: string; speed?: number }) {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    setDisplayedText('');
    setIsComplete(false);

    if (!text) return;

    let index = 0;
    const charsPerTick = Math.max(1, Math.ceil(text.length / 100)); // Velocidade proporcional

    const interval = setInterval(() => {
      if (index < text.length) {
        // Adiciona múltiplos caracteres por tick para velocidade ultra-rápida
        const nextChars = text.slice(index, index + charsPerTick);
        setDisplayedText(prev => prev + nextChars);
        index += charsPerTick;
      } else {
        setIsComplete(true);
        clearInterval(interval);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed]);

  return (
    <span>
      {displayedText}
      {!isComplete && <span className="animate-pulse text-[#00f3ff]">▊</span>}
    </span>
  );
}

export function MultiModal() {

  // LIA Context - usando API de Escopo
  const {
    isConnected,
    isSpeaking,
    isLiveActive,
    sendTextMessage,
    sendMessageWithFiles,
    transcribeAndFillInput,
    analyzeFile,
    isProcessingUpload,
    setIsProcessingUpload,
    setDynamicContent,
    dynamicContent,
    // API de Escopo para isolamento de mensagens
    messagesByScope, // Observar diretamente para re-render
    setActiveScope,
    conversations,
    activeConversationIdByMode,
    createConversation,
    // Estados por escopo
    typingByScope,
  } = useLIA()

  // Gerenciamento de conversa Multi-Modal isolada
  const [multiModalConversationId, setMultiModalConversationId] = useState<string | null>(null);
  const initRef = useRef<boolean>(false);
  const conversationsRef = useRef(conversations);
  conversationsRef.current = conversations;

  // SINCRONIZAR com activeConversationIdByMode quando sidebar troca/cria conversa
  useEffect(() => {
    const globalActiveId = activeConversationIdByMode?.multimodal;
    if (globalActiveId && globalActiveId !== multiModalConversationId) {
      setMultiModalConversationId(globalActiveId);
      setActiveScope(globalActiveId); // v4.4: Scope unificado = conversationId
      console.log('🔄 [MultiModal] Sincronizado com conversa global:', globalActiveId);
    }
  }, [activeConversationIdByMode?.multimodal, multiModalConversationId, setActiveScope]);

  // EFFECT: Inicializar conversa Multi-Modal UMA VEZ
  // v3.0: CONTEXTO UNIFICADO - Usar conversa do CHAT como fonte de verdade
  useEffect(() => {
    if (initRef.current) return;

    // A LIA VIVA (Multimodal) deve sempre orbitar a conversa do Chat
    const chatConvId = activeConversationIdByMode?.chat;

    if (chatConvId) {
      initRef.current = true;
      setMultiModalConversationId(chatConvId);
      setActiveScope(chatConvId); // v4.4: Scope unificado = conversationId
      console.log('🔗 [MultiModal] Usando conversa do CHAT como fonte de verdade:', chatConvId);
      return;
    }

    // Se não existir conversa de chat, ela será criada pelo LIAContext/Sidebar
    // O Multimodal apenas aguarda a sincronização via o primeiro useEffect
  }, [activeConversationIdByMode?.chat, setActiveScope]);

  // Obter mensagens SOMENTE do escopo unificado (observando messagesByScope para re-render)
  const scopeKey = multiModalConversationId || null; // v4.4: Scope unificado = conversationId
  const messages = scopeKey ? (messagesByScope[scopeKey] || []) : [];

  // Typing por escopo (NÃO global)
  const isTyping = scopeKey ? (typingByScope[scopeKey] || false) : false;

  // SEMPRE setar escopo ativo quando este componente renderiza
  useEffect(() => {
    if (scopeKey) {
      setActiveScope(scopeKey);
    }
  }, [scopeKey, setActiveScope]);

  // Local state
  const [inputValue, setInputValue] = useState("")
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)

  // Arquivos anexados (aguardando envio com prompt)
  const [attachedFiles, setAttachedFiles] = useState<{ file: File; preview?: string; displayName?: string }[]>([])

  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  // Logic for phased thinking text (Thinking -> Generating)
  const [phasedThinkingText, setPhasedThinkingText] = useState("Lia Thinking...")
  useEffect(() => {
    if (isTyping) {
      setPhasedThinkingText("Lia Thinking...")
      const timer = setTimeout(() => {
        setPhasedThinkingText("Lia Generating...")
      }, 2000)
      return () => clearTimeout(timer)
    } else {
      // Reset when not typing
      setPhasedThinkingText("Lia Thinking...")
    }
  }, [isTyping])

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = "inherit"
      const scrollHeight = textarea.scrollHeight
      textarea.style.height = `${scrollHeight}px`
    }
  }, [inputValue])

  // Sincronizar AvatarEngine com estados do contexto
  useEffect(() => {
    if (isSpeaking) {
      AvatarEngine.onSpeakingStart()
    } else if (isTyping) {
      AvatarEngine.onThinking()
    } else if (isLiveActive) {
      AvatarEngine.onListeningStart()
    } else {
      AvatarEngine.onIdle()
    }
  }, [isSpeaking, isTyping, isLiveActive])

  // NOTA: Avatar fica fixo no estado 'neutral' até sistema de publicação ser implementado
  // Avatar Studio é isolado e não afeta este painel

  // Limpar previews ao desmontar
  useEffect(() => {
    return () => {
      attachedFiles.forEach(f => {
        if (f.preview) URL.revokeObjectURL(f.preview)
      })
    }
  }, [attachedFiles])

  // Handle send message - Usa sendMessageWithFiles do LIAContext
  const handleSend = async () => {
    // Se tem arquivos anexados, usar função centralizada do context
    if (attachedFiles.length > 0) {
      const prompt = inputValue.trim() || 'Analise este arquivo e me diga o que você vê. Forneça insights e sugestões.'

      // Usar função do context que já faz tudo
      await sendMessageWithFiles(prompt, attachedFiles)

      // Limpar estado local
      setInputValue("")
      setAttachedFiles([])
      return
    }

    // Mensagem normal sem arquivo
    if (!inputValue.trim()) return
    sendTextMessage(inputValue, 'multimodal') // v5.4: Passar modo explícito para escopo correto
    setInputValue("")
  }

  // handleFileSelect mantido abaixo
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      const file = files[0]
      const preview = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
      setAttachedFiles(prev => [...prev, { file, preview }])
      console.log('📎 Arquivo anexado:', file.name, '- Aguardando prompt...')
    }
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  // Handle paste (Ctrl+V) - APENAS anexar
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item.type.startsWith('image/')) {
        e.preventDefault()
        const file = item.getAsFile()
        if (file) {
          const preview = URL.createObjectURL(file)
          // Usar arquivo original - renomear não é necessário
          // O nome será screenshot para arquivos clipboard sem nome
          const displayName = file.name || `screenshot_${Date.now()}.png`
          // Criar objeto com o arquivo e nome para display
          setAttachedFiles(prev => [...prev, {
            file: file,
            preview,
            displayName
          }])
          console.log('📋 Imagem colada:', displayName, '- Aguardando prompt...')
        }
        return
      }
    }
  }

  // Handle drag over
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  // Handle drop - APENAS anexar
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const files = e.dataTransfer?.files
    if (files && files.length > 0) {
      const file = files[0]
      const preview = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
      setAttachedFiles(prev => [...prev, { file, preview }])
      console.log('📁 Arquivo arrastado:', file.name, '- Aguardando prompt...')
    }
  }

  // Remover arquivo anexado
  const removeAttachedFile = (index: number) => {
    setAttachedFiles(prev => {
      const file = prev[index]
      if (file?.preview) URL.revokeObjectURL(file.preview)
      return prev.filter((_, i) => i !== index)
    })
  }

  // Toggle microphone
  // ANTI-DUPLICIDADE: Desabilitado quando Live Mode está ativo (mic gerenciado pelo GeminiLiveService)
  const toggleMic = async () => {
    // ======================================================================
    // ANTI-DUPLICIDADE: Se Live Mode ativo, não usar mic paralelo
    // O microfone é gerenciado exclusivamente pelo GeminiLiveService
    // ======================================================================
    if (isLiveActive) {
      console.log('⚠️ [MultiModal] Live Mode ativo - mic gerenciado pelo GeminiLiveService')
      return
    }

    if (isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop()
      }
      setIsRecording(false)
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' })
        mediaRecorderRef.current = mediaRecorder
        audioChunksRef.current = []

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) audioChunksRef.current.push(event.data)
        }

        mediaRecorder.onstop = async () => {
          stream.getTracks().forEach((track) => track.stop())
          const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" })
          setIsTranscribing(true)
          const transcription = await transcribeAndFillInput(audioBlob)
          setIsTranscribing(false)
          if (transcription) setInputValue(transcription)
          audioChunksRef.current = []
        }

        mediaRecorder.start()
        setIsRecording(true)
      } catch (err) {
        console.error("Erro ao acessar microfone:", err)
        alert("Não foi possível acessar o microfone.")
      }
    }
  }

  return (
    <div
      className="h-full w-full max-h-screen flex flex-col bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f0f23] overflow-hidden"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >

      {/* ==================== HEADER ==================== */}
      <header className="flex-none px-6 py-4 h-16 shrink-0">
        <h1 className="text-2xl font-bold tracking-widest">
          <span className="text-[#00f3ff] drop-shadow-[0_0_20px_rgba(0,243,255,0.8)]">LIA VIVA</span>
          <span className="text-[rgba(224,247,255,0.4)]"> | </span>
          <span className="text-[#bc13fe] drop-shadow-[0_0_20px_rgba(188,19,254,0.8)]">Multi-Modal</span>
        </h1>
      </header>

      {/* ==================== MAIN CONTENT ==================== */}
      <div className="flex-1 flex gap-6 px-6 pb-4 overflow-hidden min-h-0" style={{ maxHeight: 'calc(100vh - 80px)' }}>

        {/* ========== LEFT: AVATAR LIA (MOTOR DE ANIMAÇÃO) ========== */}
        <div className="w-[35%] flex-none min-h-0 overflow-hidden" style={{ maxHeight: 'calc(100vh - 96px)' }}>
          <div className="h-full w-full relative rounded-xl overflow-hidden border-2 border-[rgba(0,243,255,0.4)] shadow-[0_0_30px_rgba(0,243,255,0.2)] flex items-center justify-center bg-gradient-to-b from-[rgba(0,0,0,0.3)] to-[rgba(0,0,0,0.6)]">
            {/* Avatar com Motor Frame-Based */}
            <AvatarRenderer
              size="full"
              showStatus={false}
            />

            {/* Corner frame */}
            <div className="absolute top-0 left-0 w-6 h-6 border-l-2 border-t-2 border-[#00f3ff]" />
            <div className="absolute top-0 right-0 w-6 h-6 border-r-2 border-t-2 border-[#00f3ff]" />
            <div className="absolute bottom-0 left-0 w-6 h-6 border-l-2 border-b-2 border-[#bc13fe]" />
            <div className="absolute bottom-0 right-0 w-6 h-6 border-r-2 border-b-2 border-[#bc13fe]" />
          </div>
        </div>

        {/* ========== RIGHT: DYNAMIC CONTENT + CHAT (EXPANDÍVEL) ========== */}
        <div className="flex-1 flex flex-col gap-4 overflow-hidden">

          {/* ===== ÁREA DE CONTEÚDO DINÂMICO (APENAS para gráficos, tabelas, imagens) ===== */}
          {/* Análises de texto/documentos vão para o CHAT, não para esta área */}
          {((dynamicContent && !['none', 'analysis', 'text'].includes(dynamicContent.type)) || isProcessingUpload) ? (
            <div className="flex-1 rounded-xl border-2 border-[#bc13fe] bg-[rgba(10,10,30,0.8)] p-4 shadow-[0_0_20px_rgba(188,19,254,0.2)] overflow-hidden">
              <DynamicContentRenderer className="h-full" />
            </div>
          ) : null}


          {/* ===== CHAT LOG (EXPANDE QUANDO SEM CONTEÚDO VISUAL) ===== */}
          <div className={`rounded-xl border border-[rgba(0,243,255,0.3)] bg-[rgba(10,20,40,0.9)] overflow-hidden flex flex-col ${((dynamicContent && !['none', 'analysis', 'text'].includes(dynamicContent.type)) || isProcessingUpload)
            ? 'h-48'
            : 'flex-1'
            }`}>

            {/* Chat messages - estilo Chat Mode normal */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center text-[rgba(224,247,255,0.4)] text-sm py-12">
                  <p className="text-lg mb-2">Olá! Eu sou a LIA.</p>
                  <p>Envie uma mensagem para começar...</p>
                </div>
              ) : (
                <>
                  {messages.map((msg) => (
                    <div key={msg.id} className={`flex gap-3 ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                      {/* Avatar LIA (para mensagens da LIA) */}
                      {msg.type === 'lia' && (
                        <div className="flex-none w-8 h-8 rounded-full overflow-hidden border border-[#00f3ff] flex items-center justify-center">
                          <img src={LIA_BUST_URL} alt="LIA" className="w-full h-full object-cover object-top" />
                        </div>
                      )}

                      {/* Bolha de mensagem */}
                      <div className={`rounded-xl px-4 py-3 ${msg.type === 'user'
                        ? 'bg-[#1e3a5f] text-white rounded-br-sm border border-[rgba(0,243,255,0.3)] max-w-[80%]'
                        : 'bg-[rgba(0,243,255,0.1)] border border-[rgba(0,243,255,0.3)] text-[rgba(224,247,255,0.95)] rounded-bl-sm flex-1 min-w-[300px]'
                        }`}>
                        <div className="text-sm">
                          {msg.type === 'lia' ? (
                            <MarkdownRenderer content={msg.content} />
                          ) : (
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                          )}
                        </div>

                        {/* Renderizar attachments (imagens como miniaturas clicáveis) */}

                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {msg.attachments.map((att, i) => (
                              att.type === 'image' && att.url ? (
                                <button
                                  key={i}
                                  onClick={() => setDynamicContent({
                                    type: 'image',
                                    title: att.name || 'Imagem gerada',
                                    data: { url: att.url, alt: att.name || 'Imagem', caption: att.name },
                                    timestamp: Date.now()
                                  })}
                                  className="relative group cursor-pointer hover:scale-105 transition-transform"
                                  title="Clique para ver em tamanho completo"
                                >
                                  <img
                                    src={att.url}
                                    alt={att.name || 'Imagem'}
                                    className="w-32 h-32 object-cover rounded-lg border-2 border-[rgba(0,243,255,0.3)] hover:border-[#00f3ff] transition-colors"
                                  />
                                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                                    <span className="text-white text-xs">🔍 Ver maior</span>
                                  </div>
                                </button>
                              ) : null
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Avatar User (para mensagens do usuário) */}
                      {msg.type === 'user' && (
                        <div className="flex-none w-8 h-8 rounded-full bg-[rgba(188,19,254,0.3)] border border-[#bc13fe] flex items-center justify-center text-xs font-bold text-[#bc13fe]">
                          U
                        </div>
                      )}
                    </div>
                  ))}
                  {isTyping && (
                    <div className="flex gap-3 justify-start">
                      <div className="flex-none w-8 h-8 rounded-full overflow-hidden border border-[#00f3ff] flex items-center justify-center">
                        <img src={LIA_BUST_URL} alt="LIA" className="w-full h-full object-cover object-top" />
                      </div>
                      <div className="bg-[rgba(0,243,255,0.1)] border border-[rgba(0,243,255,0.3)] rounded-xl px-4 py-3 rounded-bl-sm flex items-center gap-3">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-[#00f3ff] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-2 h-2 bg-[#00f3ff] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-2 h-2 bg-[#00f3ff] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                        <span className="text-xs font-medium text-[#00f3ff] animate-pulse">{phasedThinkingText}</span>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </>
              )}
            </div>
            {/* ===== PREVIEW DE ARQUIVOS ANEXADOS ===== */}
            {attachedFiles.length > 0 && (
              <div className="flex-none flex items-center gap-2 p-2 border-t border-[rgba(0,243,255,0.2)] bg-[rgba(10,20,40,0.8)]">
                {attachedFiles.map((item, index) => (
                  <div
                    key={index}
                    className="relative group flex items-center gap-2 px-2 py-1 bg-[rgba(0,243,255,0.1)] border border-[rgba(0,243,255,0.3)] rounded-lg"
                  >
                    {/* Thumbnail ou ícone */}
                    {item.preview ? (
                      <img
                        src={item.preview}
                        alt={item.file.name}
                        className="w-10 h-10 rounded object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded bg-[rgba(188,19,254,0.2)] flex items-center justify-center text-[#bc13fe]">
                        <FileText className="w-5 h-5" />
                      </div>
                    )}

                    {/* Nome do arquivo */}
                    <span className="text-xs text-[rgba(224,247,255,0.8)] max-w-[100px] truncate">
                      {item.displayName || item.file.name}
                    </span>

                    {/* Botão de remover */}
                    <button
                      onClick={() => removeAttachedFile(index)}
                      className="ml-1 p-0.5 text-[rgba(224,247,255,0.4)] hover:text-red-400 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                {/* Instrução */}
                <span className="text-xs text-[rgba(224,247,255,0.4)] ml-2">
                  Digite o que deseja e pressione Enter
                </span>
              </div>
            )}

            {/* Input row */}
            <div className="flex-none flex items-center gap-2 p-3 border-t border-[rgba(0,243,255,0.2)] bg-[rgba(10,20,40,0.9)]">

              {/* Botão + para upload */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={!isConnected || isProcessingUpload}
                className="flex-none p-2 rounded-lg bg-[rgba(0,243,255,0.1)] border border-[rgba(0,243,255,0.3)] text-[rgba(224,247,255,0.6)] hover:text-[#00f3ff] hover:border-[#00f3ff] transition-all disabled:opacity-50"
                title="Adicionar fotos e arquivos (ou arraste / Ctrl+V)"
              >
                <span className="text-lg font-bold">+</span>
              </button>

              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      handleSend()
                    }
                    // Shift+Enter permite quebra de linha naturalmente
                  }}
                  onPaste={handlePaste}
                  placeholder={isTranscribing ? "Transcrevendo..." : isProcessingUpload ? "Analisando arquivo..." : "Digite uma mensagem..."}
                  disabled={isTranscribing || isProcessingUpload}
                  rows={1}
                  className="w-full px-4 py-2 bg-[rgba(0,0,0,0.4)] border border-[rgba(0,243,255,0.3)] rounded-lg text-sm text-[#e0f7ff] placeholder-[rgba(224,247,255,0.4)] focus:outline-none focus:border-[#00f3ff] disabled:opacity-50 resize-none overflow-y-auto min-h-[40px] max-h-[250px]"
                  style={{ lineHeight: '1.5' }}
                />
              </div>

              {/* Mic button */}
              <button
                onClick={toggleMic}
                disabled={!isConnected || isTranscribing}
                className={`flex-none p-2 rounded-lg transition-all ${isRecording
                  ? "bg-[rgba(255,0,0,0.3)] border border-[#ff0000] text-[#ff0000] animate-pulse"
                  : isTranscribing
                    ? "bg-[rgba(188,19,254,0.2)] border border-[#bc13fe] text-[#bc13fe]"
                    : "bg-[rgba(0,243,255,0.1)] border border-[rgba(0,243,255,0.3)] text-[rgba(224,247,255,0.5)] hover:text-[#00f3ff]"
                  } disabled:opacity-50`}
              >
                {isTranscribing ? <Loader2 className="w-5 h-5 animate-spin" /> : isRecording ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              </button>

              {/* Start Voice button (Gemini Live) - com seletor de modo no Admin */}
              <StartVoiceButton
                size="sm"
                isAdminPanel={typeof window !== 'undefined' && window.location.pathname.includes('admin')}
              />

              {/* Send button */}
              <button
                onClick={handleSend}
                disabled={!isConnected || isTranscribing}
                className="flex-none p-2 bg-[#00f3ff] rounded-lg text-[#0a0e1a] hover:bg-[#00d4dd] transition-all disabled:opacity-50"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden file input */}
      <input type="file" ref={fileInputRef} onChange={handleFileSelect} multiple className="hidden" />
    </div>
  )
}
