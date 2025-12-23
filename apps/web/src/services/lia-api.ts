/**
 * API PARA COMUNICACAO DA LIA COM A PLATAFORMA
 * Permite que a LIA execute acoes no sistema da imobiliaria
 *
 * Endpoints para o backend (Render):
 * POST /lia/action - Executa acao da LIA
 */
import { apiPost } from "./backend";
import {
  updateEtapa,
  addAgendaEvento,
  sugerirImovel,
  getClienteById,
  getImoveis,
  searchImoveis,
  createNotificacao,
  getAgenda,
  getProcesso,
  createCliente,
} from "./api";

// ==================== TYPES ====================

export type LiaActionType =
  | "update_status"
  | "criar_evento"
  | "sugerir_imovel"
  | "buscar_cliente"
  | "listar_imoveis"
  | "buscar_imoveis"
  | "enviar_notificacao"
  | "buscar_agenda"
  | "buscar_processo"
  | "registrar_cliente";

export interface LiaAction {
  action: LiaActionType;
  cliente_id?: string;
  etapa?: number;
  data?: string;
  hora?: string;
  tipo?: string;
  descricao?: string;
  imovel_id?: string;
  nota?: string;
  filtros?: {
    precoMin?: number;
    precoMax?: number;
    quartos?: number;
    tipologia?: string;
    localizacao?: string;
  };
  notificacao?: {
    tipo: string;
    titulo: string;
    mensagem: string;
  };
  cliente_data?: {
    nome: string;
    email: string;
    telefone?: string;
    endereco?: string;
  };
}

export interface LiaActionResponse {
  success: boolean;
  message?: string;
  data?: any;
}

// ==================== FUNCOES LOCAIS (SUPABASE DIRETO) ====================

/**
 * Processa uma acao da LIA localmente usando Supabase
 * Para uso quando o frontend pode executar diretamente
 */
export async function processLiaActionLocal(action: LiaAction): Promise<LiaActionResponse> {
  try {
    switch (action.action) {
      case "update_status": {
        if (!action.cliente_id || !action.etapa) {
          return { success: false, message: "cliente_id e etapa sao obrigatorios" };
        }
        const processo = await updateEtapa(action.cliente_id, action.etapa);
        return { success: true, data: processo };
      }

      case "criar_evento": {
        if (!action.cliente_id || !action.data || !action.hora || !action.tipo) {
          return { success: false, message: "cliente_id, data, hora e tipo sao obrigatorios" };
        }
        const evento = await addAgendaEvento({
          cliente_id: action.cliente_id,
          data: action.data,
          hora: action.hora,
          tipo: action.tipo as any,
          descricao: action.descricao,
          status: "agendado",
          imovel_id: action.imovel_id,
        });
        return { success: true, data: evento };
      }

      case "sugerir_imovel": {
        if (!action.cliente_id || !action.imovel_id) {
          return { success: false, message: "cliente_id e imovel_id sao obrigatorios" };
        }
        const sugestao = await sugerirImovel(action.cliente_id, action.imovel_id, action.nota);
        return { success: true, data: sugestao };
      }

      case "buscar_cliente": {
        if (!action.cliente_id) {
          return { success: false, message: "cliente_id e obrigatorio" };
        }
        const cliente = await getClienteById(action.cliente_id);
        return { success: true, data: cliente };
      }

      case "listar_imoveis": {
        const imoveis = await getImoveis(true); // Apenas disponiveis
        return { success: true, data: imoveis };
      }

      case "buscar_imoveis": {
        if (!action.filtros) {
          return { success: false, message: "filtros sao obrigatorios" };
        }
        const imoveis = await searchImoveis(action.filtros);
        return { success: true, data: imoveis };
      }

      case "enviar_notificacao": {
        if (!action.cliente_id || !action.notificacao) {
          return { success: false, message: "cliente_id e notificacao sao obrigatorios" };
        }
        const notificacao = await createNotificacao({
          cliente_id: action.cliente_id,
          tipo: action.notificacao.tipo,
          titulo: action.notificacao.titulo,
          mensagem: action.notificacao.mensagem,
          origem: "lia",
        });
        return { success: true, data: notificacao };
      }

      case "buscar_agenda": {
        if (!action.cliente_id) {
          return { success: false, message: "cliente_id e obrigatorio" };
        }
        const agenda = await getAgenda(action.cliente_id);
        return { success: true, data: agenda };
      }

      case "buscar_processo": {
        if (!action.cliente_id) {
          return { success: false, message: "cliente_id e obrigatorio" };
        }
        const processo = await getProcesso(action.cliente_id);
        return { success: true, data: processo };
      }

      case "registrar_cliente": {
        if (!action.cliente_data) {
          return { success: false, message: "cliente_data e obrigatorio" };
        }
        const cliente = await createCliente({
          nome: action.cliente_data.nome,
          email: action.cliente_data.email,
          telefone: action.cliente_data.telefone,
          endereco: action.cliente_data.endereco,
          role: "cliente",
          status_processo: "inicial",
          user_id: "", // Será preenchido quando o cliente criar conta
        });
        return { success: true, data: cliente };
      }

      default:
        return { success: false, message: `Acao desconhecida: ${action.action}` };
    }
  } catch (error: any) {
    return { success: false, message: error.message || "Erro ao processar acao" };
  }
}

