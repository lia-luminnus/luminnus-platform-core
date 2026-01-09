/**
 * Avatar Studio - index.tsx
 * =====================================================
 * REDIRECT TO 3D AVATAR STUDIO
 * The new 3D studio provides complete editing controls
 * =====================================================
 */

// Re-export the new 3D Avatar Studio as the main component
export { default as AvatarStudio } from '../pages/AvatarStudio3D';
export { default } from '../pages/AvatarStudio3D';

// Keep the old 2D studio available for legacy use
export { default as AvatarStudio2D } from './AvatarStudioLegacy';
