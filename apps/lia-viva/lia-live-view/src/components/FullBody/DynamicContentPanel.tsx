"use client"

import { useRef, useEffect, useState } from "react"
import { X, Maximize2, Minimize2, BarChart3, FileText, ImageIcon, Table2, Video, Download, ZoomIn, ZoomOut } from "lucide-react"
import type { LIAState } from "./AvatarLIA"

// ================================================================
// TIPOS
// ================================================================

export interface ContentItem {
    id: string
    type: 'chart' | 'table' | 'image' | 'text' | 'video' | 'pdf'
    title: string
    data: any
    priority?: 'high' | 'normal' | 'low'
}

interface DynamicContentPanelProps {
    items: ContentItem[]
    state: LIAState
    onRemoveItem?: (id: string) => void
    className?: string
}

// ================================================================
// ÍCONES POR TIPO
// ================================================================

function getTypeIcon(type: string) {
    const icons = {
        chart: <BarChart3 className="w-4 h-4" />,
        table: <Table2 className="w-4 h-4" />,
        image: <ImageIcon className="w-4 h-4" />,
        text: <FileText className="w-4 h-4" />,
        video: <Video className="w-4 h-4" />,
        pdf: <FileText className="w-4 h-4" />
    }
    return icons[type as keyof typeof icons] || <FileText className="w-4 h-4" />
}

// ================================================================
// MODAL DE IMAGEM FULLSCREEN
// ================================================================

interface ImageModalProps {
    imageUrl: string
    title: string
    onClose: () => void
}

function ImageModal({ imageUrl, title, onClose }: ImageModalProps) {
    const [zoom, setZoom] = useState(1)

    // Fechar com ESC
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [onClose])

    // Download da imagem
    const handleDownload = async () => {
        try {
            const response = await fetch(imageUrl)
            const blob = await response.blob()
            const url = window.URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = `${title.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.png`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            window.URL.revokeObjectURL(url)
        } catch (error) {
            console.error('Erro ao baixar imagem:', error)
            // Fallback: abrir em nova aba
            window.open(imageUrl, '_blank')
        }
    }

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm"
            onClick={onClose}
        >
            {/* Toolbar */}
            <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
                <button
                    onClick={(e) => { e.stopPropagation(); setZoom(z => Math.max(0.5, z - 0.25)) }}
                    className="p-2 rounded-lg bg-[rgba(0,0,0,0.5)] text-white hover:bg-[rgba(0,243,255,0.3)] transition-colors"
                    title="Zoom out"
                >
                    <ZoomOut className="w-5 h-5" />
                </button>
                <span className="text-white text-sm font-mono px-2">{Math.round(zoom * 100)}%</span>
                <button
                    onClick={(e) => { e.stopPropagation(); setZoom(z => Math.min(3, z + 0.25)) }}
                    className="p-2 rounded-lg bg-[rgba(0,0,0,0.5)] text-white hover:bg-[rgba(0,243,255,0.3)] transition-colors"
                    title="Zoom in"
                >
                    <ZoomIn className="w-5 h-5" />
                </button>
                <div className="w-px h-6 bg-white/20 mx-2" />
                <button
                    onClick={(e) => { e.stopPropagation(); handleDownload() }}
                    className="p-2 rounded-lg bg-[rgba(0,243,255,0.3)] text-white hover:bg-[rgba(0,243,255,0.5)] transition-colors flex items-center gap-2"
                    title="Baixar imagem"
                >
                    <Download className="w-5 h-5" />
                    <span className="text-sm">Baixar</span>
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); onClose() }}
                    className="p-2 rounded-lg bg-red-500/50 text-white hover:bg-red-500 transition-colors"
                    title="Fechar"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Título */}
            <div className="absolute top-4 left-4 z-10">
                <h3 className="text-white text-lg font-bold">{title}</h3>
            </div>

            {/* Imagem */}
            <div
                className="relative max-w-[90vw] max-h-[85vh] overflow-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <img
                    src={imageUrl}
                    alt={title}
                    className="object-contain rounded-lg shadow-2xl transition-transform duration-200"
                    style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
                />
            </div>
        </div>
    )
}

