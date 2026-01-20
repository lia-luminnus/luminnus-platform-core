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

        const payload = {
            timestamp: new Date().toISOString(),
            action,
            details,
            type: 'thought'
        };

        this.io.emit('diagnostic:thought', payload);
        console.log(`🧠 [Thought] ${action}: ${JSON.stringify(details)}`);
    }

    /**
     * Retorna o status de saúde do sistema
     */
    async getHealth() {
        return {
            status: 'healthy',
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            timestamp: new Date().toISOString(),
            version: '4.1.0'
        };
    }

    /**
     * Retorna logs recentes (simulado ou do arquivo)
     */
    async getLogs(limit: number = 50, level: string = 'all') {
        return {
            success: true,
            message: `Aqui estão os últimos ${limit} logs do sistema (${level}).`,
            logs: [
                { timestamp: new Date().toISOString(), level: 'info', message: 'Sistema operacional normal.' },
                { timestamp: new Date().toISOString(), level: 'info', message: 'Conexão com banco de dados ativa.' }
            ]
        };
    }

    /**
     * Lê um arquivo do projeto (protegido)
     */
    async readFile(filePath: string) {
        try {
            const fs = await import('fs');
            const path = await import('path');

            const fullPath = path.resolve(process.cwd(), filePath);
            if (!fullPath.startsWith(process.cwd())) {
                throw new Error('Acesso negado: fora do diretório do projeto.');
            }

            const content = fs.readFileSync(fullPath, 'utf-8');
            return {
                success: true,
                path: filePath,
                content: content.substring(0, 5000)
            };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Retorna o mapa do projeto (estrutura de pastas)
     */
    async getMap() {
        return {
            success: true,
            structure: {
                apps: ['lia-viva', 'web'],
                packages: ['shared', 'api', 'ui'],
                supabase: ['migrations', 'functions']
            }
        };
    }
}

export const diagnosticService = new DiagnosticService();
