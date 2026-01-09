/**
 * AvatarStudio3D.tsx - Complete 3D Avatar Editor
 * 
 * FEATURES:
 * - Load GLB/GLTF/FBX models
 * - Camera controls (distance, height, rotation)
 * - Lighting controls (intensity, color, position)
 * - Position presets (center, left, right)
 * - Visual filters (brightness, contrast, saturation)
 * - Animation controls
 * - Auto-fit and Reset View
 * - Publish settings
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
    Camera,
    Sun,
    Move,
    Sliders,
    Play,
    RotateCcw,
    Upload,
    Check,
    Maximize,
    Palette,
    Sparkles,
    Eye,
    ZoomIn,
    ZoomOut,
    ArrowUp,
    ArrowDown,
    Circle,
    Hand,
    Smile,
    ThumbsUp,
    ThumbsDown
} from 'lucide-react';
import { AvatarController } from '@/avatar/AvatarController';

// =====================================================
// TYPES
// =====================================================
interface AvatarSettings {
    // Camera
    cameraDistance: number;
    cameraHeight: number;
    cameraFov: number;

    // Position
    modelPositionX: number;
    modelPositionY: number;
    modelScale: number;

    // Lighting
    ambientIntensity: number;
    keyLightIntensity: number;
    keyLightColor: string;
    fillLightIntensity: number;
    rimLightIntensity: number;
    rimLightColor: string;

    // Filters (post-processing via CSS)
    brightness: number;
    contrast: number;
    saturation: number;

    // Animation
    currentAnimation: string;
    animationSpeed: number;
}

const DEFAULT_SETTINGS: AvatarSettings = {
    cameraDistance: 3,
    cameraHeight: 0.8,
    cameraFov: 35,
    modelPositionX: 0,
    modelPositionY: 0,
    modelScale: 1,
    ambientIntensity: 0.8,
    keyLightIntensity: 2.0,
    keyLightColor: '#ffffff',
    fillLightIntensity: 1.2,
    rimLightIntensity: 0.8,
    rimLightColor: '#00f3ff',
    brightness: 100,
    contrast: 100,
    saturation: 100,
    currentAnimation: '',
    animationSpeed: 1,
};

const POSITION_PRESETS = [
    { name: 'Centro', x: 0, y: 0 },
    { name: 'Esquerda', x: -0.5, y: 0 },
    { name: 'Direita', x: 0.5, y: 0 },
    { name: 'Cima', x: 0, y: 0.3 },
    { name: 'Baixo', x: 0, y: -0.3 },
];

// =====================================================
// COMPONENT
// =====================================================
export default function AvatarStudio3D() {
    // Refs
    const containerRef = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const controlsRef = useRef<OrbitControls | null>(null);
    const modelRef = useRef<THREE.Group | null>(null);
    const mixerRef = useRef<THREE.AnimationMixer | null>(null);
    const clockRef = useRef<THREE.Clock>(new THREE.Clock());
    const rafIdRef = useRef<number | null>(null);
    const lightsRef = useRef<{
        ambient: THREE.AmbientLight | null;
        key: THREE.DirectionalLight | null;
        fill: THREE.DirectionalLight | null;
        rim: THREE.DirectionalLight | null;
    }>({ ambient: null, key: null, fill: null, rim: null });
    const animActionsRef = useRef<Map<string, THREE.AnimationAction>>(new Map());
    const controllerRef = useRef<AvatarController | null>(null);

    // State
    const [settings, setSettings] = useState<AvatarSettings>(DEFAULT_SETTINGS);
    const [animations, setAnimations] = useState<string[]>([]);
    const [modelLoaded, setModelLoaded] = useState(false);
    const [loadProgress, setLoadProgress] = useState(0);
    const [status, setStatus] = useState('Carregue um modelo GLB/FBX ou use o modelo padrão');
    const [activeTab, setActiveTab] = useState<'camera' | 'position' | 'lighting' | 'filters' | 'animation' | 'gestures'>('camera');
    const [gestureLog, setGestureLog] = useState<string[]>([]);
    const [availableGestures, setAvailableGestures] = useState<string[]>([]);

    // Model info
    const [modelInfo, setModelInfo] = useState<{
        name: string;
        vertices: number;
        triangles: number;
        height: number;
    } | null>(null);

    // Helper to add gesture log
    const addGestureLog = useCallback((message: string) => {
        const timestamp = new Date().toLocaleTimeString();
        setGestureLog(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 19)]);
    }, []);

    // =====================================================
    // INITIALIZE SCENE
    // =====================================================
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        // Scene
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0a0a12);
        sceneRef.current = scene;

        // Camera
        const camera = new THREE.PerspectiveCamera(
            settings.cameraFov,
            container.clientWidth / container.clientHeight,
            0.1,
            100
        );
        camera.position.set(0, settings.cameraHeight, settings.cameraDistance);
        cameraRef.current = camera;

        // Renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.2;
        container.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        // Controls
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.minDistance = 0.5;
        controls.maxDistance = 10;
        controlsRef.current = controls;

        // Lights
        const ambient = new THREE.AmbientLight(0xffffff, settings.ambientIntensity);
        scene.add(ambient);
        lightsRef.current.ambient = ambient;

        const keyLight = new THREE.DirectionalLight(0xffffff, settings.keyLightIntensity);
        keyLight.position.set(3, 8, 5);
        scene.add(keyLight);
        lightsRef.current.key = keyLight;

        const fillLight = new THREE.DirectionalLight(0xaaccff, settings.fillLightIntensity);
        fillLight.position.set(-5, 4, 3);
        scene.add(fillLight);
        lightsRef.current.fill = fillLight;

        const rimLight = new THREE.DirectionalLight(0x00f3ff, settings.rimLightIntensity);
        rimLight.position.set(0, 5, -8);
        scene.add(rimLight);
        lightsRef.current.rim = rimLight;

        // Grid helper
        const grid = new THREE.GridHelper(10, 20, 0x333333, 0x222222);
        scene.add(grid);

        // Animation loop
        const animate = () => {
            const delta = clockRef.current.getDelta();

            if (mixerRef.current) {
                mixerRef.current.update(delta * settings.animationSpeed);
            }

            // Update avatar controller (for gestures/idle)
            if (controllerRef.current) {
                controllerRef.current.tick(delta);
            }

            controls.update();
            renderer.render(scene, camera);
            rafIdRef.current = requestAnimationFrame(animate);
        };
        rafIdRef.current = requestAnimationFrame(animate);

        // Resize
        const handleResize = () => {
            if (!container || !camera || !renderer) return;
            camera.aspect = container.clientWidth / container.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(container.clientWidth, container.clientHeight);
        };
        window.addEventListener('resize', handleResize);

        // Load default model
        loadModel('/avatar/Lia-Final-completa-1.glb');

        return () => {
            window.removeEventListener('resize', handleResize);
            if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
            controls.dispose();
            renderer.dispose();
            if (container.contains(renderer.domElement)) {
                container.removeChild(renderer.domElement);
            }
        };
    }, []);

    // =====================================================
    // LOAD MODEL
    // =====================================================
    const loadModel = useCallback(async (url: string) => {
        const scene = sceneRef.current;
        if (!scene) return;

        setStatus('Carregando modelo...');
        setLoadProgress(0);

        // Remove old model
        if (modelRef.current) {
            scene.remove(modelRef.current);
            modelRef.current.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    child.geometry?.dispose();
                    const mat = child.material;
                    if (Array.isArray(mat)) mat.forEach(m => m.dispose());
                    else if (mat) mat.dispose();
                }
            });
        }
        animActionsRef.current.clear();
        setAnimations([]);

        const isGLB = url.toLowerCase().endsWith('.glb') || url.toLowerCase().endsWith('.gltf');
        const isFBX = url.toLowerCase().endsWith('.fbx');

        try {
            let model: THREE.Group;
            let anims: THREE.AnimationClip[] = [];

            if (isGLB) {
                const loader = new GLTFLoader();
                const gltf = await new Promise<GLTF>((resolve, reject) => {
                    loader.load(
                        url,
                        resolve,
                        (xhr) => {
                            if (xhr.lengthComputable) {
                                setLoadProgress(Math.round((xhr.loaded / xhr.total) * 100));
                            }
                        },
                        reject
                    );
                });
                model = gltf.scene;
                anims = gltf.animations;
            } else if (isFBX) {
                const loader = new FBXLoader();
                const fbx = await new Promise<THREE.Group>((resolve, reject) => {
                    loader.load(
                        url,
                        resolve,
                        (xhr) => {
                            if (xhr.lengthComputable) {
                                setLoadProgress(Math.round((xhr.loaded / xhr.total) * 100));
                            }
                        },
                        reject
                    );
                });
                model = fbx;
                anims = (fbx as any).animations || [];
            } else {
                throw new Error('Formato não suportado. Use GLB, GLTF ou FBX.');
            }

            // Calculate bounds
            const box = new THREE.Box3().setFromObject(model);
            const size = box.getSize(new THREE.Vector3());
            const center = box.getCenter(new THREE.Vector3());

            // Position model (feet at y=0)
            model.position.set(-center.x, -box.min.y, -center.z);

            scene.add(model);
            modelRef.current = model;

            // Model info
            let verts = 0, tris = 0;
            model.traverse((child) => {
                if (child instanceof THREE.Mesh && child.geometry) {
                    verts += child.geometry.attributes.position?.count || 0;
                    tris += (child.geometry.index?.count || child.geometry.attributes.position?.count || 0) / 3;
                }
            });

            setModelInfo({
                name: url.split('/').pop() || 'Model',
                vertices: verts,
                triangles: Math.floor(tris),
                height: size.y,
            });

            // Animations - register but DON'T auto-play (gestures need bone control)
            if (anims.length > 0) {
                const mixer = new THREE.AnimationMixer(model);
                mixerRef.current = mixer;

                const animNames: string[] = [];
                anims.forEach((clip) => {
                    const action = mixer.clipAction(clip);
                    animActionsRef.current.set(clip.name, action);
                    animNames.push(clip.name);
                });
                setAnimations(animNames);

                // DON'T auto-play - let gestures control bones directly
                // User can manually select an animation if needed
                console.log('🎬 [Studio] Animations available:', animNames.length);
                console.log('ℹ️ [Studio] Animations NOT playing to allow gesture control');
            }

            // Auto-fit camera
            autoFitCamera();

            // Create AvatarController for gesture testing (autopilot DISABLED for clean testing)
            const controller = new AvatarController(model, {
                autopilotEnabled: false,  // DISABLED to test gestures without interference
                idleIntensity: 0.0,
            });
            controllerRef.current = controller;

            // Get available gestures
            const caps = Array.from(controller.getCapabilities());
            setAvailableGestures(caps);
            console.log('🎭 [Studio] Controller created, gestures:', caps);

            setModelLoaded(true);
            setStatus(`✅ Modelo carregado: ${url.split('/').pop()}`);

        } catch (error: any) {
            console.error('Load error:', error);
            setStatus(`❌ Erro: ${error.message}`);
        }
    }, []);

    // =====================================================
    // AUTO FIT CAMERA
    // =====================================================
    const autoFitCamera = useCallback(() => {
        if (!modelRef.current || !cameraRef.current || !controlsRef.current) return;

        const box = new THREE.Box3().setFromObject(modelRef.current);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());

        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = cameraRef.current.fov * (Math.PI / 180);
        const distance = maxDim / (2 * Math.tan(fov / 2)) * 1.5;

        cameraRef.current.position.set(0, center.y, distance);
        controlsRef.current.target.set(0, center.y, 0);
        controlsRef.current.update();

        setSettings(s => ({
            ...s,
            cameraDistance: distance,
            cameraHeight: center.y,
        }));
    }, []);

    // =====================================================
    // UPDATE HANDLERS
    // =====================================================
    const updateSetting = <K extends keyof AvatarSettings>(key: K, value: AvatarSettings[K]) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    // Apply camera settings
    useEffect(() => {
        if (!cameraRef.current || !controlsRef.current) return;

        cameraRef.current.fov = settings.cameraFov;
        cameraRef.current.position.z = settings.cameraDistance;
        cameraRef.current.position.y = settings.cameraHeight;
        cameraRef.current.updateProjectionMatrix();
        controlsRef.current.update();
    }, [settings.cameraDistance, settings.cameraHeight, settings.cameraFov]);

    // Apply model position/scale
    useEffect(() => {
        if (!modelRef.current || !modelLoaded) return;
        modelRef.current.position.x = settings.modelPositionX;
        // Y is handled by feet at 0 + offset
        modelRef.current.scale.setScalar(settings.modelScale);
    }, [settings.modelPositionX, settings.modelScale, modelLoaded]);

    // Apply lighting
    useEffect(() => {
        const { ambient, key, fill, rim } = lightsRef.current;
        if (ambient) ambient.intensity = settings.ambientIntensity;
        if (key) {
            key.intensity = settings.keyLightIntensity;
            key.color.set(settings.keyLightColor);
        }
        if (fill) fill.intensity = settings.fillLightIntensity;
        if (rim) {
            rim.intensity = settings.rimLightIntensity;
            rim.color.set(settings.rimLightColor);
        }
    }, [
        settings.ambientIntensity,
        settings.keyLightIntensity,
        settings.keyLightColor,
        settings.fillLightIntensity,
        settings.rimLightIntensity,
        settings.rimLightColor,
    ]);

    // Play animation
    useEffect(() => {
        if (!mixerRef.current) return;

        // Stop all
        animActionsRef.current.forEach((action) => {
            action.fadeOut(0.3);
        });

        // Play selected
        const action = animActionsRef.current.get(settings.currentAnimation);
        if (action) {
            action.reset();
            action.fadeIn(0.3);
            action.play();
        }
    }, [settings.currentAnimation]);

    // =====================================================
    // FILE UPLOAD
    // =====================================================
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const url = URL.createObjectURL(file);
        loadModel(url);
    };

    // =====================================================
    // PUBLISH
    // =====================================================
    const handlePublish = () => {
        try {
            // Save settings to localStorage
            localStorage.setItem('lia_avatar_settings', JSON.stringify(settings));
            setStatus('✅ Configurações publicadas! Serão aplicadas no Live Mode.');

            // Visual feedback
            alert('✅ Configurações salvas com sucesso!\n\nAs configurações serão aplicadas no Live Mode na próxima vez que você ativar a chamada de voz.');
        } catch (error) {
            setStatus('❌ Erro ao salvar configurações');
            alert('Erro ao salvar configurações. Tente novamente.');
        }
    };

    // =====================================================
    // RENDER
    // =====================================================
    const filterStyle = {
        filter: `brightness(${settings.brightness}%) contrast(${settings.contrast}%) saturate(${settings.saturation}%)`,
    };

    return (
        <div className="min-h-screen bg-[#0a0a12] text-white">
            {/* Header */}
            <div className="border-b border-[#222] bg-[#111] px-6 py-4">
                <div className="flex items-center justify-between max-w-7xl mx-auto">
                    <div>
                        <h1 className="text-2xl font-bold bg-gradient-to-r from-[#00f3ff] to-[#bc13fe] bg-clip-text text-transparent">
                            Avatar Studio 3D
                        </h1>
                        <p className="text-sm text-gray-400 mt-1">{status}</p>
                    </div>

                    <div className="flex gap-3">
                        <label className="px-4 py-2 rounded-lg bg-[#222] border border-[#333] hover:bg-[#333] cursor-pointer flex items-center gap-2">
                            <Upload className="w-4 h-4" />
                            Carregar Modelo
                            <input
                                type="file"
                                accept=".glb,.gltf,.fbx"
                                onChange={handleFileUpload}
                                className="hidden"
                            />
                        </label>

                        <button
                            onClick={handlePublish}
                            className="px-6 py-2 rounded-lg bg-gradient-to-r from-[#00f3ff] to-[#bc13fe] font-semibold flex items-center gap-2 hover:opacity-90"
                        >
                            <Check className="w-4 h-4" />
                            Publicar
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex max-w-7xl mx-auto">
                {/* Sidebar - Controls */}
                <div className="w-80 border-r border-[#222] bg-[#111] p-4 space-y-4 h-[calc(100vh-80px)] overflow-y-auto">
                    {/* Tabs */}
                    <div className="flex flex-wrap gap-2">
                        {[
                            { id: 'camera', icon: Camera, label: 'Câmera' },
                            { id: 'position', icon: Move, label: 'Posição' },
                            { id: 'lighting', icon: Sun, label: 'Luz' },
                            { id: 'filters', icon: Palette, label: 'Filtros' },
                            { id: 'animation', icon: Play, label: 'Animação' },
                            { id: 'gestures', icon: Hand, label: 'Gestos' },
                        ].map(({ id, icon: Icon, label }) => (
                            <button
                                key={id}
                                onClick={() => setActiveTab(id as any)}
                                className={`px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${activeTab === id
                                    ? 'bg-[#00f3ff]/20 text-[#00f3ff] border border-[#00f3ff]/30'
                                    : 'bg-[#222] border border-[#333] hover:bg-[#333]'
                                    }`}
                            >
                                <Icon className="w-4 h-4" />
                                {label}
                            </button>
                        ))}
                    </div>

                    {/* Camera Controls */}
                    {activeTab === 'camera' && (
                        <div className="space-y-4 p-4 bg-[#1a1a2e] rounded-xl">
                            <h3 className="font-semibold text-[#00f3ff]">📷 Câmera</h3>

                            <div>
                                <label className="text-xs text-gray-400 flex justify-between">
                                    <span>Distância</span>
                                    <span>{settings.cameraDistance.toFixed(1)}</span>
                                </label>
                                <input
                                    type="range"
                                    min="0.5"
                                    max="10"
                                    step="0.1"
                                    value={settings.cameraDistance}
                                    onChange={(e) => updateSetting('cameraDistance', parseFloat(e.target.value))}
                                    className="w-full accent-[#00f3ff]"
                                />
                            </div>

                            <div>
                                <label className="text-xs text-gray-400 flex justify-between">
                                    <span>Altura</span>
                                    <span>{settings.cameraHeight.toFixed(2)}</span>
                                </label>
                                <input
                                    type="range"
                                    min="0"
                                    max="3"
                                    step="0.05"
                                    value={settings.cameraHeight}
                                    onChange={(e) => updateSetting('cameraHeight', parseFloat(e.target.value))}
                                    className="w-full accent-[#00f3ff]"
                                />
                            </div>

                            <div>
                                <label className="text-xs text-gray-400 flex justify-between">
                                    <span>FOV</span>
                                    <span>{settings.cameraFov}°</span>
                                </label>
                                <input
                                    type="range"
                                    min="20"
                                    max="90"
                                    step="1"
                                    value={settings.cameraFov}
                                    onChange={(e) => updateSetting('cameraFov', parseInt(e.target.value))}
                                    className="w-full accent-[#00f3ff]"
                                />
                            </div>

                            <button
                                onClick={autoFitCamera}
                                className="w-full py-2 rounded-lg bg-[#222] border border-[#333] hover:bg-[#333] flex items-center justify-center gap-2"
                            >
                                <Maximize className="w-4 h-4" />
                                Auto-Fit
                            </button>
                        </div>
                    )}

                    {/* Position Controls */}
                    {activeTab === 'position' && (
                        <div className="space-y-4 p-4 bg-[#1a1a2e] rounded-xl">
                            <h3 className="font-semibold text-[#00f3ff]">📍 Posição</h3>

                            <div className="grid grid-cols-3 gap-2">
                                {POSITION_PRESETS.map((preset) => (
                                    <button
                                        key={preset.name}
                                        onClick={() => {
                                            updateSetting('modelPositionX', preset.x);
                                            updateSetting('modelPositionY', preset.y);
                                        }}
                                        className="px-2 py-2 rounded-lg bg-[#222] border border-[#333] hover:bg-[#333] text-xs"
                                    >
                                        {preset.name}
                                    </button>
                                ))}
                            </div>

                            <div>
                                <label className="text-xs text-gray-400 flex justify-between">
                                    <span>Posição X</span>
                                    <span>{settings.modelPositionX.toFixed(2)}</span>
                                </label>
                                <input
                                    type="range"
                                    min="-2"
                                    max="2"
                                    step="0.05"
                                    value={settings.modelPositionX}
                                    onChange={(e) => updateSetting('modelPositionX', parseFloat(e.target.value))}
                                    className="w-full accent-[#00f3ff]"
                                />
                            </div>

                            <div>
                                <label className="text-xs text-gray-400 flex justify-between">
                                    <span>Escala</span>
                                    <span>{settings.modelScale.toFixed(2)}x</span>
                                </label>
                                <input
                                    type="range"
                                    min="0.1"
                                    max="3"
                                    step="0.05"
                                    value={settings.modelScale}
                                    onChange={(e) => updateSetting('modelScale', parseFloat(e.target.value))}
                                    className="w-full accent-[#00f3ff]"
                                />
                            </div>
                        </div>
                    )}

                    {/* Lighting Controls */}
                    {activeTab === 'lighting' && (
                        <div className="space-y-4 p-4 bg-[#1a1a2e] rounded-xl">
                            <h3 className="font-semibold text-[#00f3ff]">💡 Iluminação</h3>

                            <div>
                                <label className="text-xs text-gray-400 flex justify-between">
                                    <span>Ambiente</span>
                                    <span>{settings.ambientIntensity.toFixed(1)}</span>
                                </label>
                                <input
                                    type="range"
                                    min="0"
                                    max="3"
                                    step="0.1"
                                    value={settings.ambientIntensity}
                                    onChange={(e) => updateSetting('ambientIntensity', parseFloat(e.target.value))}
                                    className="w-full accent-[#00f3ff]"
                                />
                            </div>

                            <div>
                                <label className="text-xs text-gray-400 flex justify-between">
                                    <span>Luz Principal</span>
                                    <span>{settings.keyLightIntensity.toFixed(1)}</span>
                                </label>
                                <input
                                    type="range"
                                    min="0"
                                    max="5"
                                    step="0.1"
                                    value={settings.keyLightIntensity}
                                    onChange={(e) => updateSetting('keyLightIntensity', parseFloat(e.target.value))}
                                    className="w-full accent-[#00f3ff]"
                                />
                                <input
                                    type="color"
                                    value={settings.keyLightColor}
                                    onChange={(e) => updateSetting('keyLightColor', e.target.value)}
                                    className="w-full h-8 mt-2 rounded cursor-pointer"
                                />
                            </div>

                            <div>
                                <label className="text-xs text-gray-400 flex justify-between">
                                    <span>Luz de Preenchimento</span>
                                    <span>{settings.fillLightIntensity.toFixed(1)}</span>
                                </label>
                                <input
                                    type="range"
                                    min="0"
                                    max="3"
                                    step="0.1"
                                    value={settings.fillLightIntensity}
                                    onChange={(e) => updateSetting('fillLightIntensity', parseFloat(e.target.value))}
                                    className="w-full accent-[#00f3ff]"
                                />
                            </div>

                            <div>
                                <label className="text-xs text-gray-400 flex justify-between">
                                    <span>Luz de Borda (Rim)</span>
                                    <span>{settings.rimLightIntensity.toFixed(1)}</span>
                                </label>
                                <input
                                    type="range"
                                    min="0"
                                    max="3"
                                    step="0.1"
                                    value={settings.rimLightIntensity}
                                    onChange={(e) => updateSetting('rimLightIntensity', parseFloat(e.target.value))}
                                    className="w-full accent-[#00f3ff]"
                                />
                                <input
                                    type="color"
                                    value={settings.rimLightColor}
                                    onChange={(e) => updateSetting('rimLightColor', e.target.value)}
                                    className="w-full h-8 mt-2 rounded cursor-pointer"
                                />
                            </div>
                        </div>
                    )}

                    {/* Filters */}
                    {activeTab === 'filters' && (
                        <div className="space-y-4 p-4 bg-[#1a1a2e] rounded-xl">
                            <h3 className="font-semibold text-[#00f3ff]">🎨 Filtros Visuais</h3>

                            <div>
                                <label className="text-xs text-gray-400 flex justify-between">
                                    <span>Brilho</span>
                                    <span>{settings.brightness}%</span>
                                </label>
                                <input
                                    type="range"
                                    min="50"
                                    max="150"
                                    step="1"
                                    value={settings.brightness}
                                    onChange={(e) => updateSetting('brightness', parseInt(e.target.value))}
                                    className="w-full accent-[#00f3ff]"
                                />
                            </div>

                            <div>
                                <label className="text-xs text-gray-400 flex justify-between">
                                    <span>Contraste</span>
                                    <span>{settings.contrast}%</span>
                                </label>
                                <input
                                    type="range"
                                    min="50"
                                    max="150"
                                    step="1"
                                    value={settings.contrast}
                                    onChange={(e) => updateSetting('contrast', parseInt(e.target.value))}
                                    className="w-full accent-[#00f3ff]"
                                />
                            </div>

                            <div>
                                <label className="text-xs text-gray-400 flex justify-between">
                                    <span>Saturação</span>
                                    <span>{settings.saturation}%</span>
                                </label>
                                <input
                                    type="range"
                                    min="0"
                                    max="200"
                                    step="1"
                                    value={settings.saturation}
                                    onChange={(e) => updateSetting('saturation', parseInt(e.target.value))}
                                    className="w-full accent-[#00f3ff]"
                                />
                            </div>

                            <button
                                onClick={() => {
                                    updateSetting('brightness', 100);
                                    updateSetting('contrast', 100);
                                    updateSetting('saturation', 100);
                                }}
                                className="w-full py-2 rounded-lg bg-[#222] border border-[#333] hover:bg-[#333]"
                            >
                                Resetar Filtros
                            </button>
                        </div>
                    )}

                    {/* Animation Controls */}
                    {activeTab === 'animation' && (
                        <div className="space-y-4 p-4 bg-[#1a1a2e] rounded-xl">
                            <h3 className="font-semibold text-[#00f3ff]">🎬 Animações</h3>

                            {animations.length === 0 ? (
                                <p className="text-sm text-gray-400">Nenhuma animação encontrada</p>
                            ) : (
                                <div className="space-y-2">
                                    {animations.map((name) => (
                                        <button
                                            key={name}
                                            onClick={() => updateSetting('currentAnimation', name)}
                                            className={`w-full px-3 py-2 rounded-lg text-left text-sm ${settings.currentAnimation === name
                                                ? 'bg-[#00f3ff]/20 text-[#00f3ff] border border-[#00f3ff]/30'
                                                : 'bg-[#222] border border-[#333] hover:bg-[#333]'
                                                }`}
                                        >
                                            {name}
                                        </button>
                                    ))}
                                </div>
                            )}

                            <div>
                                <label className="text-xs text-gray-400 flex justify-between">
                                    <span>Velocidade</span>
                                    <span>{settings.animationSpeed.toFixed(1)}x</span>
                                </label>
                                <input
                                    type="range"
                                    min="0.1"
                                    max="3"
                                    step="0.1"
                                    value={settings.animationSpeed}
                                    onChange={(e) => updateSetting('animationSpeed', parseFloat(e.target.value))}
                                    className="w-full accent-[#00f3ff]"
                                />
                            </div>
                        </div>
                    )}

                    {/* Gesture Controls */}
                    {activeTab === 'gestures' && (
                        <div className="space-y-4 p-4 bg-[#1a1a2e] rounded-xl">
                            <h3 className="font-semibold text-[#00f3ff]">🎭 Teste de Gestos</h3>

                            {!controllerRef.current ? (
                                <p className="text-sm text-yellow-400">Carregue um modelo primeiro</p>
                            ) : (
                                <>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={async () => {
                                                const r = await controllerRef.current?.perform('wave');
                                                addGestureLog(`Acenar: ${r?.ok ? '✅' : '❌ ' + (r as any)?.reason}`);
                                            }}
                                            className="px-3 py-3 rounded-lg bg-[#222] border border-[#333] hover:bg-[#00f3ff]/20 hover:border-[#00f3ff] flex items-center justify-center gap-2"
                                        >
                                            <Hand className="w-5 h-5" />
                                            Acenar
                                        </button>

                                        <button
                                            onClick={async () => {
                                                const r = await controllerRef.current?.perform('nod');
                                                addGestureLog(`Sim: ${r?.ok ? '✅' : '❌ ' + (r as any)?.reason}`);
                                            }}
                                            className="px-3 py-3 rounded-lg bg-[#222] border border-[#333] hover:bg-[#00f3ff]/20 hover:border-[#00f3ff] flex items-center justify-center gap-2"
                                        >
                                            <ThumbsUp className="w-5 h-5" />
                                            Sim (Cabeça)
                                        </button>

                                        <button
                                            onClick={async () => {
                                                const r = await controllerRef.current?.perform('shake_head');
                                                addGestureLog(`Não: ${r?.ok ? '✅' : '❌ ' + (r as any)?.reason}`);
                                            }}
                                            className="px-3 py-3 rounded-lg bg-[#222] border border-[#333] hover:bg-[#00f3ff]/20 hover:border-[#00f3ff] flex items-center justify-center gap-2"
                                        >
                                            <ThumbsDown className="w-5 h-5" />
                                            Não (Cabeça)
                                        </button>

                                        <button
                                            onClick={async () => {
                                                const r = await controllerRef.current?.perform('blink');
                                                addGestureLog(`Piscar: ${r?.ok ? '✅' : '❌ ' + (r as any)?.reason}`);
                                            }}
                                            className="px-3 py-3 rounded-lg bg-[#222] border border-[#333] hover:bg-[#00f3ff]/20 hover:border-[#00f3ff] flex items-center justify-center gap-2"
                                        >
                                            <Eye className="w-5 h-5" />
                                            Piscar
                                        </button>

                                        <button
                                            onClick={async () => {
                                                const r = await controllerRef.current?.perform('smile', { intensity: 0.8 });
                                                addGestureLog(`Sorrir: ${r?.ok ? '✅' : '❌ ' + (r as any)?.reason}`);
                                            }}
                                            className="px-3 py-3 rounded-lg bg-[#222] border border-[#333] hover:bg-[#00f3ff]/20 hover:border-[#00f3ff] flex items-center justify-center gap-2"
                                        >
                                            <Smile className="w-5 h-5" />
                                            Sorrir
                                        </button>

                                        <button
                                            onClick={async () => {
                                                const r = await controllerRef.current?.perform('look_at', { target: { x: 0.5, y: 0, z: 1 } });
                                                addGestureLog(`Olhar: ${r?.ok ? '✅' : '❌ ' + (r as any)?.reason}`);
                                            }}
                                            className="px-3 py-3 rounded-lg bg-[#222] border border-[#333] hover:bg-[#00f3ff]/20 hover:border-[#00f3ff] flex items-center justify-center gap-2"
                                        >
                                            <Eye className="w-5 h-5" />
                                            Olhar
                                        </button>
                                    </div>

                                    {/* Available gestures */}
                                    <div className="mt-4">
                                        <p className="text-xs text-gray-400 mb-2">Gestos disponíveis:</p>
                                        <div className="flex flex-wrap gap-1">
                                            {availableGestures.map(g => (
                                                <span key={g} className="px-2 py-1 bg-[#00f3ff]/20 text-[#00f3ff] rounded text-xs">{g}</span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Log */}
                                    <div className="mt-4">
                                        <p className="text-xs text-gray-400 mb-2">Log:</p>
                                        <div className="bg-[#0a0a12] rounded-lg p-2 h-32 overflow-y-auto text-xs font-mono">
                                            {gestureLog.length === 0 ? (
                                                <span className="text-gray-500">Clique em um botão para testar...</span>
                                            ) : (
                                                gestureLog.map((log, i) => (
                                                    <div key={i} className="text-gray-300">{log}</div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* Model Info */}
                    {modelInfo && (
                        <div className="p-4 bg-[#1a1a2e] rounded-xl text-xs space-y-1">
                            <h3 className="font-semibold text-[#00f3ff] mb-2">📊 Info do Modelo</h3>
                            <p><span className="text-gray-400">Nome:</span> {modelInfo.name}</p>
                            <p><span className="text-gray-400">Vértices:</span> {modelInfo.vertices.toLocaleString()}</p>
                            <p><span className="text-gray-400">Triângulos:</span> {modelInfo.triangles.toLocaleString()}</p>
                            <p><span className="text-gray-400">Altura:</span> {modelInfo.height.toFixed(2)}m</p>
                        </div>
                    )}

                    {/* Reset All */}
                    <button
                        onClick={() => {
                            setSettings(DEFAULT_SETTINGS);
                            autoFitCamera();
                        }}
                        className="w-full py-3 rounded-lg bg-[#222] border border-[#333] hover:bg-[#333] flex items-center justify-center gap-2"
                    >
                        <RotateCcw className="w-4 h-4" />
                        Resetar Tudo
                    </button>
                </div>

                {/* Main Viewport */}
                <div className="flex-1 relative">
                    <div
                        ref={containerRef}
                        className="w-full h-[calc(100vh-80px)]"
                        style={filterStyle}
                    />

                    {/* Loading overlay */}
                    {!modelLoaded && loadProgress > 0 && loadProgress < 100 && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                            <div className="text-center">
                                <div className="w-16 h-16 border-4 border-[#00f3ff] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                                <p className="text-lg">{loadProgress}%</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
