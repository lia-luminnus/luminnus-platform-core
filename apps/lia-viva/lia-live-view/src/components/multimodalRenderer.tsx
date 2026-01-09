/**
 * ✅ MULTIMODAL RENDERER - Renderiza conteúdo dinâmico
 *
 * Renderiza diferentes tipos de conteúdo na área dinâmica:
 * - Relatórios (markdown formatado)
 * - Gráficos (Chart.js)
 * - Tabelas (HTML table)
 * - Imagens (display)
 * - PDFs (embed ou iframe)
 * - Custom (HTML/React components)
 */

import React from 'react';
import { FileText, BarChart3, Table as TableIcon, ImageIcon, File } from 'lucide-react';

// ======================================================================
// TYPES
// ======================================================================

export type DynamicContentType = 'empty' | 'report' | 'chart' | 'table' | 'image' | 'pdf' | 'custom' | 'json' | 'analysis' | 'text' | 'map';


export interface DynamicContent {
  type: DynamicContentType;
  data?: any;
}


export interface ReportData {
  title: string;
  sections: {
    heading: string;
    content: string;
  }[];
}

export interface ChartData {
  type: 'bar' | 'line' | 'pie' | 'doughnut';
  title: string;
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
  }[];
}

export interface TableData {
  title: string;
  headers: string[];
  rows: (string | number)[][];
}

export interface ImageData {
  url: string;
  alt: string;
  caption?: string;
}

export interface PDFData {
  url: string;
  title: string;
}

export interface MapData {
  lat: number;
  lng: number;
  zoom?: number;
  title?: string;
  markers?: { lat: number; lng: number; label?: string }[];
}

// ======================================================================
// COMPONENT
// ======================================================================

interface MultimodalRendererProps {
  content: DynamicContent;
  className?: string;
}

export function MultimodalRenderer({ content, className = '' }: MultimodalRendererProps) {
  const renderContent = () => {
    switch (content.type) {
      case 'empty':
        return <EmptyState />;

      case 'report':
        return <ReportRenderer data={content.data as ReportData} />;

      case 'chart':
        return <ChartRenderer data={content.data as ChartData} />;

      case 'table':
        return <TableRenderer data={content.data as TableData} />;

      case 'image':
        return <ImageRenderer data={content.data as ImageData} />;

      case 'pdf':
        return <PDFRenderer data={content.data as PDFData} />;

      case 'json':
      case 'analysis':
      case 'custom':
        return <CustomRenderer data={content.data} />;

      case 'map':
        return <MapRenderer data={content.data as MapData} />;

      default:
        return <EmptyState />;
    }

  };

  return (
    <div className={`h-full w-full overflow-auto ${className}`}>
      {renderContent()}
    </div>
  );
}

// ======================================================================
// SUB-COMPONENTS
// ======================================================================

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center p-6">
      <div className="w-16 h-16 rounded-full border-2 border-dashed border-[rgba(0,243,255,0.3)] flex items-center justify-center mb-4">
        <BarChart3 className="w-6 h-6 text-[rgba(0,243,255,0.4)]" />
      </div>
      <h3 className="text-lg font-medium text-[rgba(224,247,255,0.6)] mb-2">
        Dynamic Content Area
      </h3>
      <p className="text-sm text-[rgba(224,247,255,0.4)] max-w-xs">
        LIA will display reports, charts, tables, images, and documents here based on your requests.
      </p>
    </div>
  );
}

function ReportRenderer({ data }: { data: ReportData }) {
  if (!data || !data.sections) return <EmptyState />;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <FileText className="w-5 h-5 text-[#00f3ff]" />
        <h2 className="text-xl font-bold text-[#00f3ff]">{data.title}</h2>
      </div>

      {data.sections.map((section, index) => (
        <div key={index} className="space-y-2">
          <h3 className="text-lg font-semibold text-[#bc13fe]">{section.heading}</h3>
          <div className="text-sm text-[rgba(224,247,255,0.8)] whitespace-pre-wrap">
            {section.content}
          </div>
        </div>
      ))}
    </div>
  );
}

