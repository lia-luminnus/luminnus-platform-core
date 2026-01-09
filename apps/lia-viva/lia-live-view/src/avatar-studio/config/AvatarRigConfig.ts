// =====================================================
// AVATAR RIG CONFIG - Configuração PRECISA de Camadas
// =====================================================
// Sistema de composição do Avatar da LIA
//
// ARQUITETURA:
// A imagem base contém a LIA completa (torso + cabeça com rosto).
// Os sprites de olhos, boca e sobrancelhas são sobrepostos
// EXATAMENTE nas posições originais do rosto, substituindo
// os elementos visuais da imagem base.
//
// SPRITES DISPONÍVEIS:
// - Bocas: fechada, semi-aberta, aberta (3 estados)
// - Olhos: abertos, semi-abertos, fechados (3 estados)
// - Sobrancelhas: franzida, normal, levantada (3 estados)
// =====================================================

// =====================================================
// ANÁLISE DA IMAGEM BASE
// =====================================================
// Imagem: "ChatGPT Image 10 de out. de 2025, 07_29_56.png"
// Dimensões reais: 1024 x 1536 pixels
//
// Anatomia do rosto na imagem (medições em pixels):
// - Centro horizontal do rosto: ~512px (50% da largura)
// - Linha dos olhos: ~425px do topo (~27.7% da altura)
// - Linha das sobrancelhas: ~385px do topo (~25% da altura)
// - Linha da boca: ~565px do topo (~36.8% da altura)
// =====================================================

export const BASE_IMAGE = {
    // Caminho do arquivo
    path: '/avatar/ChatGPT Image 10 de out. de 2025, 07_29_56.png',

    // Dimensões reais da imagem
    width: 1024,
    height: 1536,

    // Proporção (aspect ratio)
    aspectRatio: 1024 / 1536  // ~0.667
}

// =====================================================
// POSIÇÕES DOS ELEMENTOS FACIAIS (em pixels absolutos)
// =====================================================
// Estas coordenadas representam onde os sprites devem
// ser posicionados para COBRIR os elementos originais.
// Valores calibrados visualmente para a imagem base.
//
// IMPORTANTE: As coordenadas são do CENTRO de cada sprite.
// O sistema converte automaticamente para top-left no render.
// =====================================================

export const FACE_ANCHORS = {
    // Centro horizontal do rosto (onde alinhar todos os elementos)
    // O rosto está ligeiramente à esquerda do centro da imagem
    faceCenterX: 505,

    // Linha vertical de cada elemento (Y do centro do sprite)
    eyesLineY: 415,      // Centro vertical dos olhos
    browsLineY: 365,     // Centro vertical das sobrancelhas (acima dos olhos)
    mouthLineY: 565,     // Centro vertical da boca
}

// =====================================================
// DIMENSÕES DOS SPRITES INDIVIDUAIS
// =====================================================
// Dimensões NATURAIS dos arquivos PNG dos sprites:
// - Olhos: 460 x 146 pixels
// - Boca: 273 x 160 pixels
// - Sobrancelhas: 503 x 137 pixels
//
// Ajustamos com um fator de escala para encaixar
// perfeitamente no rosto da imagem base.
// =====================================================

// Fator de escala para ajustar sprites ao rosto
const SCALE_FACTOR = 0.70  // Reduzir para 70% do tamanho original

export const SPRITE_DIMENSIONS = {
    mouth: {
        // Original: 273 x 160, escalado
        width: Math.round(273 * SCALE_FACTOR),    // ~191
        height: Math.round(160 * SCALE_FACTOR)    // ~112
    },
    eyes: {
        // Original: 460 x 146, escalado
        width: Math.round(460 * SCALE_FACTOR),    // ~322
        height: Math.round(146 * SCALE_FACTOR)    // ~102
    },
    brows: {
        // Original: 503 x 137, escalado
        width: Math.round(503 * SCALE_FACTOR),    // ~352
        height: Math.round(137 * SCALE_FACTOR)    // ~96
    }
}

// =====================================================
// CAMINHOS DOS SPRITES
// =====================================================

