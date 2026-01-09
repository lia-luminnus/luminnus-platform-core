"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Clock, Wifi, WifiOff, Eye, EyeOff, Volume2, VolumeX } from "lucide-react"
import type { LIAState } from "./AvatarLIA"

// ================================================================
// TIPOS
// ================================================================

interface SmartHUDProps {
    state: LIAState
    isConnected: boolean
    timeElapsed: string
    onFocusLIA?: () => void
    onToggleMute?: () => void
    isMuted?: boolean
    className?: string
}

// ================================================================
// CONSTANTS
// ================================================================

const HIDE_DELAY_MS = 5000;   // Hide after 5s of inactivity
const THROTTLE_MS = 500;       // Throttle activity events

// ================================================================
// COMPONENTE
// ================================================================

export function SmartHUD({
    state,
    isConnected,
    timeElapsed,
    onFocusLIA,
    onToggleMute,
    isMuted = false,
    className = ''
}: SmartHUDProps) {
    const [isVisible, setIsVisible] = useState(true);

    // CRITICAL: Use refs to avoid triggering re-renders on every mouse move
    const lastActivityRef = useRef(Date.now());
    const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const throttleRef = useRef(false);

    // ================================================================
    // Auto-hide logic - runs when state changes ONLY
    // ================================================================
    useEffect(() => {
        // Clear any existing timer
        if (hideTimerRef.current) {
            clearTimeout(hideTimerRef.current);
            hideTimerRef.current = null;
        }

        // Always visible when not in standby
        if (state !== 'standby') {
            setIsVisible(true);
            return;
        }

        // In standby: set timer to hide
        const checkAndHide = () => {
            const elapsed = Date.now() - lastActivityRef.current;
            if (elapsed >= HIDE_DELAY_MS) {
                setIsVisible(false);
            } else {
                // Check again after remaining time
                hideTimerRef.current = setTimeout(checkAndHide, HIDE_DELAY_MS - elapsed);
            }
        };

        hideTimerRef.current = setTimeout(checkAndHide, HIDE_DELAY_MS);

        return () => {
            if (hideTimerRef.current) {
                clearTimeout(hideTimerRef.current);
            }
        };
    }, [state]); // ONLY depends on state, NOT on lastActivity

    // ================================================================
    // Activity handler - THROTTLED to prevent render loops
    // ================================================================
    const handleActivity = useCallback(() => {
        // Throttle: ignore events within THROTTLE_MS of last one
        if (throttleRef.current) return;

        throttleRef.current = true;
        setTimeout(() => {
            throttleRef.current = false;
        }, THROTTLE_MS);

        // Update ref (no re-render)
        lastActivityRef.current = Date.now();

        // Show HUD if hidden
        setIsVisible(prev => {
            // Only trigger state change if actually hidden
            if (!prev) return true;
            return prev; // Same value = no re-render
        });

        // Reset hide timer
        if (hideTimerRef.current) {
            clearTimeout(hideTimerRef.current);
        }

        if (state === 'standby') {
            hideTimerRef.current = setTimeout(() => {
                const elapsed = Date.now() - lastActivityRef.current;
                if (elapsed >= HIDE_DELAY_MS) {
                    setIsVisible(false);
                }
            }, HIDE_DELAY_MS);
        }
    }, [state]); // Only depends on state

    // ================================================================
    // Event listeners
    // ================================================================
    useEffect(() => {
        window.addEventListener('mousemove', handleActivity, { passive: true });
        window.addEventListener('keydown', handleActivity, { passive: true });

        return () => {
            window.removeEventListener('mousemove', handleActivity);
            window.removeEventListener('keydown', handleActivity);
        };
    }, [handleActivity]);

    // Labels e cores por estado
    const stateConfig = {
        standby: { label: 'STANDBY', color: 'text-[rgba(224,247,255,0.5)]', bg: 'bg-[rgba(0,0,0,0.3)]' },
        listening: { label: 'OUVINDO', color: 'text-[#ff00ff]', bg: 'bg-[rgba(255,0,255,0.15)]' },
        presenting_lia: { label: 'APRESENTANDO', color: 'text-[#00f3ff]', bg: 'bg-[rgba(0,243,255,0.15)]' },
        presenting_content: { label: 'CONTEÚDO', color: 'text-[#bc13fe]', bg: 'bg-[rgba(188,19,254,0.15)]' },
        processing: { label: 'PROCESSANDO', color: 'text-[#bc13fe]', bg: 'bg-[rgba(188,19,254,0.15)]' }
    };

    const config = stateConfig[state];

    return (
        <div
            className={`fixed bottom-20 right-4 md:right-8 z-30 transition-all duration-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
                } ${className}`}
        >
            <div className={`flex items-center gap-3 px-4 py-2 rounded-full backdrop-blur-xl border border-[rgba(255,255,255,0.1)] ${config.bg}`}>
                {/* Connection Status */}
                <div className="flex items-center gap-1.5">
                    {isConnected ? (
                        <Wifi className="w-3.5 h-3.5 text-green-400" />
                    ) : (
                        <WifiOff className="w-3.5 h-3.5 text-red-400" />
                    )}
                </div>

                {/* Divider */}
                <div className="w-px h-4 bg-[rgba(255,255,255,0.1)]" />

                {/* State */}
                <div className={`text-xs font-bold ${config.color}`}>
                    {config.label}
                </div>

                {/* Divider */}
                <div className="w-px h-4 bg-[rgba(255,255,255,0.1)]" />

                {/* Timer */}
                <div className="flex items-center gap-1.5 text-[rgba(224,247,255,0.6)]">
                    <Clock className="w-3 h-3" />
                    <span className="text-xs font-mono">{timeElapsed}</span>
                </div>

                {/* Focus Button */}
                {onFocusLIA && (
                    <>
                        <div className="w-px h-4 bg-[rgba(255,255,255,0.1)]" />
                        <button
                            onClick={onFocusLIA}
                            className="text-[rgba(224,247,255,0.6)] hover:text-[#00f3ff] transition-colors"
                            title="Focar na LIA"
                        >
                            <Eye className="w-4 h-4" />
                        </button>
                    </>
                )}

                {/* Mute Button */}
                {onToggleMute && (
                    <>
                        <div className="w-px h-4 bg-[rgba(255,255,255,0.1)]" />
                        <button
                            onClick={onToggleMute}
                            className={`transition-colors ${isMuted ? 'text-red-400' : 'text-[rgba(224,247,255,0.6)] hover:text-[#00f3ff]'}`}
                            title={isMuted ? 'Ativar som' : 'Mutar'}
                        >
                            {isMuted ? (
                                <VolumeX className="w-4 h-4" />
                            ) : (
                                <Volume2 className="w-4 h-4" />
                            )}
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}

export default SmartHUD;
