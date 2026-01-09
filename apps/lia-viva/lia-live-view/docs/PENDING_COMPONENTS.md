# 🚧 COMPONENTES PENDENTES - LIA VIVA

## Componentes Multimodais (Criar)

### `components/multimodal/MapRenderer.tsx`
```typescript
/**
 * Map Renderer Component
 * - Renderizar mapas Google Maps
 * - Marcadores de lugares
 * - Rotas e direções
 * - Integração com mapsService
 */
```

### `components/multimodal/ChartDisplay.tsx`
```typescript
/**
 * Chart Display Component
 * - Gráficos de barras, linhas, pizza
 * - Dashboards interativos
 * - Dados em tempo real
 * - Export para imagem
 */
```

### `components/multimodal/DocumentViewer.tsx`
```typescript
/**
 * Document Viewer Component
 * - PDF viewer
 * - Documentos gerados pela LIA
 * - Markdown rendering
 * - Code highlighting
 */
```

## Componentes de Voz (Criar)

### `components/voice/WaveformVisualizer.tsx`
```typescript
/**
 * Waveform Visualizer Component
 * - Visualização de ondas de áudio
 * - Integração com audioProcessor
 * - Animações em tempo real
 * - Volume bars
 */
```

## Componentes de Painéis (Mover)

**AÇÃO:** Mover componentes existentes para `components/panels/`

- ✅ `HeaderLIA.tsx` → `panels/HeaderLIA.tsx`
- ✅ `ChatMessages.tsx` → `panels/ChatMessages.tsx`
- ✅ `LogsPanel.tsx` → `panels/LogsPanel.tsx`
- ✅ `MemoryPanel.tsx` → `panels/MemoryPanel.tsx`
- ✅ `ToolsPanel.tsx` → `panels/ToolsPanel.tsx`

## Componentes de Voz (Mover)

**AÇÃO:** Mover componentes existentes para `components/voice/`

- ✅ `VoiceControls.tsx` → `voice/VoiceControls.tsx`
- ✅ `MicrophoneButton.tsx` → `voice/MicrophoneButton.tsx`

## Types Expandidos

### Adicionar em `types.ts`:

```typescript
// Vídeo types
export interface VideoEvent {
  id: string;
  videoUrl: string;
  thumbnail?: string;
  title: string;
  duration?: number;
}

// Imagem types
export interface ImageEvent {
  id: string;
  imageUrl: string;
  title: string;
  width: number;
  height: number;
}

// Map types
export interface MapEvent {
  id: string;
  query: string;
  places: MapPlace[];
  center?: Location;
}

// Chart types
export interface ChartEvent {
  id: string;
  title: string;
  chartType: 'bar' | 'line' | 'pie' | 'area';
  data: any[];
}

// Document types
export interface DocumentEvent {
  id: string;
  title: string;
  content: string;
  format: 'pdf' | 'markdown' | 'html';
}
```

## Integração com AppUnified

### Atualizar `AppUnified.tsx`:

```typescript
// Importar novos serviços
import { veoService } from './services/media/veoService';
import { imagenService } from './services/media/imagenService';
import { searchService } from './services/integrations/searchService';
import { mapsService } from './services/integrations/mapsService';

// Handlers para novos tipos de eventos
const handleVideoGeneration = useCallback(async (prompt: string) => {
  const result = await veoService.generateVideo({ prompt });
  // Adicionar evento visual
}, []);

const handleImageGeneration = useCallback(async (prompt: string) => {
  const result = await imagenService.generateImage({ prompt });
  // Adicionar evento visual
}, []);

const handleMapSearch = useCallback(async (query: string) => {
  const result = await mapsService.searchPlaces(query);
  // Adicionar evento visual
}, []);
```

## Backend Endpoints (Criar no Node 5000)

### `server.js` - Adicionar rotas:

```javascript
// Veo video generation
app.post('/api/veo/generate', async (req, res) => {
  // TODO: Implementar geração de vídeo
});

// Imagen image generation
app.post('/api/imagen/generate', async (req, res) => {
  // TODO: Implementar geração de imagem
});

// Maps search
app.post('/api/maps/search', async (req, res) => {
  // TODO: Implementar busca em mapas
});

// Actions API
app.post('/api/actions', async (req, res) => {
  // TODO: Implementar execução de ações
});

// Reasoning steps
app.post('/api/reasoning/steps', async (req, res) => {
  // TODO: Implementar visualização de passos
});
```

## Testes (Futuro)

### Criar estrutura de testes:

```
tests/
├── unit/
│   ├── services/
│   │   ├── veoService.test.ts
│   │   ├── imagenService.test.ts
│   │   └── audioProcessor.test.ts
│   └── components/
│       ├── VideoPlayer.test.tsx
│       └── ImageViewer.test.tsx
├── integration/
│   ├── webrtc.test.ts
│   └── backend.test.ts
└── e2e/
    ├── conversation.test.ts
    └── multimodal.test.ts
```

---

**PRÓXIMA FASE:** Implementação dos componentes e serviços marcados como 🚧
