---
description: Automação de Segurança para Git Push (LIA Governor Check + Build Check)
---

Este workflow garante que nenhum código quebrado seja enviado para o repositório, evitando falhas no Render.

## 1. Verificação de Integridade (LIA Governor)
Rodar o auditor de governança para verificar conformidade (SSOT, Placeholders).

```bash
python .agent/scripts/checklist.py
```

## 2. Verificação de Build (CRÍTICO)
Antes de enviar, é **OBRIGATÓRIO** garantir que o projeto compila localmente. Isso evita o erro "Output file has not been built" no servidor.
O comando abaixo compila todos os pacotes (shared, api, web) na ordem correta.

```bash
pnpm turbo run build
```

## 3. Verificação de Tipos (TypeScript)
O build já faz isso, mas se quiser rapidez para checar apenas tipos:

```bash
pnpm turbo run typecheck
```

## 4. Git Push Seguro
Se os passos acima passaram (Exit Code 0), você pode enviar.

```bash
git add .
git commit -m "fix(scope): description"
git push origin main
```

> [!IMPORTANT]
> Se o passo 2 falhar, **NÃO FAÇA O PUSH**. Corrija o erro localmente primeiro.
