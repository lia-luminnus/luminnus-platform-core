/**
 * AvatarLayer.tsx - 3D Avatar Renderer with Motor Integration
 * 
 * Features:
 * - Loads GLB/GLTF model
 * - Integrates with AvatarController for animations
 * - Autopilot idle vivo (blink, micro movements)
 * - Responds to isSpeaking/isListening props
 * - No autoplay of test loops
 */

import React, { useEffect, useRef, useState, memo, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { AvatarController, AvatarState } from '@/avatar/AvatarController';

// =====================================================
// TYPES & CONFIG
// =====================================================
export interface AvatarLayerProps {
    visible?: boolean;
    mode?: 'live' | 'multimodal';
    isSpeaking?: boolean;
    isListening?: boolean;
}

// Model path
const MODEL_URL = '/avatar/Lia-Final-completa-1.glb';

// Animation blacklist - these clips will NEVER play
const ANIMATION_BLACKLIST = [
    'walk', 'run', 'loop', 'test', 'rig', 'armature',
    'mixamo', 'anim', 'action', 'take'
];

// =====================================================
// COMPONENT
// =====================================================
function AvatarLayerComponent({
    visible = true,
    mode = 'live',
    isSpeaking = false,
    isListening = false,
}: AvatarLayerProps) {

    // Mount guard
    const isInitialized = useRef(false);

    // Three.js resources
    const containerRef = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const modelRef = useRef<THREE.Group | null>(null);
    const clockRef = useRef<THREE.Clock>(new THREE.Clock());
    const rafIdRef = useRef<number | null>(null);

    // Avatar Controller
    const controllerRef = useRef<AvatarController | null>(null);

    // State
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loadProgress, setLoadProgress] = useState(0);
    const [avatarState, setAvatarStateUI] = useState<AvatarState>('IDLE_ALIVE');

    // =====================================================
    // REACT TO PROPS
    // =====================================================
    useEffect(() => {
        if (!loaded || !controllerRef.current) return;

        let newState: AvatarState = 'IDLE_ALIVE';

        if (isSpeaking) {
            newState = 'SPEAKING';
        } else if (isListening) {
            newState = 'LISTENING';
        }

        controllerRef.current.setState(newState);
        setAvatarStateUI(newState);
    }, [isSpeaking, isListening, loaded]);

    // =====================================================
    // EXPOSE CONTROLLER FOR EXTERNAL USE
    // =====================================================
    useEffect(() => {
        // Expose controller globally for command integration
        if (controllerRef.current) {
            (window as any).__avatarController = controllerRef.current;
        }
        return () => {
            delete (window as any).__avatarController;
        };
    }, [loaded]);

    // =====================================================
    // MAIN INITIALIZATION
    // =====================================================
    useEffect(() => {
        if (isInitialized.current) {
            console.log('⚠️ [Avatar] Already initialized');
            return;
        }
        isInitialized.current = true;

        console.log('🟢 [Avatar] INITIALIZING');

        const container = containerRef.current;
        if (!container) {
            setError('No container');
            return;
        }

        // ===== DIMENSIONS =====
        const width = window.innerWidth;
        const height = window.innerHeight;
        console.log(`📏 [Avatar] Viewport: ${width}x${height}`);

        // ===== SCENE =====
        const scene = new THREE.Scene();
        scene.background = null;
        sceneRef.current = scene;

        // ===== CAMERA =====
        const fov = 35;
        const camera = new THREE.PerspectiveCamera(fov, width / height, 0.1, 100);
        cameraRef.current = camera;

        // ===== RENDERER =====
        const renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance',
        });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.2;

        renderer.domElement.style.position = 'absolute';
        renderer.domElement.style.top = '0';
        renderer.domElement.style.left = '0';
        renderer.domElement.style.width = '100%';
        renderer.domElement.style.height = '100%';

        container.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        // ===== LIGHTING RIG =====
        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444466, 1.2);
        hemiLight.position.set(0, 20, 0);
        scene.add(hemiLight);

        const keyLight = new THREE.DirectionalLight(0xffffff, 2.0);
        keyLight.position.set(3, 8, 5);
        scene.add(keyLight);

        const fillLight = new THREE.DirectionalLight(0xaaccff, 1.2);
        fillLight.position.set(-5, 4, 3);
        scene.add(fillLight);

        const rimLight = new THREE.DirectionalLight(0x00f3ff, 0.8);
        rimLight.position.set(0, 5, -8);
        scene.add(rimLight);

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        scene.add(ambientLight);

        console.log('💡 [Avatar] Lighting rig configured');

        // ===== LOAD MODEL =====
        const loader = new GLTFLoader();
        console.log(`📦 [Avatar] Loading: ${MODEL_URL}`);

        loader.load(
            MODEL_URL,
            (gltf: GLTF) => {
                console.log('✅ [Avatar] GLTF loaded');

                const model = gltf.scene;

                // ===== FILTER ANIMATIONS (BLACKLIST) =====
                console.log(`🎬 [Avatar] Processing ${gltf.animations.length} animations...`);

                const blockedAnimations: string[] = [];
                gltf.animations.forEach(clip => {
                    const lowerName = clip.name.toLowerCase();
                    const isBlocked = ANIMATION_BLACKLIST.some(blocked =>
                        lowerName.includes(blocked)
                    );
                    if (isBlocked) {
                        blockedAnimations.push(clip.name);
                    }
                });

                console.log('🚫 [Avatar] Blocked animations:', blockedAnimations);

                // ===== POSITION MODEL =====
                const box = new THREE.Box3().setFromObject(model);
                const size = box.getSize(new THREE.Vector3());
                const min = box.min;
                const max = box.max;

                const centerX = (min.x + max.x) / 2;
                const centerZ = (min.z + max.z) / 2;
                const feetOffset = -min.y;

                model.position.set(-centerX, feetOffset, -centerZ);

                scene.add(model);
                modelRef.current = model;

                // ===== CREATE CONTROLLER =====
                const controller = new AvatarController(model, {
                    autopilotEnabled: true,
                    idleIntensity: 1.0,  // Full intensity for visible movement
                    blinkIntervalMin: 2000,
                    blinkIntervalMax: 5000,
                });
                controllerRef.current = controller;

                // ===== CAMERA POSITIONING =====
                const newBox = new THREE.Box3().setFromObject(model);
                const modelHeight = newBox.max.y - newBox.min.y;

                let studioSettings: any = null;
                try {
                    const saved = localStorage.getItem('lia_avatar_settings');
                    if (saved) {
                        studioSettings = JSON.parse(saved);
                        console.log('📂 [Avatar] Loaded studio settings');
                    }
                } catch (e) { }

                let targetY: number;
                let distance: number;

                if (studioSettings) {
                    targetY = studioSettings.cameraHeight || modelHeight * 0.5;
                    distance = studioSettings.cameraDistance || 3;
                    const scale = studioSettings.modelScale || 1;
                    model.scale.setScalar(scale);
                    model.position.x = studioSettings.modelPositionX || 0;
                    camera.fov = studioSettings.cameraFov || 35;
                } else {
                    targetY = modelHeight * 0.5;
                    const fovRad = THREE.MathUtils.degToRad(camera.fov);
                    const visibleHeight = modelHeight * 1.15;
                    distance = (visibleHeight / 2) / Math.tan(fovRad / 2);
                }

                camera.position.set(0, targetY, distance);
                camera.lookAt(new THREE.Vector3(0, targetY, 0));
                camera.near = 0.1;
                camera.far = distance * 3;
                camera.updateProjectionMatrix();

                console.log(`🎥 [Avatar] Camera: Z=${distance.toFixed(2)}, Y=${targetY.toFixed(2)}`);
                console.log('✅ [Avatar] Setup complete - Controller ready');

                setLoaded(true);
            },
            (xhr) => {
                if (xhr.lengthComputable) {
                    const progress = Math.round((xhr.loaded / xhr.total) * 100);
                    setLoadProgress(progress);
                }
            },
            (err) => {
                console.error('❌ [Avatar] Load error:', err);
                setError('Failed to load model');
            }
        );

        // ===== RENDER LOOP =====
        let lastTime = performance.now();
        const animate = () => {
            const now = performance.now();
            const dt = (now - lastTime) / 1000;
            lastTime = now;

            // Tick controller (autopilot + active animations)
            controllerRef.current?.tick(dt);

            // Render
            if (rendererRef.current && sceneRef.current && cameraRef.current) {
                rendererRef.current.render(sceneRef.current, cameraRef.current);
            }

            rafIdRef.current = requestAnimationFrame(animate);
        };
        rafIdRef.current = requestAnimationFrame(animate);

        // ===== RESIZE HANDLER =====
        let resizeTimeout: ReturnType<typeof setTimeout>;
        const handleResize = () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                const w = window.innerWidth;
                const h = window.innerHeight;

                if (cameraRef.current && rendererRef.current) {
                    cameraRef.current.aspect = w / h;
                    cameraRef.current.updateProjectionMatrix();
                    rendererRef.current.setSize(w, h);
                }
            }, 100);
        };
        window.addEventListener('resize', handleResize);

        // ===== CLEANUP =====
        return () => {
            console.log('🔴 [Avatar] Cleanup');

            window.removeEventListener('resize', handleResize);
            clearTimeout(resizeTimeout);

            if (rafIdRef.current !== null) {
                cancelAnimationFrame(rafIdRef.current);
            }

            if (rendererRef.current) {
                rendererRef.current.dispose();
                if (container && rendererRef.current.domElement.parentNode === container) {
                    container.removeChild(rendererRef.current.domElement);
                }
            }

            if (modelRef.current) {
                modelRef.current.traverse((child) => {
                    if (child instanceof THREE.Mesh) {
                        child.geometry?.dispose();
                        const mat = child.material;
                        if (Array.isArray(mat)) {
                            mat.forEach(m => m.dispose());
                        } else if (mat) {
                            mat.dispose();
                        }
                    }
                });
            }

            sceneRef.current = null;
            cameraRef.current = null;
            rendererRef.current = null;
            modelRef.current = null;
            controllerRef.current = null;
            rafIdRef.current = null;
            isInitialized.current = false;
        };
    }, []);

    // =====================================================
    // RENDER
    // =====================================================
    return (
        <div
            ref={containerRef}
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 50,
                pointerEvents: 'none',
                opacity: visible ? 1 : 0,
                visibility: visible ? 'visible' : 'hidden',
                transition: 'opacity 0.3s ease',
                overflow: 'visible',
            }}
        >
            {/* Loading */}
            {!loaded && !error && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center text-white">
                        <div className="w-12 h-12 border-3 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                        <p className="text-sm opacity-70">Carregando LIA 3D...</p>
                        {loadProgress > 0 && <p className="text-xs opacity-50 mt-1">{loadProgress}%</p>}
                    </div>
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center text-red-400 bg-black/50 p-4 rounded-lg">
                        <p className="text-sm">❌ {error}</p>
                    </div>
                </div>
            )}

            {/* State indicator (debug) */}
            {loaded && (
                <div className="absolute top-4 left-4 text-xs text-white/50 font-mono bg-black/30 px-2 py-1 rounded">
                    {avatarState}
                </div>
            )}
        </div>
    );
}

export const AvatarLayer = memo(AvatarLayerComponent);
export default AvatarLayer;
