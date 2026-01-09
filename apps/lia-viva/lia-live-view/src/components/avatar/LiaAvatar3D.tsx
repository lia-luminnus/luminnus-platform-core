/**
 * LiaAvatar3D - Isolated 3D Avatar component
 * 
 * CRITICAL RULES (to prevent Maximum update depth exceeded):
 * - NO external dependencies (no LIAContext, no reactive props)
 * - ONE useEffect with EMPTY deps array
 * - All state via refs (no useState except for fallback)
 * - React.memo to prevent re-renders
 */

import React, { useEffect, useRef, useState, memo } from 'react';
import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

// =====================================================
// STATIC PROPS ONLY - No reactive state allowed
// =====================================================
export interface LiaAvatar3DProps {
    modelUrl?: string;
    className?: string;
    onFallback?: () => void;
}

// GLB path constant
const DEFAULT_MODEL_URL = '/avatar/Lia-Final-completa-1.glb';

function LiaAvatar3DComponent({
    modelUrl = DEFAULT_MODEL_URL,
    className = '',
    onFallback
}: LiaAvatar3DProps) {
    // Only reactive state: loading indicators
    const [loadFailed, setLoadFailed] = useState(false);
    const [loaded, setLoaded] = useState(false);

    // All Three.js resources in refs (never trigger re-render)
    const containerRef = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const modelRef = useRef<THREE.Group | null>(null);
    const rafIdRef = useRef<number | null>(null);
    const clockRef = useRef<THREE.Clock>(new THREE.Clock());
    const mixerRef = useRef<THREE.AnimationMixer | null>(null);
    const mountedRef = useRef(false);

    // =====================================================
    // SINGLE MOUNT EFFECT - NEVER RE-RUN
    // =====================================================
    useEffect(() => {
        // Prevent double mount in StrictMode
        if (mountedRef.current) return;
        mountedRef.current = true;

        console.log('🟢 [Avatar3D] Mounting - this should happen ONCE');

        const container = containerRef.current;
        if (!container) {
            console.error('❌ [Avatar3D] No container ref');
            return;
        }

        // Get container dimensions
        const rect = container.getBoundingClientRect();
        let width = rect.width || container.clientWidth || 600;
        let height = rect.height || container.clientHeight || 800;

        // Ensure minimum size
        if (width < 100) width = 600;
        if (height < 100) height = 800;

        console.log(`📏 [Avatar3D] Container: ${width}x${height}`);

        // ===== CREATE SCENE =====
        const scene = new THREE.Scene();
        scene.background = null; // Transparent
        sceneRef.current = scene;

        // ===== CREATE CAMERA (FIXED POSITION) =====
        const camera = new THREE.PerspectiveCamera(45, width / height, 0.01, 100);
        camera.position.set(0, 0.6, 3);
        camera.lookAt(0, 0.6, 0);
        cameraRef.current = camera;
        console.log(`🎥 [Avatar3D] Camera: pos=(0, 0.6, 3), fov=45, aspect=${(width / height).toFixed(2)}`);

        // ===== CREATE RENDERER =====
        const renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance'
        });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        container.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        // ===== LIGHTING =====
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 5, 5);
        scene.add(directionalLight);

        const fillLight = new THREE.DirectionalLight(0x4488ff, 0.3);
        fillLight.position.set(-3, 2, -3);
        scene.add(fillLight);

        // ===== LOAD GLB MODEL =====
        const loader = new GLTFLoader();
        console.log(`📦 [Avatar3D] Loading model: ${modelUrl}`);

        loader.load(
            modelUrl,
            (gltf: GLTF) => {
                const model = gltf.scene;

                // Calculate bounding box for centering
                const box = new THREE.Box3().setFromObject(model);
                const center = box.getCenter(new THREE.Vector3());
                const size = box.getSize(new THREE.Vector3());
                const sphere = box.getBoundingSphere(new THREE.Sphere());
                const radius = sphere.radius;

                console.log(`📏 [Avatar3D] bbox size: (${size.x.toFixed(2)}, ${size.y.toFixed(2)}, ${size.z.toFixed(2)}), radius: ${radius.toFixed(2)}`);

                // CENTER MODEL: Move to origin then offset Y to show full body
                model.position.sub(center);
                model.position.y += radius * 0.3; // Offset up to show body

                // Adjust camera to frame the model
                const fov = camera.fov * (Math.PI / 180);
                const cameraZ = (radius / Math.sin(fov / 2)) * 1.8; // Factor 1.8 for margin
                camera.position.set(0, center.y, cameraZ);
                camera.lookAt(0, center.y, 0);
                camera.updateProjectionMatrix();

                console.log(`🎥 [Avatar3D] Camera adjusted: Z=${cameraZ.toFixed(2)}, lookAt Y=${center.y.toFixed(2)}`);

                scene.add(model);
                modelRef.current = model;

                // Setup animation mixer if animations exist
                if (gltf.animations.length > 0) {
                    mixerRef.current = new THREE.AnimationMixer(model);
                    const action = mixerRef.current.clipAction(gltf.animations[0]);
                    action.play();
                    console.log(`🎬 [Avatar3D] Playing animation: ${gltf.animations[0].name}`);
                }

                console.log('✅ [Avatar3D] GLB loaded successfully');
                setLoaded(true);
            },
            undefined,
            (error: unknown) => {
                console.error('❌ [Avatar3D] Failed to load GLB:', error);
                setLoadFailed(true);
                if (onFallback) onFallback();
            }
        );

        // ===== RENDER LOOP (RAF) =====
        const animate = () => {
            const delta = clockRef.current.getDelta();

            // Update animation mixer
            if (mixerRef.current) {
                mixerRef.current.update(delta);
            }

            // Render
            if (rendererRef.current && sceneRef.current && cameraRef.current) {
                rendererRef.current.render(sceneRef.current, cameraRef.current);
            }

            rafIdRef.current = requestAnimationFrame(animate);
        };

        rafIdRef.current = requestAnimationFrame(animate);

        // ===== RESIZE HANDLER (DEBOUNCED) =====
        let resizeTimeout: ReturnType<typeof setTimeout>;
        const handleResize = () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;

                const rect = containerRef.current.getBoundingClientRect();
                const w = rect.width || 600;
                const h = rect.height || 800;

                if (w > 0 && h > 0) {
                    cameraRef.current.aspect = w / h;
                    cameraRef.current.updateProjectionMatrix();
                    rendererRef.current.setSize(w, h, false);
                }
            }, 150); // Debounce 150ms
        };

        let resizeObserver: ResizeObserver | null = null;
        if (container) {
            resizeObserver = new ResizeObserver(handleResize);
            resizeObserver.observe(container);
        }

        // ===== CLEANUP ON UNMOUNT =====
        return () => {
            console.log('🔴 [Avatar3D] Unmounting component');

            clearTimeout(resizeTimeout);
            if (resizeObserver) resizeObserver.disconnect();

            if (rafIdRef.current !== null) {
                cancelAnimationFrame(rafIdRef.current);
                rafIdRef.current = null;
            }

            if (rendererRef.current) {
                rendererRef.current.dispose();
                if (container && rendererRef.current.domElement) {
                    container.removeChild(rendererRef.current.domElement);
                }
                rendererRef.current = null;
            }

            if (modelRef.current) {
                modelRef.current.traverse((child: THREE.Object3D) => {
                    if (child instanceof THREE.Mesh) {
                        child.geometry?.dispose();
                        if (child.material) {
                            if (Array.isArray(child.material)) {
                                child.material.forEach((m: THREE.Material) => m.dispose());
                            } else {
                                child.material.dispose();
                            }
                        }
                    }
                });
                modelRef.current = null;
            }

            sceneRef.current = null;
            cameraRef.current = null;

            console.log('🧹 [Avatar3D] Cleanup complete');
        };
    }, []); // CRITICAL: Empty deps - NEVER re-run

    return (
        <div
            ref={containerRef}
            className={`relative w-full h-full ${className}`}
            style={{
                minHeight: '600px',
                minWidth: '400px',
                position: 'relative',
                zIndex: 10
            }}
        >
            {/* Loading state */}
            {!loaded && !loadFailed && (
                <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                    <div className="text-center">
                        <div className="animate-spin w-8 h-8 border-2 border-[#00f3ff] border-t-transparent rounded-full mx-auto mb-2"></div>
                        <p className="text-sm">Carregando avatar 3D...</p>
                    </div>
                </div>
            )}

            {/* Error state */}
            {loadFailed && (
                <div className="absolute inset-0 flex items-center justify-center text-red-400">
                    <div className="text-center">
                        <p className="text-sm">❌ Erro ao carregar avatar 3D</p>
                        <p className="text-xs opacity-70">Usando avatar alternativo</p>
                    </div>
                </div>
            )}
        </div>
    );
}

// CRITICAL: React.memo to prevent ANY re-renders from parent
export const LiaAvatar3D = memo(LiaAvatar3DComponent);
export default LiaAvatar3D;

// Export types for compatibility
export type LiaAvatarMode = 'idle' | 'listening' | 'thinking' | 'talking';
