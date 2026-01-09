# 🧠 Sistema de Memória Persistente - Setup Rápido

## 📋 Passo 1: Executar SQL no Supabase

1. Acesse: https://app.supabase.com
2. SQL Editor → New Query
3. Cole TODO o conteúdo de `database/migrations/001_create_memories_table.sql`
4. Clique em **RUN**
5. Aguarde "Success" ✅

## 📝 Passo 2 (OPCIONAL): Atualizar realtime.js

Para usar memória em TODO o chat, modifique `realtime/realtime.js`:

```javascript
// No topo do arquivo, adicione:
import { runChatWithMemory } from '../services/chat-with-memory.js';

// Na linha ~270, dentro de socket.on("text-message",...
// SUBSTITUA esta linha:
const resposta = await runChatWithTools(convId, text);

// POR esta:
const resposta = await runChatWithMemory(convId, text, conversationHistories);
```

## ✅ Pronto!

Agora a LIA irá:
- 🧠 Detectar informações importantes automaticamente
- 💾 Salvar memórias no Supabase
- 📚 Carregar memórias para contexto
- 🎯 Personalizar respostas baseado no histórico

## 🧪 Como Testar

### Teste 1: Salvar Memória Pessoal
**Você:** "Eu tenho 28 anos"
**LIA:** [detecta como 'personal' e salva]

### Teste 2: Salvar Empresa  
**Você:** "Minha empresa é a Luminnus"
**LIA:** [detecta como 'company' e salva]

### Teste 3: Usar Memória
**Você:** "Qual o nome da minha empresa mesmo?"
**LIA:** "Sua empresa é a Luminnus!" [usando memória salva]

## 📊 Ver Memórias Salvas

No Supabase:
```sql
SELECT * FROM memories ORDER BY updated_at DESC;
```

Ou use:
```javascript
import { getMemories } from './services/memory.js';
const memories = await getMemories('00000000-0000-0000-0000-000000000001');
console.log(memories);
```
