
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
    <div className="flex-1 flex flex-col bg-transparent overflow-hidden animate-fade-in">
      <div className="px-8 py-6 border-b border-white/5 flex justify-between items-center bg-white/5 backdrop-blur-3xl flex-shrink-0">
        <h2 className="text-2xl font-black text-white tracking-tight">Galeria de Imagens</h2>
        <div className="flex items-center gap-3">
            <button
                onClick={onClearGallery}
                className="p-3 rounded-2xl bg-white/5 hover:bg-danger/10 text-white/40 hover:text-danger disabled:opacity-20 disabled:cursor-not-allowed transition-all border border-white/10 active:scale-90"
                aria-label="Limpar Galeria"
                title="Limpar Galeria"
                disabled={images.length === 0}
            >
                <TrashIcon className="w-6 h-6" />
            </button>
            <button 
                onClick={onClose} 
                className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all border border-white/10 active:scale-90"
                aria-label="Fechar Galeria"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
        </div>
      </div>
      {images.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-white/20 p-8">
          <div className="w-32 h-32 mb-8 bg-white/5 rounded-[2.5rem] flex items-center justify-center border border-white/10 shadow-2xl">
            <PhotoIcon className="w-16 h-16 opacity-20" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">Sua galeria está vazia</h3>
          <p className="text-base font-medium">As imagens que você gerar aparecerão aqui.</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
            {images.map(image => (
              <div key={image.id} className="bg-white/5 border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden group relative animate-slide-in backdrop-blur-md">
                <div className="aspect-square overflow-hidden">
                    <img 
                      src={`data:image/png;base64,${image.base64}`} 
                      alt={image.prompt} 
                      className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                    />
                </div>
                <div className="p-5 bg-black/20">
                  <p className="text-xs font-bold text-white/80 truncate mb-1" title={image.prompt}>
                    {image.prompt}
                  </p>
                  <p className="text-[10px] font-black text-highlight uppercase tracking-widest opacity-60">
                    {new Date(image.createdAt).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div className="absolute inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                    <button 
                        onClick={() => handleDownloadImage(image.base64, image.prompt)}
                        className="p-5 bg-highlight text-black rounded-2xl hover:scale-110 transition-all shadow-[0_0_30px_rgba(0,255,0,0.3)]"
                        title="Baixar Imagem"
                        aria-label="Baixar Imagem"
                    >
                        <DownloadIcon className="w-8 h-8" />
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
