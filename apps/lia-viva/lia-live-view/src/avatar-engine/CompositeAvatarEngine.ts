// :contentReference[oaicite:0]{index=0}
import Delaunator from "delaunator";

// Tipos
type NormalizedLandmark = { x: number; y: number; z?: number };

type EngineInit = {
    canvas: HTMLCanvasElement;
    image: HTMLImageElement;
};

type SpeakHook = {
    audio: HTMLAudioElement;
};

// Índices dos landmarks do MediaPipe
const LIPS_OUTER = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 308];
const LIPS_INNER = [78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308, 415];
const JAW_DRIVERS = [17, 18, 200, 199, 175, 152];

const LEFT_UPPER_LID = [159, 160, 161, 246];
const LEFT_LOWER_LID = [145, 144, 163, 7];
const RIGHT_UPPER_LID = [386, 387, 388, 466];
const RIGHT_LOWER_LID = [374, 373, 390, 249];

// Three.js carregado via CDN
declare const THREE: any;

function clamp(v: number, a = 0, b = 1) {
    return Math.max(a, Math.min(b, v));
}

function uniq<T>(arr: T[]): T[] {
    return Array.from(new Set(arr));
}

function toPx(lm: NormalizedLandmark, W: number, H: number) {
    return { x: lm.x * W, y: lm.y * H };
}

function polyBounds(pts: { x: number; y: number }[]) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of pts) {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
    }
    return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY };
}

function estimateEdgeFactor(
    pts: { x: number; y: number }[],
    bounds: { minX: number; minY: number; w: number; h: number }
): number[] {
    return pts.map((p) => {
        const nx = (p.x - bounds.minX) / Math.max(1, bounds.w);
        const ny = (p.y - bounds.minY) / Math.max(1, bounds.h);
        const d = Math.min(nx, ny, 1 - nx, 1 - ny);
        return clamp(d * 2.5);
    });
}

