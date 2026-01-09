/* ARQUIVO: /public/avatar-core/AvatarEnginePro.js */
/* Avatar Engine V8 - Soft Masking System */
/* Usa PATCHES LOCALIZADOS com gradiente radial para evitar flickering */
/* Só desenha região de interesse (boca/olhos) com bordas suaves */

export class AvatarEnginePro {
    constructor() {
        this.canvas = null;
        this.ctx = null;

        // Assets Carregados
        this.assets = {
            base: null,
            mouthOpen: null,
            eyesClosed: null,
            eyesSemiOpen: null
        };

        // Todas as texturas (para emoções)
        this.textures = {};
        this.currentEmotion = 'idle';

        // MediaPipe
        this.landmarks = null;
        this.landmarksPx = null;
        this.mediapipe = null;
        this.libsLoaded = false;

        // Estado
        this.mouthOpenFactor = 0;
        this.blinkFactor = 0;
        this.isReady = false;
        this.debugMode = false;

        // Timing
        this.time = 0;
        this.lastTime = 0;
        this.nextBlink = 2;
        this.isBlinking = false;

        // Animation
        this.animationFrame = null;

        // Tuning boca (mais expressiva e estável)
        this.mouthTuning = {
            noiseGate: 0.06,      // corta ruído baixo
            gain: 2.6,            // aumenta amplitude percebida
            gamma: 0.55,          // curva (abre mais cedo)
            attack: 0.70,         // abre rápido
            release: 0.35,        // fecha mais suave
            minPatch: 0.02,       // threshold do patch (antes 0.05)
            extraOpenPx: 28       // “altura” extra quando falando
        };

        // Canvas temporário reutilizável (performance + estabilidade)
        this._tempCanvas = null;
        this._tempCtx = null;
    }

    destroy() {
        console.log("V8: Destroying engine...");
        this.isReady = false;

        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }

