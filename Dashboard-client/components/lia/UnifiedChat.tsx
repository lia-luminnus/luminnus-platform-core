/**
 * ============================================================
 * 💬 UnifiedChat — Chat Único Unificado da LIA
 * ============================================================
 * 
 * Merge de ChatMode + MultiModal em um único componente.
 * Padrão moderno de chat AI (ChatGPT/Gemini/Claude).
 * 
 * Features:
 * - Welcome Screen com imagem da LIA (bust) + quick prompts
 * - Chat com avatar circular da LIA nas respostas
 * - Upload de arquivos + drag & drop + Ctrl+V imagens
 * - Gravação de voz → transcrição
 * - Área de Trabalho Dinâmica (colapsável)
 * - Markdown rendering (LIAMessageRenderer)
 * - Chamada por Voz (StartVoiceButton) com gate de plano
 * 
 * ============================================================
 */

import React, { useState, useRef, useEffect, useContext } from "react";
import {
    Send, Mic, MicOff, X, FileText, ImageIcon, Video, File,
    Loader2, Paperclip, Download, Sparkles, FileSearch,
    Mail, Search, ChevronUp, ChevronDown
} from "lucide-react";
import { motion, AnimatePresence } from 'framer-motion';
import { useLIA } from "./LIAContext";
import { LIAMessageRenderer } from "./LIAMessageRenderer";
import { DynamicContentRenderer } from "./DynamicContentRenderer";
import { StartVoiceButton } from "./StartVoiceButton";
import { LuminnusLoading } from "./LuminnusLoading";
import { LanguageContext } from "../../contexts/LanguageContext";

// ============================================================
// CONSTANTS
// ============================================================

const LIA_BUST_URL = "/images/lia-bust.png";

const QUICK_PROMPTS = [
    { icon: <FileSearch className="w-5 h-5" />, label: "Analise meu relatório", prompt: "Analise meu relatório de dados" },
    { icon: <Mail className="w-5 h-5" />, label: "Crie um e-mail profissional", prompt: "Crie um e-mail profissional" },
    { icon: <FileText className="w-5 h-5" />, label: "Resuma este documento", prompt: "Resuma este documento para mim" },
    { icon: <Search className="w-5 h-5" />, label: "Pesquise sobre um tema", prompt: "Pesquise sobre" },
];

// ============================================================
// HELPERS
// ============================================================

function getFileIcon(type: string) {
    switch (type) {
        case "image": return <ImageIcon className="w-4 h-4" />;
        case "document": return <FileText className="w-4 h-4" />;
        case "video": return <Video className="w-4 h-4" />;
        default: return <File className="w-4 h-4" />;
    }
}

// ============================================================
// COMPONENT
// ============================================================

