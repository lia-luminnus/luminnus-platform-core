/**
 * AvatarController.ts - Central Avatar Motor
 * 
 * Features:
 * - State machine (IDLE_ALIVE, LISTENING, THINKING, SPEAKING)
 * - Autopilot (idle vivo) with blink and micro movements
 * - Gesture API with capability checking
 * - Command override with cooldown
 */

import * as THREE from 'three';
import { AvatarCapabilities, AvatarAction, buildCapabilities } from './capabilities';

// Avatar states
export type AvatarState = 'IDLE_ALIVE' | 'LISTENING' | 'THINKING' | 'SPEAKING';

// Result of perform action
export type PerformResult =
    | { ok: true }
    | { ok: false; reason: string; available?: AvatarAction[] };

// Controller configuration
export interface AvatarControllerConfig {
    autopilotEnabled?: boolean;
    idleIntensity?: number;
    blinkIntervalMin?: number;
    blinkIntervalMax?: number;
    overrideCooldownMs?: number;
}

const DEFAULT_CONFIG: Required<AvatarControllerConfig> = {
    autopilotEnabled: true,
    idleIntensity: 0.3,
    blinkIntervalMin: 2000,
    blinkIntervalMax: 5000,
    overrideCooldownMs: 6000,
};

/**
 * AvatarController - Central motor for avatar animation
 */
export class AvatarController {
    private root: THREE.Object3D;
    private caps: AvatarCapabilities;
    private config: Required<AvatarControllerConfig>;

    private state: AvatarState = 'IDLE_ALIVE';
    private t = 0; // Time accumulator

    // Override/cooldown
    private overrideUntil = 0;

    // Blink scheduling
    private nextBlinkAt = 0;
    private isBlinking = false;
    private blinkProgress = 0;

    // Initial pose storage
    private initialPoses: Map<string, {
        rotation: THREE.Euler;
        position: THREE.Vector3;
    }> = new Map();

    constructor(root: THREE.Object3D, config?: AvatarControllerConfig) {
        this.root = root;
        this.caps = buildCapabilities(root);
        this.config = { ...DEFAULT_CONFIG, ...config };

        // Store initial poses
        this.storeInitialPoses();

        // Schedule first blink
        this.scheduleNextBlink(Date.now());

        console.log('🎮 [CTRL] AvatarController initialized');
        console.log('🎮 [CTRL] State:', this.state);
        console.log('🎮 [CTRL] Autopilot:', this.config.autopilotEnabled);
    }

    // =====================================================
    // PUBLIC API
    // =====================================================

    /**
     * Get available capabilities
     */
    public getCapabilities(): Set<AvatarAction> {
        return this.caps.actions;
    }

    /**
     * Set avatar state
     */
    public setState(state: AvatarState): void {
        if (this.state !== state) {
            console.log(`🎭 [CTRL] State: ${this.state} → ${state}`);
            this.state = state;
        }
    }

    /**
     * Get current state
     */
    public getState(): AvatarState {
        return this.state;
    }

    /**
     * Enable/disable autopilot
     */
    public setAutopilotEnabled(enabled: boolean): void {
        this.config.autopilotEnabled = enabled;
        console.log(`🤖 [CTRL] Autopilot: ${enabled ? 'ON' : 'OFF'}`);
    }

    /**
     * Set idle intensity (0-1)
     */
    public setIdleIntensity(intensity: number): void {
        this.config.idleIntensity = Math.max(0, Math.min(1, intensity));
    }

