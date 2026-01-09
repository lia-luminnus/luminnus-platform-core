# 📊 EXEMPLO DE USO - Multimodal Renderer

## Como a LIA Pode Usar as Áreas Dinâmicas

Este documento mostra exemplos práticos de como usar o `MultimodalRenderer` para exibir conteúdo dinâmico.

---

## 1️⃣ RELATÓRIOS (Reports)

### Quando usar:
- Análises textuais
- Resumos executivos
- Documentação

### Exemplo de código:
```typescript
import { createReport } from '@/components/multimodalRenderer';

// No seu componente:
const [dynamicContent, setDynamicContent] = useState<DynamicContent>({ type: "empty" });

// Quando a LIA gera um relatório:
const report = createReport("Análise de Vendas - Q4 2024", [
  {
    heading: "Resumo Executivo",
    content: "As vendas do Q4 aumentaram 35% em relação ao Q3, atingindo R$ 2.5M..."
  },
  {
    heading: "Principais Métricas",
    content: "- Novos clientes: 450\n- Taxa de conversão: 12.5%\n- Ticket médio: R$ 5,555"
  },
  {
    heading: "Recomendações",
    content: "1. Aumentar investimento em marketing digital\n2. Expandir equipe de vendas\n3. Implementar CRM"
  }
]);

setDynamicContent(report);
```

### Como fica visualmente:
```
┌─────────────────────────────────┐
│ 📄 Análise de Vendas - Q4 2024 │
├─────────────────────────────────┤
│ Resumo Executivo                │
│ As vendas do Q4...              │
│                                 │
│ Principais Métricas             │
│ - Novos clientes: 450           │
│ - Taxa de conversão: 12.5%      │
│                                 │
│ Recomendações                   │
│ 1. Aumentar investimento...     │
└─────────────────────────────────┘
```

---

## 2️⃣ GRÁFICOS (Charts)

### Quando usar:
- Visualização de dados
- Comparações
- Tendências

### Exemplo de código:
```typescript
import { createChart } from '@/components/multimodalRenderer';

// Gráfico de barras
const chart = createChart(
  "bar",  // tipo: bar, line, pie, doughnut
  "Vendas Mensais 2024",
  ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun"],
  [
    {
      label: "Vendas",
      data: [120000, 150000, 180000, 165000, 195000, 210000],
      backgroundColor: "rgba(0, 243, 255, 0.5)",
      borderColor: "#00f3ff"
    }
  ]
);

setDynamicContent(chart);
```

### Múltiplos datasets:
```typescript
const multiChart = createChart(
  "line",
  "Comparativo de Vendas vs Custos",
  ["Jan", "Fev", "Mar", "Abr"],
  [
    {
      label: "Vendas",
      data: [100, 150, 180, 200],
      borderColor: "#00f3ff"
    },
    {
      label: "Custos",
      data: [60, 80, 90, 110],
      borderColor: "#bc13fe"
    }
  ]
);
```

### Como fica visualmente:
```
┌─────────────────────────────────┐
│ 📊 Vendas Mensais 2024          │
├─────────────────────────────────┤
│ Chart Type: BAR                 │
│                                 │
│ Jan  ████████████ 120000        │
│ Fev  ███████████████ 150000     │
│ Mar  ███████████████████ 180000 │
│ Abr  ████████████████ 165000    │
│ Mai  ████████████████████ 195000│
│ Jun  ██████████████████████ ... │
│                                 │
│ 📊 Advanced charts coming soon  │
└─────────────────────────────────┘
```

---

## 3️⃣ TABELAS (Tables)

### Quando usar:
- Listagens estruturadas
- Comparações lado-a-lado
- Dados tabulares

### Exemplo de código:
```typescript
import { createTable } from '@/components/multimodalRenderer';

// Tabela de produtos
const table = createTable(
  "Top 5 Produtos Mais Vendidos",
  ["Produto", "Unidades", "Receita", "Margem"],
  [
    ["Produto A", 150, "R$ 45,000", "35%"],
    ["Produto B", 120, "R$ 36,000", "28%"],
    ["Produto C", 95, "R$ 28,500", "42%"],
    ["Produto D", 80, "R$ 24,000", "30%"],
    ["Produto E", 65, "R$ 19,500", "38%"]
  ]
);

setDynamicContent(table);
```

### Tabela com números:
```typescript
const numericTable = createTable(
  "Análise de Performance",
  ["Métrica", "Q1", "Q2", "Q3", "Q4", "Variação"],
  [
    ["Vendas (R$)", 500000, 650000, 750000, 875000, "+75%"],
    ["Clientes", 120, 180, 250, 320, "+166%"],
    ["Ticket Médio", 4166, 3611, 3000, 2734, "-34%"]
  ]
);
```

### Como fica visualmente:
```
┌────────────────────────────────────────────┐
│ 📋 Top 5 Produtos Mais Vendidos           │
├────────────┬──────┬────────┬────────┬─────┤
│ Produto    │ Und  │ Receita│ Margem │     │
├────────────┼──────┼────────┼────────┼─────┤
│ Produto A  │ 150  │ 45,000 │ 35%    │     │
│ Produto B  │ 120  │ 36,000 │ 28%    │     │
│ Produto C  │  95  │ 28,500 │ 42%    │     │
│ Produto D  │  80  │ 24,000 │ 30%    │     │
│ Produto E  │  65  │ 19,500 │ 38%    │     │
└────────────┴──────┴────────┴────────┴─────┘
```

