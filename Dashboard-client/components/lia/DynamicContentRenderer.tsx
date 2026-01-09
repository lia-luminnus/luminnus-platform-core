// ======================================================================
// 📊 DYNAMIC CONTENT RENDERER - Múltiplos Containers
// ======================================================================
// Renderiza conteúdo dinâmico: gráficos, tabelas, imagens, JSON, análises
// PARIDADE TOTAL com Admin Panel
// ======================================================================

import React from 'react';
import { useLIA } from './LIAContext';
import { dynamicContentManager } from './services/dynamicContentManager';

// Icons inline (evita dependência de lucide-react)
const TrendingUpIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
        <polyline points="17 6 23 6 23 12"></polyline>
    </svg>
);

const TableIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
        <line x1="3" y1="9" x2="21" y2="9"></line>
        <line x1="3" y1="15" x2="21" y2="15"></line>
        <line x1="9" y1="3" x2="9" y2="21"></line>
    </svg>
);

const ImageIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
        <circle cx="8.5" cy="8.5" r="1.5"></circle>
        <polyline points="21 15 16 10 5 21"></polyline>
    </svg>
);

const FileTextIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="16" y1="13" x2="8" y2="13"></line>
        <line x1="16" y1="17" x2="8" y2="17"></line>
        <polyline points="10 9 9 9 8 9"></polyline>
    </svg>
);

const XIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
);

const LightbulbIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="9" y1="18" x2="15" y2="18"></line>
        <line x1="10" y1="22" x2="14" y2="22"></line>
        <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"></path>
    </svg>
);

// ======================================================================
// TYPES (Compat parity)
// ======================================================================

interface ChartData {
    chartType?: 'line' | 'bar' | 'pie' | 'area';
    labels: string[];
    datasets: {
        label: string;
        data: number[];
        color?: string;
    }[];
}

interface TableData {
    headers: string[];
    rows: (string | number)[][];
}

interface ImageData {
    url: string;
    caption?: string;
    alt?: string;
}

interface AnalysisData {
    title: string;
    summary: string;
    details: string[];
    insights?: string[];
}

// ======================================================================
// COMPONENTES DE VISUALIZAÇÃO
// ======================================================================

function ChartView({ data }: { data: ChartData }) {
    const datasets = data?.datasets || [];
    const labels = data?.labels || [];
    if (!datasets.length) return null;
    const allValues = datasets.flatMap(d => d.data || []);
    const maxValue = Math.max(...allValues, 1);

    return (
        <div className="h-full flex flex-col">
            <div className="flex items-center gap-2 mb-2">
                <span className="text-[#00f3ff]"><TrendingUpIcon /></span>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Gráfico</span>
            </div>
            <div className="flex-1 relative min-h-[100px]">
                <svg className="w-full h-full" viewBox="0 0 400 150" preserveAspectRatio="none">
                    <line x1="0" y1="140" x2="400" y2="140" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                    {datasets.map((dataset, idx) => {
                        const dataPoints = dataset.data || [];
                        const color = dataset.color || ['#00f3ff', '#ff00ff', '#00ff88'][idx % 3];
                        const points = dataPoints.map((value, i) => {
                            const x = (i / (dataPoints.length - 1)) * 390 + 5;
                            const y = 140 - ((value || 0) / maxValue) * 120;
                            return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                        }).join(' ');
                        return <path key={idx} d={points} fill="none" stroke={color} strokeWidth="2" />;
                    })}
                </svg>
            </div>
        </div>
    );
}

