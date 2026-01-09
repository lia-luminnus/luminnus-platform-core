/**
 * capabilities.ts - Avatar Capability Detection
 * 
 * Detects what the avatar can do based on:
 * - Morph targets (blendshapes) for expressions
 * - Bones for gestures and movements
 * - Facial bones for expressions as fallback
 */

import * as THREE from 'three';

// Available actions
export type AvatarAction = 'blink' | 'smile' | 'wave' | 'nod' | 'shake_head' | 'look_at' | 'talk';

// Capability registry
export interface AvatarCapabilities {
    actions: Set<AvatarAction>;
    morph: {
        mesh: THREE.SkinnedMesh | null;
        influences: number[] | null;
        blinkL?: number;
        blinkR?: number;
        smile?: number;
        mouthOpen?: number;
    };
    bones: {
        head?: THREE.Bone;
        neck?: THREE.Bone;
        spine?: THREE.Bone;
        chest?: THREE.Bone;
        rightArm?: THREE.Bone;
        leftArm?: THREE.Bone;
        rightHand?: THREE.Bone;
        leftHand?: THREE.Bone;
        // Facial bones
        jaw?: THREE.Bone;
        leftEye?: THREE.Bone;
        rightEye?: THREE.Bone;
        leftEyelid?: THREE.Bone;
        rightEyelid?: THREE.Bone;
    };
    allBones: string[]; // List of all bone names for debugging
}

/**
 * Find bone by matching keywords in name
 */
function findBoneByName(root: THREE.Object3D, keywords: string[]): THREE.Bone | undefined {
    let found: THREE.Bone | undefined;
    root.traverse((obj: any) => {
        if (found) return;
        if (obj?.isBone && typeof obj.name === 'string') {
            const name = obj.name.toLowerCase();
            if (keywords.some(k => name.includes(k))) {
                found = obj;
            }
        }
    });
    return found;
}

/**
 * Get all bone names in the model
 */
function getAllBoneNames(root: THREE.Object3D): string[] {
    const bones: string[] = [];
    root.traverse((obj: any) => {
        if (obj?.isBone && typeof obj.name === 'string') {
            bones.push(obj.name);
        }
    });
    return bones;
}

/**
 * Detect morph targets (blendshapes) in the model
 */
function detectMorphTargets(root: THREE.Object3D) {
    let mesh: THREE.SkinnedMesh | null = null;
    let dict: Record<string, number> | null = null;
    let influences: number[] | null = null;

    root.traverse((obj: any) => {
        if (dict) return; // Already found
        if (obj?.isSkinnedMesh && obj.morphTargetDictionary && obj.morphTargetInfluences) {
            mesh = obj;
            dict = obj.morphTargetDictionary;
            influences = obj.morphTargetInfluences;
        }
    });

    const getIndex = (candidates: string[]): number | undefined => {
        if (!dict) return undefined;
        for (const [key, index] of Object.entries(dict)) {
            const low = key.toLowerCase();
            if (candidates.some(c => low.includes(c))) {
                return index as number;
            }
        }
        return undefined;
    };

    // Log all morph targets if any exist
    if (dict) {
        console.log('🎭 [CAP] All morph targets:', Object.keys(dict));
    }

    return {
        mesh,
        influences,
        blinkL: getIndex(['blink_l', 'eye_blink_l', 'eyeblinkleft', 'blinkleft', 'lefteyeblink']),
        blinkR: getIndex(['blink_r', 'eye_blink_r', 'eyeblinkright', 'blinkright', 'righteyeblink']),
        smile: getIndex(['smile', 'mouthsmile', 'happy', 'joy', 'mouthcornerup']),
        mouthOpen: getIndex(['mouthopen', 'jawopen', 'mouth_open', 'jaw', 'viseme_aa', 'viseme']),
    };
}

/**
 * Build capabilities from loaded model
 */
export function buildCapabilities(root: THREE.Object3D): AvatarCapabilities {
    const actions = new Set<AvatarAction>();

    // Get all bone names for debugging
    const allBones = getAllBoneNames(root);
    console.log('🦴 [CAP] ALL BONES IN MODEL:', allBones);

    // Detect morph targets
    const morph = detectMorphTargets(root);

    // Detect body bones
    const head = findBoneByName(root, ['head']);
    const neck = findBoneByName(root, ['neck']);
    const spine = findBoneByName(root, ['spine']);
    const chest = findBoneByName(root, ['chest']);
    const rightArm = findBoneByName(root, ['rightarm', 'upperarm_r', 'arm_r', 'r_arm', 'rightshoulder']);
    const leftArm = findBoneByName(root, ['leftarm', 'upperarm_l', 'arm_l', 'l_arm', 'leftshoulder']);
    const rightHand = findBoneByName(root, ['righthand', 'hand_r', 'r_hand']);
    const leftHand = findBoneByName(root, ['lefthand', 'hand_l', 'l_hand']);

    // Detect facial bones
    const jaw = findBoneByName(root, ['jaw', 'chin', 'mandible']);
    const leftEye = findBoneByName(root, ['lefteye', 'eye_l', 'l_eye', 'eyel']);
    const rightEye = findBoneByName(root, ['righteye', 'eye_r', 'r_eye', 'eyer']);
    const leftEyelid = findBoneByName(root, ['lefteyelid', 'eyelid_l', 'l_eyelid', 'leftuppereyelid']);
    const rightEyelid = findBoneByName(root, ['righteyelid', 'eyelid_r', 'r_eyelid', 'rightuppereyelid']);

    // Enable actions based on actual capabilities

    // Blink: prefer morph, fallback to eyelid bones
    if (morph.influences && (morph.blinkL !== undefined || morph.blinkR !== undefined)) {
        actions.add('blink');
    } else if (leftEyelid || rightEyelid) {
        actions.add('blink');
        console.log('👁️ [CAP] Blink enabled via eyelid bones');
    }

    // Smile: prefer morph, fallback to jaw/mouth bones
    if (morph.influences && morph.smile !== undefined) {
        actions.add('smile');
    }

    // Talk: enabled if jaw bone or mouth morph
    if (jaw || (morph.influences && morph.mouthOpen !== undefined)) {
        actions.add('talk');
        console.log('🗣️ [CAP] Talk enabled via', jaw ? 'jaw bone' : 'mouth morph');
    }

    // Head movements
    if (head || neck) {
        actions.add('nod');
        actions.add('shake_head');
        actions.add('look_at');
    }

    // Wave
    if (rightArm || leftArm || rightHand || leftHand) {
        actions.add('wave');
    }

    console.log('🎭 [CAP] Morph targets found:', {
        blinkL: morph.blinkL,
        blinkR: morph.blinkR,
        smile: morph.smile,
        mouthOpen: morph.mouthOpen,
    });
    console.log('🦴 [CAP] FACIAL bones found:', {
        jaw: jaw?.name,
        leftEye: leftEye?.name,
        rightEye: rightEye?.name,
        leftEyelid: leftEyelid?.name,
        rightEyelid: rightEyelid?.name,
    });
    console.log('✅ [CAP] Available actions:', Array.from(actions));

    return {
        actions,
        morph: {
            mesh: morph.mesh,
            influences: morph.influences,
            blinkL: morph.blinkL,
            blinkR: morph.blinkR,
            smile: morph.smile,
            mouthOpen: morph.mouthOpen,
        },
        bones: {
            head,
            neck,
            spine,
            chest,
            rightArm,
            leftArm,
            rightHand,
            leftHand,
            jaw,
            leftEye,
            rightEye,
            leftEyelid,
            rightEyelid,
        },
        allBones,
    };
}

