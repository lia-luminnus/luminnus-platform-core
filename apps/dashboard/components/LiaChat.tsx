
import React, { useState, useEffect, useRef, useContext } from 'react';
import Header from './Header';
import { ChatMessage } from '../types';
import { sendMessageToGemini } from '../services/geminiService';
import { LanguageContext } from '../App';
import toast from 'react-hot-toast';

const LiaChat: React.FC = () => {
  const { t } = useContext(LanguageContext);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize with welcome message based on language
  useEffect(() => {
    setMessages([
        { id: '1', role: 'model', text: t('liaIntro'), timestamp: new Date() }
    ]);
  }, [t]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    const responseText = await sendMessageToGemini(input);

    const aiMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'model',
      text: responseText,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, aiMessage]);
    setLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleMic = () => {
    if (!('webkitSpeechRecognition' in window)) {
        toast.error('Seu navegador não suporta reconhecimento de voz.');
        return;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'pt-BR'; // Could be dynamic based on context language

    recognition.onstart = () => {
        setIsListening(true);
        toast.loading('Ouvindo...', { id: 'mic' });
    };

    recognition.onend = () => {
        setIsListening(false);
        toast.dismiss('mic');
    };

    recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
    };

    recognition.start();
  };

  return (
    <div className="flex flex-col h-full">
      <Header title={t('conversationsTitle')} />
      
      <div className="flex-1 flex overflow-hidden p-6 pb-2 gap-6">
        {/* History Sidebar */}
        <div className="w-80 hidden md:flex flex-col glass-panel bg-white dark:bg-white/5 rounded-2xl p-4">
           <h3 className="font-semibold text-lg mb-4 px-2">{t('recentConversations')}</h3>
           <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
              {[
                { title: t('chatHistory1'), snippet: t('chatHistorySnippet1') },
                { title: t('chatHistory2'), snippet: t('chatHistorySnippet2') },
                { title: t('chatHistory3'), snippet: t('chatHistorySnippet3') },
              ].map((item, idx) => (
                <button 
                    key={idx} 
                    onClick={() => toast('Carregando histórico...')}
                    className="w-full text-left p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors group"
                >
                   <p className="font-medium text-sm truncate text-gray-800 dark:text-gray-200">{item.title}</p>
                   <p className="text-xs text-gray-500 truncate group-hover:text-gray-600 dark:group-hover:text-gray-400">{item.snippet}</p>
                </button>
              ))}
           </div>
           <button onClick={() => setMessages([{ id: 'new', role: 'model', text: t('liaIntro'), timestamp: new Date() }])} className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/20 transition-colors font-medium text-sm">
              <span className="material-symbols-outlined text-lg">add</span>
              {t('newConversation')}
           </button>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col glass-panel bg-white dark:bg-white/5 rounded-2xl relative overflow-hidden">
           
           {/* Messages */}
           <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {messages.length <= 1 && (
                 <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-pink-500 via-purple-600 to-blue-500 flex items-center justify-center mb-6 animate-pulse">
                       <span className="material-symbols-outlined text-5xl text-white">auto_awesome</span>
                    </div>
                    <h2 className="text-3xl font-bold mb-2">{t('howCanIHelp')}</h2>
                    <p className="max-w-md">{t('liaIntro')}</p>
                 </div>
              )}

              {messages.length > 1 && messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                   <div className={`max-w-[80%] p-4 rounded-2xl ${
                     msg.role === 'user' 
                       ? 'bg-brand-primary text-white rounded-br-none' 
                       : 'bg-gray-100 dark:bg-white/10 text-gray-800 dark:text-gray-100 rounded-bl-none'
                   }`}>
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.text}</p>
                   </div>
                </div>
              ))}
              
              {loading && (
                <div className="flex justify-start">
                   <div className="bg-gray-100 dark:bg-white/10 p-4 rounded-2xl rounded-bl-none flex gap-2 items-center">
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75"></span>
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></span>
                   </div>
                </div>
              )}
              <div ref={messagesEndRef} />
           </div>

           {/* Input Area */}
           <div className="p-4 border-t border-gray-200 dark:border-white/10 bg-white/50 dark:bg-[#0A0F1A]/50 backdrop-blur-md">
              
              {/* Quick Prompts (only show if few messages) */}
              {messages.length < 3 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                   {[t('analyzeData'), t('draftEmail'), t('summarizePDF'), t('myTasks')].map((prompt, i) => (
                      <button key={i} onClick={() => setInput(prompt)} className="text-xs text-left p-3 rounded-xl bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 border border-gray-200 dark:border-white/10 transition-colors">
                         {prompt}
                      </button>
                   ))}
                </div>
              )}

              <div className="relative">
                 <textarea 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={t('typeMessage')}
                    className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl pl-4 pr-24 py-3 resize-none focus:ring-2 focus:ring-brand-primary focus:outline-none text-sm custom-scrollbar max-h-32"
                    rows={1}
                 />
                 <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <button 
                        onClick={handleMic} 
                        className={`p-2 rounded-full transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'hover:bg-gray-200 dark:hover:bg-white/10 text-gray-400'}`}
                    >
                       <span className="material-symbols-outlined text-xl">mic</span>
                    </button>
                    <button 
                      onClick={handleSend}
                      disabled={!input.trim() || loading}
                      className="p-2 rounded-full bg-brand-primary text-white hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed">
                       <span className="material-symbols-outlined text-xl">send</span>
                    </button>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default LiaChat;