export function UnifiedChat() {
    const {
        isConnected,
        sendTextMessage,
        sendMessageWithFiles,
        transcribeAndFillInput,
        dynamicContent,
        dynamicContainers,
        isProcessingUpload,
        isThinking,
        getScopeKey,
        messagesByScope,
        setActiveScope,
        activeConversationIdByMode,
        createConversation,
        conversations,
        typingByScope,
        isSpeaking,
        isLiveActive,
        userRole,
        setDynamicContent,
        addDynamicContainer,
        isProcessingDynamic,
        liaStatus,
    } = useLIA();

    // ============================================================
    // CONVERSATION MANAGEMENT (uses 'multimodal' mode for full features)
    // ============================================================
    const CHAT_MODE = 'multimodal' as const;

    const [conversationId, setConversationId] = useState<string | null>(null);
    const initRef = useRef<boolean>(false);
    const conversationsRef = useRef(conversations);
    conversationsRef.current = conversations;

    // Sync with active conversation
    useEffect(() => {
        const globalActiveId = activeConversationIdByMode?.[CHAT_MODE];
        if (globalActiveId && globalActiveId !== conversationId) {
            setConversationId(globalActiveId);
            setActiveScope(getScopeKey(CHAT_MODE, globalActiveId));
        }
    }, [activeConversationIdByMode?.[CHAT_MODE], conversationId, getScopeKey, setActiveScope]);

    // Initialize conversation
    useEffect(() => {
        if (initRef.current) return;
        if (activeConversationIdByMode?.[CHAT_MODE]) {
            initRef.current = true;
            setConversationId(activeConversationIdByMode[CHAT_MODE]);
            setActiveScope(getScopeKey(CHAT_MODE, activeConversationIdByMode[CHAT_MODE]!));
        }
    }, [activeConversationIdByMode?.[CHAT_MODE], getScopeKey, setActiveScope]);

    // Get messages for current scope
    const scopeKey = conversationId ? getScopeKey(CHAT_MODE, conversationId) : null;
    const messages = scopeKey ? (messagesByScope[scopeKey] || []) : [];
    const isTyping = scopeKey ? (typingByScope[scopeKey] || false) : false;

    // Set active scope when component renders
    useEffect(() => {
        if (scopeKey) {
            setActiveScope(scopeKey);
        }
    }, [scopeKey, setActiveScope]);

    // ============================================================
    // LOCAL STATE
    // ============================================================
    const [inputValue, setInputValue] = useState("");
    const [isRecording, setIsRecording] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [attachedFiles, setAttachedFiles] = useState<{ file: File; preview?: string; displayName?: string }[]>([]);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [isDynamicAreaCollapsed, setIsDynamicAreaCollapsed] = useState(false);

    // ============================================================
    // REFS
    // ============================================================
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    // ============================================================
    // EFFECTS
    // ============================================================

    // Scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Auto-resize textarea
    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            if (!inputValue) {
                textarea.style.height = "42px";
                return;
            }
            textarea.style.height = "auto";
            const scrollHeight = textarea.scrollHeight;
            textarea.style.height = `${Math.min(scrollHeight, 128)}px`;
        }
    }, [inputValue]);

    // Cleanup file previews
    useEffect(() => {
        return () => {
            attachedFiles.forEach(item => {
                if (item.preview) URL.revokeObjectURL(item.preview);
            });
        };
    }, []);

    // ============================================================
    // HANDLERS
    // ============================================================

    const handleSend = async () => {
        if (!inputValue.trim() && attachedFiles.length === 0) return;

        const content = inputValue || (attachedFiles.length > 0 ? "Analise estes arquivos" : "");
        const filesToSend = [...attachedFiles];

        setInputValue("");
        setAttachedFiles([]);

        try {
            if (filesToSend.length > 0 && sendMessageWithFiles) {
                await sendMessageWithFiles(content, filesToSend);
            } else {
                await sendTextMessage(content);
            }
        } catch (error) {
            console.error('Erro ao enviar mensagem:', error);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            Array.from(files).forEach(file => {
                const preview = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined;
                const displayName = file.name;
                setAttachedFiles(prev => [...prev, { file, preview, displayName }]);
            });
        }
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        const items = e.clipboardData?.items;
        if (!items) return;

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.type.startsWith('image/')) {
                e.preventDefault();
                const file = item.getAsFile();
                if (file) {
                    const preview = URL.createObjectURL(file);
                    const displayName = file.name || `screenshot_${Date.now()}.png`;
                    setAttachedFiles(prev => [...prev, { file, preview, displayName }]);
                }
                return;
            }
        }
    };

    const toggleMic = async () => {
        if (isLiveActive) return;
        if (isRecording) {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
                mediaRecorderRef.current.stop();
            }
            setIsRecording(false);
        } else {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
                mediaRecorderRef.current = mediaRecorder;
                audioChunksRef.current = [];

                mediaRecorder.ondataavailable = (event) => {
                    if (event.data.size > 0) audioChunksRef.current.push(event.data);
                };

                mediaRecorder.onstop = async () => {
                    stream.getTracks().forEach((track) => track.stop());
                    const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });

                    setIsTranscribing(true);
                    const transcription = await transcribeAndFillInput(audioBlob);
                    setIsTranscribing(false);

                    if (transcription) setInputValue(transcription);
                    audioChunksRef.current = [];
                };

                mediaRecorder.start();
                setIsRecording(true);
            } catch (err) {
                console.error("Erro ao acessar microfone:", err);
            }
        }
    };

    const handleQuickPrompt = (prompt: string) => {
        setInputValue(prompt);
        textareaRef.current?.focus();
    };

    // ============================================================
    // RENDER: WELCOME SCREEN (when no messages)
    // ============================================================

    const renderWelcomeScreen = () => (
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 overflow-y-auto">
            {/* LIA Bust Image */}
            <div className="relative mb-6 group">
                {/* Glow behind */}
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 rounded-full blur-3xl scale-150 group-hover:scale-[1.7] transition-transform duration-700" />
                <img
                    src={LIA_BUST_URL}
                    alt="LIA"
                    className="relative z-10 w-40 h-40 md:w-52 md:h-52 object-cover object-top rounded-full border-2 border-white/10 shadow-2xl shadow-indigo-500/10"
                />
                {/* Status dot */}
                <div className="absolute bottom-2 right-2 z-20 w-4 h-4 rounded-full bg-green-500 border-2 border-[#050810] shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
            </div>

            {/* Greeting */}
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 tracking-tight text-center">
                Como posso ajudar?
            </h2>
            <p className="text-sm text-gray-500 mb-8 text-center max-w-md">
                Envie mensagens, arquivos, imagens ou use a voz. Eu posso analisar, criar e executar ações para você.
            </p>

            {/* Quick Prompt Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
                {QUICK_PROMPTS.map((qp, i) => (
                    <button
                        key={i}
                        onClick={() => handleQuickPrompt(qp.prompt)}
                        className="flex items-center gap-3 px-4 py-3.5 bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.07] hover:border-indigo-500/30 rounded-2xl text-left transition-all group/card"
                    >
                        <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover/card:bg-indigo-500/20 transition-colors flex-shrink-0">
                            {qp.icon}
                        </div>
                        <span className="text-sm text-gray-300 font-medium group-hover/card:text-white transition-colors">
                            {qp.label}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );

    // ============================================================
    // RENDER: CHAT MESSAGES
    // ============================================================

    const renderMessages = () => (
        <div className="flex-1 overflow-y-auto px-4 md:px-0 custom-scrollbar">
            <div className="max-w-3xl mx-auto py-4 space-y-5">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {/* LIA Avatar */}
                        {msg.type === 'lia' && (
                            <div className="w-8 h-8 rounded-full overflow-hidden mr-3 flex-shrink-0 border border-cyan-500/30 shadow-[0_0_8px_rgba(34,211,238,0.15)]">
                                <img src={LIA_BUST_URL} alt="LIA" className="w-full h-full object-cover object-top scale-[1.4]" />
                            </div>
                        )}

                        {/* Message Bubble */}
                        <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${msg.type === 'user'
                            ? 'bg-indigo-600/80 text-white'
                            : 'text-gray-100'
                            }`}>
                            <div className="text-sm leading-relaxed">
                                {msg.type === 'lia' ? (
                                    <LIAMessageRenderer
                                        content={msg.content}
                                        metadata={msg.metadata}
                                        showQuickActions={true}
                                        userRole={userRole || 'client'}
                                        onToolInvoke={(toolName, params) => {
                                            const actionMap: Record<string, string> = {
                                                'email.send': 'Enviar e-mail',
                                                'email.preview': 'Ver prévia do e-mail',
                                                'email.resend': 'Reenviar e-mail',
                                                'email.status': 'Ver status do envio',
                                                'docs.generate_corrected': 'Gerar versão corrigida',
                                                'docs.export_report': 'Exportar relatório',
                                                'ui.download_file': 'Baixar arquivo',
                                                'calendar.create': 'Agendar reunião',
                                                'calendar.send_invite': 'Enviar convite',
                                                'integrations.reconnect': 'Reconectar integração',
                                                'integrations.status': 'Ver status da integração',
                                                'support.open_ticket': 'Falar com suporte',
                                                'dashboard.navigate': (params as any)?.section || 'Navegar'
                                            };
                                            const actionText = actionMap[toolName] || toolName;
                                            sendTextMessage(actionText);
                                        }}
                                    />
                                ) : (
                                    <p className="whitespace-pre-wrap">{msg.content}</p>
                                )}
                            </div>

                            {/* Attachments */}
                            {msg.attachments && msg.attachments.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {msg.attachments.map((att, i) => (
                                        att.type === 'image' && att.url ? (
                                            <button
                                                key={i}
                                                onClick={() => setPreviewImage(att.url || null)}
                                                className="relative group cursor-pointer hover:scale-105 transition-transform"
                                                title="Clique para expandir"
                                            >
                                                <img src={att.url} alt={att.name} className="w-32 h-32 object-cover rounded-lg border border-white/20 group-hover:border-cyan-400 transition-colors" />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                                                    <span className="text-white text-[10px] font-bold">🔍 EXPANDIR</span>
                                                </div>
                                            </button>
                                        ) : (
                                            <div key={i} className="flex items-center gap-2 bg-black/20 px-2 py-1 rounded-lg border border-white/10">
                                                {getFileIcon(att.type)}
                                                <span className="text-[10px] truncate max-w-[120px]">{att.name}</span>
                                            </div>
                                        )
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {/* Typing Indicator */}
                {isTyping && (
                    <div className="flex justify-start">
                        <div className="w-8 h-8 rounded-full overflow-hidden mr-3 flex-shrink-0 border border-cyan-500/30">
                            <img src={LIA_BUST_URL} alt="LIA" className="w-full h-full object-cover object-top scale-[1.4]" />
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                            <span className="text-cyan-400 text-xs animate-pulse">LIA está pensando...</span>
                        </div>
                    </div>
                )}

                {/* LIA Status (thinking/processing) */}
                {(liaStatus && !isTyping) && (
                    <div className="flex justify-start">
                        <div className="w-8 h-8 rounded-full overflow-hidden mr-3 flex-shrink-0 border border-purple-500/30">
                            <img src={LIA_BUST_URL} alt="LIA" className="w-full h-full object-cover object-top scale-[1.4]" />
                        </div>
                        <div className="bg-purple-500/10 border border-purple-500/20 rounded-2xl px-4 py-3 flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                            <span className="text-purple-400 text-xs font-medium">
                                {liaStatus.startsWith('LIA: ') ? liaStatus.substring(5) : liaStatus}
                            </span>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>
        </div>
    );

    // ============================================================
    // RENDER: DYNAMIC CONTENT AREA (collapsible)
    // ============================================================

    const renderDynamicArea = () => {
        if (dynamicContainers.length === 0 && !isProcessingUpload) return null;

        return (
            <div className={`border-b border-white/10 bg-[#0D111C] transition-all duration-300 ${isDynamicAreaCollapsed ? 'h-10' : 'max-h-[35%]'}`}>
                {/* Collapse Header */}
                <button
                    onClick={() => setIsDynamicAreaCollapsed(!isDynamicAreaCollapsed)}
                    className="w-full px-4 py-2 flex items-center justify-between hover:bg-white/5 transition-colors"
                >
                    <span className="text-xs font-bold text-cyan-400 tracking-widest uppercase flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                        Área de Trabalho
                    </span>
                    {isDynamicAreaCollapsed ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronUp className="w-4 h-4 text-gray-500" />}
                </button>

                {/* Content */}
                {!isDynamicAreaCollapsed && (
                    <div className="px-4 pb-4 overflow-auto custom-scrollbar relative" style={{ maxHeight: 'calc(35vh - 40px)' }}>
                        {(isThinking && (isProcessingUpload || isProcessingDynamic)) && (
                            <div className="absolute inset-0 z-50 bg-[#0D111C]/80 backdrop-blur-sm flex items-center justify-center">
                                <LuminnusLoading />
                            </div>
                        )}
                        <DynamicContentRenderer />
                    </div>
                )}
            </div>
        );
    };

    // ============================================================
    // MAIN RENDER
    // ============================================================

    return (
        <div className="relative h-full w-full flex flex-col bg-[#050810] overflow-hidden min-h-0" onPaste={handlePaste}>

            {/* Dynamic Content Area (top, collapsible) */}
            {renderDynamicArea()}

            {/* Chat Area */}
            {messages.length === 0 ? renderWelcomeScreen() : renderMessages()}

            {/* Input Area */}
            <div className="flex-none px-4 pb-4 pt-2">
                <div className="max-w-3xl mx-auto">
                    {/* Attached Files Preview */}
                    {attachedFiles.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3 px-1">
                            {attachedFiles.map((item, i) => (
                                <div key={i} className="group relative w-16 h-16 rounded-xl overflow-hidden border border-cyan-500/50">
                                    {item.preview ? (
                                        <img src={item.preview} alt="preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-gray-800 text-xs text-gray-400">
                                            {getFileIcon('document')}
                                        </div>
                                    )}
                                    <button
                                        onClick={() => {
                                            const fileToRemove = attachedFiles[i];
                                            if (fileToRemove.preview) URL.revokeObjectURL(fileToRemove.preview);
                                            setAttachedFiles(prev => prev.filter((_, idx) => idx !== i));
                                        }}
                                        className="absolute inset-0 bg-red-500/80 items-center justify-center hidden group-hover:flex"
                                    >
                                        <X className="w-5 h-5 text-white" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Input Bar */}
                    <div className="flex items-end gap-2 bg-[#0D111C] rounded-2xl border border-white/10 p-2 shadow-2xl shadow-black/30 focus-within:border-indigo-500/40 transition-all">
                        {/* Attachment Button */}
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="p-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all flex-shrink-0"
                            title="Anexar arquivo"
                        >
                            <Paperclip className="w-5 h-5" />
                            <input type="file" ref={fileInputRef} className="hidden" multiple onChange={handleFileSelect} />
                        </button>

                        {/* Text Input */}
                        <div className="flex-1 flex items-center">
                            <textarea
                                ref={textareaRef}
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSend();
                                    }
                                }}
                                placeholder="Pergunte algo à LIA..."
                                className="w-full bg-transparent border-none focus:ring-0 focus:outline-none text-white py-2 px-1 resize-none max-h-32 text-sm placeholder:text-gray-500"
                                rows={1}
                            />
                        </div>

                        {/* Mic Button */}
                        <button
                            onClick={toggleMic}
                            disabled={isLiveActive}
                            className={`p-2.5 rounded-xl transition-all flex-shrink-0 ${isRecording
                                ? 'text-red-500 animate-pulse bg-red-500/10'
                                : isTranscribing
                                    ? 'text-yellow-400 animate-pulse'
                                    : isLiveActive
                                        ? 'text-gray-600 cursor-not-allowed'
                                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                            title={isRecording ? "Parar gravação" : "Gravar áudio"}
                        >
                            {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                        </button>

                        {/* Send Button */}
                        <button
                            onClick={handleSend}
                            disabled={!inputValue.trim() && attachedFiles.length === 0}
                            className="p-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
                            title="Enviar mensagem"
                        >
                            <Send className="w-5 h-5" />
                        </button>

                        {/* Voice Call Button */}
                        <StartVoiceButton size="sm" variant="icon" />
                    </div>

                    {/* Disclaimer */}
                    <p className="text-[10px] text-gray-600 text-center mt-2">
                        LIA pode cometer erros. Verifique informações importantes.
                    </p>
                </div>
            </div>

            {/* Image Preview Modal */}
            <AnimatePresence>
                {previewImage && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setPreviewImage(null)}
                        className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 md:p-12"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="relative max-w-4xl w-full max-h-full flex flex-col items-center gap-4"
                        >
                            <div className="absolute -top-12 right-0 flex gap-3">
                                <button
                                    onClick={() => {
                                        const link = document.createElement('a');
                                        link.href = previewImage;
                                        link.download = `lia_image_${Date.now()}.png`;
                                        document.body.appendChild(link);
                                        link.click();
                                        document.body.removeChild(link);
                                    }}
                                    className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 text-white transition-all backdrop-blur-md"
                                    title="Baixar imagem"
                                >
                                    <Download className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => setPreviewImage(null)}
                                    className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 text-white transition-all backdrop-blur-md"
                                    title="Fechar"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="bg-black/40 p-2 rounded-2xl border border-white/10 shadow-2xl">
                                <img
                                    src={previewImage}
                                    alt="Preview"
                                    className="max-w-full max-h-[80vh] object-contain rounded-xl"
                                />
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default UnifiedChat;
