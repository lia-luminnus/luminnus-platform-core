# 🧪 INSTRUÇÕES DE TESTE - LIA VIVA

## Como testar todas as funcionalidades implementadas

---

## 📋 PRÉ-REQUISITOS

### 1. Configurar Variáveis de Ambiente

Criar arquivo `.env` na raiz do projeto:
```env
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=AIza...
PORT=3000
```

Criar arquivo `.env.local` ou `.env` também na raiz:
```env
VITE_OPENAI_API_KEY=sk-...
VITE_GEMINI_API_KEY=AIza...
```

### 2. Instalar Dependências
```bash
cd D:/Projeto_Lia_Node_3_gpt/lia-live-view
npm install
```

### 3. Iniciar Backend
```bash
node server.js
```

Você deve ver:
```
✅ Socket.IO configurado
✅ Routes configuradas
🚀 Server running on http://localhost:3000
```

### 4. Iniciar Frontend (Dev)
```bash
npm run dev
```

Você deve ver:
```
VITE v6.4.1  ready in 1234 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

---

## ✅ TESTES FUNCIONAIS

### 🔌 **TESTE 1: Conexão Socket.IO**

**Objetivo**: Verificar se frontend conecta ao backend

**Passos**:
1. Abrir `http://localhost:5173`
2. Abrir DevTools (F12)
3. Ir em Console
4. Verificar mensagens:
   ```
   ✅ LIAContext: Socket conectado
   ✅ Áudio recebido pelo servidor
   ```

**Resultado esperado**: Status "Conectado" (bolinha verde) no header

---

### 💬 **TESTE 2: Chat Mode - Mensagem de Texto**

**Objetivo**: Testar envio e recebimento de mensagens

**Passos**:
1. Acessar painel "Chat Mode"
2. Digitar: "Olá LIA, tudo bem?"
3. Pressionar Enter ou clicar em Send

**Resultado esperado**:
- Mensagem do usuário aparece (roxo)
- Indicador "LIA está pensando..." aparece
- Resposta da LIA aparece (ciano)

---

### 🎤 **TESTE 3: Chat Mode - Transcrição de Áudio**

**Objetivo**: Testar microfone com transcrição para input

**Passos**:
1. Acessar painel "Chat Mode"
2. Clicar no ícone de microfone (MicOff)
3. Permitir acesso ao microfone
4. Falar algo: "Este é um teste de transcrição"
5. Clicar novamente no microfone para parar
6. Aguardar transcrição

**Resultado esperado**:
- Ícone muda para Mic (vermelho pulsante) enquanto grava
- Após parar, mostra Loader2 (spinner roxo)
- Texto transcrito aparece no input
- Usuário pode editar antes de enviar

**⚠️ Importante**:
- Microfone NÃO envia áudio bruto
- Usuário vê transcrição ANTES de enviar
- LIA NÃO fala em voz neste painel

---

### 💾 **TESTE 4: Memória**

**Objetivo**: Verificar se LIA guarda informações

**Passos**:
1. Chat Mode, digitar: "Meu nome é João e trabalho com vendas"
2. Aguardar resposta da LIA
3. Em nova mensagem: "Qual é meu nome?"

**Resultado esperado**:
- LIA deve responder: "Seu nome é João"
- Backend salva automaticamente via function calling
- Arquivo `memories.json` é atualizado

**Verificar arquivo**:
```bash
cat server/data/memories.json
```

Deve conter:
```json
[
  {
    "id": "...",
    "content": "Usuário se chama João e trabalha com vendas",
    "category": "personal",
    "timestamp": 1733616000000
  }
]
```

---

### 🎨 **TESTE 5: Multi-Modal - Botão 1 (Transcrição)**

**Objetivo**: Testar microfone comum no Multi-Modal

**Passos**:
1. Acessar painel "Multi-Modal Mode"
2. Clicar no primeiro botão de microfone (esquerda, ícone MicOff)
3. Falar: "Mostre-me um gráfico de vendas"
4. Parar gravação

**Resultado esperado**:
- Comportamento igual ao Chat Mode
- Transcrição preenche input
- Avatar mostra estado correto
- Área dinâmica permanece vazia (aguardando resposta)