    /**
     * Perform an action
     */
    public async perform(action: AvatarAction, params: any = {}): Promise<PerformResult> {
        // Check capability
        if (!this.caps.actions.has(action)) {
            const available = Array.from(this.caps.actions);
            console.warn(`❌ [CTRL] Cannot perform "${action}" - not available`);
            return {
                ok: false,
                reason: `Ainda não consigo fazer "${action}". ` +
                    (available.length > 0
                        ? `Consigo fazer: ${available.join(', ')}`
                        : 'Nenhuma ação disponível neste modelo.'),
                available,
            };
        }

        // Set override cooldown (pause autopilot)
        const cooldown = params.cooldownMs ?? this.config.overrideCooldownMs;
        this.overrideUntil = Date.now() + cooldown;

        console.log(`▶️ [CTRL] Performing: ${action}`, params);

        // Execute action
        switch (action) {
            case 'blink':
                this.doBlink();
                return { ok: true };

            case 'smile':
                this.doSmile(params.intensity ?? 0.7, params.durationMs ?? 1000);
                return { ok: true };

            case 'nod':
                this.doNod(params.intensity ?? 0.5, params.durationMs ?? 800);
                return { ok: true };

            case 'shake_head':
                this.doShakeHead(params.intensity ?? 0.5, params.durationMs ?? 900);
                return { ok: true };

            case 'wave':
                return this.doWave(params.hand ?? 'right', params.intensity ?? 0.6, params.durationMs ?? 1500);

            case 'look_at':
                this.doLookAt(params.target ?? { x: 0, y: 0, z: 1 });
                return { ok: true };

            default:
                return { ok: false, reason: `Ação desconhecida: ${action}` };
        }
    }

    /**
     * Tick - call every frame
     */
    public tick(dt: number): void {
        this.t += dt;
        const now = Date.now();

        // Check if override is active
        const overrideActive = now < this.overrideUntil;

        // Always run micro-idle in all states (with different intensity)
        let intensity = this.config.idleIntensity;
        if (this.state === 'SPEAKING') intensity *= 0.5;
        if (this.state === 'LISTENING') intensity *= 0.8;

        // Run micro-idle (always, for "alive" appearance)
        if (this.config.autopilotEnabled && !overrideActive) {
            this.microIdle(dt, intensity);
        }

        // Auto blink only in IDLE_ALIVE
        if (this.config.autopilotEnabled && !overrideActive && this.state === 'IDLE_ALIVE') {
            if (now >= this.nextBlinkAt && this.caps.actions.has('blink')) {
                this.doBlink();
                this.scheduleNextBlink(now);
            }
        }

        // Always process active animations (blink, etc.)
        this.processActiveAnimations(dt);
    }

    // =====================================================
    // AUTOPILOT (IDLE VIVO)
    // =====================================================

    private microIdle(dt: number, intensity: number): void {
        // Log every 2 seconds for debug
        if (Math.floor(this.t) % 2 === 0 && Math.floor(this.t) !== Math.floor(this.t - dt)) {
            console.log(`🎭 [IDLE] t=${this.t.toFixed(1)}, intensity=${intensity.toFixed(2)}`);
        }

        // Try bones first, then fall back to root
        const head = this.caps.bones.head || this.caps.bones.neck;
        const spine = this.caps.bones.spine;

        if (head) {
            // Head micro-movement
            const headRx = Math.sin(this.t * 0.7) * 0.04 * intensity;
            const headRy = Math.sin(this.t * 0.5) * 0.03 * intensity;
            const headRz = Math.sin(this.t * 0.3) * 0.02 * intensity;

            const initial = this.initialPoses.get('head');
            if (initial) {
                head.rotation.x = THREE.MathUtils.lerp(head.rotation.x, initial.rotation.x + headRx, 0.1);
                head.rotation.y = THREE.MathUtils.lerp(head.rotation.y, initial.rotation.y + headRy, 0.1);
                head.rotation.z = THREE.MathUtils.lerp(head.rotation.z, initial.rotation.z + headRz, 0.1);
            }
        }

        if (spine) {
            // Breathing
            const breathe = Math.sin(this.t * 1.2) * 0.02 * intensity;
            const initial = this.initialPoses.get('spine');
            if (initial) {
                spine.rotation.x = THREE.MathUtils.lerp(spine.rotation.x, initial.rotation.x + breathe, 0.1);
            }
        }

        // ALWAYS apply to root for visible movement
        const rootRx = Math.sin(this.t * 0.6) * 0.015 * intensity;
        const rootRy = Math.sin(this.t * 0.4) * 0.01 * intensity;

        const initial = this.initialPoses.get('root');
        if (initial) {
            this.root.rotation.x = THREE.MathUtils.lerp(this.root.rotation.x, initial.rotation.x + rootRx, 0.03);
            this.root.rotation.y = THREE.MathUtils.lerp(this.root.rotation.y, initial.rotation.y + rootRy, 0.03);
        }
    }

