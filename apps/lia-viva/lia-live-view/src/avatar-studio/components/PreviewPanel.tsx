"use client"

// =====================================================
// PREVIEW PANEL - Renderização do Avatar com Camadas
// =====================================================
// Renderiza o avatar da LIA com composição de camadas:
// 1. Imagem base (corpo + cabeça completa)
// 2. Olhos sobrepostos (substituem os olhos da base)
// 3. Sobrancelhas sobrepostas
// 4. Boca sobreposta
//
// Os sprites são posicionados usando coordenadas
// calculadas a partir das proporções da imagem base.
// =====================================================

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { LayeredAvatarEngine } from "../engine/LayeredAvatarEngine"
import {
    AVATAR_SPRITES,
    calculateLayerPosition,
    DEFAULT_AVATAR_STATE,
    MOUTH_LABELS,
    EYES_LABELS,
    BROW_LABELS,
    type AvatarState,
    type BrowState
} from "../config/AvatarRigConfig"
import { applyCalibration } from "../config/calibration"

// =====================================================
// TIPOS E INTERFACES
// =====================================================

interface PreviewPanelProps {
    className?: string
    showDebug?: boolean
    showLabels?: boolean
    showGrid?: boolean
}

interface ImageDimensions {
    renderedWidth: number
    renderedHeight: number
    offsetX: number
    offsetY: number
    containerWidth: number
    containerHeight: number
}

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

