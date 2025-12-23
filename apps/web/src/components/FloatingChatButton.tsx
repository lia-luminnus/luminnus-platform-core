import { useState } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import LiaChatWindow from './LiaChatWindow';
import liaAvatar from '@/assets/lia-assistant-new.png';

const FloatingChatButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleClick = () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    setIsOpen(!isOpen);
  };

  return (
    <>
      {/* Botão Flutuante */}
      <button
        onClick={handleClick}
        className={`fixed bottom-6 right-6 z-50 w-16 h-16 rounded-full shadow-lg hover:shadow-[0_0_30px_rgba(124,58,237,0.6)] transition-all duration-300 flex items-center justify-center group overflow-hidden ${
          isOpen ? 'bg-gradient-to-r from-[#7C3AED] to-[#FF2E9E] rotate-90' : 'bg-[#1a1a1f] p-1'
        }`}
        aria-label="Chat com Lia"
      >
        {isOpen ? (
          <X className="w-8 h-8 text-white" />
        ) : (
          <div className="w-full h-full rounded-full bg-gradient-to-r from-[#7C3AED] to-[#FF2E9E] p-[2px]">
            <img 
              src={liaAvatar} 
              alt="Lia" 
              className="w-full h-full object-cover object-top rounded-full group-hover:scale-110 transition-transform"
            />
          </div>
        )}
      </button>

      {/* Janela de Chat */}
      {isOpen && user && (
        <LiaChatWindow onClose={() => setIsOpen(false)} />
      )}
    </>
  );
};

export default FloatingChatButton;
