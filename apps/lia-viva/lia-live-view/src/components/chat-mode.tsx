"use client"

/**
 * ✅ CHAT MODE - Painel básico (texto + transcrição)
 *
 * REGRAS:
 * - LIA responde por texto normalmente
 * - Microfone NÃO envia áudio bruto
 * - Microfone grava → transcreve → preenche input
 * - Usuário visualiza transcrição e decide se envia
 * - LIA NUNCA fala em voz neste painel
 * - Upload de imagem/documento funciona
 * - Memória funciona normalmente
 */

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Send, Mic, MicOff, Paperclip, X, FileText, ImageIcon, Video, File, Loader2 } from "lucide-react"
import { useLIA } from "@/context/LIAContext"
import { MarkdownRenderer } from "./MarkdownRenderer"

const LIA_BUST_URL = "/images/lia-bust.png"

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

export function ChatMode() {
  // LIA Context - usando API de Escopo
  const {
    isConnected,
    sendTextMessage,
    sendMessageWithFiles,
    transcribeAndFillInput,
    // API de Escopo para isolamento de mensagens
    getScopeKey,
    messagesByScope, // Observar diretamente para re-render
    setActiveScope,
    conversations,
    activeConversationIdByMode,
    createConversation,
    // Estados por escopo
    typingByScope,
  } = useLIA()

  // Gerenciamento de conversa Chat isolada
  const [chatConversationId, setChatConversationId] = useState<string | null>(null);
  const initRef = useRef<boolean>(false);
  const conversationsRef = useRef(conversations);
  conversationsRef.current = conversations;

  // SINCRONIZAR com activeConversationIdByMode quando sidebar troca/cria conversa
  useEffect(() => {
    const globalActiveId = activeConversationIdByMode?.chat;
    if (globalActiveId && globalActiveId !== chatConversationId) {
      setChatConversationId(globalActiveId);
      setActiveScope(getScopeKey('chat', globalActiveId));
      console.log('🔄 [ChatMode] Sincronizado com conversa global:', globalActiveId);
    }
  }, [activeConversationIdByMode?.chat, chatConversationId, getScopeKey, setActiveScope]);

  // EFFECT: Inicializar conversa Chat UMA VEZ (isolada dos outros modos)
  useEffect(() => {
    if (initRef.current) return;
    // Se já temos uma conversa ativa via sidebar, usar ela
    if (activeConversationIdByMode?.chat) {
      initRef.current = true;
      setChatConversationId(activeConversationIdByMode.chat);
      setActiveScope(getScopeKey('chat', activeConversationIdByMode.chat));
      console.log('📂 [ChatMode] Usando conversa ativa do contexto:', activeConversationIdByMode.chat);
      return;
    }

    const tryInit = () => {
      const convs = conversationsRef.current;
      if (Object.keys(convs).length === 0) return false;

      // Procurar conversa chat existente
      const existingConv = Object.values(convs).find(c => c.mode === 'chat');
      if (existingConv) {
        initRef.current = true;
        setChatConversationId(existingConv.id);
        setActiveScope(getScopeKey('chat', existingConv.id));
        console.log('📂 [ChatMode] Usando conversa existente:', existingConv.id);
        return true;
      } else {
        // Criar nova conversa chat
        const newConv = createConversation('chat');
        initRef.current = true;
        setChatConversationId(newConv.id);
        setActiveScope(getScopeKey('chat', newConv.id));
        console.log('✅ [ChatMode] Nova conversa criada:', newConv.id);
        return true;
      }
    };

    if (!tryInit()) {
      const timer = setTimeout(tryInit, 100);
      return () => clearTimeout(timer);
    }
  }, [activeConversationIdByMode?.chat, createConversation, getScopeKey, setActiveScope]);

  // Obter mensagens SOMENTE do escopo Chat (observando messagesByScope para re-render)
  const scopeKey = chatConversationId ? getScopeKey('chat', chatConversationId) : null;
  const messages = scopeKey ? (messagesByScope[scopeKey] || []) : [];

  // Typing por escopo (NÃO global)
  const isTyping = scopeKey ? (typingByScope[scopeKey] || false) : false;

  // SEMPRE setar escopo ativo quando este componente renderiza (foco)
  useEffect(() => {
    if (scopeKey) {
      setActiveScope(scopeKey);
    }
  }, [scopeKey, setActiveScope]);

  // Local state
  const [inputValue, setInputValue] = useState("")
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [pendingFiles, setPendingFiles] = useState<{ name: string; type: string; file?: File }[]>([])

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
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

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
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

  // Handle paste (Ctrl+V) - para colar imagens/screenshots
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item.type.startsWith('image/')) {
        e.preventDefault()
        const file = item.getAsFile()
        if (file) {
          const displayName = file.name || `screenshot_${Date.now()}.png`
          // Salvar o File completo para envio posterior (não só name/type)
          setPendingFiles(prev => [...prev, { name: displayName, type: file.type, file }])
          console.log('📋 [ChatMode] Imagem colada (com File):', displayName)
        }
        return
      }
    }
  }

  // Handle send text (com suporte a arquivos)
  const handleSend = async () => {
    if (!inputValue.trim() && pendingFiles.length === 0) return

    const content = inputValue || (pendingFiles.length > 0 ? `Analise estas imagens` : "")

    // Se houver arquivos pendentes com File real, usar sendMessageWithFiles
    // Verificação simples: pf.file existe e tem propriedades de File (name, type)
    const filesWithData = pendingFiles
      .filter(pf => pf.file && typeof pf.file === 'object' && 'name' in pf.file)
      .map(pf => ({ file: pf.file as File }))

    if (filesWithData.length > 0 && sendMessageWithFiles) {
      console.log('📤 [ChatMode] Enviando com arquivos:', filesWithData.length)
      await sendMessageWithFiles(content, filesWithData)
    } else {
      // Send via LIA Context (texto normal)
      sendTextMessage(content)
    }

    // Clear input
    setInputValue("")
    setPendingFiles([])
  }

  // Handle file select
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      const newFiles = Array.from(files).map((f) => ({ name: f.name, type: f.type }))
      setPendingFiles([...pendingFiles, ...newFiles])
    }
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  // Remove pending file
  const removePendingFile = (index: number) => {
    setPendingFiles(pendingFiles.filter((_, i) => i !== index))
  }

  // ✅ MICROFONE: Grava → Transcreve → Preenche Input
  const toggleMic = async () => {
    if (isRecording) {
      // Stop recording
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop()
      }
      setIsRecording(false)
    } else {
      // Start recording
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'audio/webm;codecs=opus',
        })
        mediaRecorderRef.current = mediaRecorder
        audioChunksRef.current = []

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data)
          }
        }

        mediaRecorder.onstop = async () => {
          // Stop all tracks
          stream.getTracks().forEach((track) => track.stop())

          // Create audio blob
          const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" })

          // ✅ TRANSCREVER e preencher input
          setIsTranscribing(true)
          const transcription = await transcribeAndFillInput(audioBlob)
          setIsTranscribing(false)

          if (transcription) {
            setInputValue(transcription)
          } else {
            alert("Não foi possível transcrever o áudio. Tente novamente.")
          }

          // Clear chunks
          audioChunksRef.current = []
        }

        mediaRecorder.start()
        setIsRecording(true)
      } catch (err) {
        console.error("Erro ao acessar microfone:", err)
        alert("Não foi possível acessar o microfone. Verifique as permissões do navegador.")
      }
    }
  }

  return (
    <div className="relative h-full w-full flex flex-col">
      {/* Blurred background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0e1a] to-[#0d1525] opacity-95" />

      <div className="relative z-10 h-full w-full max-w-5xl mx-auto flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[rgba(0,243,255,0.2)]">
          <h2 className="text-xl font-bold">
            <span className="text-[#00f3ff]">LIA Viva</span>
            <span className="text-[rgba(224,247,255,0.5)]"> - </span>
            <span className="text-[rgba(224,247,255,0.7)]">Chat Mode</span>
          </h2>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`} />
            <span className="text-xs text-[rgba(224,247,255,0.5)]">
              {isConnected ? "Conectado" : "Desconectado"}
            </span>
          </div>
        </div>

        {/* Messages Area */}
        <div className="relative z-10 flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-[#00f3ff] mb-4 shadow-[0_0_20px_rgba(0,243,255,0.3)]">
                <img
                  src={LIA_BUST_URL || "/placeholder.svg"}
                  alt="LIA"
                  className="w-full h-full object-cover object-top"
                />
              </div>
              <h3 className="text-xl font-bold text-[#00f3ff] mb-2">Welcome to LIA Chat</h3>
              <p className="text-[rgba(224,247,255,0.5)] max-w-md">
                Send me a message, upload files, documents, or images. I'm here to help you with anything you need.
              </p>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}>
                  {message.type === "lia" && (
                    <div className="w-10 h-10 rounded-full overflow-hidden border border-[#00f3ff] mr-3 flex-shrink-0">
                      <img
                        src={LIA_BUST_URL || "/placeholder.svg"}
                        alt="LIA"
                        className="w-full h-full object-cover object-top"
                      />
                    </div>
                  )}
                  <div className={`${message.type === "user" ? "max-w-2xl order-first" : "flex-1 max-w-[85%]"}`}>
                    <div
                      className={`rounded-xl px-4 py-3 ${message.type === 'user'
                        ? 'bg-[#1e3a5f] text-white rounded-br-sm border border-[rgba(0,243,255,0.3)]'
                        : 'bg-[rgba(10,20,40,0.6)] border border-[rgba(0,243,255,0.3)] text-[#e0f7ff] rounded-bl-sm w-full'
                        }`}
                    >
                      {message.type === 'lia' ? (
                        <MarkdownRenderer content={message.content} />
                      ) : (
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      )}

                      {/* Attachments display - Imagens como thumbnails clicáveis */}
                      {message.attachments && message.attachments.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {message.attachments.map((att, i) => (
                            att.type === 'image' && att.url ? (
                              <a
                                key={i}
                                href={att.url}
                                target="_blank"
                                rel="noopener noreferrer"
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
                              </a>
                            ) : (
                              <div
                                key={i}
                                className="flex items-center gap-2 bg-[rgba(0,243,255,0.1)] border border-[rgba(0,243,255,0.3)] rounded-lg px-3 py-2 text-xs"
                              >
                                {getFileIcon(att.type)}
                                <span className="text-[rgba(224,247,255,0.8)]">{att.name}</span>
                              </div>
                            )
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="w-10 h-10 rounded-full overflow-hidden border border-[#00f3ff] mr-3 flex-shrink-0">
                    <img src={LIA_BUST_URL} alt="LIA" className="w-full h-full object-cover object-top" />
                  </div>
                  <div className="bg-[rgba(10,20,40,0.6)] border border-[rgba(0,243,255,0.3)] rounded-2xl px-5 py-3 flex items-center gap-2 text-[#00f3ff]">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="font-medium animate-pulse">{phasedThinkingText}</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Pending Files Preview */}
        {pendingFiles.length > 0 && (
          <div className="relative z-10 px-6 py-2 border-t border-[rgba(0,243,255,0.1)]">
            <div className="flex flex-wrap gap-2">
              {pendingFiles.map((file, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 bg-[rgba(0,243,255,0.1)] border border-[rgba(0,243,255,0.3)] rounded-lg px-3 py-2 text-xs"
                >
                  {getFileIcon(getFileType(file.name))}
                  <span className="text-[rgba(224,247,255,0.8)] max-w-32 truncate">{file.name}</span>
                  <button
                    onClick={() => removePendingFile(i)}
                    className="text-[rgba(224,247,255,0.5)] hover:text-[#ff4444]"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="relative z-10 p-6 border-t border-[rgba(0,243,255,0.2)]">
          <input type="file" ref={fileInputRef} onChange={handleFileSelect} multiple className="hidden" />
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onPaste={handlePaste}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    handleSend()
                  }
                  // Shift+Enter permite quebra de linha naturalmente
                }}
                placeholder={isTranscribing ? "Transcrevendo..." : "Type a message or use voice..."}
                disabled={isTranscribing}
                rows={1}
                className="w-full px-5 py-4 bg-[rgba(10,20,40,0.6)] border border-[rgba(0,243,255,0.3)] rounded-xl text-[#e0f7ff] placeholder-[rgba(224,247,255,0.4)] focus:outline-none focus:border-[#00f3ff] focus:shadow-[0_0_15px_rgba(0,243,255,0.2)] transition-all disabled:opacity-50 resize-none overflow-y-auto min-h-[56px] max-h-[300px]"
                style={{ lineHeight: '1.5' }}
              />
            </div>
            {/* Mic button - GRAVA E TRANSCREVE */}
            <button
              onClick={toggleMic}
              disabled={!isConnected || isTranscribing}
              className={`p-4 rounded-xl transition-all ${isRecording
                ? "bg-[rgba(255,0,0,0.2)] border border-[#ff0000] text-[#ff0000] animate-pulse"
                : isTranscribing
                  ? "bg-[rgba(188,19,254,0.2)] border border-[#bc13fe] text-[#bc13fe] animate-spin"
                  : "text-[rgba(224,247,255,0.5)] hover:text-[#00f3ff]"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              title={isRecording ? "Clique para parar e transcrever" : "Clique para gravar (transcrição automática)"}
            >
              {isTranscribing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : isRecording ? (
                <Mic className="w-5 h-5" />
              ) : (
                <MicOff className="w-5 h-5" />
              )}
            </button>
            {/* File upload button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-4 text-[rgba(224,247,255,0.5)] hover:text-[#bc13fe] transition-colors"
            >
              <Paperclip className="w-5 h-5" />
            </button>
            {/* Send button */}
            <button
              onClick={handleSend}
              disabled={!isConnected || isTranscribing}
              className="p-4 bg-[rgba(0,243,255,0.1)] border border-[#00f3ff] rounded-xl text-[#00f3ff] hover:bg-[rgba(0,243,255,0.2)] hover:shadow-[0_0_15px_rgba(0,243,255,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
