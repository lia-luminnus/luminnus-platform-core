/**
 * ✅ MARKDOWN RENDERER (V3 - Final Robust Version)
 * 
 * Renderiza texto com suporte a blocos de código (Markdown)
 * Inclui cabeçalho de linguagem, botão "Copiar código" robusto e Highlighting.
 */

import React, { useState, useCallback } from 'react';
import { Copy, Check, Terminal } from 'lucide-react';

interface MarkdownRendererProps {
    content: string;
    className?: string;
}

export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
    // BUG FIX: Garantir que content seja uma string para evitar erro .includes() em objetos JSON
    if (typeof content !== 'string') {
        try {
            content = JSON.stringify(content, null, 2);
        } catch (e) {
            content = String(content);
        }
    }

    // Regex mais flexível para detectar blocos de código markdown
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
                        urlRegex.lastIndex = 0; // Reset regex
                        return (
                            <a
                                key={i}
                                href={part}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#00f3ff] hover:text-[#00d4e0] underline break-all transition-colors"
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

    // Se não houver blocos de código, renderiza como texto com links
    if (!content.includes('```')) {
        return <div className={`markdown-content w-full ${className}`}>{renderTextWithLinks(content, 'text-main')}</div>;
    }

    while ((match = codeBlockRegex.exec(content)) !== null) {
        // Texto antes do bloco
        if (match.index > lastIndex) {
            sections.push(
                renderTextWithLinks(content.substring(lastIndex, match.index), `text-${lastIndex}`)
            );
        }

        const language = (match[1] || 'text').toLowerCase().trim();
        const code = match[2].trim();

        // Bloco de código com cabeçalho e botão
        sections.push(
            <CodeBlock key={`code-${match.index}`} language={language} code={code} />
        );

        lastIndex = match.index + match[0].length;
    }

    // Texto depois do último bloco
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
 * Função para aplicar cores ao código (JSON, HTML, JS, CSS, TS)
 */
function highlightCode(code: string, lang: string) {
    // Escapar HTML básico primeiro
    let escaped = code.replace(/[&<>"']/g, m => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    }[m]!));

    if (lang === 'json') {
        return escaped
            .replace(/"([^"]+)":/g, '<span style="color: #9cdcfe;">"$1"</span>:') // Keys
            .replace(/: ("[^"]*")/g, ': <span style="color: #ce9178;">$1</span>') // Strings
            .replace(/: (-?\d+\.?\d*)/g, ': <span style="color: #b5cea8;">$1</span>') // Numbers
            .replace(/: (true|false|null)/g, ': <span style="color: #569cd6;">$1</span>'); // Consts
    }

    if (lang === 'html' || lang === 'xml') {
        return escaped
            .replace(/(&lt;|<)(\/?[a-zA-Z1-6]+)(.*?)(&gt;|>)/g, (match, p1, p2, p3, p4) => {
                const tag = `<span style="color: #569cd6;">${p2}</span>`;
                const attrs = p3.replace(/([a-zA-Z-]+)=(&quot;[^&]*&quot;)/g, '<span style="color: #9cdcfe;">$1</span>=<span style="color: #ce9178;">$2</span>');
                return `<span style="color: #808080;">${p1}</span>${tag}${attrs}<span style="color: #808080;">${p4}</span>`;
            });
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
 * Sub-componente para o bloco de código estilizado
 */
function CodeBlock({ language, code }: { language: string; code: string }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = useCallback(async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        let successful = false;

        try {
            // Método 1: Clipboard API (Moderno)
            if (navigator.clipboard && window.isSecureContext) {
                try {
                    await navigator.clipboard.writeText(code);
                    successful = true;
                } catch (apiErr) {
                    console.warn('Clipboard API failed, trying fallback...', apiErr);
                }
            }

            // Método 2: Fallback (ExecCommand) - Se o 1 falhou ou não existe
            if (!successful) {
                const textArea = document.createElement("textarea");
                textArea.value = code;
                textArea.style.position = 'fixed';
                textArea.style.left = '-9999px';
                textArea.style.top = '0';
                textArea.style.opacity = '0';
                textArea.setAttribute('readonly', '');
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
            } else {
                alert('Não foi possível copiar automaticamente. Use Ctrl+C.');
            }
        } catch (err) {
            console.error('Erro crítico ao copiar:', err);
        }
    }, [code]);

    return (
        <div className="relative my-6 rounded-xl overflow-hidden border border-[rgba(0,243,255,0.15)] bg-[#0d1117] group w-full shadow-2xl flex flex-col">
            {/* Header do Bloco */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-[#161b22] border-b border-[rgba(255,255,255,0.08)]">
                <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-[#00f3ff] opacity-70" />
                    <span className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-[0.2em]">{language || 'code'}</span>
                </div>

                <button
                    onClick={handleCopy}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border shadow-sm cursor-pointer active:scale-95 ${copied
                        ? 'text-green-400 bg-[rgba(34,197,94,0.1)] border-[rgba(34,197,94,0.2)]'
                        : 'text-gray-400 bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.05)] hover:text-[#00f3ff] hover:bg-[rgba(0,243,255,0.08)] hover:border-[rgba(0,243,255,0.2)]'
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
                            <span>Copiar código</span>
                        </>
                    )}
                </button>
            </div>

            {/* Área de Código */}
            <div className="p-5 overflow-x-auto scrollbar-thin scrollbar-thumb-[rgba(255,255,255,0.1)] scrollbar-track-transparent bg-[rgba(0,0,0,0.15)]">
                <pre className="font-mono text-[13px] leading-relaxed text-[#e0f7ff] whitespace-pre selection:bg-[rgba(0,243,255,0.2)]">
                    <code
                        className={`language-${language}`}
                        dangerouslySetInnerHTML={{ __html: highlightCode(code, language) }}
                    />
                </pre>
            </div>
        </div>
    );
}
