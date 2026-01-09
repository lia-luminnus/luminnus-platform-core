/**
 * Video Player Component
 * Player para vídeos gerados pelo Veo
 *
 * FUNCIONALIDADES:
 * - Play/pause/seek
 * - Controles customizados
 * - Fullscreen
 * - Download
 * - Thumbnail preview
 *
 * PREPARADO PARA:
 * - Multiple video sources
 * - Subtitles
 * - Quality selection
 * - Playback speed
 * - Picture-in-picture
 */

import React from 'react';

interface VideoPlayerProps {
  videoUrl: string;
  thumbnail?: string;
  title?: string;
  autoPlay?: boolean;
  controls?: boolean;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  videoUrl,
  thumbnail,
  title,
  autoPlay = false,
  controls = true
}) => {
  // 🚧 FUTURO: Implementar player completo

  return (
    <div className="video-player relative bg-black rounded-lg overflow-hidden">
      <div className="aspect-video">
        {videoUrl ? (
          <video
            src={videoUrl}
            poster={thumbnail}
            controls={controls}
            autoPlay={autoPlay}
            className="w-full h-full object-contain"
          >
            Seu navegador não suporta vídeos.
          </video>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <div className="text-4xl mb-2">🎬</div>
              <div>Carregando vídeo...</div>
            </div>
          </div>
        )}
      </div>

      {title && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
          <h3 className="text-white text-sm font-medium">{title}</h3>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