---

## 4️⃣ IMAGENS (Images)

### Quando usar:
- Gráficos externos
- Fotos de produtos
- Diagramas

### Exemplo de código:
```typescript
import { createImage } from '@/components/multimodalRenderer';

// Imagem simples
const image = createImage(
  "https://example.com/chart.png",
  "Gráfico de Crescimento",
  "Crescimento de 35% no último trimestre"
);

setDynamicContent(image);
```

### Imagem local:
```typescript
const localImage = createImage(
  "/images/analysis-result.png",
  "Resultado da Análise",
  "Análise gerada em 08/12/2025"
);
```

### Como fica visualmente:
```
┌─────────────────────────────────┐
│ 🖼️ Gráfico de Crescimento       │
├─────────────────────────────────┤
│                                 │
│     [IMAGEM RENDERIZADA]        │
│                                 │
│ Crescimento de 35% no último... │
└─────────────────────────────────┘
```

---

## 5️⃣ PDFs (Documents)

### Quando usar:
- Relatórios completos
- Contratos
- Documentação técnica

### Exemplo de código:
```typescript
import { createPDF } from '@/components/multimodalRenderer';

// PDF simples
const pdf = createPDF(
  "/documents/relatorio-anual-2024.pdf",
  "Relatório Anual 2024"
);

setDynamicContent(pdf);
```

### PDF externo:
```typescript
const externalPDF = createPDF(
  "https://example.com/contract.pdf",
  "Contrato de Prestação de Serviços"
);
```

### Como fica visualmente:
```
┌─────────────────────────────────┐
│ 📄 Relatório Anual 2024         │
├─────────────────────────────────┤
│                                 │
│  [IFRAME COM PDF EMBUTIDO]      │
│                                 │
│ 📄 Open PDF in new tab          │
└─────────────────────────────────┘
```

---

## 🔧 INTEGRAÇÃO COM BACKEND

### Como a LIA pode usar no backend:

Quando o backend (via Socket.IO) quer exibir conteúdo dinâmico:

```javascript
// server/routes/chat.ts

// Enviar comando para renderizar gráfico
socket.emit('render-dynamic-content', {
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
});
```

### No LIAContext, adicionar handler:

```typescript
// src/context/LIAContext.tsx

useEffect(() => {
  const socket = socketService.getSocket();

  const handleRenderContent = (content: DynamicContent) => {
    // Emitir evento para componentes consumirem
    window.dispatchEvent(new CustomEvent('lia-render-content', {
      detail: content
    }));
  };

  socket.on('render-dynamic-content', handleRenderContent);

  return () => {
    socket.off('render-dynamic-content', handleRenderContent);
  };
}, []);
```

### Nos componentes (Multi-Modal / Live Mode):

```typescript
useEffect(() => {
  const handleRenderEvent = (event: CustomEvent) => {
    setDynamicContent(event.detail);
  };

  window.addEventListener('lia-render-content', handleRenderEvent as EventListener);

  return () => {
    window.removeEventListener('lia-render-content', handleRenderEvent as EventListener);
  };
}, []);
```

---

## 💡 CASOS DE USO REAIS

### 1. Dashboard Executivo
```typescript
// Usuário: "Mostre meu dashboard executivo"
// LIA responde com múltiplas visualizações:

// 1. Gráfico de vendas
const salesChart = createChart("line", "Vendas Mensais", ...);

// 2. Tabela de top produtos
const productsTable = createTable("Top 10 Produtos", ...);

// 3. Relatório resumido
const summary = createReport("Resumo Executivo", ...);

// Alternar entre eles ou mostrar em sequência
```

### 2. Análise de Dados
```typescript
// Usuário: "Analise os dados de marketing"
// LIA:
// 1. Gera relatório textual
const report = createReport("Análise de Marketing", [
  { heading: "Performance", content: "..." },
  { heading: "ROI", content: "..." }
]);

// 2. Mostra gráfico de funil
const funnel = createChart("bar", "Funil de Conversão", ...);

// 3. Tabela de campanhas
const campaigns = createTable("Campanhas Ativas", ...);
```

### 3. Visualização de Documentos
```typescript
// Usuário: "Abra o relatório do último trimestre"
// LIA:
const pdf = createPDF("/reports/q4-2024.pdf", "Relatório Q4 2024");
setDynamicContent(pdf);
```

---

## 🎨 PERSONALIZAÇÃO

### Você pode criar tipos customizados:

```typescript
// Custom renderer para componentes React personalizados
const customContent: DynamicContent = {
  type: 'custom',
  data: '<div class="my-component">...</div>'
};

// Ou passar React elements diretamente:
const reactComponent: DynamicContent = {
  type: 'custom',
  data: {
    component: 'MyCustomComponent',
    props: { data: [...] }
  }
};
```

---

## 📚 REFERÊNCIAS

- **Componente**: `src/components/multimodalRenderer.tsx`
- **Tipos**: `DynamicContent`, `ReportData`, `ChartData`, `TableData`, etc.
- **Helpers**: `createReport()`, `createChart()`, `createTable()`, etc.

---

**Status**: ✅ Pronto para uso
**Compatível com**: Multi-Modal Mode, Live Mode
**Dependências**: React, Tailwind CSS
