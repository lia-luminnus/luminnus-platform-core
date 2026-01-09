/**
 * ✅ MARKDOWN RENDERER - Dashboard-client version
 * 
 * Renderiza texto com suporte a blocos de código (Markdown)
 * Inclui cabeçalho de linguagem, botão "Copiar código" e Highlighting.
 */

import React, { useState, useCallback } from 'react';
import { Copy, Check, Terminal } from 'lucide-react';

interface MarkdownRendererProps {
    content: string;
    className?: string;
}

export function MarkdownRenderer({ content: rawContent, className = '' }: MarkdownRendererProps) {
    // Garantir que content seja uma string e tratar objetos do backend
    const content = typeof rawContent === 'string'
        ? rawContent
        : (rawContent as any)?.text || (rawContent as any)?.chatPayload || (rawContent as any)?.message || JSON.stringify(rawContent);

    const codeBlockRegex = /```(\w+)?([\s\S]*?)```/g;

    const sections: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    // Função para converter URLs em links clicáveis
    const renderTextWithLinks = (text: string, key: string) => {
        const urlRegex = /(https?:\/\/[^\s\[\]()]+)/g;
        const parts = text.split(urlRegex);

        return (
            <p key={key} className="whitespace-pre-wrap mb-4 last:mb-0">
                {parts.map((part, i) => {
                    if (urlRegex.test(part)) {
                        urlRegex.lastIndex = 0;
                        return (
                            <a
                                key={i}
                                href={part}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-cyan-400 hover:text-cyan-300 underline break-all transition-colors"
                            >
                                {part}
                            </a>
                        );
                    }
                    return part;
                })}
            </p>
        );
    };

    // Se não houver blocos de código, renderiza como texto
    if (!content.includes('```')) {
        return <div className={`markdown-content w-full ${className}`}>{renderTextWithLinks(content, 'text-main')}</div>;
    }

    while ((match = codeBlockRegex.exec(content)) !== null) {
        if (match.index > lastIndex) {
            sections.push(
                renderTextWithLinks(content.substring(lastIndex, match.index), `text-${lastIndex}`)
            );
        }

        const language = (match[1] || 'text').toLowerCase().trim();
        const code = match[2].trim();

        sections.push(
            <CodeBlock key={`code-${match.index}`} language={language} code={code} />
        );

        lastIndex = match.index + match[0].length;
    }

    if (lastIndex < content.length) {
        sections.push(
            renderTextWithLinks(content.substring(lastIndex), `text-${lastIndex}`)
        );
    }

    return (
        <div className={`markdown-content w-full ${className}`}>
            {sections}
        </div>
    );
}

/**
 * Função para aplicar cores ao código
 */
function highlightCode(code: string, lang: string) {
    let escaped = code.replace(/[&<>"']/g, m => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    }[m]!));

    if (lang === 'json') {
        return escaped
            .replace(/"([^"]+)":/g, '<span style="color: #9cdcfe;">"$1"</span>:')
            .replace(/: ("[^"]*")/g, ': <span style="color: #ce9178;">$1</span>')
            .replace(/: (-?\d+\.?\d*)/g, ': <span style="color: #b5cea8;">$1</span>')
            .replace(/: (true|false|null)/g, ': <span style="color: #569cd6;">$1</span>');
    }

    if (lang === 'javascript' || lang === 'typescript' || lang === 'js' || lang === 'ts') {
        return escaped
            .replace(/\b(const|let|var|function|return|if|else|for|while|import|export|from|class|extends|new|async|await)\b/g, '<span style="color: #c586c0;">$1</span>')
            .replace(/\b(console|window|document|Math|JSON)\b/g, '<span style="color: #4ec9b0;">$1</span>')
            .replace(/(&quot;[^&]*&quot;|'[^']*'|`[^`]*`)/g, '<span style="color: #ce9178;">$1</span>')
            .replace(/\/\/.*/g, '<span style="color: #6a9955;">$&</span>');
    }

    return escaped;
}

/**
 * Sub-componente para o bloco de código
 */
function CodeBlock({ language, code }: { language: string; code: string }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = useCallback(async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        let successful = false;

        try {
            if (navigator.clipboard && window.isSecureContext) {
                try {
                    await navigator.clipboard.writeText(code);
                    successful = true;
                } catch (apiErr) {
                    console.warn('Clipboard API failed, trying fallback...');
                }
            }

            if (!successful) {
                const textArea = document.createElement("textarea");
                textArea.value = code;
                textArea.style.position = 'fixed';
                textArea.style.left = '-9999px';
                textArea.style.top = '0';
                textArea.style.opacity = '0';
                document.body.appendChild(textArea);
                textArea.select();
                try {
                    successful = document.execCommand('copy');
                } catch (cmdErr) {
                    console.error('execCommand failed:', cmdErr);
                }
                document.body.removeChild(textArea);
            }

            if (successful) {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            }
        } catch (err) {
            console.error('Erro ao copiar:', err);
        }
    }, [code]);

    return (
        <div className="relative my-4 rounded-xl overflow-hidden border border-white/10 bg-[#0d1117]">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 bg-[#161b22] border-b border-white/5">
                <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-cyan-400 opacity-70" />
                    <span className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-wider">{language || 'code'}</span>
                </div>

                <button
                    onClick={handleCopy}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all border ${copied
                        ? 'text-green-400 bg-green-500/10 border-green-500/20'
                        : 'text-gray-400 bg-white/5 border-white/10 hover:text-cyan-400 hover:bg-cyan-500/10'
                        }`}
                    type="button"
                >
                    {copied ? (
                        <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Copiado!</span>
                        </>
                    ) : (
                        <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copiar</span>
                        </>
                    )}
                </button>
            </div>

            {/* Code */}
            <div className="p-4 overflow-x-auto">
                <pre className="font-mono text-sm leading-relaxed text-gray-100 whitespace-pre">
                    <code
                        className={`language-${language}`}
                        dangerouslySetInnerHTML={{ __html: highlightCode(code, language) }}
                    />
                </pre>
            </div>
        </div>
    );
}
