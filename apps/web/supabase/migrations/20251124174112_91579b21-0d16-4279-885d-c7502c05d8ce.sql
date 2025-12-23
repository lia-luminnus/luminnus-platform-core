-- Corrigir RLS policy da tabela plan_configs para permitir leitura pública
-- Primeiro, dropar a policy existente se houver
DROP POLICY IF EXISTS "Todos podem ver configurações de planos" ON public.plan_configs;

-- Criar nova policy explícita para permitir leitura pública
CREATE POLICY "Allow public read on plan_configs"
ON public.plan_configs
FOR SELECT
TO anon, authenticated
USING (true);