/**
 * FaceRigBuilder.js
 * =====================================================
 * Constrói a malha facial e blendshapes baseados nos landmarks
 * Usa triangulação de Delaunay para criar mesh deformável
 * =====================================================
 */

export class FaceRigBuilder {
    constructor() {
        this.baseRig = null;
        this.blendshapeTargets = {};
    }

    /**
     * Constrói o rig facial a partir dos landmarks
     * @param {Object} landmarkData - Dados do ExpressionExtractor
     * @returns {Object} Rig com mesh e blendshapes
     */
    async build(landmarkData) {
        const { points, faceBox } = landmarkData;

        // Criar mesh triangulado
        const mesh = this.createMesh(points);

        // Definir blendshape targets
        const blendshapes = this.createBlendshapeTargets(points, faceBox);

        this.baseRig = {
            points: points.map(p => ({ ...p, baseX: p.x, baseY: p.y })),
            mesh,
            blendshapes,
            faceBox,
            currentBlendshapeWeights: {
                jawOpen: 0,
                mouthSmile: 0,
                mouthFrown: 0,
                mouthPucker: 0,
                eyeBlinkLeft: 0,
                eyeBlinkRight: 0,
                eyeWideLeft: 0,
                eyeWideRight: 0,
                browUpLeft: 0,
                browUpRight: 0,
                browDownLeft: 0,
                browDownRight: 0,
                cheekPuff: 0
            }
        };

        console.log(`[FaceRigBuilder] Built rig with ${points.length} points, ${mesh.triangles.length} triangles`);

        return this.baseRig;
    }

    /**
     * Cria malha triangulada usando Delaunay simplificado
     */
    createMesh(points) {
        const triangles = [];

        // Usar triangulação simplificada baseada em regiões
        // Dividir rosto em regiões e triangular cada uma

        // Para face mesh completo, usar índices conhecidos
        const faceRegions = this.getFaceRegionIndices();

        for (const region of faceRegions) {
            const regionTriangles = this.triangulateRegion(points, region);
            triangles.push(...regionTriangles);
        }

        // Fallback: se não conseguiu triangular, criar grid simples
        if (triangles.length === 0) {
            const gridTriangles = this.createGridMesh(points);
            triangles.push(...gridTriangles);
        }

        return {
            triangles,
            vertices: points.map(p => [p.x, p.y]),
            uvs: this.calculateUVs(points)
        };
    }

    /**
     * Define regiões da face para triangulação
     */
    getFaceRegionIndices() {
        // Regiões simplificadas baseadas no FaceMesh de 478 pontos
        return [
            // Testa
            { name: 'forehead', indices: [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109] },
            // Olho esquerdo
            { name: 'leftEye', indices: [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246] },
            // Olho direito  
            { name: 'rightEye', indices: [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398] },
            // Nariz
            { name: 'nose', indices: [1, 2, 98, 327, 168, 6, 197, 195, 5, 4, 19, 94, 370, 462, 250, 309, 392, 289, 305, 290] },
            // Boca
            { name: 'mouth', indices: [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 375, 321, 405, 314, 17, 84, 181, 91, 146, 61] },
            // Bochechas
            { name: 'cheeks', indices: [116, 123, 50, 101, 36, 205, 206, 207, 187, 123] }
        ];
    }

    /**
     * Triangula uma região da face
     */
    triangulateRegion(points, region) {
        const triangles = [];
        const indices = region.indices.filter(i => i < points.length);

        if (indices.length < 3) return triangles;

        // Fan triangulation simples a partir do primeiro ponto
        for (let i = 1; i < indices.length - 1; i++) {
            triangles.push({
                a: indices[0],
                b: indices[i],
                c: indices[i + 1],
                region: region.name
            });
        }

        return triangles;
    }

    /**
     * Cria mesh grid fallback
     */
    createGridMesh(points) {
        const triangles = [];
        const gridSize = Math.floor(Math.sqrt(points.length));

        for (let i = 0; i < gridSize - 1; i++) {
            for (let j = 0; j < gridSize - 1; j++) {
                const idx = i * gridSize + j;
                if (idx + gridSize + 1 < points.length) {
                    // Triângulo 1
                    triangles.push({
                        a: idx,
                        b: idx + 1,
                        c: idx + gridSize,
                        region: 'grid'
                    });
                    // Triângulo 2
                    triangles.push({
                        a: idx + 1,
                        b: idx + gridSize + 1,
                        c: idx + gridSize,
                        region: 'grid'
                    });
                }
            }
        }

        return triangles;
    }

    /**
     * Calcula coordenadas UV para texturização
     */
    calculateUVs(points) {
        if (points.length === 0) return [];

        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;

        for (const p of points) {
            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x);
            maxY = Math.max(maxY, p.y);
        }

        const width = maxX - minX || 1;
        const height = maxY - minY || 1;

