/**
 * Image Viewer Component
 * Viewer para imagens geradas pelo Imagen
 *
 * FUNCIONALIDADES:
 * - Display high-res images
 * - Zoom/pan
 * - Download
 * - Fullscreen
 * - Image info
 *
 * PREPARADO PARA:
 * - Gallery mode
 * - Image comparison
 * - Annotations
 * - Editing tools
 * - Metadata display
 */

import React, { useState } from 'react';

interface ImageViewerProps {
  imageUrl: string;
  title?: string;
  alt?: string;
  width?: number;
  height?: number;
  onDownload?: () => void;
}

const ImageViewer: React.FC<ImageViewerProps> = ({
  imageUrl,
  title,
  alt = 'Generated image',
  width,
  height,
  onDownload
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // 🚧 FUTURO: Implementar zoom, pan, fullscreen

  return (
    <div className="image-viewer bg-gray-900 rounded-lg overflow-hidden">
      <div className="relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
            <div className="text-gray-500">
              <div className="text-4xl mb-2">🖼️</div>
              <div>Carregando imagem...</div>
            </div>
          </div>
        )}

        <img
          src={imageUrl}
          alt={alt}
          width={width}
          height={height}
          onLoad={() => setIsLoading(false)}
          className="w-full h-auto object-contain max-h-[600px]"
        />

        {/* Controls Overlay */}
        <div className="absolute top-2 right-2 flex gap-2">
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 bg-black/60 hover:bg-black/80 text-white rounded-lg transition-colors"
            title="Fullscreen"
          >
            ⛶
          </button>

          {onDownload && (
            <button
              onClick={onDownload}
              className="p-2 bg-black/60 hover:bg-black/80 text-white rounded-lg transition-colors"
              title="Download"
            >
              ⬇
            </button>
          )}
        </div>
      </div>

      {title && (
        <div className="p-3 bg-gray-800 border-t border-gray-700">
          <p className="text-sm text-gray-300">{title}</p>
          {(width && height) && (
            <p className="text-xs text-gray-500 mt-1">
              {width} × {height}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default ImageViewer;
