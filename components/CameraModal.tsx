
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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-3xl flex items-center justify-center z-[110] p-4 animate-fade-in" onClick={handleClose}>
      <div className="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[3rem] shadow-2xl w-full max-w-3xl text-white relative aspect-video flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <button onClick={handleClose} className="absolute top-6 right-6 p-3 text-white bg-black/40 backdrop-blur-xl rounded-2xl z-20 hover:bg-white/10 transition-all active:scale-90" aria-label="Fechar câmera"><XMarkIcon className="w-6 h-6" /></button>
        
        {error ? (
          <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
            <h3 className="text-2xl font-black text-red-400 uppercase tracking-tighter">Erro na Câmera</h3>
            <p className="text-sm font-bold text-white/40 mt-4 uppercase tracking-widest">{error}</p>
            <button onClick={startCamera} className="mt-10 px-8 py-4 text-base font-black text-black bg-highlight hover:scale-105 rounded-2xl transition-all active:scale-95 uppercase tracking-widest shadow-2xl shadow-highlight/20">Tentar Novamente</button>
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

            <div className="absolute bottom-0 left-0 right-0 p-10 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-center">
                {captureState === 'streaming' && (
                    <button onClick={handleCaptureClick} className="w-20 h-20 bg-white rounded-full border-[6px] border-black/30 shadow-2xl flex items-center justify-center hover:scale-110 active:scale-90 transition-all" aria-label="Tirar foto">
                        <CameraIcon className="w-10 h-10 text-black"/>
                    </button>
                )}
                {captureState === 'preview' && (
                    <div className="flex items-center gap-12">
                        <button onClick={handleRetake} className="flex flex-col items-center text-white/60 font-black text-[10px] uppercase tracking-[0.2em] hover:text-white transition-all" aria-label="Tirar outra foto">
                           <div className="w-16 h-16 bg-white/10 backdrop-blur-xl rounded-full flex items-center justify-center mb-3 hover:bg-white/20 border border-white/10"><RefreshIcon className="w-8 h-8"/></div>
                           <span>Repetir</span>
                        </button>
                         <button onClick={handleAccept} className="flex flex-col items-center text-white font-black text-[10px] uppercase tracking-[0.2em] hover:text-highlight transition-all" aria-label="Usar esta foto">
                           <div className="w-20 h-20 bg-highlight rounded-full flex items-center justify-center mb-3 hover:scale-110 shadow-2xl shadow-highlight/20"><PaperAirplaneIcon className="w-10 h-10 text-black"/></div>
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