        return points.map(p => [
            (p.x - minX) / width,
            (p.y - minY) / height
        ]);
    }

    /**
     * Cria targets de blendshapes para deformação
     */
    createBlendshapeTargets(points, faceBox) {
        const targets = {};
        const faceHeight = faceBox.height || 100;
        const faceWidth = faceBox.width || 100;

        // jawOpen - abrir mandíbula
        targets.jawOpen = points.map((p, i) => {
            // Pontos da boca inferior se movem para baixo
            if (this.isLowerMouth(i)) {
                return { dx: 0, dy: faceHeight * 0.08 };
            }
            return { dx: 0, dy: 0 };
        });

        // mouthSmile - sorriso
        targets.mouthSmile = points.map((p, i) => {
            if (this.isMouthCorner(i)) {
                const side = this.isLeftSide(i, faceBox) ? -1 : 1;
                return { dx: side * faceWidth * 0.03, dy: -faceHeight * 0.02 };
            }
            return { dx: 0, dy: 0 };
        });

        // eyeBlinkLeft - piscar olho esquerdo
        targets.eyeBlinkLeft = points.map((p, i) => {
            if (this.isLeftEye(i)) {
                return { dx: 0, dy: this.isUpperEyelid(i) ? faceHeight * 0.01 : -faceHeight * 0.005 };
            }
            return { dx: 0, dy: 0 };
        });

        // eyeBlinkRight - piscar olho direito
        targets.eyeBlinkRight = points.map((p, i) => {
            if (this.isRightEye(i)) {
                return { dx: 0, dy: this.isUpperEyelid(i) ? faceHeight * 0.01 : -faceHeight * 0.005 };
            }
            return { dx: 0, dy: 0 };
        });

        // browUpLeft - levantar sobrancelha esquerda
        targets.browUpLeft = points.map((p, i) => {
            if (this.isLeftBrow(i)) {
                return { dx: 0, dy: -faceHeight * 0.02 };
            }
            return { dx: 0, dy: 0 };
        });

        // browUpRight - levantar sobrancelha direita
        targets.browUpRight = points.map((p, i) => {
            if (this.isRightBrow(i)) {
                return { dx: 0, dy: -faceHeight * 0.02 };
            }
            return { dx: 0, dy: 0 };
        });

        // mouthPucker - bico
        targets.mouthPucker = points.map((p, i) => {
            if (this.isMouth(i)) {
                const centerX = faceBox.x + faceBox.width / 2;
                const dx = (centerX - p.x) * 0.3;
                return { dx, dy: 0 };
            }
            return { dx: 0, dy: 0 };
        });

        return targets;
    }

    /**
     * Aplica blendshapes ao rig
     * @param {Object} rig - Rig atual
     * @param {Object} weights - Pesos dos blendshapes (0-1)
     * @returns {Array} Pontos deformados
     */
    applyBlendshapes(rig, weights) {
        const deformedPoints = rig.points.map((p, i) => {
            let dx = 0, dy = 0;

            for (const [name, weight] of Object.entries(weights)) {
                if (weight > 0 && rig.blendshapes[name]) {
                    const delta = rig.blendshapes[name][i];
                    if (delta) {
                        dx += delta.dx * weight;
                        dy += delta.dy * weight;
                    }
                }
            }

            return {
                ...p,
                x: p.baseX + dx,
                y: p.baseY + dy
            };
        });

        return deformedPoints;
    }

    // =====================================================
    // Helpers para identificar regiões faciais
    // =====================================================

    isLowerMouth(idx) {
        // Índices aproximados do lábio inferior no FaceMesh
        return [17, 84, 181, 91, 146, 61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291].includes(idx % 478);
    }

    isMouthCorner(idx) {
        return [61, 291, 185, 409].includes(idx % 478);
    }

    isLeftSide(idx, faceBox) {
        return idx < 234; // Aproximação: metade esquerda
    }

    isLeftEye(idx) {
        return [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246].includes(idx % 478);
    }

    isRightEye(idx) {
        return [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398].includes(idx % 478);
    }

    isUpperEyelid(idx) {
        return [159, 160, 161, 386, 385, 384].includes(idx % 478);
    }

    isLeftBrow(idx) {
        return [66, 105, 63, 70, 46, 53, 52, 65, 55].includes(idx % 478);
    }

    isRightBrow(idx) {
        return [296, 334, 293, 300, 276, 283, 282, 295, 285].includes(idx % 478);
    }

    isMouth(idx) {
        return this.isLowerMouth(idx) || this.isMouthCorner(idx) ||
            [0, 13, 14, 17, 37, 39, 40, 61, 78, 80, 81, 82, 84, 87, 88, 91, 95, 146, 178, 181, 185, 191, 267, 269, 270, 291, 308, 310, 311, 312, 314, 317, 318, 321, 324, 375, 402, 405, 409, 415].includes(idx % 478);
    }
}
