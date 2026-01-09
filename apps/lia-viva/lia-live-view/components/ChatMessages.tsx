import React, { useEffect, useRef } from 'react';
import { ChatMessage } from '../types';

interface ChatMessagesProps {
  messages: ChatMessage[];
  isLoading?: boolean;
  compact?: boolean;
}

const ChatMessages: React.FC<ChatMessagesProps> = ({ messages, isLoading = false, compact = false }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  // Compact mode configurations
  const paddingClass = compact ? 'p-2' : 'p-4';
  const spaceClass = compact ? 'space-y-2' : 'space-y-4';
  const textSizeClass = compact ? 'text-sm' : 'text-base';
  const maxWidthClass = compact ? 'max-w-full' : 'max-w-[85%]';

  return (
    <div className={`flex-1 overflow-y-auto ${paddingClass} ${spaceClass} scrollbar-thin scrollbar-thumb-neon-blue/20`}>
      {messages.length === 0 && !isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-600 font-mono pointer-events-none">
          <div className={`animate-pulse ${compact ? 'text-xs' : 'text-sm'} tracking-widest`}>AWAITING COMMUNICATION...</div>
        </div>
      )}

      {messages.map((msg) => {
        const isUser = msg.role === 'user';
        return (
          <div key={msg.id} className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex flex-col ${maxWidthClass} ${isUser ? 'items-end' : 'items-start'}`}>

              <div className={`relative ${compact ? 'p-2' : 'p-4'} ${compact ? 'rounded-lg' : 'rounded-2xl'} shadow-lg border backdrop-blur-md transition-all ${
                isUser
                  ? 'bg-neon-purple/10 border-neon-purple/40 text-gray-100 rounded-br-none'
                  : 'bg-gray-900/80 border-neon-green/30 text-gray-200 rounded-bl-none'
              }`}>

                {msg.emotion && !compact && (
                  <div className="text-xs font-mono text-neon-green mb-1 uppercase">
                    😊 {msg.emotion}
                  </div>
                )}

                <p className={`${textSizeClass} leading-relaxed whitespace-pre-wrap font-sans`}>
                  {msg.content}
                </p>

                {msg.audioUrl && !compact && (
                  <audio src={msg.audioUrl} controls className="mt-2 w-full max-w-xs" />
                )}
              </div>

              {!compact && (
                <div className={`flex items-center gap-2 mt-1 text-[10px] font-mono text-gray-500 uppercase ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                  <span>{isUser ? 'USER' : 'LIA'}</span>
                  <span>::</span>
                  <span>{formatTime(msg.timestamp)}</span>
                </div>
              )}

            </div>
          </div>
        );
      })}

      {isLoading && (
        <div className="flex w-full justify-start">
          <div className="bg-gray-900/80 border border-neon-blue/30 p-4 rounded-2xl rounded-bl-none">
            <div className="flex space-x-2 items-center h-6">
              <div className="w-2 h-2 bg-neon-blue rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-neon-blue rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-neon-blue rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </div>
      )}

      <div ref={bottomRef} className="h-1" />
    </div>
  );
};

export default ChatMessages;
