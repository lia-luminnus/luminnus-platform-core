# 🤖 Chat Integrado da LIA - Painel Admin

## 📋 Visão Geral

O **Chat da LIA** é uma interface de conversação integrada ao painel administrativo da plataforma Luminnus, permitindo que administradores interajam com a assistente virtual LIA usando comandos naturais para configurar, gerenciar e automatizar o sistema.

---

## ✨ Funcionalidades

### Para Administradores
- ✅ Interface de chat estilo ChatGPT
- ✅ **Integração Realtime via WebSocket com API LIA no Render**
- ✅ **Respostas de voz personalizadas via endpoint `/voice`**
- ✅ Controle de ativação/desativação de voz
- ✅ Prompt personalizado para contexto administrativo
- ✅ Histórico de conversas persistido no Supabase
- ✅ Respostas inteligentes sobre:
  - Gerenciamento de usuários
  - Configuração de planos
  - Integrações e automações
  - Métricas e estatísticas
  - Configurações técnicas

### Interface
- 💬 Bolhas de mensagem estilo chat moderno
- 🎨 Design limpo e responsivo
- ⚡ Scroll automático
- 🔄 Auto-resize do campo de input
- ⌨️ Atalhos de teclado (Enter para enviar, Shift+Enter para quebrar linha)
- 🗑️ Limpar histórico de conversa
- 🔊 Toggle de voz para ativar/desativar respostas em áudio
- ⚡ Conexão WebSocket para respostas em tempo real

---

## 🏗️ Arquitetura

### Componentes Criados

1. **AdminLiaChat.tsx** (`/src/components/admin/AdminLiaChat.tsx`)
   - Componente principal do chat
   - Interface de usuário moderna e responsiva
   - Gerenciamento de estado das mensagens
   - **Integração WebSocket com API Realtime do Render**
   - **Sistema de reprodução de voz personalizada**
   - Integração com Supabase para persistência de histórico

2. **AdminSidebar.tsx** (atualizado)
   - Nova entrada "Assistente LIA" com ícone Bot
   - Posicionada como segunda opção no menu

3. **AdminDashboard.tsx** (atualizado)
   - Integração do AdminLiaChat no sistema de roteamento
   - Renderização condicional da seção

