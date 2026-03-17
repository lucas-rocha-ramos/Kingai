
import React, { useState, useRef, useEffect } from 'react';
import { GeneratedImage } from '../types';
import { XMarkIcon, DownloadIcon, StarIcon, ChevronLeftIcon, ChevronRightIcon } from './Icons';

interface ImagePreviewModalProps {
  isOpen: boolean;
  images: GeneratedImage[];
  startIndex: number;
  onClose: () => void;
}

const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({ isOpen, images, startIndex, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const downloadMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentIndex(startIndex);
  }, [startIndex, images]);

  const goToPrevious = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setShowPrompt(false);
    const isFirstSlide = currentIndex === 0;
    const newIndex = isFirstSlide ? images.length - 1 : currentIndex - 1;
    setCurrentIndex(newIndex);
  };

  const goToNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setShowPrompt(false);
    const isLastSlide = currentIndex === images.length - 1;
    const newIndex = isLastSlide ? 0 : currentIndex + 1;
    setCurrentIndex(newIndex);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'ArrowLeft') goToPrevious();
        if (e.key === 'ArrowRight') goToNext();
        if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
        window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
        window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, currentIndex, images]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(event.target as Node)) {
        setShowDownloadMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setShowDownloadMenu(false);
      setShowPrompt(false);
    }
  }, [isOpen]);

  if (!isOpen || images.length === 0) return null;
  
  const image = images[currentIndex];
  if (!image) return null;

  const { base64, mimeType, prompt } = image;

  const handleDownload = async (quality: 'original' | 'hd' | '2k') => {
    if (!base64 || !mimeType) return;
    setShowDownloadMenu(false);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = `data:${mimeType};base64,${base64}`;
    
    img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            alert('Não foi possível processar a imagem para download.');
            return;
        }

        let targetWidth = img.naturalWidth;
        let targetHeight = img.naturalHeight;
        const aspectRatio = img.naturalWidth / img.naturalHeight;

        if (quality === 'hd') {
            targetWidth *= 1.5;
            targetHeight *= 1.5;
        } else if (quality === '2k') {
            if (aspectRatio >= 1) { // Landscape or square
                targetWidth = 2048;
                targetHeight = 2048 / aspectRatio;
            } else { // Portrait
                targetHeight = 2048;
                targetWidth = 2048 * aspectRatio;
            }
        }

        canvas.width = Math.round(targetWidth);
        canvas.height = Math.round(targetHeight);
        
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/png');
        const promptPart = (prompt || "generated_image").replace(/[^a-z0-9]/gi, '_').substring(0, 30);
        link.download = `nanox_${promptPart}_${quality}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    img.onerror = () => {
        alert("Falha ao carregar a imagem para download. Tente novamente.");
    };
  };

  const dataUrl = `data:${mimeType};base64,${base64}`;

  return (
    <div
      className="fixed inset-0 bg-background/80 backdrop-blur-xl flex items-center justify-center z-[100] p-4 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="image-preview-title"
    >
        {images.length > 1 && (
            <button 
                onClick={goToPrevious}
                className="absolute top-1/2 left-4 -translate-y-1/2 p-2 bg-black/30 backdrop-blur-sm text-white rounded-full hover:bg-black/50 transition-colors z-20"
                aria-label="Imagem anterior"
            >
                <ChevronLeftIcon className="w-8 h-8" />
            </button>
        )}
      <div
        className="p-2 rounded-lg shadow-xl relative max-w-[90vw] max-h-[90vh] flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={dataUrl} 
          alt={prompt || "Pré-visualização da Imagem"}
          id="image-preview-title"
          className="max-w-full max-h-[calc(90vh-2rem)] object-contain rounded-md" 
        />
        
        {images.length > 1 && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/40 backdrop-blur-sm text-white text-sm font-semibold rounded-full z-20">
                {currentIndex + 1} / {images.length}
            </div>
        )}

        <div className="absolute top-3 right-3 flex flex-col items-end gap-2 z-20">
            <button onClick={onClose} className="p-1.5 bg-black/40 backdrop-blur-sm text-white rounded-full hover:bg-black/60" aria-label="Fechar"><XMarkIcon className="w-6 h-6" /></button>
            <button onClick={() => setShowPrompt(p => !p)} className="p-2 bg-black/40 backdrop-blur-sm text-white rounded-full hover:bg-black/60" title="Ver Prompt"><StarIcon className="w-5 h-5"/></button>
            <div className="relative" ref={downloadMenuRef}>
                <button onClick={() => setShowDownloadMenu(p => !p)} className="p-2 bg-black/40 backdrop-blur-sm text-white rounded-full hover:bg-black/60" title="Baixar Imagem"><DownloadIcon className="w-5 h-5"/></button>
                {showDownloadMenu && (
                    <div className="absolute top-full right-0 mt-2 w-32 bg-surface border border-border rounded-md shadow-lg z-10 py-1">
                        <button onClick={() => handleDownload('original')} className="block w-full text-left px-3 py-1.5 text-sm text-text-primary hover:bg-panel">Original</button>
                        <button onClick={() => handleDownload('hd')} className="block w-full text-left px-3 py-1.5 text-sm text-text-primary hover:bg-panel">HD (1.5x)</button>
                        <button onClick={() => handleDownload('2k')} className="block w-full text-left px-3 py-1.5 text-sm text-text-primary hover:bg-panel">2K</button>
                    </div>
                )}
            </div>
        </div>
        {showPrompt && prompt && (
            <div className="absolute bottom-4 left-4 max-w-xl p-3 bg-black/60 backdrop-blur-md text-white text-sm rounded-lg shadow-lg z-10 animate-fade-in" onClick={() => setShowPrompt(false)}>
                {prompt}
            </div>
        )}
      </div>
       {images.length > 1 && (
            <button 
                onClick={goToNext}
                className="absolute top-1/2 right-4 -translate-y-1/2 p-2 bg-black/30 backdrop-blur-sm text-white rounded-full hover:bg-black/50 transition-colors z-20"
                aria-label="Próxima imagem"
            >
                <ChevronRightIcon className="w-8 h-8" />
            </button>
        )}
    </div>
  );
};

export default ImagePreviewModal;
