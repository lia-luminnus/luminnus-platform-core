---
description: Protocolo de Preservação de Rotas e Sincronização Luminnus (LIA)
---

# 🗺️ Protocolo de Preservação de Rotas e Sincronização (LIA)

Este workflow define as diretrizes obrigatórias para manter a estabilidade da arquitetura multi-motor da Luminnus, garantindo que as rotas e a sincronização de sessões nunca sejam quebradas.

## 🛡️ Leis de Preservação (Imutáveis)

1.  **Consulta ao Manifesto**: Antes de realizar qualquer modificação em rotas, links ou autenticação, você **DEVE** ler o arquivo [ARCHITECTURAL_ROUTING_MANIFEST.md](file:///d:/luminnus-platform-core/ARCHITECTURAL_ROUTING_MANIFEST.md).
2.  **Integridade do Hub**: A rota `/#/integrations` no Dashboard (porta `:3001`) é **sagrada**. Não mova, renomeie ou bloqueie o acesso a este caminho se houver uma sessão sincronizada.
3.  **Fluxo de Logout**: O botão de Logout deve obrigatoriamente encerrar a sessão local e redirecionar o usuário para a porta `:8080` (Site Principal/Admin).
4.  **Auth Bridge**: A transferência de sessão entre origens diferentes deve ser feita **exclusivamente** via fragmento URL (`access_token`, `refresh_token`, `redirect_to`), capturado pelo `DashboardAuthContext.tsx`.

## 📍 Mapeamento de Fluxos Críticos

| Ponto de Origem | Destino Pretendido | Caminho de Ponte (Bridge) |
| :--- | :--- | :--- |
| **Site (:8080)** | Dashboard Home | `/dashboard` |
| **Site (:8080)** | Configurações | `/dashboard?redirect_to=settings` |
| **Site (:8080)** | Integrações | `/dashboard?redirect_to=integrations` |
| **Dashboard (:3001)** | Logout | `window.location.href = ':8080/'` |

## ⚙️ Regras de Onboarding Admin vs. Cliente

-   **Clientes**: O onboarding (escolha de profissão) deve ser guardado e persistido. O cliente só vê esta tela **uma única vez**.
-   **Admin**: Todo acesso via painel administrativo (`admin_access=true`) deve disparar um reset temporário de onboarding para permitir que o administrador visualize e teste diferentes variantes do Dashboard em tempo real.

## 📝 Procedimento para Novas Rotas

1.  Verifique se a nova página pertence ao Site Principal (:8080) ou ao Dashboard (:3001).
2.  Adicione a rota no respectivo gerenciador de rotas (`AppRoutes.tsx` ou `App.tsx`).
3.  Se a rota for um destino no Dashboard vindo do Site, use o sistema de `redirect_to` no componente `DashboardRedirect.tsx`.
4.  **Sempre** atualize o `ARCHITECTURAL_ROUTING_MANIFEST.md` se a nova rota for um pilar estratégico do sistema.
