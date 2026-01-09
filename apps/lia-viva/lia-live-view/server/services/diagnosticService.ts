import { Server } from 'socket.io';

/**
 * DiagnosticService
 * Centraliza a transmissão de passos internos do diagnóstico para o Painel Admin
 */
class DiagnosticService {
    private io: Server | null = null;

    /**
     * Inicializa o serviço com a instância do socket.io
     */
    init(io: Server) {
        this.io = io;
        console.log('🧠 [DiagnosticService] Inicializado e pronto para transmitir pensamentos.');
    }

    /**
     * Transmite um passo do processo de pensamento para o usuário
     * @param userId ID do usuário admin
     * @param action Ação sendo executada (ex: 'reading_file')
     * @param details Detalhes da ação (ex: 'apps/web/src/App.tsx')
     */
    broadcastStep(userId: string, action: string, details: any) {
        if (!this.io) return;

        // Emitimos para a sala do usuário (tenant/user) para que apenas ele veja
        // Mas como é admin root, podemos emitir para uma sala global de admin se necessário
        const payload = {
            timestamp: new Date().toISOString(),
            action,
            details,
            type: 'thought'
        };

        // Emitir para todos os admins conectados (sala tenant:0000...)
        // No futuro, podemos filtrar por userId específico
        this.io.emit('diagnostic:thought', payload);

        console.log(`🧠 [Thought] ${action}: ${JSON.stringify(details)}`);
    }
}

export const diagnosticService = new DiagnosticService();
