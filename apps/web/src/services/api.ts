/**
 * API CENTRALIZADA PARA OPERACOES DO SISTEMA
 * Todas as funcoes de acesso ao banco Supabase
 *
 * Uso: import { getClientes, createImovel } from "@/services/api";
 */
import { supabase } from "@/integrations/supabase/client";

// ==================== TYPES ====================

export interface Cliente {
  id: string;
  nome: string;
  email: string;
  telefone?: string;
  endereco?: string;
  status_processo?: string;
  created_at: string;
  role: "cliente" | "admin";
  user_id: string;
}

export interface Imovel {
  id: string;
  titulo: string;
  localizacao: string;
  tipologia?: string;
  preco: number;
  area?: number;
  banheiros?: number;
  quartos?: number;
  fotos?: string[];
  disponivel: boolean;
  created_at: string;
  descricao?: string;
  caracteristicas?: string[];
}

export interface Processo {
  id: string;
  cliente_id: string;
  etapa_atual: number;
  observacoes?: string;
  updated_at: string;
  created_at: string;
  status: "em_andamento" | "concluido" | "cancelado" | "pendente";
}

export interface AgendaEvento {
  id: string;
  cliente_id: string;
  data: string;
  hora: string;
  tipo: "visita" | "reuniao" | "entrega_docs" | "assinatura" | "outro";
  descricao?: string;
  created_at: string;
  status: "agendado" | "confirmado" | "cancelado" | "realizado";
  imovel_id?: string;
}

export interface ImovelSugerido {
  id: string;
  cliente_id: string;
  imovel_id: string;
  created_at: string;
  nota_lia?: string;
  imovel?: Imovel;
}

export interface Notificacao {
  id: string;
  cliente_id?: string;
  tipo: string;
  titulo: string;
  mensagem: string;
  lida: boolean;
  created_at: string;
  origem: string;
}

export interface BuscaCliente {
  id: string;
  localizacao?: string;
  tipo_imovel?: string;
  tipologia?: string;
  casas_banho?: string;
  valor_aprovado?: number;
  preco_min?: number;
  preco_max?: number;
  nome?: string;
  email?: string;
  telefone?: string;
  created_at?: string;
}

// ==================== CLIENTES ====================

/**
 * Busca todos os clientes (apenas admins)
 */
export async function getClientes(): Promise<Cliente[]> {
  const { data, error } = await supabase
    .from("clientes")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data as Cliente[];
}

/**
 * Busca um cliente por ID
 */
export async function getClienteById(id: string): Promise<Cliente | null> {
  const { data, error } = await supabase
    .from("clientes")
    .select("*")
    .eq("id", id)
    .single();

  if (error && error.code !== "PGRST116") throw new Error(error.message);
  return data as Cliente | null;
}

/**
 * Busca cliente pelo user_id do Supabase Auth
 */
export async function getClienteByUserId(userId: string): Promise<Cliente | null> {
  const { data, error } = await supabase
    .from("clientes")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error && error.code !== "PGRST116") throw new Error(error.message);
  return data as Cliente | null;
}

/**
 * Cria um novo cliente
 */
export async function createCliente(clienteData: Omit<Cliente, "id" | "created_at">): Promise<Cliente> {
  const { data, error } = await supabase
    .from("clientes")
    .insert([clienteData])
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Cliente;
}

/**
 * Atualiza dados de um cliente
 */
export async function updateCliente(id: string, data: Partial<Cliente>): Promise<Cliente> {
  const { data: updated, error } = await supabase
    .from("clientes")
    .update(data)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return updated as Cliente;
}

/**
 * Deleta um cliente
 */
