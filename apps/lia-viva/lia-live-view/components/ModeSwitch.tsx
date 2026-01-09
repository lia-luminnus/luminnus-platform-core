/**
 * ModeSwitch Component
 * Allows switching between Chat Mode (lateral) and LIA Live Mode (central avatar)
 */

import React from 'react';

interface ModeSwitchProps {
  currentMode: 'chat' | 'live';
  onModeChange: (mode: 'chat' | 'live') => void;
}

export const ModeSwitch: React.FC<ModeSwitchProps> = ({ currentMode, onModeChange }) => {
  return (
    <div className="flex gap-2 p-2 bg-gray-900 rounded-lg border border-gray-700">
      <button
        onClick={() => onModeChange('chat')}
        className={`px-4 py-2 rounded-lg font-mono text-sm transition-all ${
          currentMode === 'chat'
            ? 'bg-neon-blue text-black'
            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
        }`}
      >
        💬 Chat Mode
      </button>
      <button
        onClick={() => onModeChange('live')}
        className={`px-4 py-2 rounded-lg font-mono text-sm transition-all ${
          currentMode === 'live'
            ? 'bg-neon-green text-black'
            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
        }`}
      >
        🎭 LIA Live
      </button>
    </div>
  );
};

export default ModeSwitch;
