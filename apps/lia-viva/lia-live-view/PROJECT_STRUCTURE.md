# 📁 Estrutura do Projeto LIA

## Estrutura de Diretórios

```
Projeto_Lia_Node_3_gpt/
├── lia-live-view/              # Aplicação principal (Gemini Live + React)
│   ├── server/                 # Backend Node.js
│   │   ├── routes/            # Rotas da API
│   │   │   ├── chat.ts        # Chat com GPT-4o (memória + functions)
│   │   │   ├── memory.ts      # API de memórias
│   │   │   └── session.ts     # API de sessão
│   │   ├── assistants/        # Integração com GPT
│   │   │   └── gpt4-mini.js   # Cliente GPT-4o-mini
│   │   ├── personality/       # Personalidade da Lia
│   │   │   └── lia-personality.js
│   │   ├── search/            # Busca na web
│   │   └── server.ts          # Servidor Express principal
│   ├── services/              # Serviços do frontend
│   │   ├── geminiLiveService.ts    # Gemini Live API (voz)
│   │   ├── backendService.ts       # Cliente HTTP para backend
│   │   ├── configService.ts        # Configurações
│   │   ├── integrations/           # Integrações externas
│   │   └── media/                  # Serviços de mídia
│   ├── components/            # Componentes React
│   ├── public/               # Arquivos públicos
│   │   └── audio-processor.js     # AudioWorklet para PCM
│   ├── docs/                 # Documentação do projeto
│   ├── AppUnified.tsx        # Componente principal React
│   ├── index.tsx             # Entry point
│   ├── vite.config.ts        # Configuração Vite
│   ├── package.json          # Dependências
│   └── .env                  # Variáveis de ambiente
│
├── config/                   # Configurações compartilhadas
│   └── supabase.js          # Cliente Supabase (memória persistente)
│
├── database/                # Scripts e schemas do banco
├── tools/                   # Ferramentas utilitárias
├── tests/                   # Testes
└── package.json             # Dependências raiz
```

## Arquivos Principais

### Frontend (lia-live-view/)
- `AppUnified.tsx` - Componente principal
- `services/geminiLiveService.ts` - Voz com Gemini Live
- `services/backendService.ts` - Comunicação com backend
- `public/audio-processor.js` - AudioWorklet para PCM

### Backend (lia-live-view/server/)
- `server.ts` - Servidor Express
- `routes/chat.ts` - Chat com GPT-4o + functions
- `routes/memory.ts` - API de memórias
- `assistants/gpt4-mini.js` - Cliente OpenAI

## URLs
- Frontend: http://localhost:3000
- API: http://localhost:3000/api/*

## Comandos
```bash
cd lia-live-view
npm run dev      # Iniciar servidor
npm run build    # Build produção
```
