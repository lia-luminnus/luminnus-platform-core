"use client"

// =====================================================
// RIG CONTROLS - Painel de Controles do Avatar
// =====================================================

import { useState, useCallback, useEffect } from "react"
import {
    LayeredAvatarEngine
} from "../engine/LayeredAvatarEngine"
import {
    FACE_ANCHORS,
    SPRITE_DIMENSIONS
} from "../config/AvatarRigConfig"
import {
    Play,
    Pause,
    RotateCcw,
    Volume2,
    Eye,
    Smile,
    Frown,
    Meh,
    Settings2,
    ChevronDown,
    ChevronUp
} from "lucide-react"

interface RigControlsProps {
    className?: string
    onCalibrationChange?: (calibration: CalibrationValues) => void
}

// Valores de calibração que podem ser ajustados em tempo real
export interface CalibrationValues {
    eyesY: number
    browsY: number
    mouthY: number
    centerX: number
    scale: number
}

export function RigControls({ className = '', onCalibrationChange }: RigControlsProps) {
    const [mouthFrame, setMouthFrame] = useState(0)
    const [eyeFrame, setEyeFrame] = useState(0)
    const [browFrame, setBrowFrame] = useState(0)
    const [headX, setHeadX] = useState(0)
    const [headY, setHeadY] = useState(0)
    const [isAnimating, setIsAnimating] = useState(false)

    // Handlers
    const handleMouthChange = useCallback((value: number) => {
        const frame = Math.round(value) as 0 | 1 | 2
        setMouthFrame(frame)
        LayeredAvatarEngine.setMouthFrame(frame)
    }, [])

    const handleEyeChange = useCallback((value: number) => {
        const frame = Math.round(value) as 0 | 1 | 2
        setEyeFrame(frame)
        LayeredAvatarEngine.setEyeFrame(frame)
    }, [])

    const handleBrowChange = useCallback((value: number) => {
        const frame = Math.round(value) as -1 | 0 | 1
        setBrowFrame(frame)
        LayeredAvatarEngine.setBrowFrame(frame)
    }, [])

    const handleHeadChange = useCallback((x: number, y: number) => {
        setHeadX(x)
        setHeadY(y)
        LayeredAvatarEngine.setHeadRotation(x, y)
    }, [])

    const handleReset = useCallback(() => {
        setMouthFrame(0)
        setEyeFrame(0)
        setBrowFrame(0)
        setHeadX(0)
        setHeadY(0)
        LayeredAvatarEngine.setMouthFrame(0)
        LayeredAvatarEngine.setEyeFrame(0)
        LayeredAvatarEngine.setBrowFrame(0)
        LayeredAvatarEngine.setHeadRotation(0, 0)
    }, [])

    const handleToggleAnimation = useCallback(() => {
        if (isAnimating) {
            LayeredAvatarEngine.stopAnimation()
            setIsAnimating(false)
        } else {
            LayeredAvatarEngine.startAnimation()
            setIsAnimating(true)
        }
    }, [isAnimating])

    const handleTestLipSync = useCallback(() => {
        LayeredAvatarEngine.startLipSync()
        // Parar após 3 segundos
        setTimeout(() => {
            LayeredAvatarEngine.stopLipSync()
        }, 3000)
    }, [])

    return (
        <div className={`bg-[#1a1a2e] rounded-xl p-4 space-y-4 ${className}`}>
            <h3 className="text-[#00f3ff] font-bold text-sm flex items-center gap-2">
                🎛️ Controles do Rig
            </h3>

            {/* ===== BOCA ===== */}
            <div className="space-y-2">
                <label className="text-xs text-[rgba(255,255,255,0.7)] flex items-center gap-2">
                    <Smile className="w-4 h-4" />
                    Boca
                </label>
                <div className="flex items-center gap-2">
                    <input
                        type="range"
                        min="0"
                        max="2"
                        step="1"
                        value={mouthFrame}
                        onChange={(e) => handleMouthChange(Number(e.target.value))}
                        className="flex-1 h-2 bg-[rgba(255,255,255,0.1)] rounded-full appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 
              [&::-webkit-slider-thumb]:bg-[#00f3ff] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer"
                    />
                    <span className="text-xs text-[rgba(255,255,255,0.5)] w-16 text-right">
                        {['Fechada', 'Semi', 'Aberta'][mouthFrame]}
                    </span>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => handleMouthChange(0)} className={`flex-1 px-2 py-1 text-xs rounded ${mouthFrame === 0 ? 'bg-[#00f3ff] text-black' : 'bg-[rgba(255,255,255,0.1)] text-white'}`}>Fechada</button>
                    <button onClick={() => handleMouthChange(1)} className={`flex-1 px-2 py-1 text-xs rounded ${mouthFrame === 1 ? 'bg-[#00f3ff] text-black' : 'bg-[rgba(255,255,255,0.1)] text-white'}`}>Semi</button>
                    <button onClick={() => handleMouthChange(2)} className={`flex-1 px-2 py-1 text-xs rounded ${mouthFrame === 2 ? 'bg-[#00f3ff] text-black' : 'bg-[rgba(255,255,255,0.1)] text-white'}`}>Aberta</button>
                </div>
            </div>

            {/* ===== OLHOS ===== */}
            <div className="space-y-2">
                <label className="text-xs text-[rgba(255,255,255,0.7)] flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    Olhos
                </label>
                <div className="flex items-center gap-2">
                    <input
                        type="range"
                        min="0"
                        max="2"
                        step="1"
                        value={eyeFrame}
                        onChange={(e) => handleEyeChange(Number(e.target.value))}
                        className="flex-1 h-2 bg-[rgba(255,255,255,0.1)] rounded-full appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 
              [&::-webkit-slider-thumb]:bg-[#bc13fe] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer"
                    />
                    <span className="text-xs text-[rgba(255,255,255,0.5)] w-16 text-right">
                        {['Abertos', 'Semi', 'Fechados'][eyeFrame]}
                    </span>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => handleEyeChange(0)} className={`flex-1 px-2 py-1 text-xs rounded ${eyeFrame === 0 ? 'bg-[#bc13fe] text-white' : 'bg-[rgba(255,255,255,0.1)] text-white'}`}>Abertos</button>
                    <button onClick={() => handleEyeChange(1)} className={`flex-1 px-2 py-1 text-xs rounded ${eyeFrame === 1 ? 'bg-[#bc13fe] text-white' : 'bg-[rgba(255,255,255,0.1)] text-white'}`}>Semi</button>
                    <button onClick={() => handleEyeChange(2)} className={`flex-1 px-2 py-1 text-xs rounded ${eyeFrame === 2 ? 'bg-[#bc13fe] text-white' : 'bg-[rgba(255,255,255,0.1)] text-white'}`}>Fechados</button>
                </div>
            </div>

            {/* ===== SOBRANCELHAS ===== */}
            <div className="space-y-2">
                <label className="text-xs text-[rgba(255,255,255,0.7)] flex items-center gap-2">
                    <Meh className="w-4 h-4" />
                    Sobrancelhas
                </label>
                <div className="flex items-center gap-2">
                    <input
                        type="range"
                        min="-1"
                        max="1"
                        step="1"
                        value={browFrame}
                        onChange={(e) => handleBrowChange(Number(e.target.value))}
                        className="flex-1 h-2 bg-[rgba(255,255,255,0.1)] rounded-full appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 
              [&::-webkit-slider-thumb]:bg-[#ff6b6b] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer"
                    />
                    <span className="text-xs text-[rgba(255,255,255,0.5)] w-16 text-right">
                        {browFrame === -1 ? 'Franzida' : browFrame === 0 ? 'Normal' : 'Levantada'}
                    </span>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => handleBrowChange(-1)} className={`flex-1 px-2 py-1 text-xs rounded flex items-center justify-center gap-1 ${browFrame === -1 ? 'bg-[#ff6b6b] text-white' : 'bg-[rgba(255,255,255,0.1)] text-white'}`}><Frown className="w-3 h-3" />Franzida</button>
                    <button onClick={() => handleBrowChange(0)} className={`flex-1 px-2 py-1 text-xs rounded flex items-center justify-center gap-1 ${browFrame === 0 ? 'bg-[#ff6b6b] text-white' : 'bg-[rgba(255,255,255,0.1)] text-white'}`}><Meh className="w-3 h-3" />Normal</button>
                    <button onClick={() => handleBrowChange(1)} className={`flex-1 px-2 py-1 text-xs rounded flex items-center justify-center gap-1 ${browFrame === 1 ? 'bg-[#ff6b6b] text-white' : 'bg-[rgba(255,255,255,0.1)] text-white'}`}><Smile className="w-3 h-3" />Levantada</button>
                </div>
            </div>

            {/* ===== CABEÇA ===== */}
            <div className="space-y-2">
                <label className="text-xs text-[rgba(255,255,255,0.7)]">🗣️ Cabeça (Rotação)</label>
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <span className="text-[10px] text-[rgba(255,255,255,0.5)]">Horizontal (X)</span>
                        <input
                            type="range"
                            min="-10"
                            max="10"
                            step="1"
                            value={headX}
                            onChange={(e) => handleHeadChange(Number(e.target.value), headY)}
                            className="w-full h-2 bg-[rgba(255,255,255,0.1)] rounded-full appearance-none cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 
                [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
                        />
                    </div>
                    <div>
                        <span className="text-[10px] text-[rgba(255,255,255,0.5)]">Vertical (Y)</span>
                        <input
                            type="range"
                            min="-10"
                            max="10"
                            step="1"
                            value={headY}
                            onChange={(e) => handleHeadChange(headX, Number(e.target.value))}
                            className="w-full h-2 bg-[rgba(255,255,255,0.1)] rounded-full appearance-none cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 
                [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
                        />
                    </div>
                </div>
            </div>

            {/* ===== AÇÕES ===== */}
            <div className="pt-2 border-t border-[rgba(255,255,255,0.1)] space-y-2">
                <div className="flex gap-2">
                    <button
                        onClick={handleToggleAnimation}
                        className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${isAnimating
                                ? 'bg-red-500/20 text-red-400 border border-red-500/50'
                                : 'bg-green-500/20 text-green-400 border border-green-500/50'
                            }`}
                    >
                        {isAnimating ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        {isAnimating ? 'Parar' : 'Animar'}
                    </button>

                    <button
                        onClick={handleReset}
                        className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-[rgba(255,255,255,0.1)] text-white hover:bg-[rgba(255,255,255,0.2)] transition-all"
                    >
                        <RotateCcw className="w-4 h-4" />
                        Reset
                    </button>
                </div>

                <button
                    onClick={handleTestLipSync}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-[#00f3ff]/20 text-[#00f3ff] border border-[#00f3ff]/50 hover:bg-[#00f3ff]/30 transition-all"
                >
                    <Volume2 className="w-4 h-4" />
                    Testar Lip-Sync (3s)
                </button>
            </div>
        </div>
    )
}

export default RigControls