function TableView({ data }: { data: TableData }) {
    const headers = data?.headers || [];
    const rows = data?.rows || [];
    return (
        <div className="h-full flex flex-col">
            <div className="flex items-center gap-2 mb-2">
                <span className="text-[#00f3ff]"><TableIcon /></span>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Tabela</span>
            </div>
            <div className="flex-1 overflow-auto custom-scrollbar text-[11px]">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-cyan-500/20">
                            {headers.map((h, i) => <th key={i} className="text-left p-1 text-cyan-400">{h}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, i) => (
                            <tr key={i} className="border-b border-white/5">
                                {(Array.isArray(row) ? row : [row]).map((c, j) => <td key={j} className="p-1 text-gray-300">{c}</td>)}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

const DownloadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
        <polyline points="7 10 12 15 17 10"></polyline>
        <line x1="12" y1="15" x2="12" y2="3"></line>
    </svg>
);

function ImageView({ data }: { data: ImageData }) {
    const handleDownload = () => {
        const link = document.createElement('a');
        link.href = data.url;
        link.download = data.alt || 'lia-generated-image.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="h-full flex flex-col items-center justify-center p-2">
            <div className="flex items-center justify-between mb-4 w-full">
                <div className="flex items-center gap-2">
                    <span className="text-[#00f3ff]"><ImageIcon /></span>
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest italic">Visualização em Tempo Real</span>
                </div>
                <button
                    onClick={handleDownload}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-600/40 transition-all text-[10px] font-bold uppercase"
                >
                    <DownloadIcon />
                    Baixar Imagem
                </button>
            </div>
            <div className="flex-1 w-full overflow-auto flex items-center justify-center bg-black/20 rounded-xl border border-white/5 p-4 shadow-inner">
                <img
                    src={data.url}
                    alt={data.alt}
                    className="max-h-full max-w-full rounded-lg shadow-2xl border border-white/10 object-contain animate-in fade-in zoom-in duration-500"
                />
            </div>
            {data.caption && (
                <p className="text-[11px] text-gray-500 mt-3 font-medium bg-black/40 px-3 py-1 rounded-full border border-white/5 tracking-tight italic">
                    "{data.caption}"
                </p>
            )}
        </div>
    );
}

// ======================================================================
// MAIN RENDERER
// ======================================================================

export function DynamicContentRenderer() {
    const { dynamicContainers, removeDynamicContainer } = useLIA();

    if (dynamicContainers.length === 0) {
        return (
            <div className="h-full flex items-center justify-center opacity-20">
                <div className="text-center">
                    <TrendingUpIcon />
                    <p className="text-[10px] uppercase tracking-widest mt-2 font-mono">Espaço LIAOS Reservado</p>
                </div>
            </div>
        );
    }

    const layoutClass = dynamicContentManager.getLayoutClasses();

    return (
        <div className={layoutClass}>
            {dynamicContainers.map((container) => (
                <div
                    key={container.id}
                    className="relative bg-black/40 rounded-xl border border-white/5 p-4 min-h-[160px] animate-in fade-in zoom-in duration-300 shadow-lg"
                >
                    <button
                        onClick={() => removeDynamicContainer(container.id)}
                        className="absolute top-2 right-2 text-gray-600 hover:text-white transition-colors"
                    >
                        <XIcon />
                    </button>

                    <div className="h-full">
                        {container.content.type === 'chart' && <ChartView data={container.content.data} />}
                        {container.content.type === 'table' && <TableView data={container.content.data} />}
                        {container.content.type === 'image' && <ImageView data={container.content.data} />}
                        {container.content.type === 'custom' && (
                            <pre className="text-[10px] text-green-400 font-mono overflow-auto p-2 bg-black/20 rounded h-full">
                                {JSON.stringify(container.content.data, null, 2)}
                            </pre>
                        )}
                        {/* Fallback para outros tipos */}
                        {container.content.type !== 'chart' && container.content.type !== 'table' && container.content.type !== 'image' && container.content.type !== 'custom' && (
                            <div className="text-xs text-gray-400 whitespace-pre-wrap h-full overflow-auto">
                                {typeof container.content.data === 'string' ? container.content.data : JSON.stringify(container.content.data, null, 2)}
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}

export default DynamicContentRenderer;