---

### 🎙️ **TESTE 6: Multi-Modal - Botão 2 (StartVoice)**

**Objetivo**: Testar Gemini Live no Multi-Modal

**Passos**:
1. Acessar painel "Multi-Modal Mode"
2. Clicar no segundo botão (StartVoice, círculo com MicOff)
3. Permitir acesso ao microfone
4. Falar algo

**Resultado esperado**:
- Botão fica magenta pulsante
- Avatar mostra "OUVINDO"
- **IMPORTANTE**: Gemini Live requer configuração adicional
- Por enquanto, mostra estado visual correto

**⚠️ Nota**:
- Gemini Live API requer WebRTC configurado
- Se não funcionar, é esperado (infraestrutura WebRTC)
- Estados visuais devem funcionar corretamente

---

### 🖼️ **TESTE 7: Multi-Modal - Área Dinâmica**

**Objetivo**: Testar renderização de conteúdo

**Passos**:
1. Abrir DevTools Console
2. Executar:
```javascript
// Criar gráfico de teste
const testChart = {
  type: 'chart',
  data: {
    type: 'bar',
    title: 'Vendas 2024',
    labels: ['Jan', 'Fev', 'Mar'],
    datasets: [{
      label: 'Vendas',
      data: [100, 150, 200]
    }]
  }
};

// Emitir evento
window.dispatchEvent(new CustomEvent('lia-render-content', {
  detail: testChart
}));
```

**Resultado esperado**:
- Área dinâmica mostra gráfico visual
- Barras de progresso coloridas
- Título "Vendas 2024"

---

### 🎭 **TESTE 8: Live Mode - StartVoice**

**Objetivo**: Testar modo institucional completo

**Passos**:
1. Acessar painel "Live Mode"
2. Clicar no botão StartVoice (centro da barra inferior)
3. Permitir microfone

**Resultado esperado**:
- Botão fica magenta pulsante
- Avatar corpo inteiro mostra "OUVINDO"
- Chat log vazio (nenhuma mensagem ainda)
- Área visual esquerda vazia

---

### 📝 **TESTE 9: Live Mode - Chat Log**

**Objetivo**: Verificar histórico de mensagens

**Passos**:
1. Live Mode, digitar várias mensagens:
   - "Mensagem 1"
   - "Mensagem 2"
   - ... até 15 mensagens

**Resultado esperado**:
- Chat log mostra últimas 10 mensagens
- Scroll funciona
- Mensagens USER em roxo
- Mensagens LIA em ciano

---

### 📤 **TESTE 10: Upload de Arquivos**

**Objetivo**: Testar upload em todos os painéis

**Passos**:
1. Chat Mode: Clicar em Paperclip, selecionar imagem
2. Multi-Modal: Clicar em UPLOAD, selecionar PDF
3. Live Mode: Clicar em Upload, selecionar arquivo

**Resultado esperado**:
- Arquivo aparece como "pending"
- Pode remover antes de enviar (X)
- Ao enviar, mensagem mostra "Sent N file(s)"

---

## 🔍 TESTES DE INTEGRAÇÃO

### **TESTE 11: Estados do Avatar**

**Objetivo**: Verificar sincronização de estados

**Passos**:
1. Multi-Modal ou Live Mode
2. Enviar mensagem de texto
3. Observar avatar

**Estados esperados** (em sequência):
1. **PENSANDO** (roxo) - LIA processando
2. **FALANDO** (ciano) - LIA respondendo
3. **OCIOSA** (ciano opaco) - Aguardando

Se StartVoice ativo:
- **OUVINDO** (magenta) - Esperando fala

---

### **TESTE 12: Chat Console (Multi-Modal)**

**Objetivo**: Verificar log de mensagens compacto

**Passos**:
1. Multi-Modal Mode
2. Enviar várias mensagens
3. Observar área inferior (acima do input)

**Resultado esperado**:
- Últimas 4 mensagens aparecem
- Formato: `USER: texto...` ou `LIA: texto...`
- Cores corretas (roxo/ciano)

