import React from 'react';

interface ConnectionPanelProps {
  isConnected: boolean;
  latencyMs?: number;
}

const ConnectionPanel: React.FC<ConnectionPanelProps> = ({ isConnected, latencyMs = 0 }) => {
  return (
    <div className="flex items-center justify-between p-4 mb-4 border border-neon-blue/30 bg-neon-panel/80 rounded-lg backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-neon-green shadow-neon-green' : 'bg-red-500'}`}></div>
        <span className="text-neon-blue font-mono text-sm tracking-wider uppercase">
          {isConnected ? 'System Online' : 'Disconnected'}
        </span>
      </div>
      
      {isConnected && (
        <div className="flex items-center gap-4 text-xs font-mono text-gray-400">
          <div>
            <span className="text-neon-blue">UPLINK:</span> STEADY
          </div>
          <div>
            <span className="text-neon-blue">LATENCY:</span> {latencyMs}ms
          </div>
        </div>
      )}
    </div>
  );
};

export default ConnectionPanel;