/**
 * AvatarUploader.tsx
 * =====================================================
 * Componente para upload de imagens do avatar
 * =====================================================
 */

import React, { useRef, useState } from 'react';
import { Upload, Image as ImageIcon, Trash2, Star, CheckCircle } from 'lucide-react';
import { AvatarStudioController, AvatarImage, EmotionType } from './AvatarStudioController';

interface Props {
    controller: AvatarStudioController;
    onImagesChange?: (images: AvatarImage[]) => void;
}

const EMOTIONS: { key: EmotionType; label: string; color: string }[] = [
    { key: 'neutral', label: 'Neutro', color: '#6b7280' },
    { key: 'happy', label: 'Feliz', color: '#22c55e' },
    { key: 'sad', label: 'Triste', color: '#3b82f6' },
    { key: 'surprised', label: 'Surpreso', color: '#eab308' },
    { key: 'angry', label: 'Raiva', color: '#ef4444' },
    { key: 'curious', label: 'Curioso', color: '#8b5cf6' },
    { key: 'talking', label: 'Falando', color: '#00f3ff' },
];

export default function AvatarUploader({ controller, onImagesChange }: Props) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [images, setImages] = useState<AvatarImage[]>([]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        const newImages = controller.handleUpload(files);
        if (newImages.length > 0) {
            const allImages = controller.getImages();
            setImages(allImages);
            onImagesChange?.(allImages);
        }

        // Reset input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleSetBase = (imageId: string) => {
        controller.setBaseImage(imageId);
        setImages(controller.getImages());
        onImagesChange?.(controller.getImages());
    };

    const handleSetEmotion = (imageId: string, emotion: EmotionType) => {
        controller.setImageEmotion(imageId, emotion);
        setImages(controller.getImages());
        onImagesChange?.(controller.getImages());
    };

    const handleRemove = (imageId: string) => {
        controller.removeImage(imageId);
        setImages(controller.getImages());
        onImagesChange?.(controller.getImages());
    };

    return (
        <div className="flex flex-col gap-4">
            {/* Upload Zone */}
            <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[rgba(0,243,255,0.3)] rounded-xl p-6 cursor-pointer hover:border-[#00f3ff] hover:bg-[rgba(0,243,255,0.05)] transition-all text-center"
            >
                <Upload className="w-8 h-8 mx-auto mb-2 text-[#00f3ff] opacity-70" />
                <p className="text-sm text-[rgba(224,247,255,0.7)]">
                    Clique para selecionar imagens
                </p>
                <p className="text-xs text-[rgba(224,247,255,0.4)] mt-1">
                    PNG, JPG • Múltiplas expressões
                </p>
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleFileSelect}
                    className="hidden"
                />
            </div>

            {/* Image Grid */}
            {images.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                    {images.map((img) => (
                        <div
                            key={img.id}
                            className={`relative group rounded-lg overflow-hidden border-2 transition-all ${img.isBase
                                    ? 'border-[#00f3ff] shadow-[0_0_15px_rgba(0,243,255,0.3)]'
                                    : 'border-transparent hover:border-[rgba(0,243,255,0.3)]'
                                }`}
                        >
                            <img
                                src={img.preview}
                                alt={img.name}
                                className="w-full aspect-[3/4] object-cover"
                            />

                            {/* Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                            {/* Controls */}
                            <div className="absolute bottom-0 left-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                {/* Emotion selector */}
                                <select
                                    value={img.emotion}
                                    onChange={(e) => handleSetEmotion(img.id, e.target.value as EmotionType)}
                                    className="w-full text-xs bg-black/50 border border-white/20 rounded px-2 py-1 text-white"
                                >
                                    {EMOTIONS.map((emo) => (
                                        <option key={emo.key} value={emo.key}>
                                            {emo.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Base indicator */}
                            {img.isBase && (
                                <div className="absolute top-2 left-2">
                                    <Star className="w-5 h-5 text-[#00f3ff] fill-[#00f3ff]" />
                                </div>
                            )}

                            {/* Actions */}
                            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {!img.isBase && (
                                    <button
                                        onClick={() => handleSetBase(img.id)}
                                        className="p-1.5 rounded bg-[#00f3ff]/80 text-black hover:bg-[#00f3ff]"
                                        title="Definir como base"
                                    >
                                        <Star className="w-3 h-3" />
                                    </button>
                                )}
                                <button
                                    onClick={() => handleRemove(img.id)}
                                    className="p-1.5 rounded bg-red-500/80 text-white hover:bg-red-500"
                                    title="Remover"
                                >
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            </div>

                            {/* Emotion badge */}
                            <div
                                className="absolute bottom-2 right-2 px-2 py-0.5 rounded text-[10px] font-medium"
                                style={{
                                    backgroundColor: EMOTIONS.find(e => e.key === img.emotion)?.color + '40',
                                    color: EMOTIONS.find(e => e.key === img.emotion)?.color
                                }}
                            >
                                {EMOTIONS.find(e => e.key === img.emotion)?.label}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Summary */}
            {images.length > 0 && (
                <div className="flex items-center justify-between text-xs text-[rgba(224,247,255,0.5)]">
                    <span>{images.length} imagem(ns)</span>
                    <span className="flex items-center gap-1">
                        <CheckCircle className="w-3 h-3 text-[#00ff88]" />
                        Base: {images.find(i => i.isBase)?.name || 'Não definida'}
                    </span>
                </div>
            )}
        </div>
    );
}
