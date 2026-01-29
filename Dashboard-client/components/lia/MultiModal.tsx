/**
 * ✅ MULTI-MODAL MODE - Dashboard-client version
 *
 * Features:
 * - File/image upload with drag & drop
 * - Paste images (Ctrl+V)
 * - Voice recording → transcription
 * - Markdown rendering for LIA responses
 * - Dynamic content area for generated visuals
 */

import React, { useState, useRef, useEffect } from "react";
import { Send, Mic, MicOff, X, FileText, ImageIcon, Video, File, Loader2, Paperclip, Download } from "lucide-react";
import { motion, AnimatePresence } from 'framer-motion';
import { useLIA } from "./LIAContext";
import { LIAMessageRenderer } from "./LIAMessageRenderer";
import { DynamicContentRenderer } from "./DynamicContentRenderer";
import { StartVoiceButton } from "./StartVoiceButton";
import { LuminnusLoading } from "./LuminnusLoading";

const LIA_FULL_URL = "/images/lia-full.png";
const LIA_AVATAR_URL = "/images/lia-bust.png";

function getFileIcon(type: string) {
    switch (type) {
        case "image":
            return <ImageIcon className="w-4 h-4" />;
        case "document":
            return <FileText className="w-4 h-4" />;
        case "video":
            return <Video className="w-4 h-4" />;
        default:
            return <File className="w-4 h-4" />;
    }
}

