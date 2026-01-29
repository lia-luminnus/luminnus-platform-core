# 🗺️ Manifesto de Arquitetura e Rotas Luminnus (LIA)

Este documento é a **Fonte Única de Verdade** para todos os caminhos, acessos e lógica de sincronização do ecossistema Luminnus. Estes caminhos são considerados **IMUTÁVEIS** para garantir a estabilidade do sistema.

> [!IMPORTANT]
> **REGRA DE OURO**: Caminhos principais não podem ser movidos ou renomeados. Qualquer nova funcionalidade deve ser acrescentada *dentro* da estrutura existente ou como uma nova rota que siga o padrão de autenticação estabelecido.

---

## 🏗️ 1. Infraestrutura e URLs

O sistema é composto por três motores principais que operam em conjunto:

| Componente | Ambiente Local | Ambiente de Produção (Render) | Responsabilidade |
| :--- | :--- | :--- | :--- |
| **Site Principal / Admin** | `http://localhost:8080` | `https://luminnus-web.onrender.com` | Landing Page, Autenticação, Vendas e Painel de Admin. |
| **Dashboard (Cliente)** | `http://localhost:3001` | `https://luminnus-dashboard.onrender.com` | Interface de uso do cliente, Configurações e Integrações. |
| **API / Backend Uni.** | `http://localhost:3000` | `https://lia-chat-api.onrender.com` | Cérebro, Banco de Dados, Stripe e Webhooks. |

---

## ⚖️ 2. Leis Imutáveis de Rotas

Estes caminhos são o alicerce do sistema e **jamais** devem ser alterados ou quebrados:

1.  **Integração Intocável**: A rota `/#/integrations` no Dashboard é SAGRADA. Nenhuma atualização de código ou verificação de segurança pode alterar este caminho ou impedir seu acesso quando a sessão estiver sincronizada.
2.  **Logout Soberano**: O botão de Logout no Dashboard deve sempre encerrar a sessão local e redirecionar obrigatoriamente para a Landing Page (`:8080`).
3.  **Unicidade do Cliente**: O cliente final só vê a escolha de profissão (onboarding) **uma única vez** após a compra. Depois disso, o acesso é direto ao Dashboard.
4.  **Admin Flexível**: O Administrador, ao acessar pelo painel Admin (`admin_access=true`), **sempre** passará pela escolha de profissão. Isso permite que o Admin teste e visualize qualquer variante do Dashboard em tempo real.

Como os apps rodam em origens diferentes (portas ou domínios diferentes), o `localStorage` não é compartilhado. A sincronização ocorre através da **Auth Bridge**:

1.  **Origem**: O usuário acessa o Painel no Site Principal (`:8080/dashboard`).
2.  **Ponte**: O componente `DashboardRedirect.tsx` captura o token atual do Supabase.
3.  **Transferência**: Redireciona para o Dashboard (`:3001`) passando os tokens e o destino na URL:
    *   Exemplo: `:3001/#/?access_token=...&refresh_token=...&redirect_to=settings`
4.  **Destino**: O `DashboardAuthContext.tsx` no Dashboard detecta os tokens, executa `supabase.auth.setSession()` e limpa a URL para segurança.

### Arquivos Chave da Sincronização:
*   **Emissor**: `apps/web/src/components/DashboardRedirect.tsx`
*   **Receptor**: `Dashboard-client/contexts/DashboardAuthContext.tsx`
*   **Configuração**: `Dashboard-client/lib/supabase.ts` (deve usar a mesma `storageKey`: `'sb-dashboard-auth'`).

---

## 📍 3. Caminhos Imutáveis

### Painel Principal (Porta 8080)
*   `/auth`: Página de Login/Cadastro Google.
*   `/dashboard`: **Ponto de Entrada Único** para o Dashboard do cliente.
*   `/admin-dashboard`: Painel de controle administrativo.
*   `/planos`: Página de preços e checkout.

### Dashboard do Cliente (Porta 3001)
*   `/#/`: Home / Visão Geral.
*   `/#/integrations`: **HUB DE INTEGRAÇÕES** (Não alterar este caminho!).
*   `/#/crm`: Gestão de Clientes.
*   `/#/lia`: Configurações da IA.
*   `/#/settings`: Perfil e Configurações de conta.
*   `/#/financial`: Faturamento e Planos.

---

## 🛠️ 4. Guia de Atualização / Expansão

Para adicionar algo novo sem quebrar o sistema:

1.  **Novas Páginas no Dashboard**: Adicione a rota no arquivo `Dashboard-client/App.tsx` dentro do componente `Routes`.
2.  **Links Externos do Site para o Dashboard**: Nunca linke direto para `localhost:3001`. Sempre use o link do site principal com o parâmetro de redirecionamento:
    *   Link correto: `http://localhost:8080/dashboard?redirect_to=nome-da-rota`
3.  **Variáveis de Ambiente**:
    *   No Dashboard, `VITE_LANDING_PAGE_URL` deve sempre apontar para o site principal (8080).
    *   No Site Principal, `VITE_DASHBOARD_URL` deve sempre apontar para o dashboard (3001).

---

## 📜 5. Histórico de Estabilidade
*   **Jan/2026**: Fixado erro de isolamento de localStorage entre portas 8080 e 3001. A sincronização via URL Fragment foi oficializada como padrão imutável.
*   **Jan/2026**: Implementada a Redirecionamento de Logout para a porta 8080.
*   **Jan/2026**: Estabelecida a Regra de Acesso Admin: Admin sempre re-seleciona profissão; Cliente apenas uma vez.
