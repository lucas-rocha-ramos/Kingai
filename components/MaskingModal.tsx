import React, { useRef, useEffect, useState } from 'react';
import { X, Brush, Trash2, Check, Undo } from 'lucide-react';

interface MaskingModalProps {
  isOpen: boolean;
  onClose: () => void;
  image: { base64: string; mimeType: string };
  onSaveMask: (maskBase64: string) => void;
}

const MaskingModal: React.FC<MaskingModalProps> = ({ isOpen, onClose, image, onSaveMask }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(30);
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    if (isOpen && canvasRef.current && maskCanvasRef.current) {
      const canvas = canvasRef.current;
      const maskCanvas = maskCanvasRef.current;
      const ctx = canvas.getContext('2d');
      const maskCtx = maskCanvas.getContext('2d');
      
      const img = new Image();
      img.onload = () => {
        // Set dimensions based on image
        const maxWidth = window.innerWidth * 0.8;
        const maxHeight = window.innerHeight * 0.7;
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
        if (height > maxHeight) {
          width *= maxHeight / height;
          height = maxHeight;
        }

        canvas.width = width;
        canvas.height = height;
        maskCanvas.width = width;
        maskCanvas.height = height;

        ctx?.drawImage(img, 0, 0, width, height);
        
        // Prepare mask context (black background)
        if (maskCtx) {
          maskCtx.fillStyle = 'black';
          maskCtx.fillRect(0, 0, width, height);
        }
      };
      img.src = `data:${image.mimeType};base64,${image.base64}`;
    }
  }, [isOpen, image]);

  const [lastPos, setLastPos] = useState<{ x: number, y: number } | null>(null);

  const getCoords = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    // Scale coordinates based on canvas internal resolution vs display size
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    const coords = getCoords(e);
    setLastPos(coords);
    draw(e, coords);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent, currentCoords?: {x: number, y: number}) => {
    if (!isDrawing || !canvasRef.current || !maskCanvasRef.current) return;
    const coords = currentCoords || getCoords(e);
    
    const ctx = canvasRef.current.getContext('2d');
    const maskCtx = maskCanvasRef.current.getContext('2d');

    if (ctx && maskCtx) {
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.lineWidth = brushSize;
      ctx.strokeStyle = 'rgba(255, 215, 0, 0.5)'; // Semi-transparent gold

      maskCtx.lineJoin = 'round';
      maskCtx.lineCap = 'round';
      maskCtx.lineWidth = brushSize;
      maskCtx.strokeStyle = 'white';

      if (lastPos) {
        ctx.beginPath();
        ctx.moveTo(lastPos.x, lastPos.y);
        ctx.lineTo(coords.x, coords.y);
        ctx.stroke();

        maskCtx.beginPath();
        maskCtx.moveTo(lastPos.x, lastPos.y);
        maskCtx.lineTo(coords.x, coords.y);
        maskCtx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(coords.x, coords.y, brushSize / 2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 215, 0, 0.5)';
        ctx.fill();

        maskCtx.beginPath();
        maskCtx.arc(coords.x, coords.y, brushSize / 2, 0, Math.PI * 2);
        maskCtx.fillStyle = 'white';
        maskCtx.fill();
      }
      
      setLastPos(coords);
      setHasDrawn(true);
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    setLastPos(null);
  };

  const clearMask = () => {
    if (canvasRef.current && maskCanvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      const maskCtx = maskCanvasRef.current.getContext('2d');
      const img = new Image();
      img.onload = () => {
        ctx?.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
        ctx?.drawImage(img, 0, 0, canvasRef.current!.width, canvasRef.current!.height);
        maskCtx!.fillStyle = 'black';
        maskCtx!.fillRect(0, 0, maskCanvasRef.current!.width, maskCanvasRef.current!.height);
        setHasDrawn(false);
      };
      img.src = `data:${image.mimeType};base64,${image.base64}`;
    }
  };

  const handleSave = () => {
    if (!maskCanvasRef.current) return;
    const maskBase64 = maskCanvasRef.current.toDataURL('image/png').split(',')[1];
    onSaveMask(maskBase64);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center z-[110] p-4 animate-fade-in">
      <div className="w-full max-w-4xl flex flex-col items-center">
        <div className="w-full flex justify-between items-center mb-4 text-white">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Brush className="w-6 h-6 text-highlight" />
              Marcar Área para Edição
            </h2>
            <p className="text-xs text-text-secondary">Pinte a parte da foto que você deseja que o Nano Banana altere.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface rounded-full transition-colors">
            <X className="w-7 h-7" />
          </button>
        </div>

        <div className="relative bg-panel border border-border rounded-xl overflow-hidden cursor-crosshair shadow-2xl">
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            className="block max-w-full"
          />
          <canvas ref={maskCanvasRef} className="hidden" />
        </div>

        <div className="w-full mt-6 flex flex-wrap items-center justify-between gap-4 bg-surface p-4 rounded-2xl border border-border">
          <div className="flex items-center gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase font-bold text-text-secondary">Tamanho do Pincel</label>
              <input 
                type="range" min="10" max="100" value={brushSize} 
                onChange={(e) => setBrushSize(parseInt(e.target.value))}
                className="w-32 accent-highlight"
              />
            </div>
            <button onClick={clearMask} className="flex items-center gap-2 px-4 py-2 bg-panel hover:bg-border text-sm text-white rounded-lg transition-colors border border-border">
              <Trash2 className="w-4 h-4 text-danger" /> Limpar
            </button>
          </div>

          <button 
            onClick={handleSave}
            disabled={!hasDrawn}
            className="flex items-center gap-2 px-8 py-3 bg-highlight text-black font-bold rounded-xl hover:bg-highlight-hover transition-all disabled:opacity-30 shadow-lg active:scale-95"
          >
            <Check className="w-5 h-5" /> Confirmar Seleção
          </button>
        </div>
      </div>
    </div>
  );
};

export default MaskingModal;