/**
 * LIAMessageRenderer v1.0
 * 
 * Wrapper component that combines MarkdownRenderer with QuickActionsBar
 * for MODE A (Incident) responses. This is the unified message display
 * component for LIA responses.
 * 
 * Part of the SSOT LIA File Reading Protocol enforcement.
 */

import React, { useMemo } from 'react';
import { MarkdownRenderer } from './MarkdownRenderer';
import { QuickActionsBar, shouldShowQuickActions as detectIncidentResponse, extractContextHints } from './QuickActionsBar';
import { suggestQuickActions } from './services/responseGate';
import { QuickAction } from './services/intentRouter';

// ============================================
// Types
// ============================================

interface LIAMessageRendererProps {
    content: string;
    className?: string;
    userMessage?: string;
    intentMode?: 'A' | 'B' | 'C' | null;
    onToolInvoke?: (toolName: string, params?: Record<string, any>) => void;
    showQuickActions?: boolean;
    metadata?: any;
    userRole?: string;
}

// ============================================
// Component
// ============================================

export function LIAMessageRenderer({
    content,
    className = '',
    userMessage = '',
    intentMode = null,
    onToolInvoke,
    showQuickActions = true,
    metadata = null,
    userRole = 'client',
}: LIAMessageRendererProps) {

    // Determine if we should show quick actions
    const shouldShowActions = useMemo(() => {
        if (!showQuickActions) return false;
        if (intentMode === 'A' || intentMode === 'C') return true;
        return detectIncidentResponse(content);
    }, [content, intentMode, showQuickActions]);

    // Generate quick actions based on context
    const quickActions = useMemo((): QuickAction[] => {
        // v9.1: Prioritize metadata actions (from ResponseGate)
        if (metadata?.quickActions) return metadata.quickActions;

        if (!shouldShowActions) return [];

        const contextHints = extractContextHints(userMessage + ' ' + content);
        const mode = intentMode || 'A';

        return suggestQuickActions(mode, userMessage, contextHints, userRole);
    }, [shouldShowActions, userMessage, content, intentMode, metadata?.quickActions, userRole]);

    // Handle action click
    const handleActionClick = (action: QuickAction) => {
        console.log(`[LIAMessageRenderer] Ação clicada: ${action.toolName}`, action.params);

        if (onToolInvoke) {
            onToolInvoke(action.toolName, action.params);
        } else {
            // Dispatch event for global handling
            window.dispatchEvent(new CustomEvent('lia-tool-invoke', {
                detail: {
                    toolName: action.toolName,
                    params: action.params || {},
                    timestamp: Date.now(),
                }
            }));
        }
    };

    return (
        <div className={`lia-message-renderer ${className}`}>
            <MarkdownRenderer content={content} />

            {shouldShowActions && quickActions.length > 0 && (
                <QuickActionsBar
                    actions={quickActions}
                    onActionClick={handleActionClick}
                />
            )}
        </div>
    );
}

export default LIAMessageRenderer;