    private scheduleNextBlink(now: number): void {
        const min = this.config.blinkIntervalMin;
        const max = this.config.blinkIntervalMax;
        this.nextBlinkAt = now + min + Math.random() * (max - min);
    }

    // =====================================================
    // ACTIVE ANIMATION PROCESSING
    // =====================================================

    private processActiveAnimations(dt: number): void {
        // Process blink
        if (this.isBlinking) {
            this.blinkProgress += dt * 8; // Complete in ~125ms

            // Blink curve: 0→1→0
            const t = this.blinkProgress;
            const blinkValue = t < 0.5 ? t * 2 : 2 - t * 2;

            this.setMorph(this.caps.morph.blinkL, blinkValue);
            this.setMorph(this.caps.morph.blinkR, blinkValue);

            if (this.blinkProgress >= 1) {
                this.isBlinking = false;
                this.blinkProgress = 0;
                this.setMorph(this.caps.morph.blinkL, 0);
                this.setMorph(this.caps.morph.blinkR, 0);
            }
        }
    }

    // =====================================================
    // ACTION IMPLEMENTATIONS
    // =====================================================

    private doBlink(): void {
        if (this.caps.morph.blinkL === undefined && this.caps.morph.blinkR === undefined) {
            console.log('👁️ [CTRL] Blink (no morph - simulated)');
            return;
        }

        this.isBlinking = true;
        this.blinkProgress = 0;
        console.log('👁️ [CTRL] Blink');
    }

    private doSmile(intensity: number, durationMs: number): void {
        const smileIdx = this.caps.morph.smile;
        if (smileIdx === undefined) {
            console.log('😊 [CTRL] Smile (no morph)');
            return;
        }

        // Ramp up
        this.setMorph(smileIdx, intensity);
        console.log(`😊 [CTRL] Smile: ${intensity} for ${durationMs}ms`);

        // Ramp down after duration
        setTimeout(() => {
            this.setMorph(smileIdx, 0);
        }, durationMs);
    }

    private doNod(intensity: number, durationMs: number): void {
        const head = this.caps.bones.head || this.caps.bones.neck;
        if (!head) {
            console.log('👍 [CTRL] Nod (no head bone)');
            return;
        }

        console.log(`👍 [CTRL] Nod START: bone=${head.name}, intensity=${intensity}`);

        // For Mixamo: X axis is forward/back tilt
        const nodAmount = 0.4 * intensity; // Increased from 0.3
        const originalX = head.rotation.x;
        const duration = durationMs;
        const start = Date.now();

        const animate = () => {
            const elapsed = Date.now() - start;
            const progress = elapsed / duration;

            if (progress >= 1) {
                head.rotation.x = originalX;
                console.log(`👍 [CTRL] Nod END`);
                return;
            }

            // Smooth nod motion: down then up
            const nod = Math.sin(progress * Math.PI) * nodAmount;
            head.rotation.x = originalX + nod;

            requestAnimationFrame(animate);
        };
        animate();
    }

    private doShakeHead(intensity: number, durationMs: number): void {
        const head = this.caps.bones.head || this.caps.bones.neck;
        if (!head) {
            console.log('👎 [CTRL] ShakeHead (no head bone)');
            return;
        }

        console.log(`👎 [CTRL] ShakeHead START: bone=${head.name}, intensity=${intensity}`);

        // For Mixamo: Y axis is left/right turn
        const shakeAmount = 0.4 * intensity; // Increased from 0.25
        const originalY = head.rotation.y;
        const duration = durationMs;
        const start = Date.now();
        const cycles = 3;

        const animate = () => {
            const elapsed = Date.now() - start;
            const progress = elapsed / duration;

            if (progress >= 1) {
                head.rotation.y = originalY;
                console.log(`👎 [CTRL] ShakeHead END`);
                return;
            }

            // Shake motion: oscillate left-right
            const shake = Math.sin(progress * Math.PI * cycles * 2) * shakeAmount * (1 - progress);
            head.rotation.y = originalY + shake;

            requestAnimationFrame(animate);
        };
        animate();
    }

