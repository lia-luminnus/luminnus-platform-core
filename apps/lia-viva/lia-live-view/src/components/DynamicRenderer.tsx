import React, { useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar, Pie } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface ChartData {
  title: string;
  labels: string[];
  values: number[];
  chartType: 'bar' | 'line' | 'pie';
  datasets?: Array<{
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string;
    borderWidth?: number;
  }>;
}

interface TableData {
  title: string;
  headers: string[];
  rows: any[][];
}

interface ImageData {
  url: string;
  alt: string;
  caption?: string;
}

interface DocumentData {
  format: string;
  fileName: string;
  downloadUrl: string;
  metadata?: any;
}

interface AnalysisData {
  fileName: string;
  analysisType: string;
  analysis: string;
  technicalDetails?: string;
  suggestions?: string[];
  codePatches?: Array<{
    file: string;
    line: number;
    originalCode: string;
    fixedCode: string;
  }>;
}

interface DynamicContent {
  type: 'chart' | 'table' | 'image' | 'document' | 'analysis' | 'code' | 'text';
  data: any;
}

interface DynamicRendererProps {
  content: DynamicContent;
  containerId: string;
}

/**
 * DynamicRenderer - Universal content renderer
 * Supports: charts, tables, images, documents, code, text
 */
export const DynamicRenderer: React.FC<DynamicRendererProps> = ({
  content,
  containerId
}) => {
  const renderChart = (data: ChartData) => {
    const chartData = {
      labels: data.labels,
      datasets: data.datasets || [
        {
          label: data.title,
          data: data.values,
          backgroundColor:
            data.chartType === 'pie'
              ? [
                  'rgba(0, 243, 255, 0.8)',
                  'rgba(188, 19, 254, 0.8)',
                  'rgba(255, 107, 107, 0.8)',
                  'rgba(78, 205, 196, 0.8)',
                  'rgba(255, 195, 0, 0.8)'
                ]
              : 'rgba(0, 243, 255, 0.6)',
          borderColor:
            data.chartType === 'line'
              ? 'rgba(0, 243, 255, 1)'
              : 'rgba(0, 243, 255, 0.8)',
          borderWidth: 2,
          fill: data.chartType === 'line' ? true : undefined
        }
      ]
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top' as const,
          labels: {
            color: '#fff',
            font: {
              family: 'Inter, system-ui, sans-serif',
              size: 12
            }
          }
        },
        title: {
          display: true,
          text: data.title,
          color: '#fff',
          font: {
            family: 'Inter, system-ui, sans-serif',
            size: 16,
            weight: 'bold'
          }
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: '#00f3ff',
          bodyColor: '#fff',
          borderColor: '#00f3ff',
          borderWidth: 1
        }
      },
      scales:
        data.chartType !== 'pie'
          ? {
              x: {
                ticks: { color: '#ccc' },
                grid: { color: 'rgba(255, 255, 255, 0.1)' }
              },
              y: {
                ticks: { color: '#ccc' },
                grid: { color: 'rgba(255, 255, 255, 0.1)' }
              }
            }
          : undefined
    };

    return (
      <div className="w-full h-80 p-4">
        {data.chartType === 'bar' && <Bar data={chartData} options={options} />}
        {data.chartType === 'line' && <Line data={chartData} options={options} />}
        {data.chartType === 'pie' && <Pie data={chartData} options={options} />}
      </div>
    );
  };

  const renderTable = (data: TableData) => {
    return (
      <div className="w-full p-4">
        <h3 className="text-xl font-bold text-white mb-4">{data.title}</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-gray-800 border border-gray-700 rounded-lg">
            <thead>
              <tr className="bg-gradient-to-r from-[#00f3ff]/20 to-[#bc13fe]/20">
                {data.headers.map((header, index) => (
                  <th
                    key={index}
                    className="px-6 py-3 text-left text-xs font-medium text-[#00f3ff] uppercase tracking-wider border-b border-gray-700"
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
                  className={rowIndex % 2 === 0 ? 'bg-gray-900' : 'bg-gray-800'}
                >
                  {row.map((cell, cellIndex) => (
                    <td
                      key={cellIndex}
                      className="px-6 py-4 whitespace-nowrap text-sm text-gray-300 border-b border-gray-700"
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
  };

  const renderImage = (data: ImageData) => {
    return (
      <div className="w-full p-4">
        <img
          src={data.url}
          alt={data.alt}
          className="max-w-full h-auto rounded-lg border-2 border-[#00f3ff]/30"
        />
        {data.caption && (
          <p className="text-sm text-gray-400 mt-2 text-center">{data.caption}</p>
        )}
      </div>
    );
  };

  const renderDocument = (data: DocumentData) => {
    return (
      <div className="w-full p-4 bg-gray-800 rounded-lg border border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white mb-1">
              📄 {data.fileName}
            </h3>
            <p className="text-sm text-gray-400">
              Formato: {data.format.toUpperCase()}
            </p>
          </div>
          <a
            href={`http://localhost:3000${data.downloadUrl}`}
            download={data.fileName}
            className="px-4 py-2 bg-gradient-to-r from-[#00f3ff] to-[#bc13fe] text-white rounded-lg hover:opacity-80 transition-opacity"
          >
            Download
          </a>
        </div>
        {data.metadata && (
          <div className="mt-4 p-3 bg-gray-900 rounded text-xs text-gray-400">
            <pre>{JSON.stringify(data.metadata, null, 2)}</pre>
          </div>
        )}
      </div>
    );
  };

  const renderAnalysis = (data: AnalysisData) => {
    return (
      <div className="w-full p-4 space-y-4">
        <div className="bg-gray-800 rounded-lg p-4 border border-[#00f3ff]/30">
          <h3 className="text-xl font-bold text-[#00f3ff] mb-2">
            🔍 Análise: {data.fileName}
          </h3>
          <p className="text-sm text-gray-400 mb-4">
            Tipo: {data.analysisType.replace(/-/g, ' ').toUpperCase()}
          </p>
          <div className="prose prose-invert max-w-none">
            <p className="text-white whitespace-pre-wrap">{data.analysis}</p>
          </div>
        </div>

        {data.technicalDetails && (
          <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
            <h4 className="text-lg font-bold text-white mb-2">
              📊 Detalhes Técnicos
            </h4>
            <p className="text-gray-300 whitespace-pre-wrap">
              {data.technicalDetails}
            </p>
          </div>
        )}

        {data.suggestions && data.suggestions.length > 0 && (
          <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
            <h4 className="text-lg font-bold text-white mb-3">💡 Sugestões</h4>
            <ul className="space-y-2">
              {data.suggestions.map((suggestion, index) => (
                <li key={index} className="text-gray-300 flex items-start">
                  <span className="text-[#00f3ff] mr-2">•</span>
                  {suggestion}
                </li>
              ))}
            </ul>
          </div>
        )}

        {data.codePatches && data.codePatches.length > 0 && (
          <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
            <h4 className="text-lg font-bold text-white mb-3">🔧 Code Patches</h4>
            <div className="space-y-4">
              {data.codePatches.map((patch, index) => (
                <div key={index} className="bg-gray-800 rounded p-3">
                  <p className="text-sm text-[#00f3ff] mb-2">
                    {patch.file}:{patch.line}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-xs text-red-400 mb-1">Original:</p>
                      <pre className="text-xs bg-red-900/20 p-2 rounded overflow-x-auto">
                        {patch.originalCode}
                      </pre>
                    </div>
                    <div>
                      <p className="text-xs text-green-400 mb-1">Fixed:</p>
                      <pre className="text-xs bg-green-900/20 p-2 rounded overflow-x-auto">
                        {patch.fixedCode}
                      </pre>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderCode = (code: string) => {
    return (
      <div className="w-full p-4">
        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto border border-gray-700">
          <code>{code}</code>
        </pre>
      </div>
    );
  };

  const renderText = (text: string) => {
    return (
      <div className="w-full p-4">
        <p className="text-white whitespace-pre-wrap">{text}</p>
      </div>
    );
  };

  return (
    <div
      className="dynamic-container bg-gray-900/50 rounded-lg border border-gray-700 backdrop-blur-sm"
      data-container-id={containerId}
    >
      {content.type === 'chart' && renderChart(content.data)}
      {content.type === 'table' && renderTable(content.data)}
      {content.type === 'image' && renderImage(content.data)}
      {content.type === 'document' && renderDocument(content.data)}
      {content.type === 'analysis' && renderAnalysis(content.data)}
      {content.type === 'code' && renderCode(content.data)}
      {content.type === 'text' && renderText(content.data)}
    </div>
  );
};

export default DynamicRenderer;
