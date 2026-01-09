/**
 * ExpressionExtractor.js
 * =====================================================
 * Extrator de landmarks faciais usando MediaPipe FaceMesh
 * Detecta 478 pontos faciais e estima expressões básicas
 * =====================================================
 */

export class ExpressionExtractor {
    constructor() {
        this.modelLoaded = false;
        this.faceMesh = null;
        this.lastLandmarks = null;
    }

    /**
     * Carrega o modelo MediaPipe FaceMesh
     */
    async load() {
        if (this.modelLoaded) return true;

        try {
            // Verificar se MediaPipe está disponível
            if (typeof FaceMesh !== 'undefined') {
                this.faceMesh = new FaceMesh({
                    locateFile: (file) => {
                        return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
                    }
                });

                this.faceMesh.setOptions({
                    maxNumFaces: 1,
                    refineLandmarks: true,
                    minDetectionConfidence: 0.5,
                    minTrackingConfidence: 0.5
                });

                await this.faceMesh.initialize();
                this.modelLoaded = true;
                console.log('[ExpressionExtractor] MediaPipe FaceMesh loaded');
                return true;
            } else {
                console.warn('[ExpressionExtractor] MediaPipe not available, using fallback');
                this.modelLoaded = true; // Use fallback
                return true;
            }
        } catch (error) {
            console.error('[ExpressionExtractor] Error loading model:', error);
            this.modelLoaded = true; // Continue with fallback
            return false;
        }
    }

