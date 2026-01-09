// ======================================================================
// ❌ Sistema Centralizado de Erros - LIA
// ======================================================================

/**
 * Códigos de erro tipados para o sistema de voz
 */
export const ErrorCodes = {
    // Erros de Microfone
    MIC_PERMISSION_DENIED: {
        code: 'MIC_PERMISSION_DENIED',
        message: 'Permissão de microfone negada. Por favor, permita o acesso ao microfone.',
        userFriendly: true
    },
    MIC_NOT_AVAILABLE: {
        code: 'MIC_NOT_AVAILABLE',
        message: 'Microfone não disponível. Verifique se um microfone está conectado.',
        userFriendly: true
    },

    // Erros de Áudio
    AUDIO_TOO_SHORT: {
        code: 'AUDIO_TOO_SHORT',
        message: 'Áudio muito curto. Fale por mais tempo.',
        userFriendly: true
    },
    AUDIO_EMPTY: {
        code: 'AUDIO_EMPTY',
        message: 'Nenhum áudio capturado. Tente novamente.',
        userFriendly: true
    },
    AUDIO_INVALID: {
        code: 'AUDIO_INVALID',
        message: 'Dados de áudio inválidos.',
        userFriendly: false
    },

    // Erros de API
    WHISPER_FAILED: {
        code: 'WHISPER_FAILED',
        message: 'Erro ao transcrever áudio. Tente novamente.',
        userFriendly: true
    },
    WHISPER_TIMEOUT: {
        code: 'WHISPER_TIMEOUT',
        message: 'Transcrição demorou muito. Tente com um áudio mais curto.',
        userFriendly: true
    },
    TTS_FAILED: {
        code: 'TTS_FAILED',
        message: 'Erro ao gerar resposta em áudio. Veja a resposta em texto.',
        userFriendly: true
    },
    TTS_TIMEOUT: {
        code: 'TTS_TIMEOUT',
        message: 'Geração de áudio demorou muito. Tente novamente.',
        userFriendly: true
    },
    GPT_FAILED: {
        code: 'GPT_FAILED',
        message: 'Erro ao processar sua mensagem. Tente reformular.',
        userFriendly: true
    },
    GPT_TIMEOUT: {
        code: 'GPT_TIMEOUT',
        message: 'Processamento demorou muito. Tente novamente.',
        userFriendly: true
    },

    // Erros de Conexão
    SOCKET_DISCONNECTED: {
        code: 'SOCKET_DISCONNECTED',
        message: 'Desconectado do servidor. Reconectando...',
        userFriendly: true
    },
    NETWORK_ERROR: {
        code: 'NETWORK_ERROR',
        message: 'Erro de rede. Verifique sua conexão.',
        userFriendly: true
    },

    // Erros de Validação
    INVALID_CONVERSATION_ID: {
        code: 'INVALID_CONVERSATION_ID',
        message: 'ID de conversação inválido.',
        userFriendly: false
    },
    INVALID_MIMETYPE: {
        code: 'INVALID_MIMETYPE',
        message: 'Formato de áudio não suportado.',
        userFriendly: true
    },
    INVALID_DATA: {
        code: 'INVALID_DATA',
        message: 'Dados inválidos recebidos.',
        userFriendly: false
    },

    // Erros Genéricos
    UNKNOWN_ERROR: {
        code: 'UNKNOWN_ERROR',
        message: 'Erro desconhecido. Tente novamente.',
        userFriendly: true
    }
};

/**
 * Classe de erro customizada para o sistema
 */
export class LiaError extends Error {
    constructor(errorCode, additionalInfo = {}) {
        super(errorCode.message);
        this.name = 'LiaError';
        this.code = errorCode.code;
        this.userFriendly = errorCode.userFriendly;
        this.additionalInfo = additionalInfo;
        this.timestamp = new Date().toISOString();
    }

    toJSON() {
        return {
            code: this.code,
            message: this.message,
            userFriendly: this.userFriendly,
            additionalInfo: this.additionalInfo,
            timestamp: this.timestamp
        };
    }
}

/**
 * Log estruturado de erro
 */
function logError(error) {
    const logEntry = {
        timestamp: error.timestamp || new Date().toISOString(),
        code: error.code,
        message: error.message,
        stack: error.stack,
        additionalInfo: error.additionalInfo || {}
    };

    // Log no console com formatação
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error(`❌ [${logEntry.code}] ${logEntry.message}`);
    console.error(`⏰ ${logEntry.timestamp}`);
    if (Object.keys(logEntry.additionalInfo).length > 0) {
        console.error('📊 Info adicional:', logEntry.additionalInfo);
    }
    if (logEntry.stack) {
        console.error('📚 Stack:', logEntry.stack);
    }
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // TODO: Integrar com serviço de logging (ex: Winston, Sentry)
    // logger.error(logEntry);
}

/**
 * Handler centralizado de erros para o backend
 */
export function handleError(error, socket = null) {
    let liaError;

    // Converter para LiaError se necessário
    if (error instanceof LiaError) {
        liaError = error;
    } else if (error.code && ErrorCodes[error.code]) {
        liaError = new LiaError(ErrorCodes[error.code]);
    } else {
        // Erro desconhecido
        liaError = new LiaError(ErrorCodes.UNKNOWN_ERROR, {
            originalError: error.message,
            originalStack: error.stack
        });
    }

    // Log estruturado
    logError(liaError);

    // Enviar para o cliente se socket fornecido
    if (socket) {
        socket.emit('error', {
            code: liaError.code,
            message: liaError.message,
            timestamp: liaError.timestamp
        });
    }

    return liaError;
}

/**
 * Wrapper para executar funções com tratamento de erro
 */
export async function withErrorHandling(fn, socket = null, errorCode = ErrorCodes.UNKNOWN_ERROR) {
    try {
        return await fn();
    } catch (error) {
        const liaError = new LiaError(errorCode, {
            originalError: error.message,
            originalStack: error.stack
        });
        handleError(liaError, socket);
        throw liaError;
    }
}

/**
 * Validadores comuns
 */
export const validators = {
    conversationId: (id) => {
        if (!id || typeof id !== 'string' || id.trim().length === 0) {
            throw new LiaError(ErrorCodes.INVALID_CONVERSATION_ID, { received: id });
        }
        return id.trim();
    },

    audioArray: (audio) => {
        if (!audio || !Array.isArray(audio) || audio.length === 0) {
            throw new LiaError(ErrorCodes.AUDIO_INVALID, { type: typeof audio });
        }
        return audio;
    },

    mimeType: (mimeType) => {
        if (!mimeType || typeof mimeType !== 'string') {
            throw new LiaError(ErrorCodes.INVALID_MIMETYPE, { received: mimeType });
        }

        const validTypes = ['audio/webm', 'audio/webm;codecs=opus', 'audio/mp4', 'audio/wav'];
        const isValid = validTypes.some(type => mimeType.includes(type.split(';')[0]));

        if (!isValid) {
            throw new LiaError(ErrorCodes.INVALID_MIMETYPE, { received: mimeType });
        }

        return mimeType;
    },

    textMessage: (text) => {
        if (!text || typeof text !== 'string' || text.trim().length === 0) {
            throw new LiaError(ErrorCodes.INVALID_DATA, { field: 'text', received: text });
        }
        return text.trim();
    }
};

export default {
    ErrorCodes,
    LiaError,
    handleError,
    withErrorHandling,
    validators
};
