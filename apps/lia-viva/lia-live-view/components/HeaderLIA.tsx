import React from 'react';

interface HeaderLIAProps {
  isConnected: boolean;
  conversationId?: string;
  onResetSession: () => void;
  onClearHistory: () => void;
  onSyncMemories: () => void;
}

const HeaderLIA: React.FC<HeaderLIAProps> = ({
  isConnected,
  conversationId,
  onResetSession,
  onClearHistory,
  onSyncMemories
}) => {
  return (
    <header className="w-full bg-gradient-to-r from-black via-neon-dark to-black border-b border-neon-blue/30 px-6 py-4">
      <div className="flex items-center justify-between">

        {/* Logo e Nome */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-neon-blue to-neon-green flex items-center justify-center">
              <span className="text-xl font-bold text-black">L</span>
            </div>
            <div>
              <h1 className="text-2xl font-mono font-bold text-transparent bg-clip-text bg-gradient-to-r from-neon-green to-neon-blue">
                LIA
              </h1>
              <p className="text-xs text-gray-500 font-mono">Luminnus Intelligent Assistant</p>
            </div>
          </div>

          {/* Status Connection */}
          <div className="ml-6 flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-neon-green animate-pulse' : 'bg-red-500'}`} />
            <span className="text-xs font-mono text-gray-400">
              {isConnected ? 'Online' : 'Offline'}
            </span>
            {conversationId && (
              <span className="text-xs font-mono text-gray-600 ml-2">
                | ID: {conversationId.substring(0, 8)}...
              </span>
            )}
          </div>
        </div>

        {/* Botões de Controle */}
        <div className="flex items-center gap-3">

          <button
            onClick={onSyncMemories}
            className="px-4 py-2 bg-neon-purple/10 border border-neon-purple/30 hover:border-neon-purple hover:bg-neon-purple/20 text-neon-purple text-xs font-mono rounded-lg transition-all duration-200 flex items-center gap-2"
            title="Sincronizar Memórias"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            SYNC
          </button>

          <button
            onClick={onClearHistory}
            className="px-4 py-2 bg-yellow-500/10 border border-yellow-500/30 hover:border-yellow-500 hover:bg-yellow-500/20 text-yellow-500 text-xs font-mono rounded-lg transition-all duration-200 flex items-center gap-2"
            title="Limpar Histórico Visual"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            CLEAR
          </button>

          <button
            onClick={onResetSession}
            className="px-4 py-2 bg-red-500/10 border border-red-500/30 hover:border-red-500 hover:bg-red-500/20 text-red-500 text-xs font-mono rounded-lg transition-all duration-200 flex items-center gap-2"
            title="Reiniciar Sessão Completa"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            RESET
          </button>

        </div>
      </div>

      {/* Barra de progresso decorativa */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon-blue to-transparent opacity-50" />
    </header>
  );
};

export default HeaderLIA;
