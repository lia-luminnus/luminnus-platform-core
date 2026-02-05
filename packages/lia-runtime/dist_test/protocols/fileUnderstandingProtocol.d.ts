/**
 * LIA — Protocolo Oficial de Leitura e Interpretação de Arquivos (SSOT) v3.1
 * Fonte Única de Verdade para o pipeline de análise multimodal.
 * v3.1: Adicionado IntentMode.ACTION para Execution Router
 */
export declare enum IntentMode {
    ACTION = "ACTION",// Execução de ação real (deletar/criar/mover/etc)
    INCIDENT = "INCIDENT",// Diagnóstico e Execução (Bug/Erro)
    CONTENT = "CONTENT",// Produção e Transformação (Resumo/Extração)
    HYBRID = "HYBRID"
}
export declare enum FileType {
    IMAGE = "IMAGE",
    PDF = "PDF",
    DOC = "DOC",
    LOG = "LOG",
    JSON = "JSON",
    CONFIG = "CONFIG",
    CODE = "CODE",
    CSV = "CSV",
    OTHER = "OTHER"
}
export interface ProtocolConstraints {
    maxLines: number;
    requireFixAndValidation: boolean;
    allowLongForm: boolean;
}
export interface IntentResult {
    mode: IntentMode;
    fileTypes: FileType[];
    context: string;
}
/**
 * Inferir o modo de intenção baseado no texto do usuário e nos arquivos recebidos
 * ORDEM DE PRIORIDADE: ACTION > CONTENT > INCIDENT > DEFAULT
 */
export declare function inferIntentMode(userText: string, fileMimeTypes?: string[], conversationContext?: string): IntentMode;
/**
 * Retorna as restrições do protocolo para o modo selecionado
 */
export declare function getResponseConstraints(mode: IntentMode, userWantsDetail?: boolean): ProtocolConstraints;
/**
 * Template sugerido para MODO A (Incidente)
 * v7.5: Tornado OPCIONAL e mais humano.
 */
export declare function templateIncident(): string;
/**
 * Template obrigatório para MODO ACTION (Execução)
 * PROIBIDO: ACHADO, EVIDÊNCIA, CAUSA RAIZ
 * Máximo 8-10 linhas
 */
export declare function templateAction(executed: boolean, capability?: string): string;
/**
 * Validador de QA para a resposta gerada
 */
export declare function validateResponse(lowerText: string): {
    ok: boolean;
    errors: string[];
};
//# sourceMappingURL=fileUnderstandingProtocol.d.ts.map