// ================================================================
// COMPONENTE PRINCIPAL
// ================================================================

export function DynamicContentPanel({
    items = [],
    state,
    onRemoveItem,
    className = ''
}: DynamicContentPanelProps) {
    const scrollRef = useRef<HTMLDivElement>(null)
    const [isExpanded, setIsExpanded] = useState(false)
    const [selectedImage, setSelectedImage] = useState<{ url: string; title: string } | null>(null)

    // Auto-scroll quando novos items são adicionados
    useEffect(() => {
        if (scrollRef.current && items.length > 0) {
            scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' })
        }
    }, [items.length])

    // Determinar visibilidade baseada no estado
    const getVisibility = () => {
        switch (state) {
            case 'presenting_content':
                return 'opacity-100 w-[400px] md:w-[500px]'
            case 'presenting_lia':
                return 'opacity-60 w-[200px] md:w-[250px] pointer-events-none'
            case 'standby':
            case 'listening':
                return items.length > 0 ? 'opacity-100 w-[250px] md:w-[300px]' : 'opacity-0 w-0 pointer-events-none'
            case 'processing':
                return 'opacity-50 w-[200px]'
            default:
                return 'opacity-100 w-[250px] md:w-[300px]'
        }
    }

    // Se não há itens e não está apresentando, não renderizar
    if (items.length === 0 && state !== 'presenting_content') {
        return null
    }

    return (
        <>
            {/* Modal de imagem fullscreen */}
            {selectedImage && (
                <ImageModal
                    imageUrl={selectedImage.url}
                    title={selectedImage.title}
                    onClose={() => setSelectedImage(null)}
                />
            )}

            <div
                className={`absolute left-4 md:left-8 top-20 bottom-28 z-20 transition-all duration-500 ease-out ${getVisibility()} ${className}`}
            >
                <div className="h-full flex flex-col rounded-2xl overflow-hidden glass-panel border border-[rgba(0,243,255,0.2)] bg-[rgba(10,20,40,0.7)] backdrop-blur-xl">
                    {/* Header */}
                    <div className="flex-none flex items-center justify-between px-4 py-3 border-b border-[rgba(0,243,255,0.15)]">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-[#00f3ff] animate-pulse" />
                            <h3 className="text-sm font-bold text-[#00f3ff]">CONTEÚDO DINÂMICO</h3>
                        </div>
                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="p-1 rounded-lg hover:bg-[rgba(0,243,255,0.1)] transition-colors"
                        >
                            {isExpanded ? (
                                <Minimize2 className="w-4 h-4 text-[rgba(224,247,255,0.6)]" />
                            ) : (
                                <Maximize2 className="w-4 h-4 text-[rgba(224,247,255,0.6)]" />
                            )}
                        </button>
                    </div>

                    {/* Content Scroll Area */}
                    <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin">
                        {items.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-center py-12">
                                <BarChart3 className="w-10 h-10 text-[rgba(0,243,255,0.3)] mb-3" />
                                <p className="text-xs text-[rgba(224,247,255,0.4)]">
                                    Conteúdo aparecerá aqui
                                </p>
                                <p className="text-[10px] text-[rgba(224,247,255,0.3)] mt-1">
                                    Gráficos, tabelas, imagens...
                                </p>
                            </div>
                        ) : (
                            items.map((item) => (
                                <ContentCard
                                    key={item.id}
                                    item={item}
                                    onRemove={() => onRemoveItem?.(item.id)}
                                    onImageClick={(url, title) => setSelectedImage({ url, title })}
                                />
                            ))
                        )}
                    </div>

                    {/* Footer - Count */}
                    {items.length > 0 && (
                        <div className="flex-none px-4 py-2 border-t border-[rgba(0,243,255,0.15)] bg-[rgba(0,0,0,0.2)]">
                            <p className="text-[10px] text-[rgba(224,247,255,0.4)]">
                                {items.length} {items.length === 1 ? 'item' : 'itens'}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </>
    )
}

// ================================================================
// CONTENT CARD
// ================================================================

interface ContentCardProps {
    item: ContentItem
    onRemove?: () => void
    onImageClick?: (url: string, title: string) => void
}

function ContentCard({ item, onRemove, onImageClick }: ContentCardProps) {
    const priorityColors = {
        high: 'border-[#ff4444]',
        normal: 'border-[rgba(0,243,255,0.3)]',
        low: 'border-[rgba(188,19,254,0.3)]'
    }

    const imageUrl = item.data?.url || item.data?.imageUrl || (typeof item.data === 'string' ? item.data : null)

    return (
        <div
            className={`group relative rounded-xl overflow-hidden border ${priorityColors[item.priority || 'normal']} bg-[rgba(0,0,0,0.3)] transition-all duration-300 hover:bg-[rgba(0,243,255,0.05)] hover:border-[rgba(0,243,255,0.5)]`}
        >
            {/* Card Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-[rgba(255,255,255,0.05)]">
                <div className="flex items-center gap-2">
                    <span className="text-[#00f3ff]">{getTypeIcon(item.type)}</span>
                    <span className="text-xs font-medium text-[rgba(224,247,255,0.9)] truncate max-w-[140px]">
                        {item.title}
                    </span>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {item.type === 'image' && imageUrl && (
                        <button
                            onClick={() => onImageClick?.(imageUrl, item.title)}
                            className="p-1 rounded hover:bg-[rgba(0,243,255,0.2)]"
                            title="Ver em tela cheia"
                        >
                            <Maximize2 className="w-3 h-3 text-[rgba(224,247,255,0.6)]" />
                        </button>
                    )}
                    {onRemove && (
                        <button
                            onClick={onRemove}
                            className="p-1 rounded hover:bg-[rgba(255,0,0,0.2)]"
                        >
                            <X className="w-3 h-3 text-[rgba(224,247,255,0.6)]" />
                        </button>
                    )}
                </div>
            </div>

            {/* Card Preview */}
            <div className="p-3 min-h-[60px]">
                {item.type === 'text' && (
                    <p className="text-[11px] text-[rgba(224,247,255,0.7)] line-clamp-4">
                        {typeof item.data === 'string' ? item.data : JSON.stringify(item.data)}
                    </p>
                )}
                {item.type === 'image' && imageUrl && (
                    <div
                        className="relative cursor-pointer group/image"
                        onClick={() => onImageClick?.(imageUrl, item.title)}
                    >
                        <img
                            src={imageUrl}
                            alt={item.title}
                            className="w-full h-auto max-h-[200px] object-contain rounded-lg"
                        />
                        {/* Overlay com botão de expandir */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/image:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                            <div className="bg-[rgba(0,243,255,0.3)] px-3 py-2 rounded-lg flex items-center gap-2 text-white">
                                <Maximize2 className="w-4 h-4" />
                                <span className="text-xs font-medium">Clique para expandir</span>
                            </div>
                        </div>
                    </div>
                )}
                {item.type === 'chart' && (
                    <div className="flex items-center justify-center h-20 bg-[rgba(0,243,255,0.05)] rounded-lg">
                        <BarChart3 className="w-10 h-10 text-[rgba(0,243,255,0.4)]" />
                    </div>
                )}
                {item.type === 'table' && (
                    <div className="flex items-center justify-center h-20 bg-[rgba(188,19,254,0.05)] rounded-lg">
                        <Table2 className="w-10 h-10 text-[rgba(188,19,254,0.4)]" />
                    </div>
                )}
            </div>
        </div>
    )
}

export default DynamicContentPanel
