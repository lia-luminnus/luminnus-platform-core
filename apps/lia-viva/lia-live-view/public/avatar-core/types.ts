// =====================================================
// AVATAR ENGINE PRO - Types Definition
// =====================================================
// TypeScript definitions for the professional avatar system
// =====================================================

// Facial Landmarks (MediaPipe 468 points)
export interface FacialLandmarks {
    points: Array<{ x: number; y: number; z: number }>;
    boundingBox: {
        xMin: number;
        yMin: number;
        xMax: number;
        yMax: number;
        width: number;
        height: number;
    };
}

// Blendshape weights (0-1)
export interface BlendShapeWeights {
    // Mouth
    mouthOpen: number;
    mouthSmile: number;
    mouthPucker: number;
    mouthFrown: number;

    // Eyes
    eyeBlinkLeft: number;
    eyeBlinkRight: number;
    eyeSquint: number;
    eyeWide: number;

    // Brows
    browUp: number;
    browDown: number;
    browInnerUp: number;

    // Cheeks
    cheekSquint: number;
    cheekPuff: number;

    // Jaw
    jawOpen: number;
    jawForward: number;
    jawLeft: number;
    jawRight: number;

    // Nose
    noseSneer: number;
}

// Viseme for lip-sync (standard 15 visemes)
export type Viseme =
    | 'sil'   // Silence
    | 'PP'    // p, b, m
    | 'FF'    // f, v
    | 'TH'    // th
    | 'DD'    // t, d
    | 'kk'    // k, g
    | 'CH'    // ch, j, sh
    | 'SS'    // s, z
    | 'nn'    // n, l
    | 'RR'    // r
    | 'aa'    // a
    | 'E'     // e
    | 'I'     // i
    | 'O'     // o
    | 'U';    // u

// Viseme timing for lip-sync
export interface VisemeTiming {
    viseme: Viseme;
    start: number;  // Start time in seconds
    end: number;    // End time in seconds
    weight: number; // Intensity 0-1
}

// Emotion types
export type EmotionType =
    | 'neutral'
    | 'happy'
    | 'sad'
    | 'angry'
    | 'surprised'
    | 'fearful'
    | 'disgusted'
    | 'contempt'
    | 'curious'
    | 'confused'
    | 'proud'
    | 'bored'
    | 'focused';

// Emotion analysis result
export interface EmotionAnalysis {
    primaryEmotion: EmotionType;
    intensity: number;          // 0-1
    confidence: number;         // 0-1
    blendShapes: Partial<BlendShapeWeights>;
    secondaryEmotions?: Array<{
        emotion: EmotionType;
        intensity: number;
    }>;
}

// Face Rig structure
export interface FaceRig {
    mesh: {
        vertices: Float32Array;
        indices: Uint16Array;
        uvs: Float32Array;
    };
    blendShapes: Map<string, Float32Array>;  // Vertex deltas per blendshape
    weights: Float32Array;                   // Vertex weights
    landmarks: FacialLandmarks;
    sourceImage: HTMLImageElement;
}

// Avatar state
export interface AvatarState {
    isInitialized: boolean;
    isAnimating: boolean;
    isSpeaking: boolean;
    currentEmotion: EmotionType;
    emotionIntensity: number;
    currentBlendShapes: BlendShapeWeights;
    targetBlendShapes: BlendShapeWeights;
}

// Motion parameters
export interface MotionParams {
    breathing: {
        amplitude: number;
        frequency: number;
        phase: number;
    };
    blink: {
        interval: number;
        duration: number;
        lastBlink: number;
    };
    headMotion: {
        amplitude: number;
        frequency: number;
        phaseX: number;
        phaseY: number;
    };
    microExpressions: {
        intensity: number;
        frequency: number;
    };
}

// Lip-sync data
export interface LipSyncData {
    visemes: VisemeTiming[];
    duration: number;
    text: string;
    hasAudio: boolean;
}

// Avatar Engine configuration
export interface AvatarEngineConfig {
    canvasId?: string;
    fps: number;
    emotionalTemperature: number;  // 1-10
    enableIdleMotion: boolean;
    enableMicroExpressions: boolean;
    lipSyncSmoothing: number;      // 0-1
    expressionSmoothing: number;   // 0-1
}

// Expression extractor result
export interface ExpressionAnalysis {
    landmarks: FacialLandmarks;
    expression: EmotionType;
    blendShapes: Partial<BlendShapeWeights>;
    faceDetected: boolean;
    confidence: number;
}

// Phoneme mapping
export interface PhonemeMapping {
    phoneme: string;
    viseme: Viseme;
    duration: number;
}

// Export all types for use in JavaScript with JSDoc
console.log('[types.ts] Avatar Engine Pro types loaded');
