/**
 * AvatarStateManager - State machine for avatar modes with auto-blink and expressions
 * 
 * State Mapping:
 * - standby → idle
 * - listening → listening
 * - processing → thinking
 * - presenting_lia/presenting_content → talking (only if audio playing)
 * - audio ended/paused → idle
 * 
 * Features:
 * - Auto-blink timer (3-7s random)
 * - Expression inference from text (never modifies chat/TTS)
 * - Expressions: neutral, smile, disapprove, thinking
 */

export type AvatarState = 'idle' | 'listening' | 'thinking' | 'talking';
export type AvatarExpression = 'neutral' | 'smile' | 'disapprove' | 'thinking';

export interface AvatarStateConfig {
    state: AvatarState;
    expression: AvatarExpression;
    isBlinking: boolean;
    mouthOpenness: number; // 0-1, from lipsync
    headTiltX: number; // Small idle movements
    headTiltY: number;
}

type StateChangeCallback = (config: AvatarStateConfig) => void;

export class AvatarStateManager {
    private _state: AvatarState = 'idle';
    private _expression: AvatarExpression = 'neutral';
    private _isBlinking: boolean = false;
    private _mouthOpenness: number = 0;
    private _headTiltX: number = 0;
    private _headTiltY: number = 0;

    // Timers
    private blinkTimer: NodeJS.Timeout | null = null;
    private idleSwayTimer: NodeJS.Timeout | null = null;

    // Audio element reference for play/pause detection
    private audioEl: HTMLAudioElement | null = null;
    private boundOnPlay: (() => void) | null = null;
    private boundOnPause: (() => void) | null = null;
    private boundOnEnded: (() => void) | null = null;

    // Callbacks
    private listeners: Set<StateChangeCallback> = new Set();

    // Blink timing
    private readonly BLINK_MIN_MS = 3000;
    private readonly BLINK_MAX_MS = 7000;
    private readonly BLINK_DURATION_MS = 150;

    constructor() {
        this.startBlinkLoop();
        this.startIdleSway();
    }

    /**
     * Get current state configuration
     */
    get config(): AvatarStateConfig {
        return {
            state: this._state,
            expression: this._expression,
            isBlinking: this._isBlinking,
            mouthOpenness: this._mouthOpenness,
            headTiltX: this._headTiltX,
            headTiltY: this._headTiltY,
        };
    }

