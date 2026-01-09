# 🚀 COMECE AQUI - LIA VIVA MULTIMODAL

## ✅ SISTEMA 100% PRONTO

O sistema multimodal está **completamente implementado** e pronto para uso!

---

## 🎯 INÍCIO RÁPIDO (3 PASSOS)

### **PASSO 1: Abrir 2 Terminais**

Você precisa de **2 terminais simultâneos** (um para backend, outro para frontend).

**Terminal 1 - Backend**:
```bash
cd D:/Projeto_Lia_Node_3_gpt/lia-live-view
npx tsx server/server.ts
```

**Aguarde ver**:
```
✅ LIA Unified Server
✅ Rotas multimodais configuradas
🚀 Running on: http://localhost:3000
```

**Terminal 2 - Frontend**:
```bash
cd D:/Projeto_Lia_Node_3_gpt/lia-live-view
npm run dev
```

**Aguarde ver**:
```
VITE ready in 1234 ms
➜  Local:   http://localhost:5173/
```

### **PASSO 2: Abrir Navegador**

Acesse: **http://localhost:5173**

### **PASSO 3: Testar Funcionalidades**

Escolha um painel e teste!

---

## 🧪 TESTES RÁPIDOS

### **Teste 1: Gerar Gráfico (Console do Navegador)**

Abra DevTools (F12) e cole:

```javascript
fetch('http://localhost:3000/api/generateChart', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: 'Crie gráfico de vendas mensais: Jan=100, Fev=150, Mar=200, Abr=180',
    chartType: 'bar'
  })
})
.then(r => r.json())
.then(data => {
  console.log('✅ Gráfico gerado:', data);
  // data.content.data contém: {title, labels, values, chartType}
});
```

### **Teste 2: Gerar Tabela**

```javascript
fetch('http://localhost:3000/api/generateTable', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: 'Crie tabela de produtos: Produto A custa R$100, Produto B custa R$150, Produto C custa R$200'
  })
})
.then(r => r.json())
.then(data => {
  console.log('✅ Tabela gerada:', data);
  // data.content.data contém: {title, headers, rows}
});
```

### **Teste 3: Gerar Imagem**

```javascript
fetch('http://localhost:3000/api/generateImage', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: 'Um gato astronauta flutuando no espaço sideral'
  })
})
.then(r => r.json())
.then(data => {
  console.log('✅ Imagem gerada:', data);
  // data.content.data.url contém a URL da imagem
  // Abra a URL no navegador para ver a imagem
  window.open(data.content.data.url);
});
```

---

## 🎨 FUNCIONALIDADES DISPONÍVEIS

### ✅ **Chat Mode**
- Microfone transcreve para input (usuário decide enviar)
- Mensagens de texto normais
- Memórias salvas automaticamente

### ✅ **Multi-Modal Mode**
- **2 botões de microfone**:
  1. Comum (transcrição)
  2. StartVoice (Gemini Live)
- Área dinâmica (containers)
- Upload de arquivos

### ✅ **Live Mode**
- Apenas StartVoice (Gemini Live)
- Chat log (últimas 10 mensagens)
- Área visual lado a lado
- Avatar corpo inteiro com estados

### ✅ **Backend Multimodal**
- Decisão automática GPT vs Gemini
- Geração de gráficos (bar, line, pie)
- Geração de tabelas estruturadas
- Geração de imagens (DALL-E 3)
- Análise de prints de erro (Gemini Vision)

---

## 📊 ENDPOINTS ATIVOS

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/generateChart` | POST | Gera gráficos |
| `/api/generateTable` | POST | Gera tabelas |
| `/api/generateImage` | POST | Gera imagens |
| `/api/health` | GET | Status do servidor |

---

## 🔑 VARIÁVEIS DE AMBIENTE

Arquivo: `.env` (raiz do projeto)

```env
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=AIza...
PORT=3000
```

Arquivo: `.env.local` (raiz do projeto)

```env
VITE_OPENAI_API_KEY=sk-...
VITE_GEMINI_API_KEY=AIza...
```

---

## 📁 DOCUMENTAÇÃO COMPLETA

1. **`SISTEMA_MULTIMODAL_COMPLETO.md`** - Status final 100%
2. **`README_MULTIMODAL.md`** - Visão geral técnica
3. **`MULTIMODAL_IMPLEMENTATION_STATUS.md`** - Detalhes de implementação
4. **`INTEGRACAO_FINAL_MULTIMODAL.md`** - Guia de integração
5. **`COMECE_AQUI.md`** - Este arquivo (início rápido)

---

## 🎯 ARQUITETURA

```
Usuário → Frontend (Vite/React)
            ↓
       LIAContext (Mente Única)
            ↓
       backendService (REST API)
            ↓
       server.ts (Express)
            ↓
    multimodalOrchestrator
       ↙          ↘
   GPT-4o Mini   Gemini 2.0
   (Cérebro)     (Olhos/Voz)
```

**Decisão Automática**:
- Texto → GPT
- Imagem → Gemini
- Gráfico → GPT + Gemini
- Conversação → GPT

---

## 🐛 TROUBLESHOOTING

### Problema: Backend não inicia
**Solução**: Verificar se `.env` existe com `OPENAI_API_KEY`

### Problema: Frontend não conecta
**Solução**: Garantir que backend está rodando em `http://localhost:3000`

### Problema: Erro ao gerar gráfico
**Solução**: Verificar se a mensagem contém dados estruturados (labels + valores)

### Problema: Build Error
**Solução**: Rodar `npm install` novamente

---

## ✨ PRÓXIMOS PASSOS (OPCIONAL)

Depois de testar o sistema básico, você pode:

1. **Integrar DynamicGrid** - Renderizar múltiplos containers
2. **Criar Data Insights Panel** - Dashboard completo
3. **Sistema de Evolução** - Logs de melhorias automáticas
4. **Melhorar UI/UX** - Animações e transições

Mas o sistema **JÁ FUNCIONA** sem isso!

---

## 🎉 SUCESSO!

Se você conseguiu:
- ✅ Backend rodando na porta 3000
- ✅ Frontend rodando na porta 5173
- ✅ Testes no console retornando dados
- ✅ Painéis abrindo sem erros

**PARABÉNS!** O sistema multimodal está 100% operacional! 🚀

---

**Dúvidas?** Consulte:
- `SISTEMA_MULTIMODAL_COMPLETO.md` para detalhes técnicos
- `README_MULTIMODAL.md` para visão geral
- Logs do backend (terminal 1) para debug

**Última Atualização**: 2025-12-08 23:15
**Status**: 🟢 PRONTO PARA USO
