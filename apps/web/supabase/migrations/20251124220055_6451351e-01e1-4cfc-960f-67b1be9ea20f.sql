-- Criar bucket para fotos de imóveis
INSERT INTO storage.buckets (id, name, public)
VALUES ('imoveis-fotos', 'imoveis-fotos', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas RLS para o bucket imoveis-fotos
-- Permitir visualização pública das fotos
CREATE POLICY "Fotos de imóveis são públicas"
ON storage.objects FOR SELECT
USING (bucket_id = 'imoveis-fotos');

-- Permitir upload apenas para admins
CREATE POLICY "Admins podem fazer upload de fotos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'imoveis-fotos' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Permitir atualização apenas para admins
CREATE POLICY "Admins podem atualizar fotos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'imoveis-fotos' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Permitir remoção apenas para admins
CREATE POLICY "Admins podem deletar fotos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'imoveis-fotos' 
  AND has_role(auth.uid(), 'admin'::app_role)
);