export function MultiModal() {
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

    // Conversation management
    const [multiConversationId, setMultiConversationId] = useState<string | null>(null);
    const initRef = useRef<boolean>(false);
    const conversationsRef = useRef(conversations);
    conversationsRef.current = conversations;

    // Sync with active conversation - Must use 'multimodal' as per LIAContext types
    useEffect(() => {
        const globalActiveId = activeConversationIdByMode?.multimodal;
        if (globalActiveId && globalActiveId !== multiConversationId) {
            setMultiConversationId(globalActiveId);
            setActiveScope(getScopeKey('multimodal', globalActiveId));
        }
    }, [activeConversationIdByMode?.multimodal, multiConversationId, getScopeKey, setActiveScope]);

    // Initialize conversation - creation handled by LIAHub
    useEffect(() => {
        if (initRef.current) return;
        if (activeConversationIdByMode?.multimodal) {
            initRef.current = true;
            setMultiConversationId(activeConversationIdByMode.multimodal);
            setActiveScope(getScopeKey('multimodal', activeConversationIdByMode.multimodal));
            return;
        }
    }, [activeConversationIdByMode?.multimodal, getScopeKey, setActiveScope]);

    // Get messages for current scope
    const scopeKey = multiConversationId ? getScopeKey('multimodal', multiConversationId) : null;
    const messages = scopeKey ? (messagesByScope[scopeKey] || []) : [];
    const isTyping = scopeKey ? (typingByScope[scopeKey] || false) : false;

    // Set active scope when component renders
    useEffect(() => {
        if (scopeKey) {
            setActiveScope(scopeKey);
        }
    }, [scopeKey, setActiveScope]);

    // Local state
    const [inputValue, setInputValue] = useState("");
    const [isRecording, setIsRecording] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [attachedFiles, setAttachedFiles] = useState<{ file: File; preview?: string; displayName?: string }[]>([]);
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    // Refs
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

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

    useEffect(() => {
        return () => {
            attachedFiles.forEach(item => {
                if (item.preview) {
                    URL.revokeObjectURL(item.preview);
                }
            });
        };
    }, []);

    const handleSend = async () => {
        if (!inputValue.trim() && attachedFiles.length === 0) return;

        const content = inputValue || (attachedFiles.length > 0 ? "Analise estes arquivos" : "");
        const filesToSend = [...attachedFiles];

        // Limpar UI imediatamente para feedback instantâneo ao usuário
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
        } finally {
            // Revogar URLs após o envio (sucesso ou falha)
            filesToSend.forEach(item => {
                if (item.preview) {
                    URL.revokeObjectURL(item.preview);
                }
            });
        }
    };

    // handleFileSelect
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

    // Handle paste (Ctrl+V)
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

    // Toggle microphone
    const toggleMic = async () => {
        if (isLiveActive) {
            console.log("Mic manual desabilitado enquanto Gemini Live está ativo");
            return;
        }
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

    return (
        <div className="relative h-full w-full flex flex-col bg-[#050810] overflow-hidden min-h-0" onPaste={handlePaste}>

            {/* Main Content Area - 28/72 Layout */}
            <div className="flex-1 flex gap-4 p-4 overflow-hidden min-h-0">
                {/* Left: LIA Avatar (28%) */}
                <div className="w-[28%] flex flex-col gap-3 min-h-0">
                    <div className={`flex-1 relative rounded-xl overflow-hidden border transition-all duration-500 flex items-center justify-center p-2 min-h-0 ${liaStatus || isThinking ? 'border-cyan-500/50 bg-[#0D111C]' : 'border-white/5 bg-[#0D111C]'}`}>
                        {/* Avatar Image com Efeitos de Iluminação (WOW Effect) */}
                        <img
                            src={LIA_FULL_URL}
                            alt="LIA Full"
                            className={`max-h-full h-auto w-auto object-contain transition-all duration-700 ${isThinking ? 'scale-105 drop-shadow-[0_0_25px_rgba(168,85,247,0.4)] animate-pulse' :
                                liaStatus ? 'scale-105 drop-shadow-[0_0_20px_rgba(34,211,238,0.3)]' :
                                    'scale-100'
                                }`}
                        />

                        {/* v7.0: Activity Overlay (Status Pill) - Shows tool-specific status */}
                        {(liaStatus || isThinking || isSpeaking) && (
                            <div className="absolute top-4 right-4 animate-in fade-in zoom-in duration-300 z-30">
                                <div className={`backdrop-blur-md border rounded-full px-3 py-1.5 flex items-center gap-2 ${isThinking ? 'bg-purple-500/20 border-purple-500/50' : 'bg-cyan-500/20 border-cyan-500/50'
                                    }`}>
                                    <Loader2 className={`w-3.5 h-3.5 animate-spin ${isThinking ? 'text-purple-400' : 'text-cyan-400'}`} />
                                    <span className={`text-[11px] font-bold uppercase tracking-wide leading-none ${isThinking ? 'text-purple-400' : 'text-cyan-400'}`}>
                                        {/* Prioridade: liaStatus específico > genérico */}
                                        {liaStatus && !liaStatus.startsWith('LIA:')
                                            ? liaStatus
                                            : isThinking
                                                ? 'LIA está pensando...'
                                                : (liaStatus ? liaStatus.replace('LIA: ', '') : 'LIA está falando')}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* v6.0: Premium Live Captions (Discretas na base) */}
                        {liaStatus && (
                            <div className="absolute inset-x-0 bottom-4 px-6 animate-in fade-in slide-in-from-bottom-2 duration-500 z-20">
                                <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl px-6 py-2 shadow-[0_0_30px_rgba(0,0,0,0.5)] flex flex-col items-center gap-0.5">
                                    <p className="text-xs font-medium text-white/90 text-center leading-relaxed drop-shadow-md">
                                        {liaStatus.startsWith('LIA: ') ? liaStatus.substring(5) : liaStatus}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Analysis & Chat (65%) */}
                <div className="flex-1 min-w-0 flex flex-col gap-4 overflow-hidden min-h-0">
                    {/* Analysis Area - Só aparece se houver conteúdo real ou upload ativo */}
                    {(dynamicContainers.length > 0 || isProcessingUpload) && (
                        <div className="h-[40%] rounded-2xl border border-white/10 bg-[#0D111C] p-4 shadow-xl overflow-hidden flex flex-col relative">
                            <h3 className="text-xs font-bold text-cyan-400 mb-2 tracking-widest uppercase flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                                Área de Trabalho Dinâmica
                            </h3>

                            {/* v6.5: Overlay de loading apenas se houver processamento real de conteúdo ou se solicitado explicitamente */}
                            {(isThinking && (isProcessingUpload || isProcessingDynamic)) && (
                                <div className="absolute inset-0 z-50 bg-[#0D111C]/80 backdrop-blur-sm flex items-center justify-center">
                                    <LuminnusLoading />
                                </div>
                            )}

                            <div className="flex-1 overflow-auto custom-scrollbar">
                                <DynamicContentRenderer />
                            </div>
                        </div>
                    )}

                    {/* Chat Messages */}
                    <div className="flex-1 rounded-2xl border border-white/10 bg-[#0A0F1A] p-4 overflow-hidden flex flex-col shadow-inner shadow-black/40">
                        <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                            {messages.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center opacity-30 text-center">
                                    <p className="text-sm font-mono tracking-widest uppercase italic border-b border-white/10 pb-2">Central de Interação</p>
                                </div>
                            ) : (
                                messages.map((msg) => (
                                    <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        {msg.type === 'lia' && (
                                            <div className="w-8 h-8 rounded-full overflow-hidden mr-2 flex-shrink-0 border border-cyan-500/30">
                                                <img src={LIA_AVATAR_URL} alt="LIA" className="w-full h-full object-cover scale-[1.4] origin-top" />
                                            </div>
                                        )}
                                        <div className={`max-w-[85%] rounded-xl px-3 py-2 ${msg.type === 'user'
                                            ? 'bg-indigo-600/80 text-white'
                                            : 'text-gray-100'
                                            }`}>
                                            <div className="text-sm">
                                                {msg.type === 'lia' ? (
                                                    <LIAMessageRenderer
                                                        content={msg.content}
                                                        metadata={msg.metadata}
                                                        showQuickActions={true}
                                                        userRole={userRole || 'client'}
                                                        onToolInvoke={(toolName, params) => {
                                                            // Convert tool action to text message for LLM to process
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
                                                            console.log(`[MultiModal] Executando ação: ${actionText} (tool: ${toolName})`);
                                                            sendTextMessage(actionText);
                                                        }}
                                                    />
                                                ) : (
                                                    <p className="whitespace-pre-wrap">{msg.content}</p>
                                                )}
                                            </div>
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
                                ))
                            )}
                            {isTyping && (
                                <div className="flex justify-start">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 mr-3 flex items-center justify-center text-white text-xs font-bold">L</div>
                                    <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 flex items-center gap-2">
                                        <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                                        <span className="text-cyan-400 text-xs animate-pulse">LIA está digitando...</span>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                    </div>


                    {/* Interaction Input */}
                    <div className="flex-none p-4 rounded-2xl border border-white/10 bg-[#0D111C] shadow-2xl">
                        {attachedFiles.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-3">
                                {attachedFiles.map((item, i) => (
                                    <div key={i} className="group relative w-16 h-16 rounded-lg overflow-hidden border border-cyan-500/50">
                                        {item.preview ? (
                                            <img src={item.preview} alt="preview" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-gray-800 text-xs">DOC</div>
                                        )}
                                        <button
                                            onClick={() => {
                                                const fileToRemove = attachedFiles[i];
                                                if (fileToRemove.preview) {
                                                    URL.revokeObjectURL(fileToRemove.preview);
                                                }
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
                        <div className="flex items-end gap-3">
                            <button onClick={() => fileInputRef.current?.click()} className="p-3 rounded-xl bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition-all border border-white/5">
                                <Paperclip className="w-5 h-5" />
                                <input type="file" ref={fileInputRef} className="hidden" multiple onChange={handleFileSelect} />
                            </button>
                            <div className="flex-1 relative flex items-center bg-white/5 rounded-xl border border-white/10 px-4 focus-within:border-cyan-500/50 transition-all">
                                <textarea
                                    ref={textareaRef}
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                                    placeholder="Fale comigo ou anexe algo..."
                                    className="w-full bg-transparent border-none focus:ring-0 focus:outline-none text-white py-3 resize-none max-h-32 text-sm"
                                    rows={1}
                                />
                                <button onClick={toggleMic} disabled={isLiveActive} className={`ml-2 p-2 rounded-lg transition-all ${isRecording ? 'text-red-500 animate-pulse bg-red-500/10' : isLiveActive ? 'text-gray-600 cursor-not-allowed' : 'text-gray-400 hover:text-white'}`}>
                                    {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                                </button>
                            </div>
                            <button onClick={handleSend} disabled={!inputValue.trim() && attachedFiles.length === 0} className="p-3 rounded-xl bg-cyan-600 text-white hover:bg-cyan-500 transition-all shadow-lg shadow-cyan-600/20 disabled:opacity-50 disabled:grayscale">
                                <Send className="w-5 h-5" />
                            </button>

                            {/* Voice Call Button - After Send Button (Parity with Admin) */}
                            <StartVoiceButton size="sm" variant="icon" />
                        </div>
                    </div>
                </div>
            </div>

            {/* v7.0: Image Preview Modal */}
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
                            {/* Actions Header */}
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

export default MultiModal;
