
import React, { useState, useEffect } from 'react';
import { CameoProfile } from '../types';
import { XMarkIcon, UploadCloudIcon, TrashIcon } from './Icons';

interface CameoSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (profile: CameoProfile) => void;
  currentProfile: CameoProfile | null;
}

const CameoSetupModal: React.FC<CameoSetupModalProps> = ({ isOpen, onClose, onSave, currentProfile }) => {
  const [images, setImages] = useState<{ base64: string, mimeType: string }[]>([]);

  useEffect(() => {
    if (currentProfile) {
      setImages(currentProfile.appearanceImages);
    } else {
      setImages([]);
    }
  }, [currentProfile, isOpen]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || images.length >= 3) return;

    const filePromises = Array.from(files).slice(0, 3 - images.length).map((file: File) => {
      return new Promise<{ base64: string, mimeType: string }>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve({ base64, mimeType: file.type });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    });

    Promise.all(filePromises).then(results => {
      setImages(prev => [...prev, ...results]);
    });

    event.target.value = '';
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    onSave({ appearanceImages: images });
  };
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-surface p-6 rounded-lg shadow-xl w-full max-w-lg text-text-primary relative" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-text-primary">Meu Cameo (SORA 2)</h2>
          <button onClick={onClose} className="p-1 text-text-secondary hover:text-text-primary rounded-full"><XMarkIcon className="w-6 h-6" /></button>
        </div>

        <p className="text-sm text-text-secondary mb-4">Envie de 1 a 3 fotos do seu rosto para criar vídeos com sua aparência. As imagens devem ter boa iluminação e mostrar seu rosto de ângulos diferentes.</p>

        <div className="grid grid-cols-3 gap-4 mb-4">
          {images.map((img, index) => (
            <div key={index} className="relative group aspect-square">
              <img src={`data:${img.mimeType};base64,${img.base64}`} alt={`Cameo ${index + 1}`} className="w-full h-full object-cover rounded-md" />
              <button onClick={() => removeImage(index)} className="absolute top-1 right-1 p-1 bg-black/50 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity">
                <TrashIcon className="w-4 h-4" />
              </button>
            </div>
          ))}
          {images.length < 3 && (
            <label htmlFor="cameo-upload" className="aspect-square border-2 border-dashed border-border rounded-md flex flex-col items-center justify-center text-text-secondary hover:bg-border hover:text-text-primary cursor-pointer transition-colors">
              <UploadCloudIcon className="w-8 h-8 mb-2" />
              <span className="text-xs text-center">Adicionar foto</span>
              <input id="cameo-upload" type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
            </label>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <button onClick={handleSave} disabled={images.length === 0} className="px-6 py-2 text-sm font-medium text-background bg-accent hover:bg-accent-hover rounded-md transition-colors disabled:opacity-50">
            Salvar Cameo
          </button>
        </div>
      </div>
    </div>
  );
};

export default CameoSetupModal;
