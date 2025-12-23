# API da LIA - Backend v2.0

API REST da LIA (Luminnus Intelligent Assistant) com sistema completo de chat, voz em tempo real, TTS e **coleta de métricas de provedores**.

## Recursos Principais

- **Chat com OpenAI** - GPT-4o-mini para conversas inteligentes
- **Voz em Tempo Real** - WebRTC com OpenAI Realtime API
- **Text-to-Speech** - Cartesia TTS para respostas em áudio
- **Coleta de Métricas** - Monitoramento automático de todos os provedores
- **Status em Tempo Real** - Health check dos provedores a cada minuto
- **Cron Jobs** - Coleta automatizada a cada 5 minutos

---

## Endpoints

### Rotas Básicas

#### `GET /`
Verifica se a API está ativa.

**Resposta:**
```
LIA Chat API ativa!
```

#### `GET /health`
Endpoint de health check para monitoramento.

**Resposta:**
```json
{
  "status": "ok",
  "message": "API está online",
  "timestamp": "2025-11-22T10:30:00.000Z"
}
```

### Chat (OpenAI)

#### `POST /chat`
Envia uma mensagem para a LIA e recebe a resposta.

**Request Body:**
```json
{
  "message": "Olá, LIA!"
}
```

**Resposta (200):**
```json
{
  "reply": "Olá! Como posso ajudar você hoje?"
}
```

### Voz em Tempo Real (OpenAI Realtime)

#### `POST /session`
Obtém token efêmero para sessão WebRTC.

**Resposta (200):**
```json
{
  "client_secret": "ek_...",
  "expires_at": 1732272600
}
```

#### `POST /proxy-realtime`
Proxy para WebRTC SDP offer/answer.

**Request Body:**
```json
{
  "sdp": "v=0\r\no=...",
  "client_secret": "ek_..."
}
```

### Text-to-Speech (Cartesia)

#### `POST /tts`
Converte texto em áudio MP3.

**Request Body:**
```json
{
  "text": "Olá, como vai?",
  "voice_id": "a0e99841-438c-4a64-b679-ae501e7d6091"
}
```

**Resposta:** Audio buffer MP3

---

## Endpoints de Métricas (Requer Autenticação Admin)

Todos os endpoints de métricas requerem header `Authorization: Bearer <token>` com token de admin do Supabase.

### `GET /api/metrics/providers`
Retorna métricas agregadas de todos os provedores.

**Query Parameters:**
- `days` (opcional, padrão: 30) - Número de dias para agregar

**Resposta (200):**
```json
{
  "success": true,
  "data": [
    {
      "provider": "openai",
      "tokens_input": 150000,
      "tokens_output": 50000,
      "audio_minutes": 0,
      "requests": 0,
      "storage_mb": 0,
      "writes": 0,
      "reads": 0,
      "cost": 0.0525
    },
    // ... outros provedores
  ],
  "period": "30 days"
}
```

### `GET /api/metrics/provider/:id`
Retorna métricas detalhadas de um provedor específico.

**Parâmetros:**
- `:id` - openai, cartesia, render, cloudflare, supabase

**Resposta (200):**
```json
{
  "success": true,
  "provider": "openai",
  "data": [
    {
      "id": "uuid",
      "provider": "openai",
      "date": "2025-11-22",
      "tokens_input": 50000,
      "tokens_output": 15000,
      "cost": 0.0175
    }
  ],
  "period": "30 days"
}
```

### `GET /api/metrics/status`
Retorna status e latência de todos os provedores.

**Resposta (200):**
```json
{
  "success": true,
  "data": [
    {
      "provider": "openai",
      "online": true,
      "latency_ms": 450,
      "last_check": "2025-11-22T10:30:00.000Z",
      "error_message": null
    },
    // ... outros provedores
  ]
}
```

### `GET /api/metrics/monthly`
Retorna projeção de custos para o mês.

**Resposta (200):**
```json
{
  "success": true,
  "data": {
    "total": 15.50,
    "byProvider": {
      "openai": 5.25,
      "cartesia": 3.50,
      "render": 0,
      "cloudflare": 0,
      "supabase": 6.75
    }
  }
}
```

### `GET /api/metrics/today`
Retorna resumo das métricas de hoje.

### `GET /api/metrics/history`
Retorna histórico para gráficos.

**Query Parameters:**
- `days` (opcional, padrão: 30)
- `provider` (opcional) - Filtrar por provedor específico

### `POST /api/metrics/refresh`
Executa coleta manual de métricas.

**Resposta (200):**
```json
{
  "success": true,
  "message": "Métricas atualizadas com sucesso",
  "data": { ... }
}
```

### `GET /api/providers/config`
Retorna configurações de todos os provedores.

### `PUT /api/providers/config/:provider`
Atualiza configuração de um provedor.

**Request Body:**
```json
{
  "config": {
    "input_price_per_million": 0.15,
    "output_price_per_million": 0.60
  }
}
```

---

## Configuração

### Variáveis de Ambiente

Crie um arquivo `.env` baseado no `.env.example`:

```env
# OpenAI (obrigatório)
OPENAI_API_KEY=sk-proj-...

# Cartesia TTS (opcional)
CARTESIA_API_KEY=...
CARTESIA_VOICE_ID=a0e99841-438c-4a64-b679-ae501e7d6091

# Supabase (obrigatório para métricas)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...
SUPABASE_PROJECT_ID=xxx

# Supabase Management API (opcional)
SUPABASE_MANAGEMENT_KEY=sbp_...

# Cloudflare (opcional)
CLOUDFLARE_API_KEY=...
CLOUDFLARE_ZONE_ID=...

# Render
RENDER_API_URL=https://lia-chat-api.onrender.com

# Servidor
PORT=3000
```

### Instalação

```bash
cd api
npm install
```

### Desenvolvimento

```bash
npm run dev
```

### Produção

```bash
npm start
```

---

## Cron Jobs Automáticos

O servidor executa automaticamente:

| Cron | Intervalo | Função |
|------|-----------|--------|
| Status Check | 1 minuto | Verifica se provedores estão online |
| Metrics Collection | 5 minutos | Coleta métricas e calcula custos |

---

## Provedores Monitorados

### OpenAI
- Tokens de entrada/saída
- Custo por milhão de tokens ($0.15/$0.60)
- Health check via chat/completions

### Cartesia
- Caracteres enviados
- Minutos de áudio (850 chars = 1 min)
- Custo por minuto ($0.042)

### Render
- Contagem de requisições
- Status do servidor
- Custo mensal fixo

### Cloudflare
- Requisições totais
- Workers executados
- Custo por milhão de requests

### Supabase
- Leituras/escritas
- Storage em MB
- Custo por GB de storage

---

## Deploy no Render

1. Configure o repositório com Root Directory: `api`
2. Build Command: `npm install`
3. Start Command: `npm start`
4. Adicione todas as variáveis de ambiente necessárias

---

## Segurança

- Todas as rotas de métricas requerem autenticação admin
- API keys nunca são expostas ao frontend
- CORS configurado (restringir em produção)
- Rate limiting recomendado para produção

---

## Licença

Projeto proprietário Luminnus. Todos os direitos reservados (c) 2025.
