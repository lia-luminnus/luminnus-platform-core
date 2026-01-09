"use client"

// =====================================================
// LOG PANEL - Painel de Logs do Avatar Studio
// =====================================================

import { useState, useEffect, useRef } from "react"
import { Terminal, Trash2, Download } from "lucide-react"

interface LogEntry {
    id: string
    timestamp: Date
    type: 'info' | 'success' | 'warning' | 'error'
    message: string
}

interface LogPanelProps {
    className?: string
}

export function LogPanel({ className = '' }: LogPanelProps) {
    const [logs, setLogs] = useState<LogEntry[]>([])
    const logEndRef = useRef<HTMLDivElement>(null)

    // Adicionar log
    const addLog = (type: LogEntry['type'], message: string) => {
        const entry: LogEntry = {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date(),
            type,
            message
        }
        setLogs(prev => [...prev, entry])
    }

    // Limpar logs
    const clearLogs = () => {
        setLogs([])
    }

    // Exportar logs
    const exportLogs = () => {
        const text = logs.map(l =>
            `[${l.timestamp.toISOString()}] [${l.type.toUpperCase()}] ${l.message}`
        ).join('\n')

        const blob = new Blob([text], { type: 'text/plain' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `avatar-studio-logs-${Date.now()}.txt`
        a.click()
        URL.revokeObjectURL(url)
    }

    // Auto-scroll
    useEffect(() => {
        logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [logs])

    // Escutar eventos do sistema
    useEffect(() => {
        // Log inicial
        addLog('info', 'Avatar Studio inicializado')

        // Escutar evento de publicação
        const handlePublish = (e: CustomEvent) => {
            addLog('success', `Avatar publicado: v${e.detail.version} - ${e.detail.name}`)
        }

        window.addEventListener('lia-avatar-published', handlePublish as EventListener)

        // Interceptar console.log para capturar logs do engine
        const originalLog = console.log
        console.log = (...args) => {
            originalLog(...args)
            const message = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')
            if (message.includes('Avatar') || message.includes('Lip-sync') || message.includes('publicado')) {
                addLog('info', message)
            }
        }

        return () => {
            window.removeEventListener('lia-avatar-published', handlePublish as EventListener)
            console.log = originalLog
        }
    }, [])

    // Cores por tipo
    const typeColors = {
        info: 'text-[#00f3ff]',
        success: 'text-green-400',
        warning: 'text-yellow-400',
        error: 'text-red-400'
    }

    return (
        <div className={`bg-[#0a0a15] rounded-xl flex flex-col ${className}`}>
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-[rgba(255,255,255,0.1)]">
                <div className="flex items-center gap-2 text-xs text-[rgba(255,255,255,0.7)]">
                    <Terminal className="w-4 h-4" />
                    <span>Logs ({logs.length})</span>
                </div>
                <div className="flex gap-1">
                    <button
                        onClick={exportLogs}
                        className="p-1 rounded hover:bg-[rgba(255,255,255,0.1)] text-[rgba(255,255,255,0.5)] hover:text-white"
                        title="Exportar logs"
                    >
                        <Download className="w-3 h-3" />
                    </button>
                    <button
                        onClick={clearLogs}
                        className="p-1 rounded hover:bg-[rgba(255,255,255,0.1)] text-[rgba(255,255,255,0.5)] hover:text-red-400"
                        title="Limpar logs"
                    >
                        <Trash2 className="w-3 h-3" />
                    </button>
                </div>
            </div>

            {/* Log entries */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1 font-mono text-[10px]">
                {logs.length === 0 ? (
                    <div className="text-center text-[rgba(255,255,255,0.3)] py-4">
                        Nenhum log ainda...
                    </div>
                ) : (
                    logs.map(log => (
                        <div key={log.id} className="flex gap-2">
                            <span className="text-[rgba(255,255,255,0.3)]">
                                {log.timestamp.toLocaleTimeString()}
                            </span>
                            <span className={typeColors[log.type]}>
                                [{log.type.toUpperCase()}]
                            </span>
                            <span className="text-[rgba(255,255,255,0.8)] flex-1">
                                {log.message}
                            </span>
                        </div>
                    ))
                )}
                <div ref={logEndRef} />
            </div>
        </div>
    )
}

export default LogPanel