// ==================== FUNCOES VIA BACKEND (RENDER) ====================

/**
 * Envia uma acao da LIA para o backend processar
 * Para uso quando precisa passar pelo servidor
 */
export async function processLiaActionBackend(action: LiaAction): Promise<LiaActionResponse> {
  try {
    const response = await apiPost<LiaActionResponse>("/lia/action", action);
    return response;
  } catch (error: any) {
    return { success: false, message: error.message || "Erro ao comunicar com backend" };
  }
}

// ==================== FUNCOES DE ALTO NIVEL PARA A LIA ====================

/**
 * LIA: Atualiza status do processo de um cliente
 */
export async function liaAtualizarStatus(clienteId: string, etapa: number): Promise<LiaActionResponse> {
  return processLiaActionLocal({
    action: "update_status",
    cliente_id: clienteId,
    etapa,
  });
}

/**
 * LIA: Agenda uma visita para o cliente
 */
export async function liaAgendarVisita(
  clienteId: string,
  data: string,
  hora: string,
  descricao?: string,
  imovelId?: string
): Promise<LiaActionResponse> {
  return processLiaActionLocal({
    action: "criar_evento",
    cliente_id: clienteId,
    data,
    hora,
    tipo: "visita",
    descricao,
    imovel_id: imovelId,
  });
}

/**
 * LIA: Sugere um imovel para o cliente
 */
export async function liaSugerirImovel(
  clienteId: string,
  imovelId: string,
  nota?: string
): Promise<LiaActionResponse> {
  return processLiaActionLocal({
    action: "sugerir_imovel",
    cliente_id: clienteId,
    imovel_id: imovelId,
    nota,
  });
}

/**
 * LIA: Busca dados de um cliente
 */
export async function liaBuscarCliente(clienteId: string): Promise<LiaActionResponse> {
  return processLiaActionLocal({
    action: "buscar_cliente",
    cliente_id: clienteId,
  });
}

/**
 * LIA: Lista todos os imoveis disponiveis
 */
export async function liaListarImoveis(): Promise<LiaActionResponse> {
  return processLiaActionLocal({
    action: "listar_imoveis",
  });
}

/**
 * LIA: Busca imoveis por filtros
 */
export async function liaBuscarImoveis(filtros: LiaAction["filtros"]): Promise<LiaActionResponse> {
  return processLiaActionLocal({
    action: "buscar_imoveis",
    filtros,
  });
}

/**
 * LIA: Envia uma notificacao para o cliente
 */
export async function liaEnviarNotificacao(
  clienteId: string,
  tipo: string,
  titulo: string,
  mensagem: string
): Promise<LiaActionResponse> {
  return processLiaActionLocal({
    action: "enviar_notificacao",
    cliente_id: clienteId,
    notificacao: { tipo, titulo, mensagem },
  });
}

/**
 * LIA: Busca agenda do cliente
 */
export async function liaBuscarAgenda(clienteId: string): Promise<LiaActionResponse> {
  return processLiaActionLocal({
    action: "buscar_agenda",
    cliente_id: clienteId,
  });
}

/**
 * LIA: Busca processo do cliente
 */
export async function liaBuscarProcesso(clienteId: string): Promise<LiaActionResponse> {
  return processLiaActionLocal({
    action: "buscar_processo",
    cliente_id: clienteId,
  });
}

/**
 * LIA: Registra um novo cliente
 */
export async function liaRegistrarCliente(
  nome: string,
  email: string,
  telefone?: string,
  endereco?: string
): Promise<LiaActionResponse> {
  return processLiaActionLocal({
    action: "registrar_cliente",
    cliente_data: { nome, email, telefone, endereco },
  });
}

// ==================== EXPORT ====================

export default {
  processLiaActionLocal,
  processLiaActionBackend,
  liaAtualizarStatus,
  liaAgendarVisita,
  liaSugerirImovel,
  liaBuscarCliente,
  liaListarImoveis,
  liaBuscarImoveis,
  liaEnviarNotificacao,
  liaBuscarAgenda,
  liaBuscarProcesso,
  liaRegistrarCliente,
};