4. **API LIA Realtime** (Render - https://lia-chat-api.onrender.com)
   - Endpoint `/session` - Criação de sessão WebSocket
   - Endpoint `/voice` - Reprodução de voz personalizada da LIA
   - WebSocket connection para comunicação em tempo real
   - Processamento de mensagens com tipo `input_text` e `response_text`

---

## 🔧 Configuração

### 1. API LIA Realtime (Render)

A integração está configurada para usar a API LIA hospedada no Render:
- **URL Base**: `https://lia-chat-api.onrender.com`
- **Endpoint de Sessão**: `POST /session`
- **Endpoint de Voz**: `GET /voice`

**Não é necessária configuração adicional** - a integração funciona out-of-the-box!

### 2. Configuração do Supabase (Para Histórico)

O histórico de conversas é armazenado no Supabase. Certifique-se de que as tabelas existem:

```sql
-- Tabela de conversas
CREATE TABLE IF NOT EXISTS chat_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de mensagens
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES chat_conversations(id),
  user_id UUID REFERENCES auth.users(id),
  role TEXT CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 3. Variáveis de Ambiente

Certifique-se de que as variáveis do Supabase estão configuradas no arquivo `.env`:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

---

## 🎯 Prompt Base da LIA

### Para Administradores

```
Você é a LIA, assistente virtual da plataforma Luminnus.
Seu papel é ajudar o administrador a configurar, criar e gerenciar
todo o sistema e os recursos da Luminnus com comandos de texto ou voz.

Você é proativa, inteligente, compreende comandos naturais e é capaz
de criar planilhas, fluxos, autenticação, integrações e outras
automações avançadas.

Suas capacidades incluem:
- Configurar e gerenciar usuários e planos
- Criar e configurar integrações (WhatsApp, CRM, E-mail, etc)
- Configurar automações e fluxos de trabalho
- Gerenciar chaves de API e configurações técnicas
- Analisar dados e métricas da plataforma
- Criar relatórios e exportar dados
- Configurar permissões e acessos
- Ajudar com tarefas administrativas complexas

Sempre seja clara, objetiva e forneça instruções passo a passo
quando necessário. Use linguagem profissional mas amigável.
```

---

## 📊 Fluxo de Funcionamento

### Fluxo WebSocket Realtime (Atual)

```
┌─────────────────────────────────────────────────────────────┐
│                    Admin envia mensagem                      │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  AdminLiaChat.tsx salva mensagem no Supabase                │
│  (tabela: chat_messages) - Histórico                        │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  Faz POST em https://lia-chat-api.onrender.com/session      │
│  para criar sessão WebSocket                                │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  Recebe client_secret.value com URL do WebSocket            │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  Conecta ao WebSocket e envia mensagem                      │
│  { type: "input_text", text: "mensagem do usuário" }        │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  API LIA processa mensagem em tempo real                    │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  Recebe resposta via WebSocket                              │
│  { type: "response_text", text: "resposta da LIA" }         │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  AdminLiaChat.tsx exibe resposta na interface               │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  Salva resposta da LIA no Supabase (histórico)              │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  Se voz habilitada: reproduz áudio via /voice endpoint      │
│  GET https://lia-chat-api.onrender.com/voice                │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔐 Controle de Acesso

O chat da LIA no admin está protegido por:

1. **Email autorizado**: Apenas `luminnus.lia.ai@gmail.com` pode acessar
2. **Hook useAdminAuth**: Verifica permissões e redireciona não-admins
3. **Flag isAdmin**: Diferencia prompts e respostas para admin

---

## 💡 Exemplos de Uso

### Perguntas que o Admin pode fazer:

```
"Como gerenciar usuários?"
"Quantos usuários temos cadastrados?"
"Como configurar a integração com WhatsApp?"
"Quais são os planos disponíveis?"
"Como editar as permissões de um plano?"
"Mostre as estatísticas da plataforma"
"Como adicionar uma nova integração?"
```

### Respostas que a LIA pode dar:

✅ Instruções passo a passo para tarefas administrativas
✅ Explicações sobre funcionalidades do painel
✅ Orientações sobre configurações técnicas
✅ Sugestões de próximas ações
✅ Links para seções relevantes do admin

---

## 🗂️ Estrutura de Dados

### Tabela: `chat_messages`

```sql
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES chat_conversations(id),
  user_id UUID REFERENCES auth.users(id),
  role TEXT CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Tabela: `chat_conversations`

```sql
CREATE TABLE chat_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 🚀 Próximas Melhorias

### Funcionalidades Futuras
- [x] ✅ **Suporte para respostas de voz** (IMPLEMENTADO)
- [x] ✅ **Integração WebSocket Realtime** (IMPLEMENTADO)
- [x] ✅ **Toggle de controle de voz** (IMPLEMENTADO)
- [ ] Suporte para entrada de voz (Speech-to-Text)
- [ ] Exportar conversas em PDF/CSV
- [ ] Sugestões contextuais inteligentes baseadas no contexto
- [ ] Ações diretas (ex: "criar usuário João com plano Plus")
- [ ] Análise de sentimento nas conversas
- [ ] Multi-idioma (EN, ES, PT)
- [ ] Integração com ferramentas externas via webhooks

### Otimizações
- [ ] Cache de respostas frequentes
- [ ] Streaming de respostas em tempo real
- [ ] Rate limiting por usuário
- [ ] Modo offline com service workers
- [ ] Avatares personalizados animados
- [ ] Indicador de "LIA está digitando" em tempo real

---

## 🐛 Troubleshooting

### Chat não responde

1. **Verifique a conexão com a API do Render**:
   - Teste se a API está online: `curl https://lia-chat-api.onrender.com/session`
   - Verifique se não há bloqueio de firewall ou CORS
   - Apps no Render podem "adormecer" - a primeira requisição pode demorar ~30s

2. **Verifique o Console do Navegador**:
   - Abra DevTools (F12) → Console
   - Procure por erros de WebSocket ou fetch
   - Verifique se há mensagens de timeout

3. **Timeout da API**:
   - O timeout é de 30 segundos por conexão
   - Se a LIA demorar mais, a conexão será fechada automaticamente

### Erro "Não autorizado" ou "Sessão não encontrada"

- Verifique se você está logado com `luminnus.lia.ai@gmail.com`
- Confirme que o token de sessão está válido
- Limpe o cache do navegador e faça login novamente
- Verifique as permissões no Supabase

### Mensagens não aparecem no histórico

- Verifique conexão com Supabase
- Confirme que as tabelas `chat_messages` e `chat_conversations` existem
- Verifique RLS (Row Level Security) no Supabase
- Teste a inserção manual no banco

### Voz não funciona

- Verifique se a voz está habilitada (botão "Voz Ativa")
- Teste o endpoint diretamente: `https://lia-chat-api.onrender.com/voice`
- Verifique se o navegador permite reprodução de áudio
- Alguns navegadores bloqueiam autoplay de áudio

### WebSocket não conecta

- Verifique se o navegador suporta WebSocket
- Teste a conexão WSS (WebSocket Secure)
- Verifique se não há proxy ou VPN bloqueando WebSocket
- Tente em outro navegador ou rede

---

## 📝 Notas Técnicas

### API LIA Realtime
- **Protocolo**: WebSocket para comunicação em tempo real
- **URL Base**: https://lia-chat-api.onrender.com
- **Timeout**: 30 segundos por conexão
- **Formato de mensagens**: JSON (`input_text`, `response_text`)
- **Voz**: Reprodução via endpoint `/voice` (áudio personalizado)

### Performance
- Tempo médio de resposta: 1-3 segundos (via WebSocket)
- Reprodução de voz: < 1 segundo para carregar
- Suporta conexões simultâneas ilimitadas
- Auto-reconnect em caso de falha de conexão

### Segurança
- ✅ Autenticação JWT via Supabase
- ✅ RLS habilitado em todas as tabelas
- ✅ Conexão HTTPS para API externa
- ✅ WebSocket seguro (wss://)
- ✅ Validação de entrada/saída
- ✅ Cleanup automático de conexões
- ✅ Timeout de segurança (30s)

---

## 📚 Referências

- [API LIA Realtime (Render)](https://lia-chat-api.onrender.com)
- [WebSocket API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [Supabase Documentation](https://supabase.com/docs)
- [React Query (TanStack)](https://tanstack.com/query/latest)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Shadcn UI](https://ui.shadcn.com/)
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)

---

## 👥 Equipe

Desenvolvido para a **Luminnus Platform**
- Sistema: LIA (Luminnus Intelligent Assistant)
- Versão: 2.0.0 - Realtime + Voz
- Data: 2025
- Integração: WebSocket Realtime API (Render)

---

## 📄 Licença

Este componente faz parte do sistema proprietário Luminnus.
Todos os direitos reservados © 2025 Luminnus.
