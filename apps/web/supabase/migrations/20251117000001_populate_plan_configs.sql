-- Migration: Popular plan_configs com dados iniciais dos planos
-- Data: 2025-11-17
-- Descrição: Insere os planos Start, Plus e Pro na tabela plan_configs

-- Inserir planos iniciais
INSERT INTO plan_configs (
  plan_name,
  price,
  annual_price,
  description,
  max_channels,
  max_conversations,
  max_messages,
  features,
  is_popular,
  discount,
  gradient_start,
  gradient_end,
  lia_quote,
  custom_cta_text,
  custom_cta_action
)
VALUES
  -- Plano Start
  (
    'Start',
    '€27',
    '€291,60',
    'Ideal para pequenos negócios e profissionais autônomos',
    '1',
    '100',
    '1000',
    '["Integração com WhatsApp (1 número)", "Chat online no site (widget simples)", "Integração com e-mail", "Criação de 1 fluxo de automação", "Agendamento simples (Google Agenda)", "Relatórios básicos de atendimento", "Acesso à LIA via painel (respostas simples)", "Suporte por e-mail", "1 usuário"]'::jsonb,
    false,
    10,
    '194 97% 64%',  -- cyan/teal
    '199 89% 48%',  -- sky blue
    'O plano Start é perfeito se você está começando! Vou cuidar das perguntas mais frequentes dos seus clientes, trabalhar 24h e liberar seu tempo para focar no crescimento. É como ter um assistente sempre disponível, sem custos de contratação.',
    NULL,
    NULL
  ),

  -- Plano Plus
  (
    'Plus',
    '€147',
    '€1.411',
    'Para empresas em crescimento que precisam escalar',
    '5',
    '500',
    '5000',
    '["WhatsApp Business (vários números)", "Chat integrado (com histórico)", "E-mail profissional", "Messenger (Facebook), Telegram, Instagram Direct", "Integração com CRM (HubSpot, RD Station, Pipedrive)", "Agenda integrada (Google, Outlook)", "Google Sheets / Excel online", "10 fluxos de automação customizados", "Gatilhos por palavras-chave", "Etiquetas automáticas", "Relatórios detalhados", "Suporte prioritário", "Até 3 usuários"]'::jsonb,
    true,
    20,
    '262.1 83.3% 57.8%',  -- purple
    '330.4 81.2% 60.4%',  -- pink
    'Esse é o plano que recomendo para quem já tem um fluxo constante de clientes! Com o Plus, posso atender em múltiplos canais, aprender com cada conversa e integrar com todas as suas ferramentas. Vou agendar reuniões, atualizar seu CRM e até gerar relatórios inteligentes. É automação de verdade! 🚀',
    NULL,
    NULL
  ),

  -- Plano Pro
  (
    'Pro',
    'A partir de €997',
    'A partir de €9.564',
    'Solução enterprise totalmente personalizada',
    'Ilimitado',
    'Ilimitado',
    'Ilimitado',
    '["Assistente LIA com personalidade customizável", "Construtor visual de fluxos com IA", "Criação de múltiplas instâncias personalizadas da LIA", "Integração com ERP (SAP, Conta Azul, Bling)", "Sistemas financeiros e bancários", "Ferramentas internas da empresa", "Integração por API e Webhooks", "Acesso ilimitado a canais e integrações", "Criação de relatórios financeiros inteligentes", "Gestão de equipe com permissões", "10+ usuários", "Suporte com gestor dedicado", "Implantação assistida"]'::jsonb,
    false,
    20,
    '330.4 81.2% 60.4%',  -- pink
    '24.6 95% 53.1%',     -- orange
    'O Pro é para quem quer uma Lia 100% personalizada! Vou me adaptar completamente ao seu negócio, usar sua linguagem, seguir seus processos e integrar com qualquer sistema. Teremos uma equipe dedicada cuidando de tudo e eu vou trabalhar como se fosse parte do time. É o máximo em inteligência artificial empresarial! 💎',
    'Solicitar proposta personalizada',
    'https://wa.me/YOUR_WHATSAPP_NUMBER?text=Olá!%20Gostaria%20de%20solicitar%20uma%20proposta%20personalizada%20do%20plano%20Pro'
  )
ON CONFLICT (plan_name) DO UPDATE SET
  price = EXCLUDED.price,
  annual_price = EXCLUDED.annual_price,
  description = EXCLUDED.description,
  max_channels = EXCLUDED.max_channels,
  max_conversations = EXCLUDED.max_conversations,
  max_messages = EXCLUDED.max_messages,
  features = EXCLUDED.features,
  is_popular = EXCLUDED.is_popular,
  discount = EXCLUDED.discount,
  gradient_start = EXCLUDED.gradient_start,
  gradient_end = EXCLUDED.gradient_end,
  lia_quote = EXCLUDED.lia_quote,
  custom_cta_text = EXCLUDED.custom_cta_text,
  custom_cta_action = EXCLUDED.custom_cta_action,
  updated_at = NOW();

-- Adicionar colunas que estavam faltando na tabela plan_configs
ALTER TABLE plan_configs
  ADD COLUMN IF NOT EXISTS annual_price TEXT,
  ADD COLUMN IF NOT EXISTS is_popular BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS discount INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gradient_start TEXT,
  ADD COLUMN IF NOT EXISTS gradient_end TEXT,
  ADD COLUMN IF NOT EXISTS lia_quote TEXT,
  ADD COLUMN IF NOT EXISTS custom_cta_text TEXT,
  ADD COLUMN IF NOT EXISTS custom_cta_action TEXT;

COMMENT ON COLUMN plan_configs.annual_price IS 'Preço anual do plano';
COMMENT ON COLUMN plan_configs.is_popular IS 'Se o plano é marcado como popular';
COMMENT ON COLUMN plan_configs.discount IS 'Desconto percentual para pagamento anual';
COMMENT ON COLUMN plan_configs.gradient_start IS 'Cor inicial do gradiente HSL';
COMMENT ON COLUMN plan_configs.gradient_end IS 'Cor final do gradiente HSL';
COMMENT ON COLUMN plan_configs.lia_quote IS 'Citação da LIA sobre o plano';
COMMENT ON COLUMN plan_configs.custom_cta_text IS 'Texto customizado do botão CTA';
COMMENT ON COLUMN plan_configs.custom_cta_action IS 'URL ou ação do botão CTA';
