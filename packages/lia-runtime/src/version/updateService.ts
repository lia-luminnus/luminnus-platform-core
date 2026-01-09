// ======================================================================
// 🔄 UPDATE SERVICE - Sistema de detecção e notificação de updates
// ======================================================================

import type { UpdateAvailableEvent } from '../contracts/events.contract';

type UpdateListener = (event: UpdateAvailableEvent) => void;

/**
 * Serviço de detecção de atualizações
 * Usa polling para verificar novas versões e notificar o usuário
 */
class UpdateServiceClass {
    private listeners: UpdateListener[] = [];
    private pollingInterval: ReturnType<typeof setInterval> | null = null;
    private currentVersion: string = '0.0.0';
    private apiUrl: string = '';
    private isPolling: boolean = false;

    /**
     * Inicializa o serviço com a versão atual e URL da API
     */
    initialize(config: { currentVersion: string; apiUrl: string }): void {
        this.currentVersion = config.currentVersion;
        this.apiUrl = config.apiUrl;
        console.log(`🔄 [UpdateService] Inicializado com versão ${this.currentVersion}`);
    }

    /**
     * Inicia polling de versão
     * @param intervalMs Intervalo entre verificações (padrão: 60s)
     */
    startPolling(intervalMs: number = 60000): void {
        if (this.isPolling) {
            console.log('⚠️ [UpdateService] Polling já está ativo');
            return;
        }

        this.isPolling = true;
        console.log(`🔄 [UpdateService] Iniciando polling a cada ${intervalMs / 1000}s`);

        // Verificar imediatamente
        this.checkForUpdates();

        // Configurar polling
        this.pollingInterval = setInterval(() => {
            this.checkForUpdates();
        }, intervalMs);
    }

    /**
     * Para o polling
     */
    stopPolling(): void {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
        this.isPolling = false;
        console.log('🔄 [UpdateService] Polling parado');
    }

    /**
     * Verifica se há atualizações disponíveis
     */
    async checkForUpdates(): Promise<boolean> {
        try {
            const response = await fetch(`${this.apiUrl}/api/version`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            });

            if (!response.ok) {
                console.warn('⚠️ [UpdateService] Falha ao verificar versão:', response.status);
                return false;
            }

            const data = await response.json();
            const serverVersion = data.buildVersion || data.version || '0.0.0';
            console.log(`[UpdateService] Server: ${serverVersion}, Current: ${this.currentVersion}`);

            if (this.isNewerVersion(serverVersion, this.currentVersion)) {
                console.log(`🆕 [UpdateService] Nova versão disponível: ${serverVersion}`);
                this.notifyListeners({
                    currentVersion: this.currentVersion,
                    newVersion: serverVersion,
                    isRequired: data.isRequired || false,
                    message: data.message,
                });
                return true;
            }

            return false;
        } catch (error) {
            console.warn('⚠️ [UpdateService] Erro ao verificar atualizações:', error);
            return false;
        }
    }

    /**
     * Compara versões semânticas
     */
    private isNewerVersion(newVer: string, currentVer: string): boolean {
        const parseVersion = (v: string) => v.split('.').map(n => parseInt(n, 10) || 0);
        const newParts = parseVersion(newVer);
        const currentParts = parseVersion(currentVer);

        for (let i = 0; i < Math.max(newParts.length, currentParts.length); i++) {
            const newPart = newParts[i] || 0;
            const currentPart = currentParts[i] || 0;
            if (newPart > currentPart) {
                console.log(`[UpdateService] ${newVer} > ${currentVer} because ${newPart} > ${currentPart}`);
                return true;
            }
            if (newPart < currentPart) return false;
        }
        return false;
    }

    /**
     * Adiciona listener para eventos de atualização
     */
    onUpdateAvailable(callback: UpdateListener): () => void {
        this.listeners.push(callback);
        return () => {
            const index = this.listeners.indexOf(callback);
            if (index > -1) this.listeners.splice(index, 1);
        };
    }

    /**
     * Notifica todos os listeners
     */
    private notifyListeners(event: UpdateAvailableEvent): void {
        this.listeners.forEach(listener => listener(event));
    }

    /**
     * Força recarga da página (usado quando usuário clica em "Atualizar")
     */
    forceUpdate(): void {
        console.log('🔄 [UpdateService] Forçando atualização...');
        // Limpar cache do service worker se existir
        if ('caches' in window) {
            caches.keys().then(names => {
                names.forEach(name => caches.delete(name));
            });
        }
        // Recarregar com cache-busting
        window.location.reload();
    }

    /**
     * Obtém a versão atual
     */
    getCurrentVersion(): string {
        return this.currentVersion;
    }
}

// Singleton
export const UpdateService = new UpdateServiceClass();
