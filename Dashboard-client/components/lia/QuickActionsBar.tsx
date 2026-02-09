/**
 * QuickActionsBar v1.0
 * 
 * Renders 2-3 action buttons at the end of MODE A (Incident) responses.
 * These buttons allow users to quickly execute suggested tools.
 * 
 * Part of the SSOT LIA File Reading Protocol enforcement.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Mail, Terminal, Zap, RefreshCw, Activity, File, Shield, Send, Download, ClipboardList } from 'lucide-react';
import { QuickAction } from './services/intentRouter';

console.log('⚡ [QuickActionsBar] Carregado');

// ============================================
// Types
// ============================================

interface QuickActionsBarProps {
    actions: QuickAction[];
    onActionClick: (action: QuickAction) => void;
    isLoading?: boolean;
}

// ============================================
// Icon Mapping
// ============================================

function getIcon(iconName: string) {
    const iconMap: Record<string, React.ReactNode> = {
        'mail': <Mail className="w-4 h-4" />,
        'terminal': <Terminal className="w-4 h-4" />,
        'zap': <Zap className="w-4 h-4" />,
        'refresh-cw': <RefreshCw className="w-4 h-4" />,
        'activity': <Activity className="w-4 h-4" />,
        'file': <File className="w-4 h-4" />,
        'shield': <Shield className="w-4 h-4" />,
        'send': <Send className="w-4 h-4" />,
        'list': <ClipboardList className="w-4 h-4" />,
        'download': <Download className="w-4 h-4" />,
    };
    return iconMap[iconName] || <Zap className="w-4 h-4" />;
}

// ============================================
// Component
// ============================================

export function QuickActionsBar({ actions, onActionClick, isLoading = false }: QuickActionsBarProps) {
    if (!actions || actions.length === 0) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-4 pt-3 border-t border-white/10"
        >

            <div className="flex flex-wrap gap-2">
                {actions.map((action, index) => (
                    <motion.button
                        key={action.toolName}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1 * index }}
                        onClick={() => onActionClick(action)}
                        disabled={isLoading}
                        className={`
                            flex items-center gap-2 px-3 py-2 rounded-lg
                            bg-cyan-500/10 border border-cyan-500/30
                            text-cyan-400 text-sm font-medium
                            hover:bg-cyan-500/20 hover:border-cyan-500/50
                            transition-all duration-200
                            disabled:opacity-50 disabled:cursor-not-allowed
                        `}
                    >
                        {getIcon(action.icon)}
                        <span>{action.label}</span>
                    </motion.button>
                ))}
            </div>
        </motion.div>
    );
}

// ============================================
// Detector for MODE A responses
// ============================================

export function shouldShowQuickActions(responseContent: string): boolean {
    // Check if response looks like a MODE A (Incident) response
    const incidentPatterns = [
        /\*\*(?:achado|evidência|causa|correção|validação)/i,
        /(?:correção\s*mínima|como\s*corrigir|passos?\s*para\s*corrigir)/i,
        /(?:validação|como\s*validar|para\s*verificar)/i,
    ];

    let matchCount = 0;
    for (const pattern of incidentPatterns) {
        if (pattern.test(responseContent)) {
            matchCount++;
        }
    }

    // If at least 2 patterns match, it's likely a MODE A response
    return matchCount >= 2;
}

// ============================================
// Context hints extractor
// ============================================

export function extractContextHints(content: string): string[] {
    const hints: string[] = [];

    if (/e-?mail|resend|inbox|enviado|smtp/i.test(content)) {
        hints.push('email');
    }
    if (/console|log|stack|trace|404|500|exception/i.test(content)) {
        hints.push('console');
    }
    if (/integra[çc][ãa]o|oauth|google|conexão/i.test(content)) {
        hints.push('integrations');
    }
    if (/database|db|sql|query|postgres|supabase/i.test(content)) {
        hints.push('database');
    }

    return hints;
}

export default QuickActionsBar;
