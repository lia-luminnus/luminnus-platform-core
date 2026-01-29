---
description: Garantir que qualquer operação de correção/criação rode primeiro o LIA Governor e valide SSOT.
---

# WORKFLOW: 00-governor-enforcer.workflow.md

## OBJETIVO
Garantir que qualquer operação de correção/criação rode primeiro o LIA Governor e valide SSOT.

## TRIGGER
**on**: user_message
**condition**:
- contém palavras: `corrigir|consertar|debug|parou|duplic|não cria|não salva|memoria|email|meet|sheets|docs`
- ou detecta erro em logs/eventos

## STEPS
1. **run_agent**: `lia-governor`
2. **apply_patches**
3. **run_smoke_tests**
4. **only_then**: continue normal orchestrator

## FAILSAFE
Se o Governor detectar:
- placeholder link
- tool não executada quando requerida
- action errada por role
→ ele bloqueia a resposta final e força correção.
