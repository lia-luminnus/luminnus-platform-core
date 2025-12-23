-- Criar tabela para salvar buscas de clientes
CREATE TABLE IF NOT EXISTS public.buscas_clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  localizacao TEXT,
  tipo_imovel TEXT,
  tipologia TEXT,
  casas_banho TEXT,
  valor_aprovado NUMERIC,
  preco_min NUMERIC,
  preco_max NUMERIC,
  nome TEXT,
  email TEXT,
  telefone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.buscas_clientes ENABLE ROW LEVEL SECURITY;

-- Admins podem ver todas as buscas
CREATE POLICY "Admins can view all searches" 
ON public.buscas_clientes
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Qualquer pessoa pode inserir uma busca (formulário público)
CREATE POLICY "Anyone can insert searches" 
ON public.buscas_clientes
FOR INSERT 
WITH CHECK (true);

-- Criar índice para melhorar performance
CREATE INDEX idx_buscas_clientes_created_at ON public.buscas_clientes(created_at DESC);

-- Habilitar realtime para a tabela
ALTER PUBLICATION supabase_realtime ADD TABLE public.buscas_clientes;