    private doWave(hand: 'right' | 'left', intensity: number, durationMs: number): PerformResult {
        const arm = hand === 'right' ? this.caps.bones.rightArm : this.caps.bones.leftArm;
        if (!arm) {
            return { ok: false, reason: `Bone do braço ${hand} não encontrado` };
        }

        console.log(`👋 [CTRL] Wave START: bone=${arm.name}, hand=${hand}, intensity=${intensity}`);

        // For Mixamo: Z axis raises arm, X rotates forward/back
        // We'll use Z to raise arm up, then oscillate X for waving
        const originalZ = arm.rotation.z;
        const originalX = arm.rotation.x;

        // Raise amount - opposite for right vs left
        const raiseAmount = (hand === 'right' ? -1 : 1) * 1.2 * intensity; // Raise arm up
        const waveAmount = 0.3 * intensity;
        const duration = durationMs;
        const start = Date.now();

        const animate = () => {
            const elapsed = Date.now() - start;
            const progress = elapsed / duration;

            if (progress >= 1) {
                arm.rotation.z = originalZ;
                arm.rotation.x = originalX;
                console.log(`👋 [CTRL] Wave END`);
                return;
            }

            // Raise arm smoothly, then lower
            const raiseProgress = progress < 0.2
                ? progress / 0.2
                : (progress > 0.8
                    ? (1 - progress) / 0.2
                    : 1);
            arm.rotation.z = originalZ + raiseAmount * raiseProgress;

            // Wave motion
            arm.rotation.x = originalX + Math.sin(progress * Math.PI * 6) * waveAmount;

            requestAnimationFrame(animate);
        };
        animate();

        return { ok: true };
    }

    private doLookAt(target: { x: number; y: number; z: number }): void {
        const head = this.caps.bones.head || this.caps.bones.neck;
        if (!head) return;

        console.log(`👀 [CTRL] LookAt: target=${JSON.stringify(target)}, bone=${head.name}`);

        // Simple look direction - increased multipliers
        const dirX = Math.atan2(target.y, target.z) * 0.5; // Increased from 0.3
        const dirY = Math.atan2(target.x, target.z) * 0.5;

        const originalX = head.rotation.x;
        const originalY = head.rotation.y;
        const start = Date.now();
        const duration = 500;

        const animate = () => {
            const elapsed = Date.now() - start;
            const progress = Math.min(elapsed / duration, 1);

            // Smooth ease
            const ease = 1 - Math.pow(1 - progress, 3);

            head.rotation.x = originalX + dirX * ease;
            head.rotation.y = originalY + dirY * ease;

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                console.log(`👀 [CTRL] LookAt DONE: rotX=${head.rotation.x.toFixed(2)}, rotY=${head.rotation.y.toFixed(2)}`);
            }
        };
        animate();
    }

    // =====================================================
    // HELPERS
    // =====================================================

    private setMorph(index: number | undefined, value: number): void {
        if (index === undefined) return;
        if (!this.caps.morph.influences) return;
        this.caps.morph.influences[index] = Math.max(0, Math.min(1, value));
    }

    private storeInitialPoses(): void {
        // Store root
        this.initialPoses.set('root', {
            rotation: this.root.rotation.clone(),
            position: this.root.position.clone(),
        });

        // Store bones
        const bones = this.caps.bones;
        if (bones.head) {
            this.initialPoses.set('head', {
                rotation: bones.head.rotation.clone(),
                position: bones.head.position.clone(),
            });
        }
        if (bones.neck) {
            this.initialPoses.set('neck', {
                rotation: bones.neck.rotation.clone(),
                position: bones.neck.position.clone(),
            });
        }
        if (bones.spine) {
            this.initialPoses.set('spine', {
                rotation: bones.spine.rotation.clone(),
                position: bones.spine.position.clone(),
            });
        }
        if (bones.rightArm) {
            this.initialPoses.set('rightArm', {
                rotation: bones.rightArm.rotation.clone(),
                position: bones.rightArm.position.clone(),
            });
        }
        if (bones.leftArm) {
            this.initialPoses.set('leftArm', {
                rotation: bones.leftArm.rotation.clone(),
                position: bones.leftArm.position.clone(),
            });
        }
    }
}
