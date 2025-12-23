-- Criar tabela de conteúdo do site
CREATE TABLE public.site_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key text UNIQUE NOT NULL,
  content jsonb NOT NULL,
  is_active boolean DEFAULT true,
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Criar tabela de temas
CREATE TABLE public.site_theme (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  theme_name text NOT NULL,
  colors jsonb NOT NULL,
  fonts jsonb NOT NULL,
  spacing jsonb NOT NULL,
  is_active boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Criar índice único para tema ativo
CREATE UNIQUE INDEX idx_active_theme ON public.site_theme (is_active) WHERE is_active = true;

-- Criar tabela de versionamento
CREATE TABLE public.site_content_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid REFERENCES public.site_content(id) ON DELETE CASCADE,
  version_number int NOT NULL,
  content jsonb NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_theme ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_content_versions ENABLE ROW LEVEL SECURITY;

-- Políticas para site_content
CREATE POLICY "Público pode ver conteúdo ativo"
  ON public.site_content FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admin pode gerenciar conteúdo"
  ON public.site_content FOR ALL
  USING (true)
  WITH CHECK (true);

-- Políticas para site_theme
CREATE POLICY "Público pode ver tema ativo"
  ON public.site_theme FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admin pode gerenciar tema"
  ON public.site_theme FOR ALL
  USING (true)
  WITH CHECK (true);

-- Políticas para site_content_versions
CREATE POLICY "Admin pode ver versões"
  ON public.site_content_versions FOR SELECT
  USING (true);

CREATE POLICY "Admin pode criar versões"
  ON public.site_content_versions FOR INSERT
  WITH CHECK (true);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_site_content_updated_at
  BEFORE UPDATE ON public.site_content
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_site_theme_updated_at
  BEFORE UPDATE ON public.site_theme
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Função para criar versão automaticamente
CREATE OR REPLACE FUNCTION public.create_content_version()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_version_number int;
BEGIN
  SELECT COALESCE(MAX(version_number), 0) + 1
  INTO v_version_number
  FROM site_content_versions
  WHERE content_id = NEW.id;
  
  INSERT INTO site_content_versions (content_id, version_number, content, created_by)
  VALUES (NEW.id, v_version_number, OLD.content, NEW.updated_by);
  
  RETURN NEW;
END;
$$;

-- Trigger para versionar antes de atualizar
CREATE TRIGGER version_site_content
  BEFORE UPDATE ON public.site_content
  FOR EACH ROW
  EXECUTE FUNCTION public.create_content_version();

-- Popular com dados iniciais
INSERT INTO public.site_content (section_key, content) VALUES
('hero', '{"title": "Transforme seu Atendimento com IA", "subtitle": "Automatize conversas, agende compromissos e escale seu negócio com nossa plataforma inteligente", "ctaText": "Começar Agora Grátis", "ctaLink": "/auth"}'),
('plans', '{"title": "Escolha seu Plano", "subtitle": "Planos flexíveis para cada etapa do seu negócio"}'),
('about', '{"title": "Sobre a Luminnus", "description": "Somos especialistas em inteligência artificial aplicada ao atendimento"}'),
('solutions', '{"title": "Nossas Soluções", "subtitle": "Tecnologia de ponta para seu negócio"}'),
('footer', '{"copyright": "© 2025 Luminnus. Todos os direitos reservados.", "description": "Transformando atendimento com inteligência artificial"}');

-- Inserir tema padrão
INSERT INTO public.site_theme (theme_name, colors, fonts, spacing, is_active) VALUES
('default', 
'{"primary": "262.1 83.3% 57.8%", "secondary": "330.4 81.2% 60.4%", "background": "222.2 84% 4.9%", "foreground": "210 40% 98%", "accent": "38 92% 50%", "success": "142.1 76.2% 36.3%", "error": "0 84.2% 60.2%", "warning": "38 92% 50%"}',
'{"main": "Inter", "heading": "Inter"}',
'{"section": "8rem", "borderRadius": "12px"}',
true);

-- Adicionar índice para performance
CREATE INDEX idx_site_content_section ON public.site_content(section_key);
CREATE INDEX idx_site_content_versions_content_id ON public.site_content_versions(content_id);
CREATE INDEX idx_site_theme_active ON public.site_theme(is_active) WHERE is_active = true;