import React from 'react';
import { PersonalityType } from '../types';

interface PersonalitySelectorProps {
  current: PersonalityType;
  onChange: (personality: PersonalityType) => void;
}

const PersonalitySelector: React.FC<PersonalitySelectorProps> = ({ current, onChange }) => {
  const personalities: { value: PersonalityType; label: string; description: string; color: string }[] = [
    {
      value: 'viva',
      label: 'Viva',
      description: 'Energética e entusiasta',
      color: 'neon-green'
    },
    {
      value: 'clara',
      label: 'Clara',
      description: 'Objetiva e direta',
      color: 'neon-blue'
    },
    {
      value: 'firme',
      label: 'Firme',
      description: 'Séria e profissional',
      color: 'neon-purple'
    }
  ];

  return (
    <div className="bg-neon-panel/50 border border-neon-blue/20 rounded-lg p-4 backdrop-blur-sm">
      <h3 className="text-sm font-mono text-neon-blue mb-4 uppercase tracking-wider">Personalidade</h3>

      <div className="grid grid-cols-3 gap-2">
        {personalities.map((p) => {
          const isActive = current === p.value;
          const colorClass = p.color;

          return (
            <button
              key={p.value}
              onClick={() => onChange(p.value)}
              className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                isActive
                  ? `border-${colorClass} bg-${colorClass}/20 scale-105`
                  : 'border-gray-800 bg-black/30 hover:border-gray-700'
              }`}
            >
              <div className={`text-xs font-mono font-bold mb-1 ${isActive ? `text-${colorClass}` : 'text-gray-500'}`}>
                {p.label.toUpperCase()}
              </div>
              <div className="text-[10px] text-gray-600 leading-tight">
                {p.description}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default PersonalitySelector;
