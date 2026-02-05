import type { UpdateAvailableEvent } from '../contracts/events.contract.js';
type UpdateListener = (event: UpdateAvailableEvent) => void;
/**
 * Serviço de detecção de atualizações
 * Usa polling para verificar novas versões e notificar o usuário
 */
declare class UpdateServiceClass {
    private listeners;
    private pollingInterval;
    private currentVersion;
    private apiUrl;
    private isPolling;
    /**
     * Inicializa o serviço com a versão atual e URL da API
     */
    initialize(config: {
        currentVersion: string;
        apiUrl: string;
    }): void;
    /**
     * Inicia polling de versão
     * @param intervalMs Intervalo entre verificações (padrão: 60s)
     */
    startPolling(intervalMs?: number): void;
    /**
     * Para o polling
     */
    stopPolling(): void;
    /**
     * Verifica se há atualizações disponíveis
     */
    checkForUpdates(): Promise<boolean>;
    /**
     * Compara versões semânticas
     */
    private isNewerVersion;
    /**
     * Adiciona listener para eventos de atualização
     */
    onUpdateAvailable(callback: UpdateListener): () => void;
    /**
     * Notifica todos os listeners
     */
    private notifyListeners;
    /**
     * Força recarga da página (usado quando usuário clica em "Atualizar")
     */
    forceUpdate(): void;
    /**
     * Obtém a versão atual
     */
    getCurrentVersion(): string;
}
export declare const UpdateService: UpdateServiceClass;
export {};
//# sourceMappingURL=updateService.d.ts.map