-- ============================================================
-- LUMINNUS IMOBILIARIA - SCHEMA DO BANCO DE DADOS SUPABASE
-- Execute este SQL diretamente no SQL Editor do Supabase
-- ============================================================

-- ==================== TABELA: CLIENTES ====================
-- Armazena informacoes dos clientes da imobiliaria
CREATE TABLE IF NOT EXISTS clientes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  telefone TEXT,
  endereco TEXT,
  status_processo TEXT DEFAULT 'inicial',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  role TEXT DEFAULT 'cliente' CHECK (role IN ('cliente', 'admin')),
  senha_hash TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Index para busca por email
CREATE INDEX IF NOT EXISTS idx_clientes_email ON clientes(email);
CREATE INDEX IF NOT EXISTS idx_clientes_user_id ON clientes(user_id);

-- RLS (Row Level Security) para clientes
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;

-- Politica: Clientes podem ver apenas seus proprios dados
CREATE POLICY "Clientes podem ver seus proprios dados"
  ON clientes FOR SELECT
  USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM clientes WHERE user_id = auth.uid() AND role = 'admin'
  ));

-- Politica: Clientes podem atualizar seus proprios dados
CREATE POLICY "Clientes podem atualizar seus dados"
  ON clientes FOR UPDATE
  USING (auth.uid() = user_id);

-- Politica: Admins podem fazer tudo
CREATE POLICY "Admins tem acesso total"
  ON clientes FOR ALL
  USING (EXISTS (
    SELECT 1 FROM clientes WHERE user_id = auth.uid() AND role = 'admin'
  ));


-- ==================== TABELA: IMOVEIS ====================
-- Armazena informacoes dos imoveis cadastrados
CREATE TABLE IF NOT EXISTS imoveis (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  localizacao TEXT NOT NULL,
  tipologia TEXT, -- Apartamento, Casa, Terreno, etc
  preco NUMERIC(12,2) NOT NULL,
  area NUMERIC(10,2),
  banheiros INTEGER DEFAULT 0,
  quartos INTEGER DEFAULT 0,
  fotos TEXT[] DEFAULT '{}',
  disponivel BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  descricao TEXT,
  caracteristicas TEXT[]
);

-- Index para busca por preco e disponibilidade
CREATE INDEX IF NOT EXISTS idx_imoveis_disponivel ON imoveis(disponivel);
CREATE INDEX IF NOT EXISTS idx_imoveis_preco ON imoveis(preco);

-- RLS para imoveis
ALTER TABLE imoveis ENABLE ROW LEVEL SECURITY;

-- Politica: Qualquer usuario autenticado pode ver imoveis disponiveis
CREATE POLICY "Usuarios podem ver imoveis"
  ON imoveis FOR SELECT
  USING (disponivel = true OR EXISTS (
    SELECT 1 FROM clientes WHERE user_id = auth.uid() AND role = 'admin'
  ));

-- Politica: Apenas admins podem inserir/atualizar/deletar
CREATE POLICY "Admins podem gerenciar imoveis"
  ON imoveis FOR ALL
  USING (EXISTS (
    SELECT 1 FROM clientes WHERE user_id = auth.uid() AND role = 'admin'
  ));


-- ==================== TABELA: PROCESSOS ====================
-- Armazena o progresso do processo de cada cliente (etapas 1-7)
CREATE TABLE IF NOT EXISTS processos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  etapa_atual INTEGER DEFAULT 1 CHECK (etapa_atual >= 1 AND etapa_atual <= 7),
  observacoes TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  status TEXT DEFAULT 'em_andamento' CHECK (status IN ('em_andamento', 'concluido', 'cancelado', 'pendente'))
);

-- Index para busca por cliente
CREATE INDEX IF NOT EXISTS idx_processos_cliente ON processos(cliente_id);

-- RLS para processos
ALTER TABLE processos ENABLE ROW LEVEL SECURITY;

-- Politica: Clientes podem ver seus proprios processos
CREATE POLICY "Clientes podem ver seus processos"
  ON processos FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM clientes WHERE clientes.id = processos.cliente_id AND clientes.user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM clientes WHERE user_id = auth.uid() AND role = 'admin'
  ));

-- Politica: Admins podem gerenciar processos
CREATE POLICY "Admins podem gerenciar processos"
  ON processos FOR ALL
  USING (EXISTS (
    SELECT 1 FROM clientes WHERE user_id = auth.uid() AND role = 'admin'
  ));


