import React from 'react';

interface ToolsPanelProps {
  onWebSearch: (query: string) => void;
  onCreateImage: (prompt: string) => void;
  onSummarize: () => void;
}

const ToolsPanel: React.FC<ToolsPanelProps> = ({ onWebSearch, onCreateImage, onSummarize }) => {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [imagePrompt, setImagePrompt] = React.useState('');

  return (
    <div className="bg-neon-panel/50 border border-neon-blue/20 rounded-lg p-4 backdrop-blur-sm">
      <h3 className="text-sm font-mono text-neon-blue mb-4 uppercase tracking-wider">Quick Tools</h3>

      <div className="space-y-3">

        {/* Web Search */}
        <div className="p-3 bg-black/30 rounded-lg border border-gray-800">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-4 h-4 text-neon-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span className="text-xs font-mono text-gray-400">Web Search</span>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Search query..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchQuery && onWebSearch(searchQuery)}
              className="flex-1 bg-gray-900 border border-gray-700 rounded px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-neon-green transition-colors font-mono"
            />
            <button
              onClick={() => searchQuery && onWebSearch(searchQuery)}
              className="px-3 py-2 bg-neon-green/20 border border-neon-green text-neon-green text-xs font-mono rounded hover:bg-neon-green/30 transition-all"
            >
              GO
            </button>
          </div>
        </div>

        {/* Create Image */}
        <div className="p-3 bg-black/30 rounded-lg border border-gray-800">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-4 h-4 text-neon-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-xs font-mono text-gray-400">Create Image</span>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Image description..."
              value={imagePrompt}
              onChange={(e) => setImagePrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && imagePrompt && onCreateImage(imagePrompt)}
              className="flex-1 bg-gray-900 border border-gray-700 rounded px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-neon-purple transition-colors font-mono"
            />
            <button
              onClick={() => imagePrompt && onCreateImage(imagePrompt)}
              className="px-3 py-2 bg-neon-purple/20 border border-neon-purple text-neon-purple text-xs font-mono rounded hover:bg-neon-purple/30 transition-all"
            >
              GO
            </button>
          </div>
        </div>

        {/* Summarize */}
        <button
          onClick={onSummarize}
          className="w-full p-3 bg-black/30 rounded-lg border border-gray-800 hover:border-neon-blue hover:bg-black/50 transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-neon-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-xs font-mono text-gray-400 group-hover:text-neon-blue transition-colors">
              Summarize Conversation
            </span>
          </div>
          <svg className="w-4 h-4 text-gray-600 group-hover:text-neon-blue transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

      </div>
    </div>
  );
};

export default ToolsPanel;
