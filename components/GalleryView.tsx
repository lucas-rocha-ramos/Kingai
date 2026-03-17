
import React from 'react';
import { GeneratedImage } from '../types';
import { XMarkIcon, DownloadIcon, TrashIcon, PhotoIcon } from './Icons';

interface GalleryViewProps {
  images: GeneratedImage[];
  onClose: () => void;
  onClearGallery: () => void;
}

const GalleryView: React.FC<GalleryViewProps> = ({ images, onClose, onClearGallery }) => {
  const handleDownloadImage = (base64Image: string, prompt: string) => {
    const link = document.createElement('a');
    link.href = `data:image/png;base64,${base64Image}`;
    link.download = `nanox_${prompt.replace(/[^a-z0-9]/gi, '_').toLowerCase().substring(0, 30) || 'gallery_image'}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex-1 flex flex-col bg-background overflow-hidden animate-fade-in">
      <div className="p-4 border-b border-border flex justify-between items-center bg-panel flex-shrink-0">
        <h2 className="text-xl font-sora font-semibold text-text-primary">Galeria de Imagens</h2>
        <div className="flex items-center space-x-2">
            <button
                onClick={onClearGallery}
                className="p-2 rounded-full hover:bg-surface text-text-secondary hover:text-danger disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Limpar Galeria"
                title="Limpar Galeria"
                disabled={images.length === 0}
            >
                <TrashIcon className="w-6 h-6" />
            </button>
            <button 
                onClick={onClose} 
                className="p-2 rounded-full hover:bg-surface text-text-secondary hover:text-text-primary transition-colors"
                aria-label="Fechar Galeria"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
        </div>
      </div>
      {images.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-text-secondary p-4">
          <PhotoIcon className="w-24 h-24 mb-4 text-border" />
          <h3 className="text-xl font-semibold text-text-primary">Sua galeria está vazia</h3>
          <p>As imagens que você gerar aparecerão aqui.</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {images.map(image => (
              <div key={image.id} className="bg-panel border border-border rounded-lg shadow-lg overflow-hidden group relative animate-slide-in">
                <img 
                  src={`data:image/png;base64,${image.base64}`} 
                  alt={image.prompt} 
                  className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="p-3">
                  <p className="text-xs text-text-secondary truncate" title={image.prompt}>
                    {image.prompt}
                  </p>
                  <p className="text-xs text-text-secondary/70 mt-1">
                    {new Date(image.createdAt).toLocaleString('pt-BR')}
                  </p>
                </div>
                <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <button 
                        onClick={() => handleDownloadImage(image.base64, image.prompt)}
                        className="p-3 bg-white/10 text-white rounded-full hover:bg-white/20 transition-colors"
                        title="Baixar Imagem"
                        aria-label="Baixar Imagem"
                    >
                        <DownloadIcon className="w-6 h-6" />
                    </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default GalleryView;
