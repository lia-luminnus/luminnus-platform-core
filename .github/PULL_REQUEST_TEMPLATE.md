# 📝 Change Request

## Descrição
<!-- O que vai mudar? Seja claro e conciso -->


## Justificativa
<!-- Por que essa mudança é necessária? -->


## Arquivos Impactados
<!-- Liste todos os arquivos que serão modificados -->
- [ ] `arquivo1.ts`
- [ ] `arquivo2.js`

## Zona de Estabilidade
<!-- Marque qual zona esse PR afeta -->
- [ ] 🔴 **CORE_STABLE** (Exige aprovação obrigatória)
- [ ] 🟡 **UI_STABLE** (Cuidado ao alterar)
- [ ] 🟢 **EXPERIMENTAL** (Livre)

## Risco
- [ ] 🟢 Baixo
- [ ] 🟡 Médio
- [ ] 🔴 Alto

## Plano de Rollback
<!-- Como reverter se algo der errado? -->


## Smoke Tests
<!-- Confirme que todos os testes passaram -->
- [ ] `GET /api/health` retorna `{"ok":true}`
- [ ] Socket.IO conecta com token válido
- [ ] Mensagem enviada e resposta recebida
- [ ] Refresh mantém histórico de mensagens

## Screenshots/Vídeos (se aplicável)
<!-- Anexe evidências de que funciona -->


## Checklist Final
- [ ] Li o arquivo `GOVERNANCE.md`
- [ ] Testei localmente
- [ ] O código está limpo e sem console.log de debug
- [ ] Não quebrei nenhuma funcionalidade existente