-- ==================== TABELA: AGENDA ====================
-- Armazena eventos da agenda (visitas, reunioes, entregas)
CREATE TABLE IF NOT EXISTS agenda (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  hora TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('visita', 'reuniao', 'entrega_docs', 'assinatura', 'outro')),
  descricao TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  status TEXT DEFAULT 'agendado' CHECK (status IN ('agendado', 'confirmado', 'cancelado', 'realizado')),
  imovel_id UUID REFERENCES imoveis(id) ON DELETE SET NULL
);

-- Index para busca por cliente e data
CREATE INDEX IF NOT EXISTS idx_agenda_cliente ON agenda(cliente_id);
CREATE INDEX IF NOT EXISTS idx_agenda_data ON agenda(data);

-- RLS para agenda
ALTER TABLE agenda ENABLE ROW LEVEL SECURITY;

-- Politica: Clientes podem ver seus proprios eventos
CREATE POLICY "Clientes podem ver seus eventos"
  ON agenda FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM clientes WHERE clientes.id = agenda.cliente_id AND clientes.user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM clientes WHERE user_id = auth.uid() AND role = 'admin'
  ));

-- Politica: Admins podem gerenciar agenda
CREATE POLICY "Admins podem gerenciar agenda"
  ON agenda FOR ALL
  USING (EXISTS (
    SELECT 1 FROM clientes WHERE user_id = auth.uid() AND role = 'admin'
  ));


-- ==================== TABELA: IMOVEIS_SUGERIDOS ====================
-- Relaciona imoveis sugeridos para cada cliente
CREATE TABLE IF NOT EXISTS imoveis_sugeridos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  imovel_id UUID NOT NULL REFERENCES imoveis(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  nota_lia TEXT, -- Nota da LIA sobre por que sugeriu este imovel
  UNIQUE(cliente_id, imovel_id)
);

-- Index para busca
CREATE INDEX IF NOT EXISTS idx_sugeridos_cliente ON imoveis_sugeridos(cliente_id);

-- RLS para imoveis_sugeridos
ALTER TABLE imoveis_sugeridos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clientes podem ver seus imoveis sugeridos"
  ON imoveis_sugeridos FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM clientes WHERE clientes.id = imoveis_sugeridos.cliente_id AND clientes.user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM clientes WHERE user_id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Admins podem gerenciar sugestoes"
  ON imoveis_sugeridos FOR ALL
  USING (EXISTS (
    SELECT 1 FROM clientes WHERE user_id = auth.uid() AND role = 'admin'
  ));


-- ==================== TABELA: NOTIFICACOES ====================
-- Armazena notificacoes para clientes e admins
CREATE TABLE IF NOT EXISTS notificacoes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  titulo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  lida BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  origem TEXT DEFAULT 'sistema' -- sistema, lia, admin
);

-- Index para busca
CREATE INDEX IF NOT EXISTS idx_notificacoes_cliente ON notificacoes(cliente_id);

-- RLS para notificacoes
ALTER TABLE notificacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clientes podem ver suas notificacoes"
  ON notificacoes FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM clientes WHERE clientes.id = notificacoes.cliente_id AND clientes.user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM clientes WHERE user_id = auth.uid() AND role = 'admin'
  ));


-- ==================== FUNCOES AUXILIARES ====================

-- Funcao para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para processos
DROP TRIGGER IF EXISTS processos_updated_at ON processos;
CREATE TRIGGER processos_updated_at
  BEFORE UPDATE ON processos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();


-- ==================== DADOS INICIAIS (OPCIONAL) ====================
-- Descomente para inserir dados de teste

/*
-- Inserir imoveis de exemplo
INSERT INTO imoveis (titulo, localizacao, tipologia, preco, area, banheiros, quartos, disponivel, descricao) VALUES
  ('Apartamento T2 Centro', 'Lisboa Centro', 'Apartamento', 250000, 85, 2, 2, true, 'Apartamento renovado no centro historico'),
  ('Moradia T3 com Jardim', 'Cascais', 'Moradia', 450000, 150, 3, 3, true, 'Moradia com jardim e garagem'),
  ('Apartamento T1 Moderno', 'Porto', 'Apartamento', 180000, 55, 1, 1, true, 'Apartamento moderno com acabamentos de alta qualidade');
*/


-- ============================================================
-- FIM DO SCHEMA
-- Execute todo este SQL no Supabase SQL Editor
-- ============================================================
