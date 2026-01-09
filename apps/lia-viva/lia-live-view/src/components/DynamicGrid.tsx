import React from 'react';
import DynamicRenderer from './DynamicRenderer';
import type { DynamicContainer } from '../services/dynamicContentManager';

interface DynamicGridProps {
  containers: DynamicContainer[];
  onRemoveContainer?: (containerId: string) => void;
}

/**
 * DynamicGrid - Manages up to 4 containers in responsive grid layout
 */
export const DynamicGrid: React.FC<DynamicGridProps> = ({
  containers,
  onRemoveContainer
}) => {
  const getGridClass = () => {
    const count = containers.length;
    if (count === 0) return 'grid-cols-1';
    if (count === 1) return 'grid-cols-1';
    if (count === 2) return 'grid-cols-1 md:grid-cols-2';
    if (count === 3) return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
    if (count >= 4) return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2';
    return 'grid-cols-1';
  };

  if (containers.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <div className="text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-600 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p className="text-lg font-medium">Nenhum conteúdo para exibir</p>
          <p className="text-sm mt-1">
            Conteúdos gerados aparecerão aqui automaticamente
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`grid ${getGridClass()} gap-4 auto-rows-fr`}>
      {containers.map((container) => (
        <div
          key={container.id}
          className="relative group"
          style={{ minHeight: '300px' }}
        >
          {onRemoveContainer && (
            <button
              onClick={() => onRemoveContainer(container.id)}
              className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-red-600 hover:bg-red-700 text-white rounded-full w-8 h-8 flex items-center justify-center"
              title="Remover container"
            >
              ×
            </button>
          )}
          <DynamicRenderer content={container.content} containerId={container.id} />
        </div>
      ))}
    </div>
  );
};

export default DynamicGrid;
