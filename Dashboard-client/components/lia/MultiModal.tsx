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
import { Send, Mic, MicOff, X, FileText, ImageIcon, Video, File, Loader2, Paperclip } from "lucide-react";
import { useLIA } from "./LIAContext";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { DynamicContentRenderer } from "./DynamicContentRenderer";
import { StartVoiceButton } from "./StartVoiceButton";
import { LuminnusLoading } from "./LuminnusLoading";

const LIA_FULL_URL = "/images/lia-full.png";

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
        setDynamicContent,
        addDynamicContainer,
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
            textarea.style.height = "inherit";
            const scrollHeight = textarea.scrollHeight;
            textarea.style.height = `${scrollHeight}px`;
        }
    }, [inputValue]);

    // Handle send
    const handleSend = async () => {
        if (!inputValue.trim() && attachedFiles.length === 0) return;

        const content = inputValue || (attachedFiles.length > 0 ? "Analise estes arquivos" : "");

        if (attachedFiles.length > 0 && sendMessageWithFiles) {
            await sendMessageWithFiles(content, attachedFiles);
        } else {
            sendTextMessage(content);
        }

        setInputValue("");
        setAttachedFiles([]);
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
            {/* Header */}
            <header className="flex-none flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#0A0F1A]">
                <h1 className="text-xl font-bold tracking-wide flex items-center gap-3">
                    <span className="text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.5)]">LIA VIVA</span>
                    <span className="text-gray-600">|</span>
                    <span className="text-purple-500 drop-shadow-[0_0_15px_rgba(168,85,247,0.5)]">Multi-Modal</span>
                </h1>
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                    <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" : "bg-red-500"}`} />
                    <span className="text-xs font-medium text-gray-400">{isConnected ? "Online" : "Offline"}</span>
                </div>
            </header>

            {/* Main Content Area - 35/65 Layout */}
            <div className="flex-1 flex gap-6 p-6 overflow-hidden min-h-0">
                {/* Left: LIA Avatar (35%) */}
                <div className="w-[35%] flex flex-col gap-4 min-h-0">
                    <div className="flex-1 relative rounded-2xl overflow-hidden border border-white/5 bg-[#0D111C] shadow-2xl flex items-center justify-center p-4 min-h-0">
                        <img src={LIA_FULL_URL} alt="LIA Full" className="max-h-full h-auto w-auto object-contain" />
                    </div>
                </div>

                {/* Right: Analysis & Chat (65%) */}
                <div className="flex-1 min-w-0 flex flex-col gap-4 overflow-hidden min-h-0">
                    {/* Analysis Area */}
                    {(dynamicContainers.length > 0 || isProcessingUpload || isThinking) && (
                        <div className="h-[40%] rounded-2xl border border-white/10 bg-[#0D111C] p-4 shadow-xl overflow-hidden flex flex-col relative">
                            <h3 className="text-xs font-bold text-cyan-400 mb-2 tracking-widest uppercase flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                                Área de Trabalho Dinâmica
                            </h3>

                            {isThinking && (
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
                                        <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${msg.type === 'user'
                                            ? 'bg-indigo-600 text-white rounded-br-none shadow-lg shadow-indigo-600/20'
                                            : 'bg-white/5 border border-white/10 text-gray-100 rounded-bl-none'
                                            }`}>
                                            <div className="text-sm">
                                                {msg.type === 'lia' ? (
                                                    <MarkdownRenderer content={msg.content} />
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
                                                                onClick={() => addDynamicContainer('image', {
                                                                    url: att.url,
                                                                    alt: att.name || 'Imagem',
                                                                    caption: att.name,
                                                                    prompt: att.name
                                                                })}
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
                                            onClick={() => setAttachedFiles(prev => prev.filter((_, idx) => idx !== i))}
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
                            <StartVoiceButton size="md" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default MultiModal;
