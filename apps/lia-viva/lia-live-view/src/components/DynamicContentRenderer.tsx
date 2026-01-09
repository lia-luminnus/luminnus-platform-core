// ======================================================================
// 📊 DYNAMIC CONTENT RENDERER
// ======================================================================
// Renderiza conteúdo dinâmico: gráficos, tabelas, imagens, JSON, análises
// ======================================================================

import React from 'react';
import { useLIA, DynamicContent, ChartData, TableData, AnalysisData, ImageData } from '@/context/LIAContext';
import { TrendingUp, TrendingDown, Table, Image, FileJson, FileText, Lightbulb, X } from 'lucide-react';
import { LuminnusLoading } from './LuminnusLoading';

// ======================================================================
// CHART COMPONENT
// ======================================================================

function ChartView({ data }: { data: ChartData }) {
    // Validar dados
    const datasets = data?.datasets || [];
    const labels = data?.labels || [];

    // Se não houver datasets válidos, mostrar mensagem
    if (!datasets.length || !datasets[0]?.data?.length) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <TrendingUp className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-sm">Dados do gráfico inválidos ou incompletos</p>
                <pre className="text-xs mt-2 p-2 bg-black/30 rounded max-w-full overflow-auto">
                    {JSON.stringify(data, null, 2)}
                </pre>
            </div>
        );
    }

    const allValues = datasets.flatMap(d => d.data || []);
    const maxValue = Math.max(...allValues, 1); // Mínimo 1 para evitar divisão por zero

    return (
        <div className="h-full flex flex-col">
            <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-[#00f3ff]" />
                <span className="text-sm text-gray-400">Gráfico</span>
                {labels.length > 0 && (
                    <span className="text-xs text-gray-500 ml-2">({labels.length} pontos)</span>
                )}
            </div>

            <div className="flex-1 relative min-h-[120px]">
                <svg className="w-full h-full" viewBox="0 0 400 150" preserveAspectRatio="none">
                    {/* Grid lines */}
                    <line x1="10" y1="140" x2="390" y2="140" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                    <line x1="10" y1="80" x2="390" y2="80" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                    <line x1="10" y1="20" x2="390" y2="20" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />

                    {datasets.map((dataset, idx) => {
                        const dataPoints = dataset.data || [];
                        if (dataPoints.length === 0) return null;

                        const color = dataset.color || ['#00f3ff', '#ff00ff', '#00ff88'][idx % 3];
                        const points = dataPoints.map((value, i) => {
                            const x = dataPoints.length > 1
                                ? (i / (dataPoints.length - 1)) * 380 + 10
                                : 200;
                            const y = 140 - ((value || 0) / maxValue) * 120;
                            return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                        }).join(' ');

                        return (
                            <g key={idx}>
                                <path
                                    d={points}
                                    fill="none"
                                    stroke={color}
                                    strokeWidth="2"
                                    className="drop-shadow-[0_0_5px_currentColor]"
                                />
                                {/* Área preenchida */}
                                <path
                                    d={`${points} L 390 140 L 10 140 Z`}
                                    fill={color}
                                    fillOpacity="0.1"
                                />
                                {/* Pontos */}
                                {dataPoints.map((value, i) => {
                                    const x = dataPoints.length > 1
                                        ? (i / (dataPoints.length - 1)) * 380 + 10
                                        : 200;
                                    const y = 140 - ((value || 0) / maxValue) * 120;
                                    return (
                                        <circle key={i} cx={x} cy={y} r="3" fill={color} />
                                    );
                                })}
                            </g>
                        );
                    })}
                </svg>
            </div>

            {/* Labels */}
            {labels.length > 0 && (
                <div className="flex justify-between text-xs text-gray-500 mt-1 px-2">
                    <span>{labels[0]}</span>
                    {labels.length > 2 && <span>{labels[Math.floor(labels.length / 2)]}</span>}
                    <span>{labels[labels.length - 1]}</span>
                </div>
            )}

            {/* Legenda */}
            <div className="flex gap-4 mt-2 text-xs">
                {datasets.map((dataset, idx) => (
                    <div key={idx} className="flex items-center gap-1">
                        <div
                            className="w-3 h-3 rounded"
                            style={{ backgroundColor: dataset.color || ['#00f3ff', '#ff00ff', '#00ff88'][idx % 3] }}
                        />
                        <span className="text-gray-400">{dataset.label || `Série ${idx + 1}`}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ======================================================================
// TABLE COMPONENT
// ======================================================================

function TableView({ data }: { data: TableData }) {
    // Validar dados
    const headers = data?.headers || [];
    const rows = data?.rows || [];

    if (!headers.length && !rows.length) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <Table className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-sm">Dados da tabela inválidos ou incompletos</p>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            <div className="flex items-center gap-2 mb-3">
                <Table className="w-4 h-4 text-[#00f3ff]" />
                <span className="text-sm text-gray-400">Tabela</span>
                <span className="text-xs text-gray-500 ml-2">
                    ({rows.length} linhas)
                </span>
            </div>

            <div className="flex-1 overflow-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-[rgba(0,243,255,0.2)]">
                            {headers.map((header, idx) => (
                                <th key={idx} className="text-left py-2 px-3 text-[#00f3ff] font-medium">
                                    {header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, rowIdx) => (
                            <tr
                                key={rowIdx}
                                className="border-b border-[rgba(255,255,255,0.05)] hover:bg-[rgba(0,243,255,0.05)]"
                            >
                                {(Array.isArray(row) ? row : [row]).map((cell, cellIdx) => (
                                    <td key={cellIdx} className="py-2 px-3 text-gray-300">
                                        {typeof cell === 'object' ? JSON.stringify(cell) : cell}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ======================================================================
// IMAGE COMPONENT
// ======================================================================

function ImageView({ data }: { data: ImageData }) {
    return (
        <div className="h-full flex flex-col overflow-hidden">
            <div className="flex items-center gap-2 mb-3 flex-shrink-0">
                <Image className="w-4 h-4 text-[#00f3ff]" />
                <span className="text-sm text-gray-400">Imagem</span>
            </div>

            {/* Container com scroll para imagens grandes */}
            <div className="flex-1 overflow-auto flex items-start justify-center">
                <img
                    src={data.url}
                    alt={data.alt || 'Imagem'}
                    className="max-w-full rounded-lg object-contain"
                    style={{ maxHeight: 'none' }} // Permite altura total
                />
            </div>

            {data.caption && (
                <p className="text-sm text-gray-400 text-center mt-2 flex-shrink-0">{data.caption}</p>
            )}
        </div>
    );
}


// ======================================================================
// ANALYSIS COMPONENT
// ======================================================================

function AnalysisView({ data }: { data: AnalysisData }) {
    return (
        <div className="h-full flex flex-col overflow-auto">
            <div className="flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4 text-[#00f3ff]" />
                <span className="text-sm text-gray-400">Análise</span>
            </div>

            {/* Título */}
            <h3 className="text-lg font-bold text-white mb-2">{data.title}</h3>

            {/* Resumo */}
            <p className="text-gray-300 mb-4">{data.summary}</p>

            {/* Detalhes */}
            {data.details && data.details.length > 0 && (
                <div className="mb-4">
                    <h4 className="text-sm font-medium text-[#00f3ff] mb-2">Detalhes</h4>
                    <ul className="space-y-1">
                        {data.details.map((detail, idx) => (
                            <li key={idx} className="text-sm text-gray-400 flex items-start gap-2">
                                <span className="text-[#00f3ff] mt-1">•</span>
                                <span>{detail}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Insights */}
            {data.insights && data.insights.length > 0 && (
                <div className="bg-[rgba(255,0,255,0.1)] border border-[rgba(255,0,255,0.3)] rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                        <Lightbulb className="w-4 h-4 text-[#ff00ff]" />
                        <span className="text-sm font-medium text-[#ff00ff]">Insights</span>
                    </div>
                    <ul className="space-y-1">
                        {data.insights.map((insight, idx) => (
                            <li key={idx} className="text-sm text-gray-300">
                                {insight}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}

// ======================================================================
// JSON COMPONENT
// ======================================================================

function JsonView({ data }: { data: any }) {
    return (
        <div className="h-full flex flex-col">
            <div className="flex items-center gap-2 mb-3">
                <FileJson className="w-4 h-4 text-[#00f3ff]" />
                <span className="text-sm text-gray-400">JSON</span>
            </div>

            <pre className="flex-1 overflow-auto bg-[rgba(0,0,0,0.3)] rounded-lg p-3 text-xs text-green-400 font-mono">
                {JSON.stringify(data, null, 2)}
            </pre>
        </div>
    );
}

// ======================================================================
// MAIN RENDERER
// ======================================================================

export function DynamicContentRenderer({ className = '' }: { className?: string }) {
    const { dynamicContent, setDynamicContent, isProcessingUpload, isTyping } = useLIA();

    // Mostrar loading APENAS quando processando upload de arquivo
    // NÃO mostrar loading para digitação normal ou análises de texto
    // Análises de documentos devem ir diretamente para o chat como mensagem
    if (isProcessingUpload) {
        return (
            <div className={`flex items-center justify-center ${className}`}>
                <LuminnusLoading />
            </div>
        );
    }


    if (!dynamicContent || dynamicContent.type === 'none') {
        return (
            <div className={`flex items-center justify-center text-center ${className}`}>
                <div className="text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Dynamic Content Area</p>
                    <p className="text-xs opacity-60">
                        LIA exibirá gráficos, tabelas e análises aqui
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className={`bg-[rgba(0,0,0,0.3)] rounded-xl border border-[rgba(0,243,255,0.2)] p-4 relative ${className}`}>
            {/* Botão de fechar */}
            <button
                onClick={() => setDynamicContent(null)}
                className="absolute top-2 right-2 p-1 text-gray-500 hover:text-white transition-colors"
            >
                <X className="w-4 h-4" />
            </button>

            {/* Título */}
            {dynamicContent.title && (
                <h3 className="text-lg font-bold text-[#00f3ff] mb-3">{dynamicContent.title}</h3>
            )}

            {/* Conteúdo */}
            <div className="h-full">
                {dynamicContent.type === 'chart' && <ChartView data={dynamicContent.data as ChartData} />}
                {dynamicContent.type === 'table' && <TableView data={dynamicContent.data as TableData} />}
                {dynamicContent.type === 'image' && <ImageView data={dynamicContent.data as ImageData} />}
                {dynamicContent.type === 'analysis' && <AnalysisView data={dynamicContent.data as AnalysisData} />}
                {dynamicContent.type === 'json' && <JsonView data={dynamicContent.data} />}
                {dynamicContent.type === 'text' && (
                    <div className="text-gray-300 whitespace-pre-wrap">{dynamicContent.data}</div>
                )}
            </div>
        </div>
    );
}
