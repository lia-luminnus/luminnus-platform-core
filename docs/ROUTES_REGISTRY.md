# ROUTES_REGISTRY.md - Registro Oficial de Rotas

## 🌐 Frontend (Dashboard)
| Rota | Arquivo/Página | Função Principal |
| :--- | :--- | :--- |
| `/` | `apps/dashboard/App.tsx` | Dashboard principal e engine de widgets. |
| `/login` | `apps/dashboard/pages/Login.tsx` | Autenticação de usuários. |
| `/admin` | `apps/dashboard/pages/Admin.tsx` | Gestão de configurações e usuários. |

## 🔌 Backend API (LIA-Core)
| Endpoint | Arquivo/Handler | Função |
| :--- | :--- | :--- |
| `WS /socket.io` | `backend/socket/hub.ts` | Gateway de tempo real para LIA e Dashboard. |
| `POST /api/lia/chat` | `backend/routes/liaChat.ts` | Processamento de mensagens via LLM. |
| `GET /api/dashboard/config` | `backend/routes/dashboard.ts` | Busca configuração do dashboard do Supabase. |
| `POST /api/transcribe` | `backend/routes/audio.ts` | Transcrição de áudio via Whisper/OpenAI. |

## 📜 Regras de Evolução
1. Antes de criar uma rota, procure-a nesta lista.
2. Se precisar de uma nova versão de uma rota existente, use prefixo `/v2/`.
3. Mantenha este arquivo atualizado em todo PR que adicione ou modifique rotas.