        if (this.ctx && this.canvas) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }

        this.assets = { base: null, mouthOpen: null, eyesClosed: null, eyesSemiOpen: null };
        this.textures = {};
        this.landmarks = null;
        this.landmarksPx = null;
        this.mouthOpenFactor = 0;
        this.blinkFactor = 0;

        this._tempCanvas = null;
        this._tempCtx = null;
    }

    async loadLibraries() {
        if (this.libsLoaded) return true;

        await new Promise((resolve) => {
            if (window.FaceMesh) {
                this.initMediaPipe();
                resolve();
                return;
            }
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js';
            script.crossOrigin = 'anonymous';
            script.onload = () => {
                console.log("V8: MediaPipe loaded");
                this.initMediaPipe();
                resolve();
            };
            script.onerror = () => resolve();
            document.head.appendChild(script);
        });

        this.libsLoaded = true;
        return true;
    }

    initMediaPipe() {
        try {
            this.mediapipe = new window.FaceMesh({
                locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
            });
            this.mediapipe.setOptions({
                maxNumFaces: 1,
                refineLandmarks: true,
                minDetectionConfidence: 0.5,
                minTrackingConfidence: 0.5
            });
            this.mediapipe.onResults((results) => {
                if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
                    this.landmarks = results.multiFaceLandmarks[0];
                    this.convertLandmarksToPixels();
                }
            });
        } catch (e) {
            console.error("V8: MediaPipe init error:", e);
        }
    }

    convertLandmarksToPixels() {
        if (!this.landmarks || !this.canvas) return;

        const w = this.canvas.width;
        const h = this.canvas.height;

        this.landmarksPx = this.landmarks.map(lm => ({
            x: lm.x * w,
            y: lm.y * h
        }));
    }

    init(canvasElement) {
        this.destroy();
        this.canvas = canvasElement;
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
        this.loadLibraries();
        console.log("V8: Engine initialized - Soft Masking System");
    }

    async loadCompositeAvatar(avatarManifest) {
        console.log("V8: Loading composite avatar with soft masking...", Object.keys(avatarManifest));
        this.isReady = false;
        this.textures = {};

        const loadImg = (url) => new Promise((resolve) => {
            if (!url) { resolve(null); return; }
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.onload = () => resolve(img);
            img.onerror = () => resolve(null);
            img.src = url;
        });

        // Carrega TODAS as texturas
        for (const [key, url] of Object.entries(avatarManifest)) {
            const img = await loadImg(url);
            if (img) {
                this.textures[key] = img;
                console.log(`V8: ✅ Loaded "${key}"`);

                // Auto-detecta assets especiais pelo nome
                const keyLower = key.toLowerCase();
                if ((keyLower.includes('boca') && keyLower.includes('aberta')) ||
                    (keyLower.includes('mouth') && keyLower.includes('open'))) {
                    this.assets.mouthOpen = img;
                    console.log("V8: 📌 Detected mouthOpen asset");
                }
                if ((keyLower.includes('olhos') && keyLower.includes('fechados')) ||
                    (keyLower.includes('eyes') && keyLower.includes('closed'))) {
                    this.assets.eyesClosed = img;
                    console.log("V8: 📌 Detected eyesClosed asset");
                }
                if (keyLower.includes('olhos') && keyLower.includes('semi')) {
                    this.assets.eyesSemiOpen = img;
                    console.log("V8: 📌 Detected eyesSemiOpen asset");
                }
            }
        }

        // Define base
        this.assets.base = this.textures['idle'] || this.textures['neutral'] || Object.values(this.textures)[0];

        if (!this.assets.base) {
            console.error("V8: No base image!");
            return false;
        }

        // Configura canvas
        this.canvas.width = this.assets.base.width;
        this.canvas.height = this.assets.base.height;

        // Inicializa canvas temporário reutilizável
        this._tempCanvas = document.createElement('canvas');
        this._tempCanvas.width = this.canvas.width;
        this._tempCanvas.height = this.canvas.height;
        this._tempCtx = this._tempCanvas.getContext('2d');

        // Detecta landmarks na imagem base
        if (this.mediapipe) {
            await this.mediapipe.send({ image: this.assets.base });
        }

        this.isReady = true;
        this.startLoop();

        console.log(`V8: ✅ Soft Masking Ready - ${Object.keys(this.textures).length} textures`);
        console.log(`V8: Special assets - mouthOpen: ${!!this.assets.mouthOpen}, eyesClosed: ${!!this.assets.eyesClosed}`);

        return true;
    }

    // ============================================
    // SOFT PATCH - Desenha região localizada com feather
    // ============================================
    drawSoftPatch(targetImage, centerX, centerY, radiusX, radiusY, opacity) {
        if (!targetImage || opacity <= 0.02) return;
        if (!this._tempCanvas || !this._tempCtx) return;

        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        // Garante sync de tamanho (caso canvas seja reconfigurado)
        if (this._tempCanvas.width !== w || this._tempCanvas.height !== h) {
            this._tempCanvas.width = w;
            this._tempCanvas.height = h;
        }

        const tempCtx = this._tempCtx;

        // Limpa e desenha a imagem alvo no canvas temporário
        tempCtx.setTransform(1, 0, 0, 1, 0, 0);
        tempCtx.clearRect(0, 0, w, h);
        tempCtx.globalCompositeOperation = 'source-over';
        tempCtx.drawImage(targetImage, 0, 0, w, h);

        // Cria gradiente radial (centro opaco, bordas transparentes) NO MESMO CONTEXTO
        const gradient = tempCtx.createRadialGradient(
            centerX, centerY, Math.min(radiusX, radiusY) * 0.28,  // Centro
            centerX, centerY, Math.max(radiusX, radiusY)          // Borda
        );
        gradient.addColorStop(0, `rgba(255, 255, 255, ${opacity})`);
        gradient.addColorStop(0.7, `rgba(255, 255, 255, ${opacity * 0.55})`);
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

        // Aplica máscara de gradiente
        tempCtx.globalCompositeOperation = 'destination-in';
        tempCtx.fillStyle = gradient;
        tempCtx.fillRect(0, 0, w, h);

        // Desenha o resultado mascarado no canvas principal
        ctx.save();
        ctx.drawImage(this._tempCanvas, 0, 0);
        ctx.restore();
    }

    // ============================================
    // COMPOSIÇÃO COM SOFT MASKING
    // ============================================
    updateCompositor() {
        if (!this.ctx || !this.assets.base) return;

        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        // 1. LIMPA e desenha BASE (emoção atual)
        ctx.clearRect(0, 0, w, h);
        const baseTexture = this.textures[this.currentEmotion] || this.assets.base;
        ctx.drawImage(baseTexture, 0, 0, w, h);

        // Se não temos landmarks, usa coordenadas estimadas
        let mouthCenterX, mouthCenterY, mouthRadiusX, mouthRadiusY;
        let leftEyeCenterX, leftEyeCenterY, rightEyeCenterX, rightEyeCenterY, eyeRadius;

        if (this.landmarksPx) {
            // Usa landmarks reais
            const upperLip = this.landmarksPx[13];
            const lowerLip = this.landmarksPx[14];
            const leftCorner = this.landmarksPx[61];
            const rightCorner = this.landmarksPx[291];

            mouthCenterX = (leftCorner.x + rightCorner.x) / 2;
            mouthCenterY = (upperLip.y + lowerLip.y) / 2;
            mouthRadiusX = Math.abs(rightCorner.x - leftCorner.x) * 0.7;

            // Aumenta “leitura” vertical da boca (mais expressiva)
            mouthRadiusY = Math.abs(lowerLip.y - upperLip.y) * 3.2;

            // Olhos
            const leftEyeInner = this.landmarksPx[33];
            const leftEyeOuter = this.landmarksPx[133];
            leftEyeCenterX = (leftEyeInner.x + leftEyeOuter.x) / 2;
            leftEyeCenterY = this.landmarksPx[159].y;

            const rightEyeInner = this.landmarksPx[362];
            const rightEyeOuter = this.landmarksPx[263];
            rightEyeCenterX = (rightEyeInner.x + rightEyeOuter.x) / 2;
            rightEyeCenterY = this.landmarksPx[386].y;

            eyeRadius = Math.abs(leftEyeOuter.x - leftEyeInner.x) * 0.7;
        } else {
            // Fallback: coordenadas estimadas
            mouthCenterX = w * 0.5;
            mouthCenterY = h * 0.72;
            mouthRadiusX = w * 0.12;
            mouthRadiusY = h * 0.065;

            leftEyeCenterX = w * 0.38;
            rightEyeCenterX = w * 0.62;
            leftEyeCenterY = rightEyeCenterY = h * 0.38;
            eyeRadius = w * 0.06;
        }

        // 2. PATCH DA BOCA (Soft Masking)
        const minPatch = this.mouthTuning?.minPatch ?? 0.02;
        if (this.assets.mouthOpen && this.mouthOpenFactor > minPatch) {
            const extra = (this.mouthTuning?.extraOpenPx ?? 28) * this.mouthOpenFactor;

            this.drawSoftPatch(
                this.assets.mouthOpen,
                mouthCenterX, mouthCenterY,
                mouthRadiusX,
                mouthRadiusY + extra,
                this.mouthOpenFactor
            );
        }

        // 3. PATCH DOS OLHOS (Soft Masking)
        if (this.assets.eyesClosed && this.blinkFactor > 0.3) {
            const eyeOpacity = Math.min(1, (this.blinkFactor - 0.3) * 1.5);

            // Olho esquerdo
            this.drawSoftPatch(
                this.assets.eyesClosed,
                leftEyeCenterX, leftEyeCenterY,
                eyeRadius, eyeRadius * 0.7,
                eyeOpacity
            );

            // Olho direito
            this.drawSoftPatch(
                this.assets.eyesClosed,
                rightEyeCenterX, rightEyeCenterY,
                eyeRadius, eyeRadius * 0.7,
                eyeOpacity
            );
        }

        // 4. DEBUG OVERLAY
        if (this.debugMode) {
            this.renderDebugOverlay();
        }
    }

    renderDebugOverlay() {
        const ctx = this.ctx;

        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.font = 'bold 12px monospace';
        ctx.fillText(`V8 Soft Masking | Emotion: ${this.currentEmotion}`, 10, 20);
        ctx.fillText(`Mouth: ${this.mouthOpenFactor.toFixed(2)} | Blink: ${this.blinkFactor.toFixed(2)}`, 10, 36);
        ctx.fillText(`Assets: mouth=${!!this.assets.mouthOpen}, eyes=${!!this.assets.eyesClosed}`, 10, 52);

        // Desenha áreas de patch
        if (this.landmarksPx) {
            const upperLip = this.landmarksPx[13];
            const lowerLip = this.landmarksPx[14];
            const leftCorner = this.landmarksPx[61];
            const rightCorner = this.landmarksPx[291];

            const mouthCenterX = (leftCorner.x + rightCorner.x) / 2;
            const mouthCenterY = (upperLip.y + lowerLip.y) / 2;
            const mouthRadiusX = Math.abs(rightCorner.x - leftCorner.x) * 0.7;
            const mouthRadiusY = Math.abs(lowerLip.y - upperLip.y) * 3.2;

            ctx.strokeStyle = 'rgba(255, 100, 100, 0.6)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.ellipse(mouthCenterX, mouthCenterY, mouthRadiusX, mouthRadiusY, 0, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    updatePhysics(dt) {
        this.time += dt;

        // Piscar Automático
        if (!this.isBlinking && this.time > this.nextBlink) {
            this.isBlinking = true;
            this.blinkFactor = 0;
        }

        if (this.isBlinking) {
            this.blinkFactor += dt * 12;
            if (this.blinkFactor >= 1) {
                this.blinkFactor = 1;
                setTimeout(() => {
                    this.blinkFactor = 0;
                    this.isBlinking = false;
                    this.nextBlink = this.time + 2 + Math.random() * 3;
                }, 80);
            }
        }
    }

    // Boca: tuning (gate + gain + curva + attack/release)
    setJawOpen(value) {
        const t = this.mouthTuning || {};
        const noiseGate = (typeof t.noiseGate === 'number') ? t.noiseGate : 0.06;
        const gain = (typeof t.gain === 'number') ? t.gain : 2.6;
        const gamma = (typeof t.gamma === 'number') ? t.gamma : 0.55;
        const attack = (typeof t.attack === 'number') ? t.attack : 0.70;
        const release = (typeof t.release === 'number') ? t.release : 0.35;

        // clamp
        let val = Math.max(0, Math.min(1, value));

        // noise gate
        let x = Math.max(0, val - noiseGate) / (1 - noiseGate);

        // curva (mais presença em voz baixa)
        x = Math.pow(x, gamma);

        // ganho
        x = Math.min(1, x * gain);

        // smoothing responsivo
        const k = x > this.mouthOpenFactor ? attack : release;
        this.mouthOpenFactor += (x - this.mouthOpenFactor) * k;
    }

    setMouthOpen(value) { this.setJawOpen(value); }
    updateMouth(value) { this.setJawOpen(value); }

    setEmotion(emotionName) {
        const key = emotionName.toLowerCase();
        if (this.textures[key]) {
            this.currentEmotion = key;
            console.log("V8: Emotion switched to:", key);
            return true;
        }
        return false;
    }

    toggleDebug() {
        this.debugMode = !this.debugMode;
        console.log("V8: Debug mode:", this.debugMode);
        return this.debugMode;
    }

    startLoop() {
        if (this.animationFrame) cancelAnimationFrame(this.animationFrame);

        const tick = () => {
            const now = Date.now() / 1000;
            const dt = now - (this.lastTime || now);
            this.lastTime = now;

            if (this.isReady) {
                this.updatePhysics(dt);
                this.updateCompositor();
            }

            this.animationFrame = requestAnimationFrame(tick);
        };
        tick();
    }

    demoSpeak() {
        console.log("V8: Demo speak with soft masking...");
        let t = 0;
        const interval = setInterval(() => {
            t += 0.15;
            const val = (Math.sin(t * 5) + 0.5 * Math.sin(t * 12) + 1) / 2.5;
            this.setJawOpen(val);
        }, 30);
        setTimeout(() => {
            clearInterval(interval);
            this.setJawOpen(0);
        }, 5000);
    }

    getAvailableEmotions() {
        return Object.keys(this.textures);
    }

    async loadAvatar(url) {
        return this.loadCompositeAvatar({ idle: url });
    }

    async loadAssets(manifest) {
        return this.loadCompositeAvatar(manifest);
    }
}

window.AvatarEnginePro = AvatarEnginePro;
