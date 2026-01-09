// =====================================================
// CALIBRATION - Valores ajustáveis em tempo de execução
// =====================================================
// Este arquivo contém valores de calibração que podem
// ser ajustados para alinhar perfeitamente os sprites
// com a imagem base.
//
// INSTRUÇÕES DE CALIBRAÇÃO:
// 1. Abra o Avatar Studio em http://localhost:5174
// 2. Clique no ícone de Bug (Debug) no header
// 3. Observe as coordenadas atuais no overlay
// 4. Ajuste os valores abaixo até alinhar perfeitamente
// 5. O hot-reload do Vite atualizará automaticamente
// =====================================================

// =====================================================
// OFFSETS DE CALIBRAÇÃO
// =====================================================
// Estes valores são ADICIONADOS às posições calculadas.
// Use valores positivos para mover para baixo/direita.
// Use valores negativos para mover para cima/esquerda.
// =====================================================

export const CALIBRATION_OFFSETS = {
    // Offset horizontal para todos os elementos (em pixels na imagem base 1024px)
    globalX: 0,

    // Offsets verticais individuais (em pixels na imagem base 1536px)
    eyesY: 0,      // Ajuste fino: + = mais baixo, - = mais alto
    browsY: 0,     // Ajuste fino: + = mais baixo, - = mais alto
    mouthY: 0,     // Ajuste fino: + = mais baixo, - = mais alto
}

// =====================================================
// FATORES DE ESCALA
// =====================================================
// Multiplicadores para ajustar o tamanho dos sprites.
// 1.0 = tamanho calculado, >1 = maior, <1 = menor
// =====================================================

export const SCALE_ADJUSTMENTS = {
    global: 1.0,     // Escala aplicada a todos
    eyes: 1.0,       // Escala específica dos olhos
    brows: 1.0,      // Escala específica das sobrancelhas
    mouth: 1.0,      // Escala específica da boca
}

// =====================================================
// FUNÇÃO: Aplicar calibração às posições
// =====================================================

import { BASE_IMAGE } from './AvatarRigConfig'

export function applyCalibration(
    layerType: 'mouth' | 'eyes' | 'brows',
    position: { left: number; top: number; width: number; height: number },
    renderedWidth: number,
    renderedHeight: number
): { left: number; top: number; width: number; height: number } {
    // Fator de escala relativo (proporcional ao tamanho renderizado)
    const scaleX = renderedWidth / BASE_IMAGE.width
    const scaleY = renderedHeight / BASE_IMAGE.height

    // Obter offsets de calibração
    const offsetX = CALIBRATION_OFFSETS.globalX * scaleX
    let offsetY = 0

    switch (layerType) {
        case 'eyes':
            offsetY = CALIBRATION_OFFSETS.eyesY * scaleY
            break
        case 'brows':
            offsetY = CALIBRATION_OFFSETS.browsY * scaleY
            break
        case 'mouth':
            offsetY = CALIBRATION_OFFSETS.mouthY * scaleY
            break
    }

    // Obter fator de escala
    const globalScale = SCALE_ADJUSTMENTS.global
    const localScale = SCALE_ADJUSTMENTS[layerType]
    const totalScale = globalScale * localScale

    // Calcular novo tamanho
    const newWidth = position.width * totalScale
    const newHeight = position.height * totalScale

    // Ajustar posição para manter centralizado após escala
    const widthDiff = (newWidth - position.width) / 2
    const heightDiff = (newHeight - position.height) / 2

    return {
        left: position.left - widthDiff + offsetX,
        top: position.top - heightDiff + offsetY,
        width: newWidth,
        height: newHeight
    }
}

// =====================================================
// PRESET: Valores padrão testados
// =====================================================
// Se precisar resetar, use estes valores:
// =====================================================

export const DEFAULT_CALIBRATION = {
    offsets: {
        globalX: 0,
        eyesY: 0,
        browsY: 0,
        mouthY: 0,
    },
    scales: {
        global: 1.0,
        eyes: 1.0,
        brows: 1.0,
        mouth: 1.0,
    }
}
