import React from 'react';

interface MicrophoneButtonProps {
  isActive: boolean;
  onClick: () => void;
  volumeLevel: number; // 0 to 100
}

const MicrophoneButton: React.FC<MicrophoneButtonProps> = ({ isActive, onClick, volumeLevel }) => {
  return (
    <button
      onClick={onClick}
      className={`
        relative group flex items-center justify-center w-16 h-16 rounded-full border-2 transition-all duration-300
        ${isActive 
          ? 'border-neon-green bg-neon-green/10 shadow-neon-green' 
          : 'border-gray-600 bg-gray-900 hover:border-neon-blue hover:shadow-neon-blue'}
      `}
    >
      {/* Volume Visualizer Ring */}
      {isActive && (
        <div 
          className="absolute inset-0 rounded-full border border-neon-green opacity-50"
          style={{ transform: `scale(${1 + volumeLevel / 100})`, transition: 'transform 0.1s ease-out' }}
        />
      )}

      {/* Icon */}
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        fill="none" 
        viewBox="0 0 24 24" 
        strokeWidth={1.5} 
        stroke="currentColor" 
        className={`w-8 h-8 transition-colors ${isActive ? 'text-neon-green' : 'text-gray-400 group-hover:text-neon-blue'}`}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
      </svg>
    </button>
  );
};

export default MicrophoneButton;