/**
 * ✅ StartVoiceButton - Botão para ativar/desativar Gemini Live
 * COM SELETOR EMBUTIDO para modo Auto-Diagnóstico (Admin-Only)
 * 
 * Usado em Multi-Modal Mode e Live Mode
 * O dropdown só aparece se isAdminPanel = true
 */

import React, { useState, useRef, useEffect } from 'react';
import { useLIA } from '@/context/LIAContext';
import { ChevronDown } from 'lucide-react';

// Tipos para o modo LIA
export type LiaMode = 'NORMAL' | 'DIAGNOSTIC';

interface StartVoiceButtonProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  isAdminPanel?: boolean; // Se true, mostra o seletor de modo
  onModeChange?: (mode: LiaMode) => void; // Callback quando o modo muda
}

export function StartVoiceButton({
  size = 'md',
  className = '',
  isAdminPanel = false,
  onModeChange,
}: StartVoiceButtonProps) {
  const {
    isLiveActive,
    isListening,
    startLiveMode,
    stopLiveMode,
    isConnected,
  } = useLIA();

  // Estado do modo LIA (persistido apenas no Admin)
  const [liaMode, setLiaMode] = useState<LiaMode>(() => {
    if (!isAdminPanel) return 'NORMAL';
    return (localStorage.getItem('admin_lia_mode') as LiaMode) || 'NORMAL';
  });

  // Estado do dropdown
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Persistir modo no localStorage (apenas Admin)
  useEffect(() => {
    if (isAdminPanel) {
      localStorage.setItem('admin_lia_mode', liaMode);
      console.log(`🔧 [LIA Mode] Changed to: ${liaMode}`);
    }
  }, [liaMode, isAdminPanel]);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base',
  };

  const handleToggle = async () => {
    if (isLiveActive) {
      await stopLiveMode();
    } else {
      // Injetar o modo na sessão antes de iniciar
      if (isAdminPanel && liaMode === 'DIAGNOSTIC') {
        console.log('🔧 [LIA] Starting in DIAGNOSTIC mode...');
        // O modo será passado para o backend via contexto
      }
      await startLiveMode();
    }
  };

  const handleModeSelect = (mode: LiaMode) => {
    setLiaMode(mode);
    setIsDropdownOpen(false);
    onModeChange?.(mode);
  };

  // Estilos base do botão
  const baseStyles = `
    rounded-lg transition-all font-medium whitespace-nowrap
    ${isLiveActive
      ? 'bg-[rgba(255,0,255,0.2)] border border-[#ff00ff] text-[#ff00ff] shadow-[0_0_10px_rgba(255,0,255,0.3)]'
      : liaMode === 'DIAGNOSTIC'
        ? 'bg-[rgba(255,165,0,0.2)] border-2 border-[rgba(255,165,0,0.6)] text-[#ffa500] hover:border-[#ffa500]'
        : 'bg-[rgba(0,243,255,0.1)] border-2 border-[rgba(0,243,255,0.3)] text-[rgba(224,247,255,0.8)] hover:text-[#00f3ff] hover:border-[#00f3ff]'
    }
    disabled:opacity-50 disabled:cursor-not-allowed
    ${sizeClasses[size]}
    ${className}
  `;

  // Se não for Admin, renderiza botão simples (sem dropdown)
  if (!isAdminPanel) {
    return (
      <button
        onClick={handleToggle}
        disabled={!isConnected && !isLiveActive}
        className={baseStyles}
        title={isLiveActive ? 'Parar conversa por voz' : 'Iniciar conversa por voz (Gemini Live)'}
      >
        {isLiveActive ? (
          <span className="flex items-center gap-2">
            Parar de falar 🔇
            {isListening && (
              <span className="inline-block w-2 h-2 bg-[#ff00ff] rounded-full animate-ping" />
            )}
          </span>
        ) : (
          <span>Começar a falar 🗣️</span>
        )}
      </button>
    );
  }

  // Admin: Renderiza split-button com dropdown
  return (
    <div className="relative inline-flex" ref={dropdownRef}>
      {/* Botão principal */}
      <button
        onClick={handleToggle}
        disabled={!isConnected && !isLiveActive}
        className={`
          ${baseStyles}
          rounded-r-none border-r-0
        `}
        title={isLiveActive ? 'Parar conversa por voz' : `Iniciar conversa (${liaMode === 'DIAGNOSTIC' ? 'Diagnóstico' : 'Normal'})`}
      >
        {isLiveActive ? (
          <span className="flex items-center gap-1.5">
            Ouvindo... 🔇
            {isListening && (
              <span className="inline-block w-1.5 h-1.5 bg-[#ff00ff] rounded-full animate-ping" />
            )}
          </span>
        ) : (
          <span className="flex items-center gap-1">
            {liaMode === 'DIAGNOSTIC' ? '🔧 Diagnóstico' : 'Falar 🗣️'}
          </span>
        )}
      </button>

      {/* Botão do dropdown (seta) */}
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        disabled={!isConnected || isLiveActive}
        className={`
          ${isLiveActive
            ? 'bg-[rgba(255,0,255,0.3)] border-2 border-[#ff00ff] text-[#ff00ff]'
            : liaMode === 'DIAGNOSTIC'
              ? 'bg-[rgba(255,165,0,0.2)] border-2 border-[rgba(255,165,0,0.6)] text-[#ffa500] hover:border-[#ffa500]'
              : 'bg-[rgba(0,243,255,0.1)] border-2 border-[rgba(0,243,255,0.3)] text-[rgba(224,247,255,0.8)] hover:text-[#00f3ff] hover:border-[#00f3ff]'
          }
          px-2 py-2 rounded-lg rounded-l-none transition-all
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
        title="Selecionar modo"
      >
        <ChevronDown className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown menu */}
      {isDropdownOpen && (
        <div className="absolute top-full right-0 mt-1 w-48 bg-[#1a1a2e] border border-[rgba(0,243,255,0.3)] rounded-lg shadow-xl z-50 overflow-hidden">
          <button
            onClick={() => handleModeSelect('NORMAL')}
            className={`w-full px-4 py-3 text-left text-sm transition-colors flex items-center gap-2
              ${liaMode === 'NORMAL'
                ? 'bg-[rgba(0,243,255,0.2)] text-[#00f3ff]'
                : 'text-gray-300 hover:bg-[rgba(0,243,255,0.1)]'
              }
            `}
          >
            <span>🗣️</span>
            <div>
              <div className="font-medium">Começar a Falar (Normal)</div>
              <div className="text-xs text-gray-500">Conversa padrão com LIA</div>
            </div>
            {liaMode === 'NORMAL' && <span className="ml-auto">✓</span>}
          </button>

          <div className="border-t border-[rgba(255,165,0,0.2)]" />

          <button
            onClick={() => handleModeSelect('DIAGNOSTIC')}
            className={`w-full px-4 py-3 text-left text-sm transition-colors flex items-center gap-2
              ${liaMode === 'DIAGNOSTIC'
                ? 'bg-[rgba(255,165,0,0.2)] text-[#ffa500]'
                : 'text-gray-300 hover:bg-[rgba(255,165,0,0.1)]'
              }
            `}
          >
            <span>🔧</span>
            <div>
              <div className="font-medium">Auto-Diagnóstico</div>
              <div className="text-xs text-gray-500">Modo SRE/DevOps</div>
            </div>
            {liaMode === 'DIAGNOSTIC' && <span className="ml-auto">✓</span>}
          </button>
        </div>
      )}
    </div>
  );
}