function ChartRenderer({ data }: { data: ChartData }) {
  if (!data) return <EmptyState />;

  // TODO: Integrar Chart.js quando disponível
  // Por enquanto, vamos mostrar um placeholder visual

  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-5 h-5 text-[#00f3ff]" />
        <h2 className="text-lg font-bold text-[#00f3ff]">{data.title}</h2>
      </div>

      <div className="bg-[rgba(10,20,40,0.5)] border border-[rgba(0,243,255,0.3)] rounded-lg p-4">
        <p className="text-xs text-[rgba(224,247,255,0.5)] mb-3">
          Chart Type: {data.type.toUpperCase()}
        </p>

        {/* Simple visualization placeholder */}
        <div className="space-y-2">
          {data.labels.map((label, index) => {
            const value = data.datasets[0]?.data[index] || 0;
            const maxValue = Math.max(...(data.datasets[0]?.data || [1]));
            const percentage = (value / maxValue) * 100;

            return (
              <div key={index} className="space-y-1">
                <div className="flex justify-between text-xs text-[rgba(224,247,255,0.7)]">
                  <span>{label}</span>
                  <span>{value}</span>
                </div>
                <div className="h-6 bg-[rgba(10,20,40,0.8)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#00f3ff] to-[#bc13fe] transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-[10px] text-[rgba(224,247,255,0.4)] mt-3 text-center">
        📊 Advanced charts coming soon with Chart.js integration
      </p>
    </div>
  );
}

function TableRenderer({ data }: { data: TableData }) {
  if (!data || !data.headers || !data.rows) return <EmptyState />;

  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <TableIcon className="w-5 h-5 text-[#00f3ff]" />
        <h2 className="text-lg font-bold text-[#00f3ff]">{data.title}</h2>
      </div>

      <div className="overflow-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-[rgba(0,243,255,0.3)]">
              {data.headers.map((header, index) => (
                <th
                  key={index}
                  className="px-4 py-2 text-left text-xs font-bold text-[#00f3ff] bg-[rgba(0,243,255,0.1)]"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className="border-b border-[rgba(0,243,255,0.1)] hover:bg-[rgba(0,243,255,0.05)] transition-colors"
              >
                {row.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    className="px-4 py-2 text-sm text-[rgba(224,247,255,0.8)]"
                  >
                    {cell}
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

function ImageRenderer({ data }: { data: ImageData }) {
  if (!data || !data.url) return <EmptyState />;

  return (
    <div className="p-4 flex flex-col items-center">
      <div className="flex items-center gap-2 mb-4 self-start">
        <ImageIcon className="w-5 h-5 text-[#00f3ff]" />
        <h2 className="text-lg font-bold text-[#00f3ff]">{data.alt}</h2>
      </div>

      <div className="relative w-full max-w-2xl">
        <img
          src={data.url}
          alt={data.alt}
          className="w-full h-auto rounded-lg border border-[rgba(0,243,255,0.3)] shadow-[0_0_20px_rgba(0,243,255,0.2)]"
        />
        {data.caption && (
          <p className="text-xs text-[rgba(224,247,255,0.6)] text-center mt-2">
            {data.caption}
          </p>
        )}
      </div>
    </div>
  );
}

function PDFRenderer({ data }: { data: PDFData }) {
  if (!data || !data.url) return <EmptyState />;

  return (
    <div className="p-4 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <File className="w-5 h-5 text-[#00f3ff]" />
        <h2 className="text-lg font-bold text-[#00f3ff]">{data.title}</h2>
      </div>

      <div className="flex-1 border border-[rgba(0,243,255,0.3)] rounded-lg overflow-hidden">
        <iframe
          src={data.url}
          title={data.title}
          className="w-full h-full"
          style={{ minHeight: '400px' }}
        />
      </div>

      <a
        href={data.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-[#00f3ff] hover:text-[#bc13fe] transition-colors mt-2 text-center"
      >
        📄 Open PDF in new tab
      </a>
    </div>
  );
}

function CustomRenderer({ data }: { data: any }) {
  if (!data) return <EmptyState />;

  // Custom renderer for arbitrary HTML or React components
  return (
    <div className="p-4">
      <div className="text-sm text-[rgba(224,247,255,0.8)]">
        {typeof data === 'string' ? (
          <div dangerouslySetInnerHTML={{ __html: data }} />
        ) : (
          <pre className="whitespace-pre-wrap font-mono text-xs">
            {JSON.stringify(data, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}

function MapRenderer({ data }: { data: MapData }) {
  if (!data) return <EmptyState />;

  return (
    <div className="p-4 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <ImageIcon className="w-5 h-5 text-[#00f3ff]" />
        <h2 className="text-lg font-bold text-[#00f3ff]">{data.title || 'Google Maps View'}</h2>
      </div>

      <div className="flex-1 min-h-[400px] border border-[rgba(0,243,255,0.3)] rounded-lg overflow-hidden">
        {/* Usando o Web Component <gmp-map> seguindo as melhores práticas do Google Maps Platform */}
        {/* @ts-ignore */}
        <gmp-map
          center={`${data.lat},${data.lng}`}
          zoom={data.zoom || 14}
          map-id="DEMO_MAP_ID"
          internal-usage-attribution-ids="gmp_mcp_codeassist_v0.1_github"
          style={{ height: '100%', width: '100%' }}
        >
          {data.markers?.map((marker, i) => (
            /* @ts-ignore */
            <gmp-advanced-marker
              key={i}
              position={`${marker.lat},${marker.lng}`}
              title={marker.label}
            ></gmp-advanced-marker>
          ))}
        </gmp-map>
      </div>

      <p className="text-[10px] text-[rgba(224,247,255,0.4)] mt-2 italic">
        Powered by Google Maps Platform. Use o zoom para navegar.
      </p>
    </div>
  );
}

// ======================================================================
// HELPER FUNCTIONS
// ======================================================================

/**
 * Cria um objeto de relatório a partir de texto markdown ou estruturado
 */
export function createReport(title: string, sections: { heading: string; content: string }[]): DynamicContent {
  return {
    type: 'report',
    data: { title, sections } as ReportData,
  };
}

/**
 * Cria um objeto de gráfico
 */
export function createChart(
  type: ChartData['type'],
  title: string,
  labels: string[],
  datasets: ChartData['datasets']
): DynamicContent {
  return {
    type: 'chart',
    data: { type, title, labels, datasets } as ChartData,
  };
}

/**
 * Cria um objeto de tabela
 */
export function createTable(title: string, headers: string[], rows: (string | number)[][]): DynamicContent {
  return {
    type: 'table',
    data: { title, headers, rows } as TableData,
  };
}

/**
 * Cria um objeto de imagem
 */
export function createImage(url: string, alt: string, caption?: string): DynamicContent {
  return {
    type: 'image',
    data: { url, alt, caption } as ImageData,
  };
}

/**
 * Cria um objeto de PDF
 */
export function createPDF(url: string, title: string): DynamicContent {
  return {
    type: 'pdf',
    data: { url, title } as PDFData,
  };
}
/**
 * Cria um objeto de mapa
 */
export function createMap(lat: number, lng: number, zoom?: number, title?: string, markers?: MapData['markers']): DynamicContent {
  return {
    type: 'map',
    data: { lat, lng, zoom, title, markers } as MapData,
  };
}
