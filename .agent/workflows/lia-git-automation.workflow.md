---
description: Automação de Segurança para Git Push (LIA Governor Check + Build Check)
---

Release Gatekeeper (SSOT: main sempre verde)
Objetivo

Garantir que NENHUM código quebrado chegue em main e, por consequência, NENHUM deploy quebrado suba no Render.
Regra de ouro: Se não passa CI, não entra. Se não entra, não deploya.

Escopo

Monorepo luminnus-platform-core com pacotes:

packages/lia-runtime

packages/api

apps/web (dashboard-client)

apps/lia-viva/lia-live-view (admin / live)

packages/shared (dependência crítica)

Outputs (o que este agent entrega)

Branch Protection em main (bloqueia push direto e exige CI verde).

GitHub Actions Gate (build/typecheck/lint e opcional “workspace sanity”).

Husky pre-push / pre-commit (bloqueia push local sem build).

PR Template + Operating Mode AntiGravity (processo padronizado, sem bypass).

Hard Rules (não negociáveis)

❌ Proibido push direto em main (humano ou agent).

✅ Só entra via PR + CI verde + up-to-date com main.

✅ Qualquer falha TS (ex: TS2307 Cannot find module @luminnus/shared) = merge bloqueado.

✅ Render deve deployar apenas após merge em main (que já é verde).

1) GitHub — Branch Protection (ENFORCEMENT)

Caminho: GitHub → Settings → Branches → Add branch protection rule

Branch name pattern: main

Marcar:

✅ Require a pull request before merging

✅ Require status checks to pass before merging

marque os checks (nomes podem variar) como:

build (turbo)

typecheck (turbo)

lint (turbo) (se existir)

parity-guard / runtime-guard (se existir)

✅ Require branches to be up to date before merging

✅ Require approvals: 1

✅ Restrict who can push to matching branches (somente você)

✅ Do not allow bypassing the above settings

✅ Block force pushes

Resultado: AntiGravity pode “tentar”, mas GitHub nega.

2) GitHub Actions — CI Gate (colar como workflow)

Crie: .github/workflows/ci-gate.yml

name: CI Gate

on:
  pull_request:
    branches: [ "main" ]
  push:
    branches: [ "main" ]

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  gate:
    runs-on: ubuntu-latest
    timeout-minutes: 20

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9

      - name: Install
        run: pnpm install --frozen-lockfile

      # (Opcional mas recomendado) sanity check do workspace
      - name: Workspace sanity
        run: |
          node -e "
            const fs=require('fs');
            const pkgs=['packages/shared','packages/lia-runtime','packages/api','apps/web'];
            for (const p of pkgs){
              const f=p+'/package.json';
              if (fs.existsSync(f)) JSON.parse(fs.readFileSync(f,'utf8'));
            }
            console.log('workspace ok');
          "

      - name: Build (Turbo)
        run: pnpm turbo run build

      - name: Typecheck (Turbo)
        run: pnpm turbo run typecheck

      - name: Lint (Turbo)
        run: pnpm turbo run lint


SSOT do merge: esse workflow precisa estar verde.

3) Repo — Husky “bloqueia push local” (defesa adicional)

No repo, rode:

pnpm add -D husky
pnpm husky init


Crie/edite .husky/pre-push:

#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

pnpm turbo run build
pnpm turbo run typecheck


Crie/edite .husky/pre-commit:

#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

pnpm turbo run lint

4) PR Template — “o agent não inventa”

Crie .github/pull_request_template.md

## Objetivo
(1 frase: o que muda e por quê)

## Mudanças
- [ ] build passa (`pnpm turbo run build`)
- [ ] typecheck passa (`pnpm turbo run typecheck`)
- [ ] lint passa (`pnpm turbo run lint`)

## Risco / Rollback
- Risco:
- Rollback: (como voltar)

## Evidências
- Logs/prints/links de CI verde

5) Operating Mode — AntiGravity (PROMPT SSOT)

Cole isso no AntiGravity como “modo de operação permanente”:

PROMPT

Você é o Release Gatekeeper.
Regras:

Proibido push direto em main.

Sempre criar branch fix/* ou feat/*.

Rodar pnpm turbo run build + pnpm turbo run typecheck antes de abrir PR.

Abrir PR para main e aguardar CI verde.

Se CI falhar, corrigir na mesma branch e atualizar o PR.

Nunca declarar “resolvido” sem CI verde.

Se houver erro TS2307 (ex: @luminnus/shared), tratar como bloqueador P0.

6) Incident Playbook (quando quebrar de novo)

Se falhar build/typecheck:

Ver o primeiro erro real no CI (não o último).

Corrigir dependência/workspace:

package.json → "@luminnus/shared": "workspace:*"

tsconfig / references conforme padrão do repo

Rodar local:

pnpm install

pnpm turbo run build

Só então atualizar PR.

Definition of Done (DoD)

main sem push direto ✅

PR obrigatório ✅

CI Gate verde obrigatório ✅

Render deploya somente main ✅

Nunca mais loop de “arrumei mas continua quebrando” ✅