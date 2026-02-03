---
description: Protocolo Oficial de Onboarding e Redirecionamento (SSOT)
---

# LIA Onboarding & Routing Protocol

Este documento define a **Verdade Única (SSOT)** para o fluxo de entrada, autenticação e onboarding da plataforma Luminnus. Qualquer alteração nestes fluxos DEVE respeitar rigorosamente as regras abaixo.

## 1. Princípios Fundamentais

### A. Regra do Cliente (One-Time Pass)
- **O que é:** Clientes reais (Usuários Finais) devem passar pela seleção de profissão **apenas uma vez na vida**.
- **Mecanismo:** O estado final é persistido no banco de dados (`profiles.onboarding_completed = true`).
- **Comportamento:**
    - Ao logar: Verificar `profiles.onboarding_completed`.
    - Se `true`: Redirecionar IMEDIATAMENTE para `/` (Dashboard).
    - Se `false`: Redirecionar para `/onboarding`.
- **Proteção:** O componente `/onboarding` deve ter um **Guard Clause** que expulsa usuários que já completaram o processo.

### B. Regra do Admin (Always Pass)
- **O que é:** Administradores (Lia Admins) devem poder **testar todos os fluxos**.
- **Mecanismo:** O estado de onboarding é **resetado a cada sessão**.
- **Comportamento:**
    - Ao logar: O sistema detecta `isAdmin` (via email ou role).
    - Ação: Força `resetOnboarding()` no estado local.
    - Resultado: O Admin sempre cai na tela de seleção de profissão para poder instanciar dashboards de teste.

---

## 2. Pontos de Controle de Código (Checkpoints)

Ao editar qualquer arquivo de autenticação, verifique se estes pontos estão preservados:

### `Dashboard-client/contexts/DashboardAuthContext.tsx`
O cérebro da lógica. Deve conter:
```typescript
// 🔑 SSOT: Lógica de Onboarding
const onboardingCompleted = isAdmin
    ? localOnboardingCompleted  // Admin: Respeita sessão local (que é resetada)
    : (profile?.onboarding_completed || localOnboardingCompleted); // Cliente: Respeita o Banco
```
E a lógica de reset do admin:
```typescript
if (adminDetected) {
   // Resetar onboarding para esta sessão
   useAppStore.getState().resetOnboarding();
}
```

### `Dashboard-client/components/Onboarding.tsx`
O guarda-costas. Deve conter o bloqueio para evitar acessos acidentais de clientes antigos:
```typescript
// 🔒 CRITICAL: Prevent returning users from seeing onboarding
React.useEffect(() => {
  if (onboardingCompleted && !isAdmin) { // Admin pode ficar
    navigate('/', { replace: true });
  }
}, [onboardingCompleted]);
```

### `apps/web/src/pages/AuthCallback.tsx`
O porteiro. Deve redirecionar para o Dashboard sem tentar adivinhar o estado do onboarding (deixe o Dashboard decidir):
```typescript
if (hasActivePlan) {
    // Redireciona para a raiz do Dashboard.
    // O App.tsx do Dashboard fará a triagem (Onboarding vs Home)
    window.location.href = DASHBOARD_URL;
}
```

---

## 3. Checklist de Validação (Executar antes do Commit)

Sempre que tocar em `AuthContext`, `App.tsx` ou `Onboarding`, responda:

1. [ ] **Teste do Cliente Recorrente:** Se eu logar com um usuário que JA TEM profissão, eu vou direto para o dashboard?
2. [ ] **Teste do Admin:** Se eu logar como Admin, eu consigo ver a tela de seleção de profissão novamente?
3. [ ] **Teste de URL Direta:** Se um cliente antigo digitar `/onboarding` na URL, ele é chutado de volta para `/`?

Se qualquer resposta for **NÃO**, o código está quebrado e viola este protocolo.
