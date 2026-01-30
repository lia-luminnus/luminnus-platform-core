## Objetivo

Corrigir os problemas críticos do Gemini Live Voice:
1. **Erro 1008 (Desconexão)**: Remover tools nativas incompatíveis.
2. **Áudio "Rádio Mal Sintonizado"**: Migrar de ScriptProcessor (deprecated/blocking) para AudioWorklet (thread separada).
3. **Indicador Visual**: Ativar feedback visual no avatar durante geração e ações.
4. **Pesquisa por Voz**: Implementar fallback via backend para manter funcionalidade sem tools nativas.

---

## Plano de Implementação

### 1. Remover Tools do Token Efêmero (CRÍTICO)

**Arquivo:** `apps/lia-viva/lia-live-view/server/routes/session.ts`

**Ação:**
- Remover a propriedade `tools` da configuração `liveConnectConstraints`.
- Manter apenas `responseModalities: ['AUDIO']` e `systemInstruction`.

**Motivo:**
O modelo Native Audio é otimizado para fala fluida, não para execução de código. Para usar tools, deve-se usar o modo Chat ou o modelo `gemini-1.5-flash` (não native audio). Como queremos qualidade de voz (Aoede), devemos sacrificar as tools no modo Live.

**Código:**
```typescript
liveConnectConstraints: {
    model: 'gemini-2.5-flash-native-audio-preview-12-2025',
    config: {
        responseModalities: ['AUDIO'],
        speechConfig: { ... },
        inputAudioTranscription: {},
        outputAudioTranscription: {},
        // REMOVER: tools: [...] 
    },
    systemInstruction: ...
}
```

### 2. Migrar para AudioWorkletNode (CRÍTICO para qualidade)

**Arquivo:** `packages/lia-runtime/src/live/geminiLiveService.ts`

**Ação:**
- Substituir `createScriptProcessor` por `AudioWorkletNode`.
- Criar processador de áudio em arquivo separado ou inline blob URL.

**Motivo:**
O ScriptProcessor roda na main thread. Quando a UI atualiza (avatar 3D), o áudio trava ("rádio mal sintonizado"). O AudioWorklet roda em thread separada de áudio, garantindo fluidez.

### 3. Implementar Proxy de Busca (Fallback)

**Arquivo:** `packages/lia-runtime/src/live/geminiLiveService.ts`

**Ação:**
- Detectar intenção de busca na transcrição do usuário (regex).
- Se detectar, enviar comando para o backend via `fetch`.
- Injetar o resultado como contexto de sistema no Gemini Live.

### 4. Ativar Indicador Visual no Avatar

**Arquivo:** `apps/lia-viva/lia-live-view/src/context/LIAContext.tsx`

**Ação:**
- Escutar eventos `generating-start` e `tool-active`.
- Atualizar estado `isProcessing` que controla a animação do avatar.

---

## Verificação (DoD)

### Teste 1: Estabilidade da Conexão
1. Iniciar chamada de voz.
2. Pedir algo que normalmente acionaria tool: "Qual a cotação do euro?".
3. **Resultado Esperado:** LIA responde (em voz): "Desculpe, não consigo verificar cotações por voz agora, mas posso ver no chat." **SEM DESCONECTAR (Erro 1008).**

### Teste 2: Qualidade de Áudio
1. Conversar normalmente.
2. **Resultado Esperado:** Áudio flui sem cortes, logs mostram `✅ [DEBUG-AUDIO] ... partes de áudio encontradas`.

### Teste 3: Nome Correto
1. Falar "Oi".
2. **Resultado Esperado:** Nome NÃO muda para "a".

---

## Arquivos Afetados

1. `apps/lia-viva/lia-live-view/server/routes/session.ts` (Remoção de tools)
2. `packages/lia-runtime/src/live/geminiLiveService.ts` (Refinamento de logs/erros)

---

## Observação Importante

Você mencionou que a LIA "parece um rádio antigo sem sintonia". Isso acontece porque quando o modelo tenta usar uma tool, ele para de enviar chunks de áudio e envia chunks de texto (pensamento/chamada de função). O frontend tenta reproduzir silêncio ou fragmentos, causando o efeito "falhando". **Remover as tools resolverá isso.**