export function PreviewPanel({
    className = '',
    showDebug = false,
    showLabels = true,
    showGrid = false
}: PreviewPanelProps) {
    // Refs
    const containerRef = useRef<HTMLDivElement>(null)
    const baseImageRef = useRef<HTMLImageElement>(null)

    // Estado do avatar (sincronizado com o engine)
    const [avatarState, setAvatarState] = useState<AvatarState>(DEFAULT_AVATAR_STATE)

    // Dimensões calculadas da imagem renderizada
    const [dimensions, setDimensions] = useState<ImageDimensions>({
        renderedWidth: 0,
        renderedHeight: 0,
        offsetX: 0,
        offsetY: 0,
        containerWidth: 0,
        containerHeight: 0
    })

    // Estado de carregamento das imagens
    const [imagesLoaded, setImagesLoaded] = useState({
        base: false,
        mouth: false,
        eyes: false,
        brows: false
    })

    // =====================================================
    // INSCRIÇÃO NO ENGINE
    // =====================================================

    useEffect(() => {
        const unsubscribe = LayeredAvatarEngine.subscribe((config) => {
            setAvatarState({
                mouthState: config.mouthFrame,
                eyesState: config.eyeFrame,
                browState: config.browFrame,
                headRotationX: config.headRotationX,
                headRotationY: config.headRotationY
            })
        })
        return unsubscribe
    }, [])

    // =====================================================
    // CÁLCULO DE DIMENSÕES
    // =====================================================

    const updateDimensions = useCallback(() => {
        const container = containerRef.current
        const image = baseImageRef.current

        if (!container || !image || !image.complete || !image.naturalWidth) {
            return
        }

        const containerRect = container.getBoundingClientRect()
        const containerWidth = containerRect.width
        const containerHeight = containerRect.height

        const naturalWidth = image.naturalWidth
        const naturalHeight = image.naturalHeight
        const imageRatio = naturalWidth / naturalHeight
        const containerRatio = containerWidth / containerHeight

        let renderedWidth: number
        let renderedHeight: number
        let offsetX: number
        let offsetY: number

        // object-fit: contain - calcular dimensões reais da imagem renderizada
        if (imageRatio > containerRatio) {
            // Imagem mais "larga" que o container - limitada pela largura
            renderedWidth = containerWidth
            renderedHeight = containerWidth / imageRatio
            offsetX = 0
            offsetY = (containerHeight - renderedHeight) / 2
        } else {
            // Imagem mais "alta" que o container - limitada pela altura
            renderedHeight = containerHeight
            renderedWidth = containerHeight * imageRatio
            offsetX = (containerWidth - renderedWidth) / 2
            offsetY = 0
        }

        setDimensions({
            renderedWidth,
            renderedHeight,
            offsetX,
            offsetY,
            containerWidth,
            containerHeight
        })
    }, [])

    // =====================================================
    // OBSERVERS E EVENT LISTENERS
    // =====================================================

    // ResizeObserver para detectar mudanças de tamanho do container
    useEffect(() => {
        const container = containerRef.current
        if (!container) return

        const observer = new ResizeObserver(() => {
            updateDimensions()
        })

        observer.observe(container)
        return () => observer.disconnect()
    }, [updateDimensions])

    // Recalcular quando imagem base carregar
    const handleBaseImageLoad = useCallback(() => {
        setImagesLoaded(prev => ({ ...prev, base: true }))
        updateDimensions()
    }, [updateDimensions])

    // =====================================================
    // CÁLCULO DAS POSIÇÕES DAS CAMADAS
    // =====================================================

    const layerPositions = useMemo(() => {
        const { renderedWidth, renderedHeight, offsetX, offsetY } = dimensions

        if (renderedWidth === 0 || renderedHeight === 0) {
            return null
        }

        // Calcular posições base
        const mouthBase = calculateLayerPosition('mouth', renderedWidth, renderedHeight, offsetX, offsetY)
        const eyesBase = calculateLayerPosition('eyes', renderedWidth, renderedHeight, offsetX, offsetY)
        const browsBase = calculateLayerPosition('brows', renderedWidth, renderedHeight, offsetX, offsetY)

        // Aplicar calibração
        return {
            mouth: applyCalibration('mouth', mouthBase, renderedWidth, renderedHeight),
            eyes: applyCalibration('eyes', eyesBase, renderedWidth, renderedHeight),
            brows: applyCalibration('brows', browsBase, renderedWidth, renderedHeight)
        }
    }, [dimensions])

    // =====================================================
    // URLs DOS SPRITES ATUAIS
    // =====================================================

    const currentSprites = useMemo(() => ({
        mouth: AVATAR_SPRITES.mouth[avatarState.mouthState],
        eyes: AVATAR_SPRITES.eyes[avatarState.eyesState],
        brows: AVATAR_SPRITES.brows[avatarState.browState.toString() as '-1' | '0' | '1']
    }), [avatarState.mouthState, avatarState.eyesState, avatarState.browState])

    // =====================================================
    // RENDER
    // =====================================================

    return (
        <div
            ref={containerRef}
            className={`relative bg-gradient-to-b from-[#1a1a2e] to-[#0f0f23] rounded-xl overflow-hidden ${className}`}
        >
            {/* ========== CAMADA BASE: Imagem completa da LIA ========== */}
            <img
                ref={baseImageRef}
                src={AVATAR_SPRITES.base}
                alt="LIA Avatar Base"
                className="w-full h-full object-contain select-none"
                onLoad={handleBaseImageLoad}
                draggable={false}
            />

            {/* ========== CAMADAS SOBREPOSTAS ========== */}
            {layerPositions && (
                <>
                    {/* CAMADA: Boca (z-index mais baixo dos elementos do rosto) */}
                    <img
                        src={currentSprites.mouth}
                        alt="Boca"
                        className="absolute select-none"
                        style={{
                            left: `${layerPositions.mouth.left}px`,
                            top: `${layerPositions.mouth.top}px`,
                            width: `${layerPositions.mouth.width}px`,
                            height: `${layerPositions.mouth.height}px`,
                            pointerEvents: 'none',
                            zIndex: 10
                        }}
                        onLoad={() => setImagesLoaded(prev => ({ ...prev, mouth: true }))}
                        draggable={false}
                    />

                    {/* CAMADA: Olhos */}
                    <img
                        src={currentSprites.eyes}
                        alt="Olhos"
                        className="absolute select-none"
                        style={{
                            left: `${layerPositions.eyes.left}px`,
                            top: `${layerPositions.eyes.top}px`,
                            width: `${layerPositions.eyes.width}px`,
                            height: `${layerPositions.eyes.height}px`,
                            pointerEvents: 'none',
                            zIndex: 11
                        }}
                        onLoad={() => setImagesLoaded(prev => ({ ...prev, eyes: true }))}
                        draggable={false}
                    />

                    {/* CAMADA: Sobrancelhas (z-index mais alto) */}
                    <img
                        src={currentSprites.brows}
                        alt="Sobrancelhas"
                        className="absolute select-none"
                        style={{
                            left: `${layerPositions.brows.left}px`,
                            top: `${layerPositions.brows.top}px`,
                            width: `${layerPositions.brows.width}px`,
                            height: `${layerPositions.brows.height}px`,
                            pointerEvents: 'none',
                            zIndex: 12
                        }}
                        onLoad={() => setImagesLoaded(prev => ({ ...prev, brows: true }))}
                        draggable={false}
                    />
                </>
            )}

            {/* ========== DEBUG OVERLAY ========== */}
            {showDebug && layerPositions && (
                <div className="absolute top-2 left-2 bg-black/90 text-white text-[9px] p-2 rounded font-mono z-50 max-w-[200px]">
                    <div className="text-[#00f3ff] font-bold mb-1">Debug Info</div>
                    <div className="text-yellow-400">Container:</div>
                    <div className="pl-2">{dimensions.containerWidth.toFixed(0)} x {dimensions.containerHeight.toFixed(0)}</div>
                    <div className="text-yellow-400 mt-1">Image Rendered:</div>
                    <div className="pl-2">{dimensions.renderedWidth.toFixed(0)} x {dimensions.renderedHeight.toFixed(0)}</div>
                    <div className="text-yellow-400 mt-1">Offset:</div>
                    <div className="pl-2">X: {dimensions.offsetX.toFixed(0)}, Y: {dimensions.offsetY.toFixed(0)}</div>
                    <hr className="my-1 border-white/20" />
                    <div className="text-green-400">Mouth:</div>
                    <div className="pl-2">L:{layerPositions.mouth.left.toFixed(0)} T:{layerPositions.mouth.top.toFixed(0)}</div>
                    <div className="pl-2">W:{layerPositions.mouth.width.toFixed(0)} H:{layerPositions.mouth.height.toFixed(0)}</div>
                    <div className="text-purple-400 mt-1">Eyes:</div>
                    <div className="pl-2">L:{layerPositions.eyes.left.toFixed(0)} T:{layerPositions.eyes.top.toFixed(0)}</div>
                    <div className="pl-2">W:{layerPositions.eyes.width.toFixed(0)} H:{layerPositions.eyes.height.toFixed(0)}</div>
                    <div className="text-red-400 mt-1">Brows:</div>
                    <div className="pl-2">L:{layerPositions.brows.left.toFixed(0)} T:{layerPositions.brows.top.toFixed(0)}</div>
                    <div className="pl-2">W:{layerPositions.brows.width.toFixed(0)} H:{layerPositions.brows.height.toFixed(0)}</div>
                </div>
            )}

            {/* ========== GRID OVERLAY (para calibração) ========== */}
            {showGrid && (
                <div
                    className="absolute inset-0 pointer-events-none z-40"
                    style={{
                        backgroundImage: `
                            linear-gradient(rgba(0,243,255,0.1) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(0,243,255,0.1) 1px, transparent 1px)
                        `,
                        backgroundSize: '50px 50px'
                    }}
                />
            )}

            {/* ========== LABELS DE ESTADO ========== */}
            {showLabels && (
                <div className="absolute bottom-3 left-3 right-3 flex justify-between text-[10px] text-white/60 font-mono z-20 bg-black/30 rounded px-2 py-1">
                    <span>Boca: {MOUTH_LABELS[avatarState.mouthState]}</span>
                    <span>Olhos: {EYES_LABELS[avatarState.eyesState]}</span>
                    <span>Sobranc: {BROW_LABELS[avatarState.browState.toString() as keyof typeof BROW_LABELS]}</span>
                </div>
            )}
        </div>
    )
}

export default PreviewPanel
