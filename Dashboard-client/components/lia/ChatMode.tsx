/**
 * ✅ CHAT MODE - Dashboard-client version
 *
 * Features:
 * - Text messaging via Socket.IO
 * - Voice recording → transcription → fills input
 * - File/image upload support
 * - Markdown rendering for LIA responses
 * - Conversation isolation by scope
 */

import React, { useState, useRef, useEffect } from "react";
import { Send, Mic, MicOff, Paperclip, X, FileText, ImageIcon, Video, File, Loader2 } from "lucide-react";
import { useLIA } from "./LIAContext";
import { MarkdownRenderer } from "./MarkdownRenderer";

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

function getFileType(fileName: string): "image" | "document" | "video" | "other" {
    const ext = fileName.split(".").pop()?.toLowerCase() || "";
    if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext)) return "image";
    if (["pdf", "doc", "docx", "txt", "xls", "xlsx", "csv"].includes(ext)) return "document";
    if (["mp4", "mov", "avi", "webm"].includes(ext)) return "video";
    return "other";
}

export function ChatMode() {
    const {
        isConnected,
        sendTextMessage,
        sendMessageWithFiles,
        transcribeAndFillInput,
        getScopeKey,
        messagesByScope,
        setActiveScope,
        conversations,
        activeConversationIdByMode,
        createConversation,
        typingByScope,
        isSpeaking,
        isLiveActive,
    } = useLIA();

    // Conversation management
    const [chatConversationId, setChatConversationId] = useState<string | null>(null);
    const initRef = useRef<boolean>(false);
    const conversationsRef = useRef(conversations);
    conversationsRef.current = conversations;

    // Sync with active conversation
    useEffect(() => {
        const globalActiveId = activeConversationIdByMode?.chat;
        if (globalActiveId && globalActiveId !== chatConversationId) {
            setChatConversationId(globalActiveId);
            setActiveScope(getScopeKey('chat', globalActiveId));
        }
    }, [activeConversationIdByMode?.chat, chatConversationId, getScopeKey, setActiveScope]);

    // Initialize conversation - creation handled by LIAHub
    useEffect(() => {
        if (initRef.current) return;
        if (activeConversationIdByMode?.chat) {
            initRef.current = true;
            setChatConversationId(activeConversationIdByMode.chat);
            setActiveScope(getScopeKey('chat', activeConversationIdByMode.chat));
            return;
        }
    }, [activeConversationIdByMode?.chat, getScopeKey, setActiveScope]);

    // Get messages for current scope
    const scopeKey = chatConversationId ? getScopeKey('chat', chatConversationId) : null;
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
    const [pendingFiles, setPendingFiles] = useState<{ name: string; type: string; file?: File }[]>([]);

    // Refs
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    // Phased thinking text
    const [phasedThinkingText, setPhasedThinkingText] = useState("LIA está pensando...");
    useEffect(() => {
        if (isTyping) {
            setPhasedThinkingText("LIA está pensando...");
            const timer = setTimeout(() => {
                setPhasedThinkingText("LIA está gerando resposta...");
            }, 2000);
            return () => clearTimeout(timer);
        } else {
            setPhasedThinkingText("LIA está pensando...");
        }
    }, [isTyping]);

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

    // Handle paste (Ctrl+V images)
    const handlePaste = (e: React.ClipboardEvent) => {
        const items = e.clipboardData?.items;
        if (!items) return;

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.type.startsWith('image/')) {
                e.preventDefault();
                const file = item.getAsFile();
                if (file) {
                    const displayName = file.name || `screenshot_${Date.now()}.png`;
                    setPendingFiles(prev => [...prev, { name: displayName, type: file.type, file }]);
                }
                return;
            }
        }
    };

    // Handle send
    const handleSend = async () => {
        if (!inputValue.trim() && pendingFiles.length === 0) return;

        const content = inputValue || (pendingFiles.length > 0 ? `Analise estas imagens` : "");

        const filesWithData = pendingFiles
            .filter(pf => pf.file && typeof pf.file === 'object' && 'name' in pf.file)
            .map(pf => ({ file: pf.file as File }));

        if (filesWithData.length > 0 && sendMessageWithFiles) {
            await sendMessageWithFiles(content, filesWithData);
        } else {
            sendTextMessage(content);
        }

        setInputValue("");
        setPendingFiles([]);
    };

    // Handle file select
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files) {
            const newFiles = Array.from(files).map((f) => ({ name: f.name, type: f.type, file: f }));
            setPendingFiles([...pendingFiles, ...newFiles]);
        }
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    // Remove pending file
    const removePendingFile = (index: number) => {
        setPendingFiles(pendingFiles.filter((_, i) => i !== index));
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
                const mediaRecorder = new MediaRecorder(stream, {
                    mimeType: 'audio/webm;codecs=opus',
                });
                mediaRecorderRef.current = mediaRecorder;
                audioChunksRef.current = [];

                mediaRecorder.ondataavailable = (event) => {
                    if (event.data.size > 0) {
                        audioChunksRef.current.push(event.data);
                    }
                };

                mediaRecorder.onstop = async () => {
                    stream.getTracks().forEach((track) => track.stop());
                    const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });

                    setIsTranscribing(true);
                    const transcription = await transcribeAndFillInput(audioBlob);
                    setIsTranscribing(false);

                    if (transcription) {
                        setInputValue(transcription);
                    } else {
                        alert("Não foi possível transcrever o áudio. Tente novamente.");
                    }

                    audioChunksRef.current = [];
                };

                mediaRecorder.start();
                setIsRecording(true);
            } catch (err) {
                console.error("Erro ao acessar microfone:", err);
                alert("Não foi possível acessar o microfone. Verifique as permissões do navegador.");
            }
        }
    };

    return (
        <div className="relative h-full w-full flex flex-col bg-[#0d1525]">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
                <h2 className="text-lg font-bold">
                    <span className="text-cyan-400">LIA</span>
                    <span className="text-gray-500"> | </span>
                    <span className="text-gray-300">Chat Mode</span>
                </h2>
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`} />
                    <span className="text-xs text-gray-400">{isConnected ? "Conectado" : "Desconectado"}</span>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center opacity-60">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center mb-4 border border-cyan-500/30">
                            <span className="text-4xl">💬</span>
                        </div>
                        <h3 className="text-xl font-bold text-cyan-400 mb-2">Bem-vindo ao Chat</h3>
                        <p className="text-gray-400 max-w-md">
                            Envie mensagens, arquivos ou use o microfone para interagir com a LIA.
                        </p>
                    </div>
                ) : (
                    <>
                        {messages.map((message) => (
                            <div key={message.id} className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}>
                                {message.type === "lia" && (
                                    <div className="w-10 h-10 rounded-full overflow-hidden mr-3 flex-shrink-0 border-2 border-cyan-500/30 shadow-lg shadow-cyan-500/10">
                                        <img src={LIA_AVATAR_URL} alt="LIA" className="w-full h-full object-cover" />
                                    </div>
                                )}
                                <div className={`${message.type === "user" ? "max-w-[85%]" : "flex-1 max-w-[85%]"}`}>
                                    <div
                                        className={`rounded-2xl px-5 py-4 shadow-xl ${message.type === 'user'
                                            ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-br-none border border-white/10'
                                            : 'bg-white/5 border border-white/10 text-gray-100 rounded-bl-none backdrop-blur-md'
                                            }`}
                                    >
                                        {message.type === 'lia' ? (
                                            <MarkdownRenderer content={message.content} />
                                        ) : (
                                            <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                                        )}

                                        {/* Attachments */}
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
                                                        >
                                                            <img
                                                                src={att.url}
                                                                alt={att.name || 'Imagem'}
                                                                className="w-24 h-24 object-cover rounded-lg border border-white/20"
                                                            />
                                                        </a>
                                                    ) : (
                                                        <div
                                                            key={i}
                                                            className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs"
                                                        >
                                                            {getFileIcon(att.type)}
                                                            <span className="text-gray-300">{att.name}</span>
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
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 mr-3 flex-shrink-0 flex items-center justify-center text-white text-sm font-bold">
                                    L
                                </div>
                                <div className="bg-white/5 border border-cyan-500/30 rounded-xl px-4 py-3 flex items-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                                    <span className="text-cyan-400 text-sm animate-pulse">{phasedThinkingText}</span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </>
                )}
            </div>

            {/* Pending Files Preview */}
            {pendingFiles.length > 0 && (
                <div className="px-4 py-2 border-t border-white/5">
                    <div className="flex flex-wrap gap-2">
                        {pendingFiles.map((file, i) => (
                            <div
                                key={i}
                                className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs"
                            >
                                {getFileIcon(getFileType(file.name))}
                                <span className="text-gray-300 max-w-32 truncate">{file.name}</span>
                                <button
                                    onClick={() => removePendingFile(i)}
                                    className="text-gray-500 hover:text-red-400"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Input Area */}
            <div className="p-4 border-t border-white/10 bg-[#0a0f1a]">
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
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                            placeholder={isTranscribing ? "Transcrevendo..." : "Digite sua mensagem..."}
                            disabled={isTranscribing}
                            rows={1}
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all disabled:opacity-50 resize-none overflow-y-auto min-h-[48px] max-h-[200px]"
                        />
                    </div>
                    {/* Mic button */}
                    <button
                        onClick={toggleMic}
                        disabled={!isConnected || isTranscribing}
                        className={`p-3 rounded-xl transition-all ${isRecording
                            ? "bg-red-500/20 border border-red-500 text-red-400 animate-pulse"
                            : isTranscribing
                                ? "bg-purple-500/20 border border-purple-500 text-purple-400"
                                : "bg-white/5 border border-white/10 text-gray-400 hover:text-cyan-400 hover:border-cyan-500/30"
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                        title={isRecording ? "Parar gravação" : "Gravar áudio"}
                    >
                        {isTranscribing ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : isRecording ? (
                            <Mic className="w-5 h-5" />
                        ) : (
                            <MicOff className="w-5 h-5" />
                        )}
                    </button>
                    {/* File button */}
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="p-3 bg-white/5 border border-white/10 rounded-xl text-gray-400 hover:text-purple-400 hover:border-purple-500/30 transition-colors"
                    >
                        <Paperclip className="w-5 h-5" />
                    </button>
                    {/* Send button */}
                    <button
                        onClick={handleSend}
                        disabled={!isConnected || isTranscribing}
                        className="p-3 bg-cyan-500/20 border border-cyan-500/50 rounded-xl text-cyan-400 hover:bg-cyan-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
}
