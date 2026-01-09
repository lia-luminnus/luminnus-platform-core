"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Send, Upload, X, FileText, ImageIcon, Video, File, ChevronUp, ChevronDown } from "lucide-react"
import { StartVoiceButton } from "@/components/StartVoiceButton"
import type { LIAState } from "./AvatarLIA"

// ================================================================
// TIPOS
// ================================================================

interface PendingFile {
    name: string
    type: string
}

interface InteractionBarProps {
    state: LIAState
    isConnected: boolean
    onSendMessage: (text: string, files?: PendingFile[]) => void
    onFileSelect?: (files: File[]) => void
    className?: string
}

// ================================================================
// HELPERS
// ================================================================

function getFileIcon(type: string) {
    if (type.includes('image')) return <ImageIcon className="w-4 h-4" />
    if (type.includes('video')) return <Video className="w-4 h-4" />
    if (type.includes('pdf') || type.includes('document')) return <FileText className="w-4 h-4" />
    return <File className="w-4 h-4" />
}

// ================================================================
// COMPONENTE
// ================================================================

export function InteractionBar({
    state,
    isConnected,
    onSendMessage,
    onFileSelect,
    className = ''
}: InteractionBarProps) {
    const [inputValue, setInputValue] = useState("")
    const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([])
    const [isExpanded, setIsExpanded] = useState(false)
    const [isDragging, setIsDragging] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const inputRef = useRef<HTMLTextAreaElement>(null)

    // Auto-expand quando usuário começa a digitar ou há arquivos pendentes
    useEffect(() => {
        if (inputValue.length > 0 || pendingFiles.length > 0) {
            setIsExpanded(true)
        }
    }, [inputValue, pendingFiles])

    // Auto-resize textarea
    useEffect(() => {
        const textarea = inputRef.current
        if (textarea) {
            textarea.style.height = "inherit"
            const scrollHeight = textarea.scrollHeight
            textarea.style.height = `${scrollHeight}px`
        }
    }, [inputValue])

    // Focar no input quando expandir
    useEffect(() => {
        if (isExpanded && inputRef.current) {
            inputRef.current.focus()
        }
    }, [isExpanded])

    // Handle send
    const handleSend = () => {
        if (!inputValue.trim() && pendingFiles.length === 0) return

        onSendMessage(inputValue, pendingFiles)
        setInputValue("")
        setPendingFiles([])
    }

    // Handle file select
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (files) {
            const newFiles = Array.from(files).map(f => ({ name: f.name, type: f.type }))
            setPendingFiles([...pendingFiles, ...newFiles])

            if (onFileSelect) {
                onFileSelect(Array.from(files))
            }
        }
        if (fileInputRef.current) fileInputRef.current.value = ""
    }

    // Remove pending file
    const removePendingFile = (index: number) => {
        setPendingFiles(pendingFiles.filter((_, i) => i !== index))
    }

    // Drag and drop
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
        const files = e.dataTransfer.files
        if (files) {
            const newFiles = Array.from(files).map(f => ({ name: f.name, type: f.type }))
            setPendingFiles([...pendingFiles, ...newFiles])
        }
    }

    // Mostrar/ocultar baseado no estado
    const shouldShow = state !== 'presenting_lia' || isExpanded

    return (
        <div
            className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-full max-w-2xl px-4 transition-all duration-500 ${shouldShow ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none'
                } ${className}`}
        >
            {/* Toggle Button (quando minimizado) */}
            {!isExpanded && (
                <button
                    onClick={() => setIsExpanded(true)}
                    className="absolute -top-10 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-full bg-[rgba(10,20,40,0.8)] backdrop-blur-xl border border-[rgba(0,243,255,0.2)] text-[rgba(224,247,255,0.6)] hover:text-[#00f3ff] hover:border-[rgba(0,243,255,0.4)] transition-all"
                >
                    <ChevronUp className="w-4 h-4" />
                    <span className="text-xs">Interagir</span>
                </button>
            )}

            {/* Main Bar */}
            <div
                className={`relative rounded-2xl overflow-hidden backdrop-blur-xl border transition-all duration-300 ${isDragging
                    ? 'border-[#00f3ff] shadow-[0_0_30px_rgba(0,243,255,0.4)]'
                    : 'border-[rgba(0,243,255,0.2)] shadow-[0_0_20px_rgba(0,0,0,0.5)]'
                    } bg-[rgba(10,20,40,0.85)]`}
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                onDragLeave={() => setIsDragging(false)}
            >
                {/* Pending Files */}
                {pendingFiles.length > 0 && (
                    <div className="flex flex-wrap gap-2 p-3 border-b border-[rgba(0,243,255,0.1)]">
                        {pendingFiles.map((file, i) => (
                            <div
                                key={i}
                                className="flex items-center gap-2 bg-[rgba(0,243,255,0.1)] border border-[rgba(0,243,255,0.2)] rounded-lg px-2 py-1 text-xs"
                            >
                                <span className="text-[#00f3ff]">{getFileIcon(file.type)}</span>
                                <span className="text-[rgba(224,247,255,0.8)] max-w-32 truncate">{file.name}</span>
                                <button
                                    onClick={() => removePendingFile(i)}
                                    className="text-[rgba(224,247,255,0.5)] hover:text-red-400 transition-colors"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Input Row */}
                <div className="flex items-center gap-3 px-4 py-3">
                    {/* Voice Button */}
                    <StartVoiceButton size="md" />

                    {/* Text Input */}
                    <textarea
                        ref={inputRef}
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault()
                                handleSend()
                            }
                            // Shift+Enter permite quebra de linha naturalmente
                        }}
                        placeholder="Digite uma mensagem ou fale com a LIA..."
                        rows={1}
                        className="flex-1 bg-transparent text-sm text-[#e0f7ff] placeholder-[rgba(224,247,255,0.4)] focus:outline-none resize-none overflow-y-auto min-h-[24px] max-h-[200px]"
                        style={{ lineHeight: '1.5' }}
                        disabled={!isConnected}
                    />

                    {/* Hidden file input */}
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        multiple
                        className="hidden"
                    />

                    {/* Upload Button */}
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-none p-2 rounded-lg text-[rgba(224,247,255,0.5)] hover:text-[#bc13fe] hover:bg-[rgba(188,19,254,0.1)] transition-all"
                        title="Upload arquivos"
                    >
                        <Upload className="w-5 h-5" />
                    </button>

                    {/* Send Button */}
                    <button
                        onClick={handleSend}
                        disabled={!isConnected || (!inputValue.trim() && pendingFiles.length === 0)}
                        className="flex-none p-2 rounded-lg bg-gradient-to-r from-[rgba(0,243,255,0.2)] to-[rgba(188,19,254,0.2)] text-[#00f3ff] hover:from-[rgba(0,243,255,0.3)] hover:to-[rgba(188,19,254,0.3)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        <Send className="w-5 h-5" />
                    </button>

                    {/* Minimize Button */}
                    {isExpanded && (
                        <button
                            onClick={() => setIsExpanded(false)}
                            className="flex-none p-2 rounded-lg text-[rgba(224,247,255,0.4)] hover:text-[rgba(224,247,255,0.8)] transition-colors"
                            title="Minimizar"
                        >
                            <ChevronDown className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}

export default InteractionBar
