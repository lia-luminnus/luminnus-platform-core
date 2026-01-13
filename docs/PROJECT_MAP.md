# PROJECT_MAP.md - Mapa de Responsabilidades

## 🏛️ Arquitetura Core
| Componente | Arquivo Owner | Responsabilidade |
| :--- | :--- | :--- |
| **LIA Brain** | ` Dashboard-client/components/lia/LIAContext.tsx` | Orquestração de chat, memória e entrada de voz/texto. |
| **Dashboard Engine** | `Dashboard-client/components/dashboard-engine/DashboardContext.tsx` | Gerenciamento de estado, layout e persistência dos widgets. |
| **Action Handler** | `Dashboard-client/components/lia/services/LiaActionHandler.ts` | Execução de comandos estruturados (ADD, REPLACE, etc.). |
| **SSOT Manifest** | `Dashboard-client/components/lia/services/systemManifest.ts` | Fonte única para widgets, capacidades e aliases. |
| **Socket Service** | `Dashboard-client/components/lia/services/socketService.ts` | Comunicação em tempo real com o backend (LIA-API). |

## 🏗️ Onde Mexer (Regras)
- **Widgets (Novos/Edição)**: `Dashboard-client/components/dashboard-engine/` + `WidgetRegistry.tsx`.
- **Inteligência/Prompt**: `Dashboard-client/components/lia/services/LiaActionHandler.ts` (detecção).
- **Layout/UI**: `Dashboard-client/components/layout/`.
- **Voz/Live Mode**: `apps/lia-viva/lia-live-view/`.

## 🚫 Proibições
- **Duplicar Rotas**: Verifique sempre o `ROUTES_REGISTRY.md` antes de criar um novo endpoint.
- **Regressão de Interface**: Proibido mudar tipos na `LIAContext.tsx` sem manter retrocompatibilidade.
- **Ignorar ACK**: Toda ação da LIA deve aguardar confirmação do destino antes de finalizar.
