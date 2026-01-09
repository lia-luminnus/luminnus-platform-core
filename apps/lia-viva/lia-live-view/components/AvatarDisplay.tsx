import React, { useEffect, useState } from 'react';

type AvatarState = 'idle' | 'listening' | 'thinking' | 'responding' | 'emotion';

interface AvatarMetadata {
  idle: string;
  listening: string;
  thinking: string;
  responding: string;
  emotions: {
    [key: string]: string;
  };
}

interface AvatarDisplayProps {
  state?: AvatarState;
  emotion?: string;
  isAgentSpeaking?: boolean; // Mantido para compatibilidade
  size?: 'small' | 'medium' | 'large';
}

const AvatarDisplay: React.FC<AvatarDisplayProps> = ({
  state = 'idle',
  emotion,
  isAgentSpeaking = false,
  size = 'medium'
}) => {
  const [rings] = useState<number[]>([1, 2, 3]);
  const [currentImage, setCurrentImage] = useState<string>('');
  const [previousImage, setPreviousImage] = useState<string>('');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [avatarMetadata, setAvatarMetadata] = useState<AvatarMetadata | null>(null);

  // Carrega metadata via fetch (correto para Vite)
  useEffect(() => {
    const loadMetadata = async () => {
      try {
        const response = await fetch('/avatar/metadata.json');
        if (!response.ok) {
          throw new Error('Failed to load avatar metadata');
        }
        const data = await response.json();
        setAvatarMetadata(data);
      } catch (error) {
        console.error('[AvatarDisplay] Error loading metadata:', error);
        // Fallback mínimo
        setAvatarMetadata({
          idle: 'Gemini_Generated_Image_nk1tnnnk1tnnnk1t.PNG',
          listening: 'Lia expressando curiosidade.PNG',
          thinking: 'Lia com uma expressão de confusão.PNG',
          responding: 'ChatGPT Image 10 de out. de 2025, 07_29_56.png',
          emotions: {}
        });
      }
    };

    loadMetadata();
  }, []);

  // Determina qual imagem exibir baseado no estado
  useEffect(() => {
    if (!avatarMetadata) return; // Aguarda carregamento

    let imageName = '';

    if (state === 'emotion' && emotion && avatarMetadata.emotions[emotion]) {
      imageName = avatarMetadata.emotions[emotion];
    } else if (state && avatarMetadata[state as keyof AvatarMetadata]) {
      const value = avatarMetadata[state as keyof AvatarMetadata];
      imageName = typeof value === 'string' ? value : avatarMetadata.idle;
    } else {
      // Fallback para idle
      imageName = avatarMetadata.idle;
    }

    const newImagePath = `/avatar/${imageName}`;

    if (newImagePath !== currentImage) {
      setPreviousImage(currentImage);
      setIsTransitioning(true);

      // Pequeno delay para ativar transição
      setTimeout(() => {
        setCurrentImage(newImagePath);
        setTimeout(() => setIsTransitioning(false), 300);
      }, 50);
    }
  }, [state, emotion, avatarMetadata, currentImage]);

  // Determina cor dos anéis baseado no estado
  const getRingColor = () => {
    if (state === 'responding' || isAgentSpeaking) return 'border-neon-green';
    if (state === 'listening') return 'border-neon-purple';
    if (state === 'thinking') return 'border-neon-blue';
    return 'border-neon-blue';
  };

  const getRingAnimation = () => {
    if (state === 'responding' || isAgentSpeaking) return 'animate-ping';
    if (state === 'listening') return 'animate-pulse';
    return '';
  };

  const getStatusText = () => {
    if (state === 'emotion' && emotion) return emotion.toUpperCase();
    if (state === 'responding' || isAgentSpeaking) return 'TRANSMITTING...';
    if (state === 'listening') return 'LISTENING...';
    if (state === 'thinking') return 'PROCESSING...';
    return 'STANDBY';
  };

  const getStatusColor = () => {
    if (state === 'responding' || isAgentSpeaking) return 'text-neon-green';
    if (state === 'listening') return 'text-neon-purple';
    if (state === 'thinking') return 'text-neon-blue';
    return 'text-gray-500';
  };

  // Size configuration
  const sizeConfig = {
    small: {
      container: 'w-32 h-32',
      image: 'w-28 h-28',
      title: 'text-lg',
      status: 'text-xs'
    },
    medium: {
      container: 'w-64 h-64',
      image: 'w-56 h-56',
      title: 'text-2xl',
      status: 'text-sm'
    },
    large: {
      container: 'w-96 h-96',
      image: 'w-80 h-80',
      title: 'text-4xl',
      status: 'text-lg'
    }
  };

  const config = sizeConfig[size];

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-neon-panel rounded-lg border border-neon-blue/20 overflow-hidden">
      {/* Background Grid */}
      <div className="absolute inset-0 opacity-10"
           style={{
             backgroundImage: 'linear-gradient(#0ff0fc 1px, transparent 1px), linear-gradient(90deg, #0ff0fc 1px, transparent 1px)',
             backgroundSize: '40px 40px'
           }}>
      </div>

      {/* Central Core */}
      <div className={`relative z-10 ${config.container} flex items-center justify-center`}>
         {/* Outer pulsing rings */}
         {rings.map((r) => (
            <div
              key={r}
              className={`absolute border rounded-full transition-all duration-1000 ease-in-out opacity-20
                ${getRingColor()} ${getRingAnimation()}
              `}
              style={{
                width: `${r * 100}%`,
                height: `${r * 100}%`,
                animationDuration: state === 'responding' || isAgentSpeaking ? '1s' : '4s'
              }}
            />
         ))}

         {/* Avatar Image Container */}
         <div className={`relative ${config.image} rounded-full overflow-hidden border-4 shadow-2xl transition-all duration-300`}
              style={{
                borderColor: state === 'responding' || isAgentSpeaking ? '#39ff14' :
                            state === 'listening' ? '#bc13fe' :
                            state === 'thinking' ? '#0ff0fc' : '#0ff0fc',
                boxShadow: state === 'responding' || isAgentSpeaking ? '0 0 20px #39ff14, 0 0 40px #39ff14' :
                           state === 'listening' ? '0 0 20px #bc13fe, 0 0 40px #bc13fe' :
                           state === 'thinking' ? '0 0 20px #0ff0fc, 0 0 40px #0ff0fc' :
                           '0 0 20px #0ff0fc, 0 0 40px #0ff0fc'
              }}>

            {/* Previous Image (for crossfade) */}
            {previousImage && isTransitioning && (
              <img
                src={previousImage}
                alt="LIA Avatar Previous"
                className="absolute inset-0 w-full h-full object-cover avatar-fade-out"
              />
            )}

            {/* Current Image */}
            {currentImage ? (
              <img
                src={currentImage}
                alt="LIA Avatar"
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
                  isTransitioning ? 'avatar-fade-in' : 'opacity-100'
                }`}
                onError={(e) => {
                  // Fallback se imagem não carregar
                  console.warn(`Avatar image failed to load: ${currentImage}`);
                  e.currentTarget.src = `/avatar/${avatarMetadata.idle}`;
                }}
              />
            ) : (
              // Fallback visual se nenhuma imagem carregar
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-neon-blue to-black">
                <div className="text-6xl font-mono font-bold text-white opacity-20">LIA</div>
              </div>
            )}
         </div>
      </div>

      <div className="mt-8 text-center z-10">
         <h2 className={`${config.title} font-mono font-bold text-white tracking-[0.2em]`}>LIA</h2>
         <p className={`${config.status} font-mono mt-2 tracking-widest transition-colors duration-300 ${getStatusColor()} ${
           (state === 'responding' || isAgentSpeaking || state === 'listening') ? 'animate-pulse' : ''
         }`}>
            {getStatusText()}
         </p>
      </div>
    </div>
  );
};

export default AvatarDisplay;
