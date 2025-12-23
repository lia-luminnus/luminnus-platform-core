/**
 * Utility para armazenamento seguro de configurações sensíveis
 * ATENÇÃO: Este é um armazenamento básico. Para produção, considere usar variáveis de ambiente do servidor.
 */

// Chave de criptografia simples (apenas ofuscação básica)
const STORAGE_KEY = 'lia_admin_config_v1';
const ENCODE_OFFSET = 7;

// Função simples de encode/decode (ofuscação básica)
const encodeData = (data: string): string => {
  return btoa(
    data
      .split('')
      .map(char => String.fromCharCode(char.charCodeAt(0) + ENCODE_OFFSET))
      .join('')
  );
};

const decodeData = (data: string): string => {
  return atob(data)
    .split('')
    .map(char => String.fromCharCode(char.charCodeAt(0) - ENCODE_OFFSET))
    .join('');
};

export interface AdminConfig {
  openaiKey?: string;
  openaiApiKey?: string; // Alias para openaiKey
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  supabaseServiceKey?: string;
  supabaseServiceRoleKey?: string; // Alias para supabaseServiceKey
  liaApiUrl?: string;
  systemPrompt?: string;
  webhookUrl?: string;
  otherApiKeys?: Record<string, string>;
  lastUpdated?: string;
}

export const secureStorage = {
  // Salvar configurações
  save: (config: AdminConfig): void => {
    try {
      const data = JSON.stringify({
        ...config,
        lastUpdated: new Date().toISOString(),
      });
      const encoded = encodeData(data);
      localStorage.setItem(STORAGE_KEY, encoded);
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      throw new Error('Falha ao salvar configurações');
    }
  },

  // Carregar configurações
  load: (): AdminConfig | null => {
    try {
      const encoded = localStorage.getItem(STORAGE_KEY);
      if (!encoded) return null;

      const decoded = decodeData(encoded);
      return JSON.parse(decoded) as AdminConfig;
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      return null;
    }
  },

  // Limpar configurações
  clear: (): void => {
    localStorage.removeItem(STORAGE_KEY);
  },

  // Verificar se existe configuração
  exists: (): boolean => {
    return localStorage.getItem(STORAGE_KEY) !== null;
  },
};

// Senha master para acesso ao painel admin
// IMPORTANTE: Troque esta senha antes de usar em produção!
export const ADMIN_MASTER_PASSWORD = 'senha-da-lia-2025';

// Verificar senha de admin
export const verifyAdminPassword = (password: string): boolean => {
  return password === ADMIN_MASTER_PASSWORD;
};

// Session storage para controlar se admin está logado
const ADMIN_SESSION_KEY = 'lia_admin_session';

export const adminSession = {
  // Criar sessão admin
  create: (): void => {
    const session = {
      timestamp: Date.now(),
      expiresIn: 3600000, // 1 hora
    };
    sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
  },

  // Verificar se sessão está válida
  isValid: (): boolean => {
    try {
      const sessionData = sessionStorage.getItem(ADMIN_SESSION_KEY);
      if (!sessionData) return false;

      const session = JSON.parse(sessionData);
      const now = Date.now();
      const expiresAt = session.timestamp + session.expiresIn;

      return now < expiresAt;
    } catch {
      return false;
    }
  },

  // Destruir sessão
  destroy: (): void => {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
  },
};
