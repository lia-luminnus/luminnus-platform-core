import React from 'react';

interface VoiceControlsProps {
  isVoiceActive: boolean;
  isMicEnabled: boolean;
  isTTSEnabled: boolean;
  isWebRTCConnected: boolean;
  volume: number;
  onToggleVoice: () => void;
  onToggleMic: () => void;
  onToggleTTS: () => void;
}

const VoiceControls: React.FC<VoiceControlsProps> = ({
  isVoiceActive,
  isMicEnabled,
  isTTSEnabled,
  isWebRTCConnected,
  volume,
  onToggleVoice,
  onToggleMic,
  onToggleTTS
}) => {
  return (
    <div className="bg-neon-panel/50 border border-neon-blue/20 rounded-lg p-4 backdrop-blur-sm">
      <h3 className="text-sm font-mono text-neon-blue mb-4 uppercase tracking-wider">Voice Controls</h3>

      <div className="space-y-4">

        {/* Botão Principal: Iniciar/Parar Voz */}
        <button
          onClick={onToggleVoice}
          className={`w-full py-3 px-4 rounded-lg font-mono text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2 ${
            isVoiceActive
              ? 'bg-red-500/20 border-2 border-red-500 text-red-500 hover:bg-red-500/30'
              : 'bg-neon-green/20 border-2 border-neon-green text-neon-green hover:bg-neon-green/30'
          }`}
        >
          {isVoiceActive ? (
            <>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10h6v4H9z" />
              </svg>
              STOP VOICE
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              START VOICE
            </>
          )}
        </button>

        {/* Status WebRTC */}
        <div className="flex items-center justify-between p-3 bg-black/30 rounded-lg border border-gray-800">
          <span className="text-xs font-mono text-gray-400">WebRTC Status</span>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isWebRTCConnected ? 'bg-neon-green animate-pulse' : 'bg-gray-600'}`} />
            <span className={`text-xs font-mono ${isWebRTCConnected ? 'text-neon-green' : 'text-gray-600'}`}>
              {isWebRTCConnected ? 'CONNECTED' : 'DISCONNECTED'}
            </span>
          </div>
        </div>

        {/* Toggle Microfone */}
        <div className="flex items-center justify-between p-3 bg-black/30 rounded-lg border border-gray-800">
          <span className="text-xs font-mono text-gray-400">Microphone</span>
          <button
            onClick={onToggleMic}
            disabled={!isVoiceActive}
            className={`px-3 py-1 rounded font-mono text-xs transition-all ${
              isMicEnabled
                ? 'bg-neon-green/20 text-neon-green border border-neon-green'
                : 'bg-gray-800 text-gray-500 border border-gray-700'
            } ${!isVoiceActive && 'opacity-50 cursor-not-allowed'}`}
          >
            {isMicEnabled ? 'ON' : 'OFF'}
          </button>
        </div>

        {/* Toggle TTS */}
        <div className="flex items-center justify-between p-3 bg-black/30 rounded-lg border border-gray-800">
          <span className="text-xs font-mono text-gray-400">Text-to-Speech</span>
          <button
            onClick={onToggleTTS}
            disabled={!isVoiceActive}
            className={`px-3 py-1 rounded font-mono text-xs transition-all ${
              isTTSEnabled
                ? 'bg-neon-blue/20 text-neon-blue border border-neon-blue'
                : 'bg-gray-800 text-gray-500 border border-gray-700'
            } ${!isVoiceActive && 'opacity-50 cursor-not-allowed'}`}
          >
            {isTTSEnabled ? 'ON' : 'OFF'}
          </button>
        </div>

        {/* Volume Meter */}
        {isVoiceActive && (
          <div className="p-3 bg-black/30 rounded-lg border border-gray-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono text-gray-400">Input Volume</span>
              <span className="text-xs font-mono text-neon-green">{Math.round(volume)}%</span>
            </div>
            <div className="w-full h-2 bg-gray-900 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-neon-green to-neon-blue transition-all duration-100"
                style={{ width: `${Math.min(volume, 100)}%` }}
              />
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default VoiceControls;
