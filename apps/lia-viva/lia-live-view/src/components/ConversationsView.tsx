/**
 * ConversationsView - Painel de gerenciamento de conversas
 */
import { ConversationSidebar } from './ConversationSidebar';
import { useConversations } from '@/hooks/useConversations';
import { MessageSquare, Clock, MessageCircle } from 'lucide-react';

export function ConversationsView() {
    const {
        conversations,
        activeConversationId,
        activeConversation,
        createConversation,
        selectConversation,
        renameConversation,
        deleteConversation
    } = useConversations();

    return (
        <div className="flex h-full">
            {/* Sidebar de Conversas */}
            <div className="w-72 h-full border-r border-[rgba(0,243,255,0.2)] bg-[rgba(10,14,26,0.8)]">
                <ConversationSidebar
                    conversations={conversations}
                    activeConversationId={activeConversationId}
                    onSelectConversation={selectConversation}
                    onNewConversation={() => createConversation('multi-modal')}
                    onRenameConversation={renameConversation}
                    onDeleteConversation={deleteConversation}
                />
            </div>

            {/* Área Principal */}
            <div className="flex-1 flex flex-col items-center justify-center p-8">
                {activeConversation ? (
                    <div className="w-full max-w-2xl">
                        <div className="text-center mb-8">
                            <MessageSquare className="w-16 h-16 mx-auto mb-4 text-[#00f3ff] opacity-50" />
                            <h2 className="text-2xl font-bold text-[#00f3ff] mb-2">{activeConversation.title}</h2>
                            <p className="text-[rgba(224,247,255,0.6)]">
                                {activeConversation.messages.length} mensagens
                            </p>
                            <p className="text-sm text-[rgba(224,247,255,0.4)] mt-1">
                                <Clock className="w-3 h-3 inline mr-1" />
                                Criada em {new Date(activeConversation.createdAt).toLocaleString('pt-BR')}
                            </p>
                        </div>

                        {/* Preview das mensagens */}
                        <div className="bg-[rgba(0,0,0,0.3)] rounded-xl border border-[rgba(0,243,255,0.2)] p-4 max-h-96 overflow-y-auto">
                            {activeConversation.messages.length === 0 ? (
                                <p className="text-center text-[rgba(224,247,255,0.4)] py-8">
                                    Nenhuma mensagem ainda
                                </p>
                            ) : (
                                <div className="space-y-3">
                                    {activeConversation.messages.slice(-10).map((msg: any, idx: number) => (
                                        <div
                                            key={idx}
                                            className={`p-3 rounded-lg ${msg.type === 'user'
                                                    ? 'bg-[rgba(188,19,254,0.1)] border-l-2 border-[#bc13fe]'
                                                    : 'bg-[rgba(0,243,255,0.1)] border-l-2 border-[#00f3ff]'
                                                }`}
                                        >
                                            <span className="text-xs text-[rgba(224,247,255,0.5)] block mb-1">
                                                {msg.type === 'user' ? 'Você' : 'LIA'}
                                            </span>
                                            <p className="text-sm text-[#e0f7ff]">{msg.content?.substring(0, 200)}{msg.content?.length > 200 ? '...' : ''}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <p className="text-center text-sm text-[rgba(224,247,255,0.5)] mt-4">
                            💡 Use o Multi-Modal ou Chat Mode para continuar esta conversa
                        </p>
                    </div>
                ) : (
                    <div className="text-center">
                        <MessageCircle className="w-24 h-24 mx-auto mb-6 text-[#00f3ff] opacity-30" />
                        <h2 className="text-2xl font-bold text-[#00f3ff] mb-4">Gerenciador de Conversas</h2>
                        <p className="text-[rgba(224,247,255,0.6)] mb-6 max-w-md">
                            Organize suas conversas com a LIA. Cada conversa mantém seu histórico completo.
                        </p>
                        <button
                            onClick={() => createConversation('multi-modal')}
                            className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#00f3ff] to-[#bc13fe] text-[#0a0e1a] font-bold
                hover:shadow-[0_0_30px_rgba(0,243,255,0.5)] transition-all duration-300"
                        >
                            + Criar Nova Conversa
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