    /**
     * Extrai landmarks de uma imagem
     * @param {HTMLImageElement|HTMLCanvasElement} image 
     * @returns {Object} landmarks e expressão detectada
     */
    async extract(image) {
        await this.load();

        try {
            if (this.faceMesh) {
                // Usar MediaPipe real
                const results = await this.faceMesh.send({ image });
                if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
                    this.lastLandmarks = results.multiFaceLandmarks[0];
                    return this.processLandmarks(this.lastLandmarks, image.width, image.height);
                }
            }

            // Fallback: gerar landmarks estimados baseados no tamanho da imagem
            return this.generateFallbackLandmarks(image.width, image.height);

        } catch (error) {
            console.error('[ExpressionExtractor] Extract error:', error);
            return this.generateFallbackLandmarks(image.width, image.height);
        }
    }

    /**
     * Processa landmarks para formato utilizável
     */
    processLandmarks(landmarks, width, height) {
        const points = landmarks.map((lm, i) => ({
            id: i,
            x: lm.x * width,
            y: lm.y * height,
            z: lm.z * width // Profundidade normalizada
        }));

        // Detectar expressão básica
        const expression = this.detectExpression(points);

        // Calcular blendshapes estimados
        const blendshapes = this.estimateBlendshapes(points);

        return {
            points,
            expression,
            blendshapes,
            faceBox: this.calculateFaceBox(points),
            timestamp: Date.now()
        };
    }

    /**
     * Detecta expressão facial básica analisando landmarks
     */
    detectExpression(points) {
        if (points.length < 478) return 'neutral';

        // Índices importantes do FaceMesh
        const MOUTH_UPPER = 13;
        const MOUTH_LOWER = 14;
        const LEFT_EYE_UPPER = 159;
        const LEFT_EYE_LOWER = 145;
        const RIGHT_EYE_UPPER = 386;
        const RIGHT_EYE_LOWER = 374;
        const LEFT_BROW = 66;
        const RIGHT_BROW = 296;
        const LEFT_MOUTH_CORNER = 61;
        const RIGHT_MOUTH_CORNER = 291;

        // Calcular aberturas
        const mouthOpen = Math.abs(points[MOUTH_UPPER].y - points[MOUTH_LOWER].y);
        const leftEyeOpen = Math.abs(points[LEFT_EYE_UPPER].y - points[LEFT_EYE_LOWER].y);
        const rightEyeOpen = Math.abs(points[RIGHT_EYE_UPPER].y - points[RIGHT_EYE_LOWER].y);
        const avgEyeOpen = (leftEyeOpen + rightEyeOpen) / 2;

        // Calcular posição dos cantos da boca (sorriso)
        const mouthWidth = Math.abs(points[LEFT_MOUTH_CORNER].x - points[RIGHT_MOUTH_CORNER].x);
        const mouthCenterY = (points[LEFT_MOUTH_CORNER].y + points[RIGHT_MOUTH_CORNER].y) / 2;

        // Detectar expressões
        if (mouthOpen > avgEyeOpen * 2) return 'surprised';
        if (mouthOpen > avgEyeOpen * 1.5) return 'talking';
        if (avgEyeOpen < 5) return 'blinking';

        return 'neutral';
    }

    /**
     * Estima blendshapes a partir dos landmarks
     */
    estimateBlendshapes(points) {
        if (points.length < 100) {
            return this.getDefaultBlendshapes();
        }

        // Índices simplificados
        const mouthOpen = this.normalize(Math.abs(points[13]?.y - points[14]?.y) || 0, 0, 50);
        const leftEyeBlink = 1 - this.normalize(Math.abs(points[159]?.y - points[145]?.y) || 10, 0, 15);
        const rightEyeBlink = 1 - this.normalize(Math.abs(points[386]?.y - points[374]?.y) || 10, 0, 15);

        return {
            jawOpen: mouthOpen,
            mouthSmile: 0,
            mouthFrown: 0,
            eyeBlinkLeft: Math.max(0, leftEyeBlink),
            eyeBlinkRight: Math.max(0, rightEyeBlink),
            browUpLeft: 0,
            browUpRight: 0,
            browDownLeft: 0,
            browDownRight: 0
        };
    }

    /**
     * Normaliza valor entre min e max para 0-1
     */
    normalize(value, min, max) {
        return Math.max(0, Math.min(1, (value - min) / (max - min)));
    }

    /**
     * Retorna blendshapes padrão (neutro)
     */
    getDefaultBlendshapes() {
        return {
            jawOpen: 0,
            mouthSmile: 0,
            mouthFrown: 0,
            eyeBlinkLeft: 0,
            eyeBlinkRight: 0,
            browUpLeft: 0,
            browUpRight: 0,
            browDownLeft: 0,
            browDownRight: 0
        };
    }

    /**
     * Calcula bounding box do rosto
     */
    calculateFaceBox(points) {
        if (points.length === 0) return { x: 0, y: 0, width: 0, height: 0 };

        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;

        for (const p of points) {
            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x);
            maxY = Math.max(maxY, p.y);
        }

        return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY
        };
    }

    /**
     * Gera landmarks de fallback quando MediaPipe não está disponível
     */
    generateFallbackLandmarks(width, height) {
        // Gerar grid simplificado de pontos faciais
        const points = [];
        const centerX = width / 2;
        const centerY = height * 0.4; // Rosto mais para cima
        const faceWidth = width * 0.6;
        const faceHeight = height * 0.5;

        // Criar 68 pontos principais (simplificado)
        const keyPoints = [
            // Contorno do rosto (0-16)
            ...this.generateContour(centerX, centerY, faceWidth, faceHeight),
            // Sobrancelhas (17-26)
            ...this.generateBrows(centerX, centerY, faceWidth),
            // Nariz (27-35)
            ...this.generateNose(centerX, centerY, faceHeight),
            // Olhos (36-47)
            ...this.generateEyes(centerX, centerY, faceWidth),
            // Boca (48-67)
            ...this.generateMouth(centerX, centerY + faceHeight * 0.3, faceWidth)
        ];

        for (let i = 0; i < keyPoints.length; i++) {
            points.push({
                id: i,
                x: keyPoints[i].x,
                y: keyPoints[i].y,
                z: 0
            });
        }

        // Preencher até 478 pontos com interpolação
        while (points.length < 478) {
            const basePoint = points[points.length % keyPoints.length];
            points.push({
                id: points.length,
                x: basePoint.x + (Math.random() - 0.5) * 5,
                y: basePoint.y + (Math.random() - 0.5) * 5,
                z: 0
            });
        }

        return {
            points,
            expression: 'neutral',
            blendshapes: this.getDefaultBlendshapes(),
            faceBox: { x: centerX - faceWidth / 2, y: centerY - faceHeight / 2, width: faceWidth, height: faceHeight },
            timestamp: Date.now(),
            isFallback: true
        };
    }

    generateContour(cx, cy, w, h) {
        const points = [];
        for (let i = 0; i <= 16; i++) {
            const angle = Math.PI * 0.1 + (Math.PI * 0.8 * i / 16);
            points.push({
                x: cx + Math.cos(angle) * w / 2,
                y: cy + Math.sin(angle) * h / 2
            });
        }
        return points;
    }

    generateBrows(cx, cy, w) {
        const points = [];
        const browY = cy - w * 0.15;
        // Left brow
        for (let i = 0; i < 5; i++) {
            points.push({ x: cx - w * 0.25 + i * w * 0.1, y: browY });
        }
        // Right brow
        for (let i = 0; i < 5; i++) {
            points.push({ x: cx + w * 0.05 + i * w * 0.1, y: browY });
        }
        return points;
    }

    generateNose(cx, cy, h) {
        const points = [];
        for (let i = 0; i < 9; i++) {
            points.push({ x: cx + (Math.random() - 0.5) * 20, y: cy + i * h * 0.03 });
        }
        return points;
    }

    generateEyes(cx, cy, w) {
        const points = [];
        const eyeY = cy - w * 0.05;
        // Left eye (6 points)
        for (let i = 0; i < 6; i++) {
            const angle = i * Math.PI / 3;
            points.push({
                x: cx - w * 0.15 + Math.cos(angle) * w * 0.06,
                y: eyeY + Math.sin(angle) * w * 0.025
            });
        }
        // Right eye (6 points)
        for (let i = 0; i < 6; i++) {
            const angle = i * Math.PI / 3;
            points.push({
                x: cx + w * 0.15 + Math.cos(angle) * w * 0.06,
                y: eyeY + Math.sin(angle) * w * 0.025
            });
        }
        return points;
    }

    generateMouth(cx, cy, w) {
        const points = [];
        // Outer mouth (12 points)
        for (let i = 0; i < 12; i++) {
            const angle = i * Math.PI / 6;
            points.push({
                x: cx + Math.cos(angle) * w * 0.12,
                y: cy + Math.sin(angle) * w * 0.04
            });
        }
        // Inner mouth (8 points)
        for (let i = 0; i < 8; i++) {
            const angle = i * Math.PI / 4;
            points.push({
                x: cx + Math.cos(angle) * w * 0.08,
                y: cy + Math.sin(angle) * w * 0.02
            });
        }
        return points;
    }
}
