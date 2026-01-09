import React, { useEffect, useRef } from 'react';
import { SystemLog } from '../types';

interface LogsPanelProps {
  logs: SystemLog[];
  maxLogs?: number;
}

const LogsPanel: React.FC<LogsPanelProps> = ({ logs, maxLogs = 50 }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const getLogIcon = (type: SystemLog['type']) => {
    switch (type) {
      case 'success': return '✓';
      case 'error': return '✕';
      case 'warning': return '⚠';
      default: return 'ℹ';
    }
  };

  const getLogColor = (type: SystemLog['type']) => {
    switch (type) {
      case 'success': return 'text-neon-green border-neon-green/30';
      case 'error': return 'text-red-500 border-red-500/30';
      case 'warning': return 'text-yellow-500 border-yellow-500/30';
      default: return 'text-neon-blue border-neon-blue/30';
    }
  };

  const displayLogs = logs.slice(-maxLogs);

  return (
    <div className="bg-neon-panel/50 border border-neon-blue/20 rounded-lg p-4 backdrop-blur-sm max-h-[400px] flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-mono text-neon-blue uppercase tracking-wider">System Logs</h3>
        <span className="text-xs font-mono text-gray-600">{logs.length} events</span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-neon-blue/20 font-mono text-xs">
        {displayLogs.length === 0 ? (
          <div className="text-center text-gray-600 py-8">
            No system events logged
          </div>
        ) : (
          displayLogs.map((log) => (
            <div
              key={log.id}
              className={`p-2 bg-black/30 rounded border ${getLogColor(log.type)} hover:bg-black/50 transition-all`}
            >
              <div className="flex items-start gap-2">
                <span className={`${getLogColor(log.type)} font-bold`}>
                  {getLogIcon(log.type)}
                </span>
                <div className="flex-1">
                  <p className="text-gray-300 leading-relaxed">{log.message}</p>
                  {log.details && (
                    <pre className="text-[10px] text-gray-600 mt-1 overflow-x-auto">
                      {JSON.stringify(log.details, null, 2)}
                    </pre>
                  )}
                </div>
                <span className="text-[10px] text-gray-600 whitespace-nowrap">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};

export default LogsPanel;
