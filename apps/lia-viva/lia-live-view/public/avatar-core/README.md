# LIA Avatar Engine Pro

Motor de avatar avançado com rigging facial, lip-sync e renderização contínua.

## 📁 Estrutura

```
public/avatar-core/
├── AvatarEnginePro.js      # Orquestrador principal
├── ExpressionExtractor.js  # Detecção de landmarks faciais
├── FaceRigBuilder.js       # Construção de mesh e blendshapes
├── LipSyncEngine.js        # Conversão áudio/texto → visemas
├── MotionSynthesizer.js    # Animações idle (piscar, respirar)
├── EmotionEngine.js        # Análise de emoção em texto
├── avatar-engine-loader.html # Página de teste standalone
└── README.md               # Este arquivo
```

## 🚀 Uso Rápido

### Standalone (teste)
Abra `avatar-engine-loader.html` no navegador.

### Em código
```javascript
import { AvatarEnginePro } from './AvatarEnginePro.js';

const canvas = document.getElementById('avatar-canvas');
const engine = new AvatarEnginePro(canvas);

await engine.initialize();

// Carregar avatar
const img = new Image();
img.src = 'lia-avatar.jpg';
img.onload = async () => {
    await engine.createAvatar(img);
    
    // Falar
    await engine.speak("Olá! Eu sou a LIA!");
};
```

## 🔧 API

### AvatarEnginePro

| Método | Descrição |
|--------|-----------|
| `initialize()` | Inicializa engine e carrega modelos |
| `createAvatar(image)` | Cria avatar a partir de imagem |
| `speak(text, audioBuffer?)` | Inicia fala com lip-sync |
| `stopSpeak()` | Para fala atual |
| `setExpression(emotion, intensity)` | Define expressão manual |
| `setConfig(config)` | Atualiza configurações |
| `destroy()` | Libera recursos |

### Callbacks

```javascript
engine.onSpeakStart = (text) => { };
engine.onSpeakEnd = () => { };
engine.onEmotionChange = (result) => { };
```

### Configurações

```javascript
engine.setConfig({
    renderDebugMesh: false,   // Mostrar mesh de debug
    enableMotion: true,       // Animações idle
    enableLipSync: true,      // Lip-sync ativo
    smoothing: 0.3,           // Suavização de transições
    fps: 60                   // Taxa de frames
});
```

## 🎭 Emoções Suportadas

- `neutral` - Neutro
- `happy` - Feliz
- `sad` - Triste
- `surprised` - Surpreso
- `angry` - Bravo
- `curious` - Curioso
- `talking` - Falando

## 📡 Integração com Backend

O engine pode se conectar ao backend LIA para:
- TTS: `/api/avatar/speak`
- Emoção: `/api/emotion-decode`

## 🎯 Pipeline

```
[Imagem] → ExpressionExtractor → FaceRigBuilder → [Rig]
                                                    ↓
[Texto] → EmotionEngine ←→ MotionSynthesizer ←→ [Blendshapes]
    ↓                                               ↓
LipSyncEngine → [Visemas] ─────────────────→ [Renderização]
```

## ⚠️ Requisitos

- Navegador moderno com Canvas 2D
- Para MediaPipe: conexão com internet
- Para áudio: browser com Web Audio API