    /**
     * Subscribe to state changes
     */
    subscribe(callback: StateChangeCallback): () => void {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    /**
     * Notify all listeners
     */
    private notify(): void {
        const config = this.config;
        this.listeners.forEach(cb => cb(config));
    }

    /**
     * Set audio element for play/pause detection
     */
    setAudioElement(audioEl: HTMLAudioElement | null): void {
        // Remove old listeners
        if (this.audioEl && this.boundOnPlay && this.boundOnPause && this.boundOnEnded) {
            this.audioEl.removeEventListener('play', this.boundOnPlay);
            this.audioEl.removeEventListener('pause', this.boundOnPause);
            this.audioEl.removeEventListener('ended', this.boundOnEnded);
        }

        this.audioEl = audioEl;

        if (audioEl) {
            this.boundOnPlay = () => this.onAudioPlay();
            this.boundOnPause = () => this.onAudioPause();
            this.boundOnEnded = () => this.onAudioEnded();

            audioEl.addEventListener('play', this.boundOnPlay);
            audioEl.addEventListener('pause', this.boundOnPause);
            audioEl.addEventListener('ended', this.boundOnEnded);
        }
    }

    /**
     * Audio play event
     */
    private onAudioPlay(): void {
        if (this._state === 'idle' || this._state === 'thinking') {
            this._state = 'talking';
            this.notify();
        }
    }

    /**
     * Audio pause event
     */
    private onAudioPause(): void {
        if (this._state === 'talking') {
            this._state = 'idle';
            this._mouthOpenness = 0;
            this.notify();
        }
    }

    /**
     * Audio ended event
     */
    private onAudioEnded(): void {
        if (this._state === 'talking') {
            this._state = 'idle';
            this._mouthOpenness = 0;
            this.notify();
        }
    }

    /**
     * Set state from LiveMode
     * State transitions respect audio playing status
     */
    setLiveModeState(liveModeState: string): void {
        switch (liveModeState) {
            case 'standby':
                if (this._state !== 'talking') {
                    this._state = 'idle';
                }
                break;
            case 'listening':
                this._state = 'listening';
                break;
            case 'processing':
                this._state = 'thinking';
                this._expression = 'thinking';
                break;
            case 'presenting_lia':
            case 'presenting_content':
                // Only set talking if audio is actually playing
                if (this.audioEl && !this.audioEl.paused) {
                    this._state = 'talking';
                } else {
                    this._state = 'idle';
                }
                break;
            default:
                this._state = 'idle';
        }
        this.notify();
    }

    /**
     * Update mouth openness from lipsync controller
     */
    setMouthOpenness(value: number): void {
        this._mouthOpenness = Math.max(0, Math.min(1, value));
        // Don't notify here - called in RAF loop, let component handle it
    }

    /**
     * Infer expression from text without modifying text
     * Called on voice.assistant.final only
     */
    inferExpression(text: string): void {
        const t = text.toLowerCase();

        if (t.includes('risadinha') || t.includes('haha') || t.includes('rs') || t.includes('😊') || t.includes('boa notícia')) {
            this._expression = 'smile';
        } else if (t.includes('tsc') || t.includes('humm') || t.includes('não concordo')) {
            this._expression = 'disapprove';
        } else if (t.includes('hm') || t.includes('deixa eu pensar') || t.includes('interessante')) {
            this._expression = 'thinking';
        } else {
            this._expression = 'neutral';
        }

        this.notify();
    }

    /**
     * Reset expression to neutral
     */
    resetExpression(): void {
        this._expression = 'neutral';
        this.notify();
    }

    /**
     * Start auto-blink loop
     */
    private startBlinkLoop(): void {
        const scheduleBlink = () => {
            const delay = this.BLINK_MIN_MS + Math.random() * (this.BLINK_MAX_MS - this.BLINK_MIN_MS);

            this.blinkTimer = setTimeout(() => {
                // Blink
                this._isBlinking = true;
                this.notify();

                // Open eyes after blink duration
                setTimeout(() => {
                    this._isBlinking = false;
                    this.notify();
                }, this.BLINK_DURATION_MS);

                // Schedule next blink
                scheduleBlink();
            }, delay);
        };

        scheduleBlink();
    }

    /**
     * Start subtle idle sway movements
     */
    private startIdleSway(): void {
        this.idleSwayTimer = setInterval(() => {
            // Small random head movements
            this._headTiltX = (Math.random() - 0.5) * 0.02; // ±1% tilt
            this._headTiltY = (Math.random() - 0.5) * 0.02;
            // Don't notify for micro movements - let RAF handle it
        }, 2000);
    }

    /**
     * Clean up all resources
     */
    dispose(): void {
        console.log('🧹 [AvatarState] Disposing...');

        // Stop blink timer
        if (this.blinkTimer) {
            clearTimeout(this.blinkTimer);
            this.blinkTimer = null;
        }

        // Stop idle sway timer
        if (this.idleSwayTimer) {
            clearInterval(this.idleSwayTimer);
            this.idleSwayTimer = null;
        }

        // Remove audio listeners
        if (this.audioEl && this.boundOnPlay && this.boundOnPause && this.boundOnEnded) {
            this.audioEl.removeEventListener('play', this.boundOnPlay);
            this.audioEl.removeEventListener('pause', this.boundOnPause);
            this.audioEl.removeEventListener('ended', this.boundOnEnded);
        }

        this.audioEl = null;
        this.listeners.clear();
        this._state = 'idle';
        this._expression = 'neutral';
        this._isBlinking = false;
        this._mouthOpenness = 0;
    }
}

// Singleton instance
let stateManagerInstance: AvatarStateManager | null = null;

export function getAvatarStateManager(): AvatarStateManager {
    if (!stateManagerInstance) {
        stateManagerInstance = new AvatarStateManager();
    }
    return stateManagerInstance;
}

export function disposeAvatarStateManager(): void {
    if (stateManagerInstance) {
        stateManagerInstance.dispose();
        stateManagerInstance = null;
    }
}
