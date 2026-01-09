/**
 * AvatarStudioController.ts
 * =====================================================
 * Controller que conecta o React ao Avatar Engine Pro
 * USA: window.AvatarEnginePro do arquivo público
 * =====================================================
 */

// Declarar tipo para window.AvatarEnginePro
declare global {
    interface Window {
        AvatarEnginePro: any;
    }
}

export interface AvatarImage {
    id: string;
    file: File;
    preview: string;
    name: string;
    isBase: boolean;
    emotion: string;
}

export interface AvatarState {
    isInitialized: boolean;
    isLoading: boolean;
    isSpeaking: boolean;
    currentEmotion: string;
    error: string | null;
}

export type EmotionType = 'neutral' | 'happy' | 'sad' | 'surprised' | 'angry' | 'curious' | 'talking';

// IndexedDB configuration
const DB_NAME = 'AvatarStudioDB';
const DB_STORE = 'avatarImages';
const DB_VERSION = 1;

export class AvatarStudioController {
    private canvas: HTMLCanvasElement | null = null;
    private engine: any = null;
    private images: AvatarImage[] = [];
    private selectedImage: AvatarImage | null = null;
    private state: AvatarState = {
        isInitialized: false,
        isLoading: false,
        isSpeaking: false,
        currentEmotion: 'neutral',
        error: null
    };
    private listeners: Set<(state: AvatarState) => void> = new Set();
    private logCallback: ((message: string) => void) | null = null;
    private scriptLoaded = false;
    private db: IDBDatabase | null = null;

    constructor() {
        this.log('Controller initialized');
    }

    /**
     * Inicializa o controller e carrega imagens salvas
     */
    async init(): Promise<void> {
        try {
            await this.openDB();
            await this.loadImagesFromStorage();
            this.log(`Loaded ${this.images.length} images from storage`);
        } catch (error) {
            this.log('Failed to load images from storage');
        }
    }

