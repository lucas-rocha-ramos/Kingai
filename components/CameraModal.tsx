
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { XMarkIcon, CameraIcon, PaperAirplaneIcon, RefreshIcon } from './Icons';

const CameraModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onCapture: (imageDataUrl: string) => void;
}> = ({ isOpen, onClose, onCapture }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [captureState, setCaptureState] = useState<'streaming' | 'preview'>('streaming');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    if (streamRef.current) {
      stopCamera();
    }
    setError(null);
    setCaptureState('streaming');
    setCapturedImage(null);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }, // Prefer back camera
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Erro ao acessar a câmera:", err);
      if (err instanceof Error) {
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          setError("Permissão para acessar a câmera foi negada. Por favor, habilite nas configurações do seu navegador.");
        } else {
           setError("Não foi possível acessar a câmera. Verifique se ela não está sendo usada por outro aplicativo.");
        }
      } else {
          setError("Ocorreu um erro desconhecido ao tentar acessar a câmera.");
      }
    }
  }, [stopCamera]);
  
  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera]);

  const handleCaptureClick = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const context = canvas.getContext('2d');
    if (context) {
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageDataUrl = canvas.toDataURL('image/jpeg', 0.9);
      setCapturedImage(imageDataUrl);
      setCaptureState('preview');
    }
  };
  
  const handleRetake = () => {
    setCapturedImage(null);
    setCaptureState('streaming');
  };
  
  const handleAccept = () => {
    if (capturedImage) {
      onCapture(capturedImage);
    }
  };

  const handleClose = () => {
      stopCamera();
      onClose();
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in" onClick={handleClose}>
      <div className="bg-panel rounded-2xl shadow-2xl w-full max-w-2xl text-text-primary relative aspect-video flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <button onClick={handleClose} className="absolute top-3 right-3 p-1.5 text-white bg-black/40 rounded-full z-20 hover:bg-black/60" aria-label="Fechar câmera"><XMarkIcon className="w-6 h-6" /></button>
        
        {error ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <h3 className="text-lg font-semibold text-danger">Erro na Câmera</h3>
            <p className="text-sm text-text-secondary mt-2">{error}</p>
            <button onClick={startCamera} className="mt-6 px-4 py-2 text-sm font-medium text-background bg-accent hover:bg-accent-hover rounded-md transition-colors">Tentar Novamente</button>
          </div>
        ) : (
          <>
            <div className="flex-1 w-full h-full bg-black flex items-center justify-center relative">
                <video ref={videoRef} autoPlay playsInline muted className={`w-full h-full object-cover ${captureState !== 'streaming' ? 'hidden' : ''}`}></video>
                {capturedImage && (
                    <img src={capturedImage} alt="Captura da câmera" className={`w-full h-full object-cover ${captureState !== 'preview' ? 'hidden' : ''}`} />
                )}
                <canvas ref={canvasRef} className="hidden"></canvas>
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent flex items-center justify-center">
                {captureState === 'streaming' && (
                    <button onClick={handleCaptureClick} className="w-16 h-16 bg-white rounded-full border-4 border-black/30 shadow-lg flex items-center justify-center" aria-label="Tirar foto">
                        <CameraIcon className="w-8 h-8 text-background"/>
                    </button>
                )}
                {captureState === 'preview' && (
                    <div className="flex items-center gap-8">
                        <button onClick={handleRetake} className="flex flex-col items-center text-white font-medium" aria-label="Tirar outra foto">
                           <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-1 hover:bg-white/30"><RefreshIcon className="w-7 h-7"/></div>
                           <span>Repetir</span>
                        </button>
                         <button onClick={handleAccept} className="flex flex-col items-center text-white font-medium" aria-label="Usar esta foto">
                           <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mb-1 hover:bg-accent-hover"><PaperAirplaneIcon className="w-8 h-8 text-background"/></div>
                           <span>Usar Foto</span>
                        </button>
                    </div>
                )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CameraModal;