---

## 🛠️ TESTES TÉCNICOS

### **TESTE 13: Build Production**

```bash
npm run build
```

**Resultado esperado**:
```
✓ built in 11.30s
dist/index.html                  0.87 kB
dist/assets/index-xCiy9lqB.css 137.33 kB
dist/assets/index-DVdpOnFS.js  331.83 kB
```

---

### **TESTE 14: Lint/TypeScript**

```bash
npm run lint
npx tsc --noEmit
```

**Resultado esperado**:
- Nenhum erro de tipo
- Nenhum erro de lint

---

## 🐛 TESTES DE ERROS

### **TESTE 15: Sem Conexão Backend**

**Passos**:
1. Parar backend (`Ctrl+C`)
2. Tentar enviar mensagem

**Resultado esperado**:
- Status "Desconectado" (bolinha vermelha)
- Botões desabilitados
- Console mostra erro de conexão

---

### **TESTE 16: Microfone Sem Permissão**

**Passos**:
1. Negar permissão de microfone
2. Tentar gravar

**Resultado esperado**:
- Alert: "Não foi possível acessar o microfone..."
- Gravação não inicia

---

### **TESTE 17: Transcrição Falha**

**Passos**:
1. Gravar apenas ruído (sem fala)
2. Parar gravação

**Resultado esperado**:
- Transcrição vazia ou
- Alert: "Não foi possível transcrever..."

---

## 📊 CHECKLIST DE VALIDAÇÃO

Marque cada item após teste bem-sucedido:

### Conexão
- [ ] Frontend conecta ao backend
- [ ] Status "Conectado" visível
- [ ] Socket.IO funcionando

### Chat Mode
- [ ] Envia mensagem de texto
- [ ] Recebe resposta da LIA
- [ ] Microfone grava
- [ ] Transcrição funciona
- [ ] Input preenchido corretamente
- [ ] Usuário pode editar antes de enviar

### Multi-Modal
- [ ] Botão 1 (transcrição) funciona
- [ ] Botão 2 (StartVoice) muda estado
- [ ] Área dinâmica renderiza conteúdo
- [ ] Avatar sincronizado
- [ ] Chat console mostra últimas 4 msgs

### Live Mode
- [ ] StartVoice único botão
- [ ] Chat log mostra mensagens
- [ ] Área visual funciona
- [ ] Avatar corpo inteiro reage
- [ ] Timer de sessão conta

### Memória
- [ ] LIA guarda informações
- [ ] memories.json atualizado
- [ ] LIA lembra em conversas futuras

### Upload
- [ ] Seleciona arquivos
- [ ] Preview de pendentes
- [ ] Remove arquivos
- [ ] Envia com mensagem

### Estados Visuais
- [ ] OUVINDO (magenta)
- [ ] PENSANDO (roxo)
- [ ] FALANDO (ciano)
- [ ] OCIOSA (ciano opaco)

### Build & Código
- [ ] Build sem erros
- [ ] TypeScript sem erros
- [ ] Lint passa

---

## 🎯 CRITÉRIOS DE SUCESSO

✅ **Mínimo para produção**:
- [ ] 80% dos testes passam
- [ ] Build sem erros
- [ ] Conexão estável
- [ ] Chat Mode 100% funcional
- [ ] Memória funcionando

✅ **Ideal**:
- [ ] 100% dos testes passam
- [ ] Gemini Live funcionando
- [ ] Upload real implementado
- [ ] Área dinâmica com conteúdo real

---

## 📞 SUPORTE

### Erros Comuns

**"Cannot read property of undefined"**
→ Verificar se backend está rodando
→ Verificar variáveis de ambiente

**"Socket connection error"**
→ Backend não iniciado ou porta errada
→ Verificar CORS

**"Whisper API error"**
→ VITE_OPENAI_API_KEY incorreta
→ Verificar .env.local

**"Gemini Live não funciona"**
→ WebRTC requer configuração adicional
→ Estados visuais devem funcionar

---

**Data**: 2025-12-08
**Versão**: 4.0.0
**Status**: ✅ Pronto para testes