    /**
     * Abre conexão com IndexedDB
     */
    private async openDB(): Promise<IDBDatabase> {
        return new Promise((resolve, reject) => {
            if (this.db) {
                resolve(this.db);
                return;
            }

            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => reject(request.error);

            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains(DB_STORE)) {
                    db.createObjectStore(DB_STORE, { keyPath: 'id' });
                }
            };
        });
    }

    /**
     * Salva imagens no IndexedDB como base64
     */
    async saveImagesToStorage(): Promise<void> {
        try {
            const db = await this.openDB();
            const transaction = db.transaction(DB_STORE, 'readwrite');
            const store = transaction.objectStore(DB_STORE);

            // Limpa store existente
            store.clear();

            // Converte cada imagem para base64 e salva
            for (const img of this.images) {
                const base64 = await this.fileToBase64(img.file);
                store.put({
                    id: img.id,
                    name: img.name,
                    isBase: img.isBase,
                    emotion: img.emotion,
                    base64,
                    type: img.file.type
                });
            }

            await new Promise<void>((resolve, reject) => {
                transaction.oncomplete = () => resolve();
                transaction.onerror = () => reject(transaction.error);
            });

            this.log(`Saved ${this.images.length} images to storage`);
        } catch (error) {
            this.log('Failed to save images to storage');
        }
    }

    /**
     * Carrega imagens do IndexedDB
     */
    async loadImagesFromStorage(): Promise<AvatarImage[]> {
        try {
            const db = await this.openDB();
            const transaction = db.transaction(DB_STORE, 'readonly');
            const store = transaction.objectStore(DB_STORE);

            const storedImages = await new Promise<any[]>((resolve, reject) => {
                const request = store.getAll();
                request.onsuccess = () => resolve(request.result || []);
                request.onerror = () => reject(request.error);
            });

            // Converte base64 de volta para File e preview URL
            const loadedImages: AvatarImage[] = [];
            for (const stored of storedImages) {
                const file = this.base64ToFile(stored.base64, stored.name, stored.type);
                loadedImages.push({
                    id: stored.id,
                    file,
                    preview: URL.createObjectURL(file),
                    name: stored.name,
                    isBase: stored.isBase,
                    emotion: stored.emotion
                });
            }

            this.images = loadedImages;
            if (this.images.length > 0) {
                this.selectedImage = this.images.find(img => img.isBase) || this.images[0];
            }

            return loadedImages;
        } catch (error) {
            this.log('Failed to load images from storage');
            return [];
        }
    }

    /**
     * Converte File para base64
     */
    private async fileToBase64(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    /**
     * Converte base64 para File
     */
    private base64ToFile(base64: string, name: string, type: string): File {
        const arr = base64.split(',');
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new File([u8arr], name, { type });
    }

    setLogCallback(callback: (message: string) => void) {
        this.logCallback = callback;
    }

    private log(message: string) {
        console.log(`[AvatarStudioController] ${message}`);
        if (this.logCallback) {
            this.logCallback(message);
        }
    }

    private setState(partial: Partial<AvatarState>) {
        this.state = { ...this.state, ...partial };
        this.listeners.forEach(listener => listener(this.state));
    }

    subscribe(listener: (state: AvatarState) => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    getState(): AvatarState {
        return { ...this.state };
    }

    attachCanvasRef(canvasRef: React.RefObject<HTMLCanvasElement>) {
        if (canvasRef.current) {
            this.canvas = canvasRef.current;
            this.log('Canvas attached');
        }
    }

    handleUpload(files: FileList | File[]): AvatarImage[] {
        const newImages: AvatarImage[] = [];

        Array.from(files).forEach((file, index) => {
            if (!file.type.startsWith('image/')) return;

            const image: AvatarImage = {
                id: `img_${Date.now()}_${index}`,
                file,
                preview: URL.createObjectURL(file),
                name: file.name,
                isBase: this.images.length === 0 && index === 0,
                emotion: 'neutral'
            };

            newImages.push(image);
        });

        this.images = [...this.images, ...newImages];
        this.log(`Uploaded ${newImages.length} image(s), total: ${this.images.length}`);

        if (!this.selectedImage && this.images.length > 0) {
            this.selectedImage = this.images[0];
        }

        // Salva automaticamente no IndexedDB
        this.saveImagesToStorage();

        return newImages;
    }

    setBaseImage(imageId: string) {
        this.images = this.images.map(img => ({
            ...img,
            isBase: img.id === imageId
        }));
        this.selectedImage = this.images.find(img => img.id === imageId) || null;
        this.log(`Base image set: ${this.selectedImage?.name}`);
    }

    setImageEmotion(imageId: string, emotion: EmotionType) {
        this.images = this.images.map(img =>
            img.id === imageId ? { ...img, emotion } : img
        );
        this.log(`Image ${imageId} emotion: ${emotion}`);
    }

    removeImage(imageId: string) {
        const image = this.images.find(img => img.id === imageId);
        if (image) {
            URL.revokeObjectURL(image.preview);
        }
        this.images = this.images.filter(img => img.id !== imageId);

        if (this.selectedImage?.id === imageId) {
            this.selectedImage = this.images[0] || null;
        }
        this.log(`Image removed: ${imageId}`);
    }

    getImages(): AvatarImage[] {
        return [...this.images];
    }

    /**
     * Carrega o script do motor dinamicamente via tag <script src="...">
     * Isso evita erros de CORS e imports inline.
     */
    private async loadEngineScript(): Promise<boolean> {
        return new Promise((resolve) => {
            // 1. Se já estiver carregado, retorna imediatamente
            // @ts-ignore
            if (window.AvatarEnginePro) {
                console.log("AvatarEngine: Já carregado na memória.");
                resolve(true);
                return;
            }

            console.log("AvatarEngine: Injetando script do Core...");

            const script = document.createElement('script');
            script.type = 'module';
            // Adicionamos timestamp para evitar cache do navegador durante desenvolvimento
            script.src = `/avatar-core/AvatarEnginePro.js?t=${Date.now()}`;

            script.onload = () => {
                console.log("AvatarEngine: Script baixado. Aguardando inicialização...");
                // Pequeno delay para garantir que o módulo executou e anexou ao window
                setTimeout(() => {
                    // @ts-ignore
                    if (window.AvatarEnginePro) {
                        console.log("AvatarEngine: Classe detectada com sucesso!");
                        resolve(true);
                    } else {
                        console.error("AvatarEngine: Script carregou, mas window.AvatarEnginePro é undefined.");
                        resolve(false);
                    }
                }, 100);
            };

            script.onerror = (e) => {
                console.error("AvatarEngine: Falha fatal ao carregar arquivo JS.", e);
                resolve(false);
            };

            document.body.appendChild(script);
        });
    }

    /**
     * Inicializa o engine com TODAS as imagens de expressão
     */
    async startEngine(): Promise<boolean> {
        if (!this.canvas) {
            this.setState({ error: 'Canvas not attached' });
            return false;
        }

        if (this.images.length === 0) {
            this.setState({ error: 'No images uploaded' });
            return false;
        }

        this.setState({ isLoading: true, error: null });
        this.log('Starting V6 Composite Engine...');

        try {
            // Carregar script do public/
            const loaded = await this.loadEngineScript();

            if (!loaded || !window.AvatarEnginePro) {
                throw new Error('Failed to load AvatarEnginePro');
            }

            // Criar instância
            this.engine = new window.AvatarEnginePro();
            await this.engine.init(this.canvas);

            // NOVO: Construir manifesto de texturas baseado nas emoções + filenames
            const avatarManifest: Record<string, string> = {};

            this.images.forEach(img => {
                // Mapeia emoção para chave
                const emotionKey = img.emotion?.toLowerCase() || 'neutral';

                // Se for a primeira imagem ou marcada como base, usa também como 'idle'
                if (img.isBase || !avatarManifest['idle']) {
                    avatarManifest['idle'] = img.preview;
                }

                // Adiciona ao manifesto pela emoção
                avatarManifest[emotionKey] = img.preview;

                // IMPORTANTE: Também adiciona pelo nome do arquivo original
                // Isso permite que o V7 auto-detecte assets especiais
                if (img.name) {
                    // Remove extensão e usa nome limpo
                    const cleanName = img.name.replace(/\.[^.]+$/, '').toLowerCase();
                    avatarManifest[cleanName] = img.preview;
                }
            });

            this.log(`V7 Manifesto: ${Object.keys(avatarManifest).join(', ')}`);

            // Carregar TODAS as texturas
            await this.engine.loadCompositeAvatar(avatarManifest);

            this.setState({ isInitialized: true, isLoading: false });
            this.log('✅ V6 Composite Engine started with ' + Object.keys(avatarManifest).length + ' expressions!');
            return true;

        } catch (error: any) {
            this.setState({
                isLoading: false,
                error: error.message || 'Failed to start engine'
            });
            this.log(`❌ Error: ${error.message}`);
            return false;
        }
    }

    /**
     * Testa fala com TTS real e AMPLITUDE-DRIVEN LIP SYNC
     * Uses AudioContext + AnalyserNode + RMS for real-time jaw control
     */
    async testSpeech(text?: string): Promise<boolean> {
        if (!this.engine) {
            const started = await this.startEngine();
            if (!started) return false;
        }

        const speechText = text || 'Olá! Eu sou a LIA, sua assistente inteligente.';
        this.log(`Speaking: "${speechText.substring(0, 30)}..."`);
        this.setState({ isSpeaking: true });

        try {
            // Fetch TTS with robust headers
            const response = await fetch('/api/avatar/speak', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'audio/mpeg,audio/wav,application/octet-stream'
                },
                body: JSON.stringify({ text: speechText })
            });

            const contentType = response.headers.get('content-type') || '';

            if (!response.ok) {
                const errText = await response.text().catch(() => '');
                this.log(`TTS HTTP ${response.status}. content-type=${contentType}. body=${errText.substring(0, 100)}`);
                throw new Error(`TTS HTTP ${response.status}`);
            }

            if (!contentType.includes('audio') && !contentType.includes('octet-stream')) {
                const errText = await response.text().catch(() => '');
                this.log(`TTS returned non-audio. content-type=${contentType}. body=${errText.substring(0, 100)}`);
                // Fallback to demo animation
                this.engine.demoSpeak();
                setTimeout(() => {
                    this.setState({ isSpeaking: false });
                    this.log('Speech demo ended (no audio)');
                }, 5000);
                return true;
            }

            // Get audio as ArrayBuffer
            const ttsArrayBuffer = await response.arrayBuffer();
            this.log(`TTS content-type: ${contentType}, size: ${ttsArrayBuffer.byteLength} bytes`);

            // Play with amplitude-driven lip sync
            await this.playTTSAndDriveLipSync(ttsArrayBuffer);
            return true;

        } catch (error: any) {
            this.log(`❌ Speech error: ${error.message}`);
            this.setState({ isSpeaking: false });
            // Fallback to demo animation
            this.engine?.demoSpeak();
            setTimeout(() => this.setState({ isSpeaking: false }), 5000);
            return false;
        }
    }

    /**
     * Amplitude-driven lip sync with AudioContext + AnalyserNode
     * Maps RMS to jawOpenWeight in real-time
     */
    private async playTTSAndDriveLipSync(ttsArrayBuffer: ArrayBuffer): Promise<void> {
        // Create or resume AudioContext
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioContextClass();

        if (ctx.state !== 'running') {
            await ctx.resume();
        }
        this.log('AudioContext running');

        // Decode audio
        const audioBuffer = await ctx.decodeAudioData(ttsArrayBuffer.slice(0));
        const src = ctx.createBufferSource();
        src.buffer = audioBuffer;

        // Create analyser for RMS calculation
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 2048;
        const data = new Uint8Array(analyser.fftSize);

        // Gain node
        const gain = ctx.createGain();
        gain.gain.value = 1;

        // Connect: source → analyser → gain → destination
        src.connect(analyser);
        analyser.connect(gain);
        gain.connect(ctx.destination);

        let running = true;
        let smoothed = 0;

        const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

        // Animation loop for jaw control
        const tick = () => {
            if (!running) return;

            analyser.getByteTimeDomainData(data);

            // Calculate RMS
            let sum = 0;
            for (let i = 0; i < data.length; i++) {
                const x = (data[i] - 128) / 128;
                sum += x * x;
            }
            const rms = Math.sqrt(sum / data.length); // ~0..0.3

            // Map RMS to jaw open: threshold + gain + clamp
            const target = clamp((rms - 0.015) * 10, 0, 1);

            // Smoothing to prevent jitter
            smoothed = smoothed * 0.75 + target * 0.25;

            // Apply JAW OPEN (not stretch)
            if (this.engine && this.engine.setJawOpen) {
                this.engine.setJawOpen(smoothed);
            }

            requestAnimationFrame(tick);
        };

        // On audio end
        src.onended = () => {
            running = false;
            if (this.engine && this.engine.setJawOpen) {
                this.engine.setJawOpen(0);
            }
            this.setState({ isSpeaking: false });
            this.log('Speech ended');
            ctx.close();
        };

        // Start playback and animation
        src.start();
        tick();
        this.log('Audio playing with amplitude-driven lip sync...');
    }

    /**
     * Define expressão - TROCA A TEXTURA para a emoção correspondente
     */
    setExpression(emotion: EmotionType, intensity: number = 0.7) {
        this.setState({ currentEmotion: emotion });

        // V6: Troca a textura no engine
        if (this.engine && this.engine.setEmotion) {
            const emotionKey = emotion.toLowerCase();
            this.engine.setEmotion(emotionKey);
            this.log(`Expression changed: ${emotion} (texture swap)`);
        } else {
            this.log(`Expression: ${emotion}`);
        }
    }

    /**
     * Para fala atual
     */
    stopSpeech() {
        if (this.engine) {
            this.engine.updateMouth(0);
        }
        this.setState({ isSpeaking: false });
        this.log('Speech stopped');
    }

    /**
     * Toggle debug mesh - shows landmarks and contours
     */
    toggleDebugMesh(): boolean {
        if (this.engine && this.engine.toggleDebug) {
            const isDebug = this.engine.toggleDebug();
            this.log(`Debug mode: ${isDebug ? 'ON' : 'OFF'}`);
            return isDebug;
        }
        return false;
    }

    /**
     * Publica avatar (salva configuração)
     */
    async publish(): Promise<boolean> {
        if (!this.selectedImage) {
            this.log('No avatar to publish');
            return false;
        }

        const config = {
            avatarId: `avatar_${Date.now()}`,
            name: 'LIA Avatar',
            baseImage: this.selectedImage.preview,
            images: this.images.map(img => ({
                id: img.id,
                emotion: img.emotion,
                isBase: img.isBase
            })),
            publishedAt: Date.now()
        };

        try {
            localStorage.setItem('lia-avatar-published-config', JSON.stringify(config));
            this.log('✅ Avatar published');
            return true;
        } catch (error) {
            this.log('❌ Failed to publish');
            return false;
        }
    }

    /**
     * Reset engine para recriar avatar com imagens atualizadas
     */
    async resetEngine(): Promise<boolean> {
        this.log('Resetting engine for recreation...');

        // IMPORTANTE: Destroi engine existente para evitar sobreposição
        if (this.engine && this.engine.destroy) {
            this.engine.destroy();
        }
        this.engine = null;

        // Reset state
        this.setState({
            isInitialized: false,
            isLoading: false,
            isSpeaking: false,
            error: null
        });

        // Reinicia engine
        return this.startEngine();
    }

    /**
     * Limpa recursos
     */
    destroy() {
        this.engine = null;
        this.images.forEach(img => URL.revokeObjectURL(img.preview));
        this.images = [];
        this.selectedImage = null;
        this.listeners.clear();
        this.log('Controller destroyed');
    }
}