export const AVATAR_SPRITES = {
    // Imagem base completa (torso + cabeça com rosto)
    base: BASE_IMAGE.path,

    // Bocas: índice 0 = fechada, 1 = semi, 2 = aberta
    mouth: [
        '/avatar/Boca fechada .PNG',
        '/avatar/Boca semi-aberta.PNG',
        '/avatar/Boca aberta.PNG'
    ] as const,

    // Olhos: índice 0 = abertos, 1 = semi, 2 = fechados
    eyes: [
        '/avatar/Olhos abertos.PNG',
        '/avatar/Olhos semi-aberto.PNG',
        '/avatar/Olhos fechados.PNG'
    ] as const,

    // Sobrancelhas: -1 = franzida, 0 = normal, 1 = levantada
    brows: {
        '-1': '/avatar/sobrancelha franzida.PNG',
        '0': '/avatar/sobrancelha normal.PNG',
        '1': '/avatar/sobrancelha levantada.PNG'
    } as const
}

// =====================================================
// CONFIGURAÇÃO DE POSICIONAMENTO NORMALIZADO
// =====================================================
// Valores entre 0 e 1, representando proporções relativas
// à imagem base. Isso permite responsividade.
// =====================================================

export const NORMALIZED_POSITIONS = {
    mouth: {
        // Centro do sprite como proporção da imagem
        centerX: FACE_ANCHORS.faceCenterX / BASE_IMAGE.width,      // 0.5
        centerY: FACE_ANCHORS.mouthLineY / BASE_IMAGE.height,      // ~0.374
        // Tamanho do sprite como proporção da imagem
        widthRatio: SPRITE_DIMENSIONS.mouth.width / BASE_IMAGE.width,   // ~0.195
        heightRatio: SPRITE_DIMENSIONS.mouth.height / BASE_IMAGE.height // ~0.065
    },
    eyes: {
        centerX: FACE_ANCHORS.faceCenterX / BASE_IMAGE.width,      // 0.5
        centerY: FACE_ANCHORS.eyesLineY / BASE_IMAGE.height,       // ~0.277
        widthRatio: SPRITE_DIMENSIONS.eyes.width / BASE_IMAGE.width,    // ~0.371
        heightRatio: SPRITE_DIMENSIONS.eyes.height / BASE_IMAGE.height  // ~0.062
    },
    brows: {
        centerX: FACE_ANCHORS.faceCenterX / BASE_IMAGE.width,      // 0.5
        centerY: FACE_ANCHORS.browsLineY / BASE_IMAGE.height,      // ~0.244
        widthRatio: SPRITE_DIMENSIONS.brows.width / BASE_IMAGE.width,   // ~0.352
        heightRatio: SPRITE_DIMENSIONS.brows.height / BASE_IMAGE.height // ~0.046
    }
}

// =====================================================
// FUNÇÃO: Calcular posição CSS de uma camada
// =====================================================
// Dado o tamanho renderizado da imagem base no container,
// retorna as coordenadas CSS (left, top, width, height)
// para posicionar o sprite corretamente.
// =====================================================

export interface LayerPosition {
    left: number
    top: number
    width: number
    height: number
}

export function calculateLayerPosition(
    layerType: 'mouth' | 'eyes' | 'brows',
    renderedWidth: number,
    renderedHeight: number,
    offsetX: number = 0,
    offsetY: number = 0
): LayerPosition {
    const pos = NORMALIZED_POSITIONS[layerType]

    // Calcular tamanho do sprite proporcionalmente
    const spriteWidth = pos.widthRatio * renderedWidth
    const spriteHeight = pos.heightRatio * renderedHeight

    // Calcular centro do sprite em pixels (relativo ao container)
    const centerX = offsetX + (pos.centerX * renderedWidth)
    const centerY = offsetY + (pos.centerY * renderedHeight)

    // Converter de centro para top-left (CSS usa top-left como origem)
    return {
        left: centerX - (spriteWidth / 2),
        top: centerY - (spriteHeight / 2),
        width: spriteWidth,
        height: spriteHeight
    }
}

// =====================================================
// TIPOS DO ESTADO DO AVATAR
// =====================================================

export type MouthState = 0 | 1 | 2
export type EyesState = 0 | 1 | 2
export type BrowState = -1 | 0 | 1

export interface AvatarState {
    mouthState: MouthState
    eyesState: EyesState
    browState: BrowState
    headRotationX: number  // -10 a 10
    headRotationY: number  // -10 a 10
}

export const DEFAULT_AVATAR_STATE: AvatarState = {
    mouthState: 0,
    eyesState: 0,
    browState: 0,
    headRotationX: 0,
    headRotationY: 0
}

// =====================================================
// LABELS PARA UI
// =====================================================

export const MOUTH_LABELS = ['fechada', 'semi', 'aberta'] as const
export const EYES_LABELS = ['abertos', 'semi', 'fechados'] as const
export const BROW_LABELS = { '-1': 'franzida', '0': 'normal', '1': 'levantada' } as const