function buildFeatherMaterial(texture: any) {
    return new THREE.ShaderMaterial({
        transparent: true,
        uniforms: {
            uTex: { value: texture },
            uFeather: { value: 0.08 },
        },
        vertexShader: `
      varying vec2 vUv;
      varying float vEdge;
      attribute float aEdge;
      void main() {
        vUv = uv;
        vEdge = aEdge;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
        fragmentShader: `
      uniform sampler2D uTex;
      uniform float uFeather;
      varying vec2 vUv;
      varying float vEdge;

      void main() {
        vec4 c = texture2D(uTex, vUv);
        float alpha = smoothstep(0.0, uFeather, vEdge);
        gl_FragColor = vec4(c.rgb, c.a * alpha);
      }
    `,
    });
}

export class CompositeAvatarEngine {
    private canvas!: HTMLCanvasElement;
    private renderer!: any;
    private scene!: any;
    private camera!: any;

    private baseTexture!: any;
    private baseMesh!: any;

    private mouthMesh?: any;
    private leftEyeMesh?: any;
    private rightEyeMesh?: any;

    // Posições originais para reset
    private mouthBasePositions?: Float32Array;
    private leftEyeBasePositions?: Float32Array;
    private rightEyeBasePositions?: Float32Array;

    private W = 0;
    private H = 0;

    private landmarks?: NormalizedLandmark[];

    private raf?: number;
    private jawOpen = 0;
    private blink = 0;

    private analyser?: AnalyserNode;
    private audioCtx?: AudioContext;
    private dataArray?: Uint8Array<ArrayBuffer>;

    private audioSource?: MediaElementAudioSourceNode;
    private attachedAudio?: HTMLAudioElement;

    async init({ canvas, image }: EngineInit) {
        this.canvas = canvas;
        this.W = image.naturalWidth || image.width;
        this.H = image.naturalHeight || image.height;

        // Aguarda Three.js carregar
        await this.loadThreeJS();

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, alpha: true, antialias: true });
        this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight, false);
        this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));

        // Camera ortográfica em pixels
        const halfW = this.W / 2;
        const halfH = this.H / 2;
        this.camera = new THREE.OrthographicCamera(-halfW, halfW, halfH, -halfH, -1000, 1000);
        this.camera.position.z = 10;

        this.scene = new THREE.Scene();

        // Textura base
        this.baseTexture = new THREE.Texture(image);
        this.baseTexture.colorSpace = THREE.SRGBColorSpace;
        this.baseTexture.needsUpdate = true;

        // Mesh base (imagem inteira)
        const baseGeo = new THREE.PlaneGeometry(this.W, this.H, 1, 1);
        const baseMat = new THREE.MeshBasicMaterial({ map: this.baseTexture, transparent: true });
        this.baseMesh = new THREE.Mesh(baseGeo, baseMat);
        this.scene.add(this.baseMesh);

        // Detecta landmarks
        this.landmarks = await this.detectLandmarks(image);
        console.log("CompositeEngine: 468 landmarks detected");

        // Constrói patches
        const mouthIndices = uniq([...LIPS_OUTER, ...LIPS_INNER, ...JAW_DRIVERS]);
        const leftEyeIndices = uniq([...LEFT_UPPER_LID, ...LEFT_LOWER_LID]);
        const rightEyeIndices = uniq([...RIGHT_UPPER_LID, ...RIGHT_LOWER_LID]);

        this.mouthMesh = this.buildPatchMesh(this.landmarks, mouthIndices);
        this.leftEyeMesh = this.buildPatchMesh(this.landmarks, leftEyeIndices);
        this.rightEyeMesh = this.buildPatchMesh(this.landmarks, rightEyeIndices);

        if (this.mouthMesh) {
            this.scene.add(this.mouthMesh);
            this.mouthBasePositions = this.mouthMesh.geometry.getAttribute("position").array.slice();
        }
        if (this.leftEyeMesh) {
            this.scene.add(this.leftEyeMesh);
            this.leftEyeBasePositions = this.leftEyeMesh.geometry.getAttribute("position").array.slice();
        }
        if (this.rightEyeMesh) {
            this.scene.add(this.rightEyeMesh);
            this.rightEyeBasePositions = this.rightEyeMesh.geometry.getAttribute("position").array.slice();
        }

        console.log("CompositeEngine: Patches built (mouth, left eye, right eye)");

        this.startLoop();
        this.startBlinkLoop();
    }

    private async loadThreeJS(): Promise<void> {
        if (typeof THREE !== "undefined") return;

        return new Promise((resolve) => {
            const script = document.createElement("script");
            script.src = "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js";
            script.onload = () => {
                console.log("CompositeEngine: Three.js loaded");
                resolve();
            };
            document.head.appendChild(script);
        });
    }

    destroy() {
        if (this.raf) cancelAnimationFrame(this.raf);
        this.raf = undefined;

        try {
            this.audioSource?.disconnect();
        } catch { /* noop */ }
        try {
            this.analyser?.disconnect();
        } catch { /* noop */ }

        this.audioSource = undefined;
        this.analyser = undefined;
        this.dataArray = undefined;
        this.attachedAudio = undefined;

        this.renderer?.dispose();
    }

    setJawOpen(v: number) {
        this.jawOpen = clamp(v);
        if (this.jawOpen > 0.05) {
            console.log("jawOpen updating:", this.jawOpen.toFixed(3));
        }
    }

    setBlink(v: number) {
        this.blink = clamp(v);
    }

    attachSpeech({ audio }: SpeakHook) {
        this.audioCtx = this.audioCtx || new (window.AudioContext || (window as any).webkitAudioContext)();

        // Se já está anexado ao mesmo elemento, evita recriar (previne InvalidStateError do createMediaElementSource)
        if (this.attachedAudio === audio && this.analyser && this.dataArray) return;

        // Se havia áudio anterior, desconecta chain
        try {
            this.audioSource?.disconnect();
        } catch { /* noop */ }
        try {
            this.analyser?.disconnect();
        } catch { /* noop */ }

        this.attachedAudio = audio;

        // Resume contexto no play (muitos browsers iniciam como "suspended")
        const resumeCtx = async () => {
            try {
                if (this.audioCtx && this.audioCtx.state === "suspended") await this.audioCtx.resume();
            } catch { /* noop */ }
        };
        audio.addEventListener("play", resumeCtx, { passive: true });

        let src: MediaElementAudioSourceNode | undefined;
        try {
            src = this.audioCtx.createMediaElementSource(audio);
        } catch (e) {
            // Se já existe um MediaElementSourceNode para esse <audio>, não recria; mantém o pipeline atual.
            console.warn("CompositeEngine: createMediaElementSource failed (maybe already attached).", e);
        }

        this.analyser = this.audioCtx.createAnalyser();
        this.analyser.fftSize = 1024;

        if (src) {
            this.audioSource = src;
            src.connect(this.analyser);
        } else {
            // Se não deu pra criar src, não força pipeline; evita crashes em updateFromAudio
            this.audioSource = undefined;
        }

        this.analyser.connect(this.audioCtx.destination);

        // Time-domain precisa de array do tamanho fftSize (não frequencyBinCount)
        this.dataArray = new Uint8Array(this.analyser.fftSize) as Uint8Array<ArrayBuffer>;

        // tenta retomar imediatamente se já estiver permitido
        void resumeCtx();
    }

    private startBlinkLoop() {
        const schedule = () => {
            const next = 2500 + Math.random() * 3500;
            setTimeout(async () => {
                await this.blinkOnce();
                schedule();
            }, next);
        };
        schedule();
        console.log("CompositeEngine: blink loop active");
    }

    private async blinkOnce(): Promise<void> {
        const duration = 150;
        const t0 = performance.now();

        return new Promise((resolve) => {
            const step = () => {
                const t = performance.now();
                const p = Math.min(1, (t - t0) / duration);
                this.blink = p < 0.5 ? p * 2 : 2 - p * 2;

                if (p < 1) {
                    requestAnimationFrame(step);
                } else {
                    this.blink = 0;
                    resolve();
                }
            };
            requestAnimationFrame(step);
        });
    }

    private startLoop() {
        const tick = () => {
            this.updateFromAudio();
            this.applyRig();
            this.render();
            this.raf = requestAnimationFrame(tick);
        };
        tick();
    }

    private updateFromAudio() {
        if (!this.analyser || !this.dataArray) return;

        const analyser = this.analyser;

        // garante tamanho correto para getByteTimeDomainData
        if (this.dataArray.length !== analyser.fftSize) {
            this.dataArray = new Uint8Array(analyser.fftSize) as Uint8Array<ArrayBuffer>;
        }

        const dataToFill = this.dataArray!;

        try {
            analyser.getByteTimeDomainData(dataToFill);
        } catch (e) {
            console.warn("CompositeEngine: getByteTimeDomainData failed.", e);
            return;
        }

        let sum = 0;
        for (let i = 0; i < dataToFill.length; i++) {
            const v = (dataToFill[i] - 128) / 128;
            sum += v * v;
        }
        const rms = Math.sqrt(sum / dataToFill.length);

        // calibração (mais responsivo e mais abertura)
        const jaw = clamp((rms - 0.015) * 16);
        this.jawOpen = this.jawOpen * 0.65 + jaw * 0.35; // smoothing
    }

    private applyRig() {
        if (this.mouthMesh && this.mouthBasePositions) {
            this.applyMouth(this.mouthMesh, this.mouthBasePositions);
        }
        if (this.leftEyeMesh && this.leftEyeBasePositions) {
            this.applyEye(this.leftEyeMesh, this.leftEyeBasePositions);
        }
        if (this.rightEyeMesh && this.rightEyeBasePositions) {
            this.applyEye(this.rightEyeMesh, this.rightEyeBasePositions);
        }
    }

    private applyMouth(mesh: any, basePositions: Float32Array) {
        const geo = mesh.geometry;
        const pos = geo.getAttribute("position");
        const jaw = this.jawOpen;

        // Encontra bounds do patch
        let minY = Infinity, maxY = -Infinity;
        for (let i = 0; i < pos.count; i++) {
            const y = basePositions[i * 3 + 1];
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
        }
        const h = Math.max(1, maxY - minY);

        for (let i = 0; i < pos.count; i++) {
            const bx = basePositions[i * 3 + 0];
            const by = basePositions[i * 3 + 1];
            const bz = basePositions[i * 3 + 2];

            // Peso maior na parte de baixo (jaw)
            const w = clamp((by - minY) / h);
            const down = jaw * 18 * w;

            // Mouth wide leve
            const wide = jaw * 2.5;
            const x = bx + (bx > 0 ? wide : -wide) * (1 - w);

            pos.setXYZ(i, x, by + down, bz);
        }

        pos.needsUpdate = true;
        geo.computeVertexNormals();
    }

    private applyEye(mesh: any, basePositions: Float32Array) {
        const geo = mesh.geometry;
        const pos = geo.getAttribute("position");
        const b = this.blink;

        let minY = Infinity, maxY = -Infinity;
        for (let i = 0; i < pos.count; i++) {
            const y = basePositions[i * 3 + 1];
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
        }
        const midY = (minY + maxY) / 2;

        for (let i = 0; i < pos.count; i++) {
            const bx = basePositions[i * 3 + 0];
            const by = basePositions[i * 3 + 1];
            const bz = basePositions[i * 3 + 2];

            // Parte superior desce, inferior sobe
            const d = by > midY ? -1 : 1;
            const amp = b * 8;

            pos.setXYZ(i, bx, by + d * amp, bz);
        }

        pos.needsUpdate = true;
        geo.computeVertexNormals();
    }

    private render() {
        const cw = this.canvas.clientWidth;
        const ch = this.canvas.clientHeight;
        const pr = this.renderer.getPixelRatio() || 1;

        if (this.canvas.width !== cw * pr || this.canvas.height !== ch * pr) {
            this.renderer.setSize(cw, ch, false);
        }

        this.renderer.render(this.scene, this.camera);
    }

    private async detectLandmarks(image: HTMLImageElement): Promise<NormalizedLandmark[]> {
        return new Promise((resolve, reject) => {
            if (!window.FaceMesh) {
                // Carrega MediaPipe
                const script = document.createElement("script");
                script.src = "https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js";
                script.crossOrigin = "anonymous";
                script.onload = () => this.runFaceMesh(image, resolve, reject);
                document.head.appendChild(script);
            } else {
                this.runFaceMesh(image, resolve, reject);
            }
        });
    }

    private runFaceMesh(
        image: HTMLImageElement,
        resolve: (lm: NormalizedLandmark[]) => void,
        reject: (e: Error) => void
    ) {
        const faceMesh = new window.FaceMesh({
            locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
        });

        faceMesh.setOptions({
            maxNumFaces: 1,
            refineLandmarks: true,
            minDetectionConfidence: 0.6,
            minTrackingConfidence: 0.6,
        });

        faceMesh.onResults((res: any) => {
            const landmarks = res.multiFaceLandmarks?.[0];
            if (!landmarks) {
                reject(new Error("FaceMesh: nenhum rosto detectado."));
                return;
            }
            resolve(landmarks.map((p: any) => ({ x: p.x, y: p.y, z: p.z })));
            faceMesh.close();
        });

        faceMesh.send({ image }).catch(reject);
    }

    private buildPatchMesh(all: NormalizedLandmark[], indices: number[]) {
        if (!all?.length) return null;

        const ptsNorm = indices.map((i) => all[i]).filter(Boolean);
        if (ptsNorm.length < 4) return null;

        const ptsPx = ptsNorm.map((p) => toPx(p, this.W, this.H));
        const bounds = polyBounds(ptsPx);

        // Coordenadas locais (centralizadas)
        const local = ptsPx.map((p) => ({
            x: p.x - this.W / 2,
            y: -(p.y - this.H / 2), // Inverte Y
        }));

        // Triangulação Delaunay
        const coords = local.flatMap((p) => [p.x, p.y]);
        const delaunay = new Delaunator(coords);
        const tris = delaunay.triangles;

        const geo = new THREE.BufferGeometry();

        // Positions
        const positions = new Float32Array(local.length * 3);
        const uvs = new Float32Array(local.length * 2);

        for (let i = 0; i < local.length; i++) {
            positions[i * 3 + 0] = local[i].x;
            positions[i * 3 + 1] = local[i].y;
            positions[i * 3 + 2] = 1; // Na frente da base

            uvs[i * 2 + 0] = ptsNorm[i].x;
            uvs[i * 2 + 1] = 1 - ptsNorm[i].y;
        }

        geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        geo.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
        geo.setIndex(new THREE.BufferAttribute(new Uint32Array(tris), 1));

        // Edge factor para feather
        const edge = estimateEdgeFactor(ptsPx, bounds);
        geo.setAttribute("aEdge", new THREE.BufferAttribute(new Float32Array(edge), 1));

        const mat = buildFeatherMaterial(this.baseTexture);
        const mesh = new THREE.Mesh(geo, mat);
        mesh.frustumCulled = false;

        return mesh;
    }
}

// Declaração para window.FaceMesh
declare global {
    interface Window {
        FaceMesh: any;
    }
}

export default CompositeAvatarEngine;
