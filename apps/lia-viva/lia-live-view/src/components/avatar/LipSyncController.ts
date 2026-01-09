/**
 * LipSyncController - Audio amplitude analysis for lipsync
 * 
 * Requirements:
 * - Single AudioContext per session (reuse)
 * - source.connect(analyser) only (no destination - avoid echo)
 * - Proper disconnect on setAudioElement() swap
 * - dispose() for cleanup
 * - Smoothing with lerp + threshold (<0.03 → 0) + clamp 0..1
 */

export class LipSyncController {
    private audioContext: AudioContext | null = null;
    private analyser: AnalyserNode | null = null;
    private source: MediaElementAudioSourceNode | null = null;
    private dataArray: Uint8Array | null = null;
    private currentAudioEl: HTMLAudioElement | null = null;

    // Smoothed amplitude value
    private _amplitude: number = 0;
    private prevAmplitude: number = 0;

    // RAF for internal update loop
    private rafId: number | null = null;
    private lastUpdate: number = 0;
    private readonly UPDATE_INTERVAL_MS = 1000 / 30; // 30fps throttle

    // Smoothing factor (0-1, lower = smoother)
    private readonly SMOOTH_FACTOR = 0.25;
    private readonly THRESHOLD = 0.03;

    /**
     * Get current smoothed amplitude (0-1)
     */
    get amplitude(): number {
        return this._amplitude;
    }

    /**
     * Connect to an audio element for analysis
     * Properly disconnects previous source if exists
     */
    setAudioElement(audioEl: HTMLAudioElement | null): void {
        // Same element, skip
        if (audioEl === this.currentAudioEl) return;

        // Disconnect previous source
        this.disconnectSource();

        if (!audioEl) {
            this.currentAudioEl = null;
            return;
        }

        try {
            // Create AudioContext on first use (reuse across calls)
            if (!this.audioContext) {
                this.audioContext = new AudioContext();
            }

            // Resume if suspended (browser autoplay policy)
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }

            // Create analyser
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 2048;
            this.analyser.smoothingTimeConstant = 0.3;

            // Create source from audio element
            this.source = this.audioContext.createMediaElementSource(audioEl);

            // IMPORTANT: Connect source → analyser ONLY
            // DO NOT connect to destination (audioEl already plays to speakers)
            this.source.connect(this.analyser);

            // Create data array for analysis
            this.dataArray = new Uint8Array(this.analyser.fftSize);

            this.currentAudioEl = audioEl;

            // Start internal update loop
            this.startUpdateLoop();

            console.log('🎤 [LipSync] Connected to audio element');
        } catch (error) {
            console.warn('⚠️ [LipSync] Failed to connect audio element:', error);
        }
    }

    /**
     * Disconnect current source and clean up nodes
     */
    private disconnectSource(): void {
        if (this.source) {
            try {
                this.source.disconnect();
            } catch {
                // Already disconnected
            }
            this.source = null;
        }

        if (this.analyser) {
            try {
                this.analyser.disconnect();
            } catch {
                // Already disconnected
            }
            this.analyser = null;
        }

        this.dataArray = null;
    }

    /**
     * Start internal RAF update loop
     */
    private startUpdateLoop(): void {
        if (this.rafId !== null) return;

        const update = (timestamp: number) => {
            // Throttle to 30fps
            if (timestamp - this.lastUpdate >= this.UPDATE_INTERVAL_MS) {
                this.updateAmplitude();
                this.lastUpdate = timestamp;
            }

            this.rafId = requestAnimationFrame(update);
        };

        this.rafId = requestAnimationFrame(update);
    }

    /**
     * Stop internal RAF update loop
     */
    private stopUpdateLoop(): void {
        if (this.rafId !== null) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
    }

    /**
     * Calculate and update amplitude with smoothing
     */
    private updateAmplitude(): void {
        if (!this.analyser || !this.dataArray) {
            this._amplitude = 0;
            return;
        }

        // Get time domain data
        this.analyser.getByteTimeDomainData(this.dataArray);

        // Calculate RMS (root mean square) for amplitude
        let sum = 0;
        for (let i = 0; i < this.dataArray.length; i++) {
            const v = (this.dataArray[i] - 128) / 128; // Normalize to -1..1
            sum += v * v;
        }
        const rms = Math.sqrt(sum / this.dataArray.length);

        // Scale and clamp
        let newAmplitude = Math.min(1, rms * 2.5);

        // Apply threshold (anti-noise)
        if (newAmplitude < this.THRESHOLD) {
            newAmplitude = 0;
        }

        // Apply smoothing with lerp
        this._amplitude = this.lerp(this.prevAmplitude, newAmplitude, this.SMOOTH_FACTOR);

        // Clamp final value
        this._amplitude = Math.max(0, Math.min(1, this._amplitude));

        this.prevAmplitude = this._amplitude;
    }

    /**
     * Linear interpolation
     */
    private lerp(a: number, b: number, t: number): number {
        return a + (b - a) * t;
    }

    /**
     * Clean up all resources
     * Call this when LiveMode closes
     */
    dispose(): void {
        console.log('🧹 [LipSync] Disposing...');

        // Stop update loop
        this.stopUpdateLoop();

        // Disconnect source
        this.disconnectSource();

        // Close AudioContext
        if (this.audioContext) {
            try {
                this.audioContext.close();
            } catch {
                // Already closed
            }
            this.audioContext = null;
        }

        this.currentAudioEl = null;
        this._amplitude = 0;
        this.prevAmplitude = 0;
    }
}

// Singleton instance for reuse across sessions
let lipSyncInstance: LipSyncController | null = null;

export function getLipSyncController(): LipSyncController {
    if (!lipSyncInstance) {
        lipSyncInstance = new LipSyncController();
    }
    return lipSyncInstance;
}

export function disposeLipSyncController(): void {
    if (lipSyncInstance) {
        lipSyncInstance.dispose();
        lipSyncInstance = null;
    }
}