export async function deleteCliente(id: string): Promise<void> {
  const { error } = await supabase.from("clientes").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ==================== IMOVEIS ====================

/**
 * Busca todos os imoveis
 */
export async function getImoveis(onlyAvailable = false): Promise<Imovel[]> {
  let query = supabase.from("imoveis").select("*").order("created_at", { ascending: false });

  if (onlyAvailable) {
    query = query.eq("disponivel", true);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data as Imovel[];
}

/**
 * Busca um imovel por ID
 */
export async function getImovel(id: string): Promise<Imovel | null> {
  const { data, error } = await supabase
    .from("imoveis")
    .select("*")
    .eq("id", id)
    .single();

  if (error && error.code !== "PGRST116") throw new Error(error.message);
  return data as Imovel | null;
}

/**
 * Cria um novo imovel
 */
export async function createImovel(imovelData: Omit<Imovel, "id" | "created_at">): Promise<Imovel> {
  const { data, error } = await supabase
    .from("imoveis")
    .insert(imovelData)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Imovel;
}

/**
 * Atualiza um imovel
 */
export async function updateImovel(id: string, data: Partial<Imovel>): Promise<Imovel> {
  const { data: updated, error } = await supabase
    .from("imoveis")
    .update(data)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return updated as Imovel;
}

/**
 * Deleta um imovel
 */
export async function deleteImovel(id: string): Promise<void> {
  const { error } = await supabase.from("imoveis").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/**
 * Busca imoveis com filtros
 */
export async function searchImoveis(filtros: {
  precoMin?: number;
  precoMax?: number;
  quartos?: number;
  tipologia?: string;
  localizacao?: string;
}): Promise<Imovel[]> {
  let query = supabase.from("imoveis").select("*").eq("disponivel", true);

  if (filtros.precoMin) query = query.gte("preco", filtros.precoMin);
  if (filtros.precoMax) query = query.lte("preco", filtros.precoMax);
  if (filtros.quartos) query = query.gte("quartos", filtros.quartos);
  if (filtros.tipologia) query = query.eq("tipologia", filtros.tipologia);
  if (filtros.localizacao) query = query.ilike("localizacao", `%${filtros.localizacao}%`);

  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data as Imovel[];
}

// ==================== PROCESSOS ====================

/**
 * Busca processo de um cliente
 */
export async function getProcesso(clienteId: string): Promise<Processo | null> {
  const { data, error } = await supabase
    .from("processos")
    .select("*")
    .eq("cliente_id", clienteId)
    .single();

  if (error && error.code !== "PGRST116") throw new Error(error.message);
  return data as Processo | null;
}

/**
 * Busca todos os processos (admins)
 */
export async function getProcessos(): Promise<Processo[]> {
  const { data, error } = await supabase
    .from("processos")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data as Processo[];
}

/**
 * Cria um novo processo para um cliente
 */
export async function createProcesso(clienteId: string): Promise<Processo> {
  const { data, error } = await supabase
    .from("processos")
    .insert({
      cliente_id: clienteId,
      etapa_atual: 1,
      status: "em_andamento",
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Processo;
}

/**
 * Atualiza a etapa de um processo
 */
export async function updateEtapa(clienteId: string, etapa: number, observacoes?: string): Promise<Processo> {
  const updateData: Partial<Processo> = { etapa_atual: etapa };
  if (observacoes) updateData.observacoes = observacoes;

  const { data, error } = await supabase
    .from("processos")
    .update(updateData)
    .eq("cliente_id", clienteId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Processo;
}

/**
 * Atualiza status do processo
 */
export async function updateProcessoStatus(
  clienteId: string,
  status: Processo["status"]
): Promise<Processo> {
  const { data, error } = await supabase
    .from("processos")
    .update({ status })
    .eq("cliente_id", clienteId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Processo;
}

// ==================== AGENDA ====================

/**
 * Busca agenda de um cliente
 */
export async function getAgenda(clienteId: string): Promise<AgendaEvento[]> {
  const { data, error } = await supabase
    .from("agenda")
    .select("*")
    .eq("cliente_id", clienteId)
    .order("data", { ascending: true });

  if (error) throw new Error(error.message);
  return data as AgendaEvento[];
}

/**
 * Busca todos os eventos da agenda (admins)
 */
export async function getAllAgenda(): Promise<AgendaEvento[]> {
  const { data, error } = await supabase
    .from("agenda")
    .select("*")
    .order("data", { ascending: true });

  if (error) throw new Error(error.message);
  return data as AgendaEvento[];
}

/**
 * Adiciona evento na agenda
 */
export async function addAgendaEvento(
  eventoData: Omit<AgendaEvento, "id" | "created_at">
): Promise<AgendaEvento> {
  const { data, error } = await supabase
    .from("agenda")
    .insert(eventoData)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as AgendaEvento;
}

/**
 * Atualiza evento da agenda
 */
export async function updateAgendaEvento(
  id: string,
  data: Partial<AgendaEvento>
): Promise<AgendaEvento> {
  const { data: updated, error } = await supabase
    .from("agenda")
    .update(data)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return updated as AgendaEvento;
}

/**
 * Deleta evento da agenda
 */
export async function deleteAgendaEvento(id: string): Promise<void> {
  const { error } = await supabase.from("agenda").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ==================== IMOVEIS SUGERIDOS ====================

/**
 * Busca imoveis sugeridos para um cliente
 */
export async function getImoveisSugeridos(clienteId: string): Promise<ImovelSugerido[]> {
  const { data, error } = await supabase
    .from("imoveis_sugeridos")
    .select(`
      *,
      imovel:imoveis(*)
    `)
    .eq("cliente_id", clienteId);

  if (error) throw new Error(error.message);
  return data as ImovelSugerido[];
}

/**
 * Sugere um imovel para um cliente
 */
export async function sugerirImovel(
  clienteId: string,
  imovelId: string,
  notaLia?: string
): Promise<ImovelSugerido> {
  const { data, error } = await supabase
    .from("imoveis_sugeridos")
    .insert({
      cliente_id: clienteId,
      imovel_id: imovelId,
      nota_lia: notaLia,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as ImovelSugerido;
}

/**
 * Remove sugestao de imovel
 */
export async function removerSugestao(id: string): Promise<void> {
  const { error } = await supabase.from("imoveis_sugeridos").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ==================== NOTIFICACOES ====================

/**
 * Busca notificacoes de um cliente
 */
export async function getNotificacoes(clienteId: string): Promise<Notificacao[]> {
  const { data, error } = await supabase
    .from("notificacoes")
    .select("*")
    .eq("cliente_id", clienteId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data as Notificacao[];
}

/**
 * Cria uma notificacao
 */
export async function createNotificacao(
  notificacaoData: Omit<Notificacao, "id" | "created_at" | "lida">
): Promise<Notificacao> {
  const { data, error } = await supabase
    .from("notificacoes")
    .insert({ ...notificacaoData, lida: false })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Notificacao;
}

/**
 * Marca notificacao como lida
 */
export async function marcarNotificacaoLida(id: string): Promise<void> {
  const { error } = await supabase
    .from("notificacoes")
    .update({ lida: true })
    .eq("id", id);

  if (error) throw new Error(error.message);
}

// ===============================
// Buscas de Clientes
// ===============================

/**
 * Salva uma busca de cliente
 */
export async function saveBuscaCliente(busca: Partial<BuscaCliente>): Promise<BuscaCliente> {
  const { data, error } = await supabase
    .from('buscas_clientes')
    .insert(busca)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as BuscaCliente;
}

/**
 * Busca todas as buscas de clientes (admins)
 */
export async function getBuscasClientes(): Promise<BuscaCliente[]> {
  const { data, error } = await supabase
    .from('buscas_clientes')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data as BuscaCliente[];
}

// ==================== STORAGE - FOTOS DE IMÓVEIS ====================

/**
 * Faz upload de uma foto de imóvel para o bucket
 */
export async function uploadImovelFoto(file: File, imovelId: string): Promise<string> {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${imovelId}/${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('imoveis-fotos')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('imoveis-fotos')
      .getPublicUrl(data.path);

    return publicUrl;
  } catch (error) {
    console.error('Erro ao fazer upload da foto:', error);
    throw error;
  }
}

/**
 * Remove uma foto do bucket
 */
export async function deleteImovelFoto(url: string): Promise<void> {
  try {
    const urlParts = url.split('/imoveis-fotos/');
    if (urlParts.length < 2) throw new Error('URL inválida');
    
    const filePath = urlParts[1];

    const { error } = await supabase.storage
      .from('imoveis-fotos')
      .remove([filePath]);

    if (error) throw error;
  } catch (error) {
    console.error('Erro ao deletar foto:', error);
    throw error;
  }
}

// ==================== HELPERS ====================

/**
 * Obtem o cliente atual baseado na sessao
 */
export async function getClienteAtual(): Promise<Cliente | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  return getClienteByUserId(user.id);
}

/**
 * Verifica se o usuario atual e admin
 */
export async function isAdmin(): Promise<boolean> {
  const cliente = await getClienteAtual();
  return cliente?.role === "admin";
}
