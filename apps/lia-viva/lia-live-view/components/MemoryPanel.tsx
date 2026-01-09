import React, { useState } from 'react';
import { Memory } from '../types';

interface MemoryPanelProps {
  memories: Memory[];
  onAddMemory: (content: string, category?: string) => void;
  onDeleteMemory?: (id: string) => void;
}

const MemoryPanel: React.FC<MemoryPanelProps> = ({ memories, onAddMemory, onDeleteMemory }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newMemory, setNewMemory] = useState('');
  const [newCategory, setNewCategory] = useState('');

  const handleAdd = () => {
    if (newMemory.trim()) {
      onAddMemory(newMemory, newCategory || undefined);
      setNewMemory('');
      setNewCategory('');
      setIsAdding(false);
    }
  };

  return (
    <div className="bg-neon-panel/50 border border-neon-blue/20 rounded-lg p-4 backdrop-blur-sm max-h-[500px] flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-mono text-neon-blue uppercase tracking-wider">Memórias</h3>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="px-3 py-1 bg-neon-green/20 border border-neon-green text-neon-green text-xs font-mono rounded hover:bg-neon-green/30 transition-all"
        >
          {isAdding ? 'CANCEL' : '+ ADD'}
        </button>
      </div>

      {isAdding && (
        <div className="mb-4 p-3 bg-black/30 rounded-lg border border-neon-green/30 space-y-2">
          <input
            type="text"
            placeholder="Categoria (opcional)"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-neon-green transition-colors font-mono"
          />
          <textarea
            placeholder="Conteúdo da memória..."
            value={newMemory}
            onChange={(e) => setNewMemory(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-neon-green transition-colors font-mono resize-none"
            rows={3}
          />
          <button
            onClick={handleAdd}
            className="w-full py-2 bg-neon-green/20 border border-neon-green text-neon-green text-xs font-mono rounded hover:bg-neon-green/30 transition-all"
          >
            SAVE MEMORY
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-2 scrollbar-thin scrollbar-thumb-neon-blue/20">
        {memories.length === 0 ? (
          <div className="text-center text-gray-600 text-xs font-mono py-8">
            Nenhuma memória salva
          </div>
        ) : (
          memories.map((memory) => (
            <div key={memory.id} className="p-3 bg-black/30 rounded-lg border border-gray-800 hover:border-neon-blue/50 transition-all group">
              {memory.category && (
                <div className="text-xs font-mono text-neon-purple mb-1">[{memory.category}]</div>
              )}
              <p className="text-xs text-gray-300 leading-relaxed">{memory.content}</p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-[10px] font-mono text-gray-600">
                  {new Date(memory.timestamp).toLocaleDateString()}
                </span>
                {onDeleteMemory && (
                  <button
                    onClick={() => onDeleteMemory(memory.id)}
                    className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-400 transition-all text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default MemoryPanel;
