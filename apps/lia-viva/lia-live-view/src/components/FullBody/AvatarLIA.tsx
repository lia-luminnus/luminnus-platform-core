"use client"

import { useState, useEffect, useRef } from "react"

// ================================================================
// TIPOS
// ================================================================

export type LIAState = 'standby' | 'listening' | 'presenting_lia' | 'presenting_content' | 'processing'

interface AvatarLIAProps {
    state: LIAState
    position?: 'center' | 'left' | 'right'
    size?: 'normal' | 'large' | 'small'
    className?: string
}

// URL do avatar full body
const LIA_FULLBODY_URL = "/images/lia-bust.png"

// ================================================================
// COMPONENTE
// ================================================================

export function AvatarLIA({
    state = 'standby',
    position = 'center',
    size = 'normal',
    className = ''
}: AvatarLIAProps) {
    // Mouse tracking para parallax 3D
    const [mouseOffset, setMouseOffset] = useState({ x: 0, y: 0 })
    const containerRef = useRef<HTMLDivElement>(null)

    // Parallax tracking
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!containerRef.current) return

            const rect = containerRef.current.getBoundingClientRect()
            const centerX = rect.left + rect.width / 2
            const centerY = rect.top + rect.height / 2

            // Offset suave (máx ±15px)
            const offsetX = ((e.clientX - centerX) / window.innerWidth) * 15
            const offsetY = ((e.clientY - centerY) / window.innerHeight) * 10

            setMouseOffset({ x: offsetX, y: offsetY })
        }

        window.addEventListener('mousemove', handleMouseMove)
        return () => window.removeEventListener('mousemove', handleMouseMove)
    }, [])

    // Tamanho baseado no prop
    const sizeClasses = {
        small: 'w-[200px] h-[300px] md:w-[250px] md:h-[380px]',
        normal: 'w-[300px] h-[450px] md:w-[380px] md:h-[560px]',
        large: 'w-[380px] h-[560px] md:w-[480px] md:h-[700px]'
    }

    // Posição baseada no prop
    const positionClasses = {
        center: 'left-1/2 -translate-x-1/2',
        left: 'left-4 md:left-16',
        right: 'right-4 md:right-16'
    }

    // Glow baseado no estado
    const getGlowStyle = () => {
        switch (state) {
            case 'listening':
                return 'drop-shadow-[0_0_50px_rgba(255,0,255,0.7)] scale-[1.02]'
            case 'presenting_lia':
                return 'drop-shadow-[0_0_60px_rgba(0,243,255,0.8)] scale-[1.05]'
            case 'presenting_content':
                return 'drop-shadow-[0_0_30px_rgba(0,243,255,0.4)] scale-[0.95] opacity-90'
            case 'processing':
                return 'drop-shadow-[0_0_40px_rgba(188,19,254,0.7)] animate-pulse'
            default: // standby
                return 'drop-shadow-[0_0_30px_rgba(0,243,255,0.3)]'
        }
    }

    // Status badge
    const getStatusBadge = () => {
        const badges = {
            standby: { text: 'STANDBY', color: 'bg-[rgba(0,243,255,0.2)] text-[#00f3ff]', animate: false },
            listening: { text: 'OUVINDO', color: 'bg-[rgba(255,0,255,0.9)] text-white', animate: true },
            presenting_lia: { text: 'APRESENTANDO', color: 'bg-[rgba(0,243,255,0.9)] text-[#0a0e1a]', animate: true },
            presenting_content: { text: 'ASSISTENTE', color: 'bg-[rgba(188,19,254,0.7)] text-white', animate: false },
            processing: { text: 'PROCESSANDO', color: 'bg-[rgba(188,19,254,0.9)] text-white', animate: true }
        }
        return badges[state]
    }

    const badge = getStatusBadge()

    return (
        <div
            ref={containerRef}
            className={`absolute ${positionClasses[position]} flex items-center justify-center z-10 pointer-events-none transition-all duration-500 ease-out ${className}`}
            style={{
                transform: position === 'center'
                    ? `translateX(-50%) translateX(${mouseOffset.x}px) translateY(${mouseOffset.y}px)`
                    : `translateX(${mouseOffset.x}px) translateY(${mouseOffset.y}px)`
            }}
        >
            <div className="relative">
                {/* Holographic Frame - Corner brackets */}
                <div className="absolute -inset-4 md:-inset-6">
                    {/* Top Left */}
                    <div className="absolute top-0 left-0 w-12 h-12 md:w-16 md:h-16">
                        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-[#00f3ff] to-transparent shadow-[0_0_10px_rgba(0,243,255,0.8)]" />
                        <div className="absolute top-0 left-0 h-full w-[2px] bg-gradient-to-b from-[#00f3ff] to-transparent shadow-[0_0_10px_rgba(0,243,255,0.8)]" />
                    </div>
                    {/* Top Right */}
                    <div className="absolute top-0 right-0 w-12 h-12 md:w-16 md:h-16">
                        <div className="absolute top-0 right-0 w-full h-[2px] bg-gradient-to-l from-[#00f3ff] to-transparent shadow-[0_0_10px_rgba(0,243,255,0.8)]" />
                        <div className="absolute top-0 right-0 h-full w-[2px] bg-gradient-to-b from-[#00f3ff] to-transparent shadow-[0_0_10px_rgba(0,243,255,0.8)]" />
                    </div>
                    {/* Bottom Left */}
                    <div className="absolute bottom-0 left-0 w-12 h-12 md:w-16 md:h-16">
                        <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-[#bc13fe] to-transparent shadow-[0_0_10px_rgba(188,19,254,0.8)]" />
                        <div className="absolute bottom-0 left-0 h-full w-[2px] bg-gradient-to-t from-[#bc13fe] to-transparent shadow-[0_0_10px_rgba(188,19,254,0.8)]" />
                    </div>
                    {/* Bottom Right */}
                    <div className="absolute bottom-0 right-0 w-12 h-12 md:w-16 md:h-16">
                        <div className="absolute bottom-0 right-0 w-full h-[2px] bg-gradient-to-l from-[#bc13fe] to-transparent shadow-[0_0_10px_rgba(188,19,254,0.8)]" />
                        <div className="absolute bottom-0 right-0 h-full w-[2px] bg-gradient-to-t from-[#bc13fe] to-transparent shadow-[0_0_10px_rgba(188,19,254,0.8)]" />
                    </div>
                </div>

                {/* LIA Image */}
                <div className={`relative ${sizeClasses[size]} transition-all duration-500 ease-out`}>
                    <img
                        src={LIA_FULLBODY_URL}
                        alt="LIA Viva - Avatar"
                        className={`w-full h-full object-contain transition-all duration-500 ${getGlowStyle()}`}
                    />

                    {/* Scanline overlay */}
                    <div
                        className="absolute inset-0 pointer-events-none opacity-10"
                        style={{
                            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,243,255,0.1) 2px, rgba(0,243,255,0.1) 4px)',
                        }}
                    />

                    {/* Ambient glow (standby only) */}
                    {state === 'standby' && (
                        <div className="absolute inset-0 bg-gradient-radial from-[rgba(0,243,255,0.05)] to-transparent animate-pulse pointer-events-none" />
                    )}
                </div>

                {/* Status Badge */}
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 z-20">
                    <div className={`px-4 py-2 rounded-full text-xs font-bold ${badge.color} ${badge.animate ? 'animate-pulse' : ''} flex items-center gap-2 shadow-lg`}>
                        {badge.animate && (
                            <div className="w-2 h-2 bg-current rounded-full animate-ping" />
                        )}
                        {badge.text}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default AvatarLIA
