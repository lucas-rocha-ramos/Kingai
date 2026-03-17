
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChatSession, Agent, VisagistaResult } from '../types';
import { CameraIcon, SparklesIcon, RefreshIcon, UploadCloudIcon } from './Icons';

interface VisagistaViewProps {
  activeChatSession: ChatSession;
  agents: Agent[];
  onAnalysis: (prompt: string, image: { base64: string; mimeType: string }) => void;
  isLoading: boolean;
  loadingMessage: string;
  onClear: () => void;
}

const VisagistaView: React.FC<VisagistaViewProps> = ({
  activeChatSession,
  agents,
  onAnalysis,
  isLoading,
  loadingMessage,
  onClear,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [prompt, setPrompt] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<{ base64: string, mimeType: string } | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    stopCamera();
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError("Não foi possível acessar a câmera. Verifique as permissões.");
    }
  }, [stopCamera]);

  const hasResults = activeChatSession.visagistaResults && activeChatSession.visagistaResults.length > 0;

  useEffect(() => {
    if (!hasResults && !uploadedImage) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [startCamera, stopCamera, hasResults, uploadedImage]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        if (!e.target?.result) return;
        const base64 = (e.target.result as string).split(',')[1];
        setUploadedImage({ base64, mimeType: file.type });
        stopCamera();
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };
  
  const handleUseCamera = () => {
      setUploadedImage(null);
      startCamera();
  };

  const handleAnalyze = () => {
    if (!prompt.trim()) {
      alert("Por favor, descreva o que você deseja analisar (ex: 'Quero um novo corte de cabelo').");
      return;
    }

    let imageToAnalyze = uploadedImage;

    if (!imageToAnalyze) {
        if (!videoRef.current || !canvasRef.current) {
            alert("A câmera não está pronta ou nenhuma imagem foi enviada.");
            return;
        }
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext('2d');
        if (context) {
          // Flip horizontal para que a imagem capturada corresponda ao espelho que o usuário vê
          context.translate(canvas.width, 0);
          context.scale(-1, 1);
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageDataUrl = canvas.toDataURL('image/jpeg', 0.9);
          const base64 = imageDataUrl.split(',')[1];
          imageToAnalyze = { base64, mimeType: 'image/jpeg' };
        }
    }
    
    if (imageToAnalyze) {
        onAnalysis(prompt, imageToAnalyze);
    }
  };


  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-background text-center p-4 animate-fade-in">
        <div className="relative mb-8">
            <SparklesIcon className="w-20 h-20 text-highlight animate-pulse" />
            <div className="absolute inset-0 bg-highlight/20 blur-2xl rounded-full animate-ping"></div>
        </div>
        <h2 className="text-2xl font-bold text-text-primary mb-2">Processando Análise</h2>
        <p className="text-text-secondary text-lg max-w-md">{loadingMessage || 'Aguarde um momento enquanto a IA trabalha...'}</p>
        <div className="mt-8 w-64 bg-surface h-1.5 rounded-full overflow-hidden">
            <div className="bg-highlight h-full animate-[progress_15s_ease-in-out_infinite]" style={{width: '30%'}}></div>
        </div>
      </div>
    );
  }

  if (hasResults) {
    return (
        <div className="flex-1 flex flex-col bg-background min-h-0 animate-fade-in">
            <header className="p-4 border-b border-border flex justify-between items-center bg-panel">
                <div>
                    <h2 className="text-xl font-bold text-text-primary">Visagismo Personalizado</h2>
                    <p className="text-xs text-text-secondary">Recomendações baseadas em seu perfil</p>
                </div>
                <button
                    onClick={onClear}
                    className="flex items-center gap-2 px-4 py-2 bg-surface text-text-primary rounded-lg text-sm font-bold hover:bg-border transition shadow-sm"
                >
                    <RefreshIcon className="w-5 h-5" />
                    <span>Novo Estudo</span>
                </button>
            </header>
            <div className="flex-1 overflow-y-auto p-4 md:p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {activeChatSession.visagistaResults?.map((result, index) => (
                        <div key={index} className="bg-panel border border-border rounded-2xl shadow-xl overflow-hidden flex flex-col animate-slide-in" style={{animationDelay: `${index * 150}ms`}}>
                            <div className="aspect-square relative group">
                                <img
                                    src={`data:${result.image.mimeType};base64,${result.image.base64}`}
                                    alt={result.title}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            </div>
                            <div className="p-5 flex flex-col flex-grow">
                                <h3 className="text-xl font-bold text-highlight">{result.title}</h3>
                                <p className="text-sm text-text-secondary mt-3 leading-relaxed flex-grow">{result.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-background min-h-0 relative">
      <div className="flex-1 w-full h-full bg-black flex items-center justify-center relative overflow-hidden">
        {error ? (
          <div className="z-10 text-center p-6 bg-danger/20 text-danger rounded-2xl max-w-md border border-danger/30">
            <p className="font-bold text-lg mb-2">Erro de Câmera</p>
            <p className="text-sm">{error}</p>
            <button onClick={startCamera} className="mt-4 px-4 py-2 bg-danger text-white rounded-lg text-sm font-bold">Tentar Novamente</button>
          </div>
        ) : (
          <div className="relative w-full h-full flex items-center justify-center">
            {uploadedImage ? (
                <img src={`data:${uploadedImage.mimeType};base64,${uploadedImage.base64}`} alt="Preview" className="max-w-full max-h-full object-contain rounded-xl shadow-2xl" />
            ) : (
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover md:object-contain transform -scale-x-100"></video>
            )}
            <div className="absolute inset-0 border-[16px] border-background/20 pointer-events-none rounded-xl"></div>
          </div>
        )}
        <canvas ref={canvasRef} className="hidden"></canvas>
      </div>

      <div className="p-6 bg-panel flex-shrink-0 border-t border-border flex flex-col md:flex-row items-center gap-4 shadow-2xl">
        <input ref={fileInputRef} type="file" onChange={handleFileChange} className="hidden" accept="image/png, image/jpeg, image/webp" />
        <div className="flex gap-2 w-full md:w-auto">
            {uploadedImage ? (
                <button onClick={handleUseCamera} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-surface text-text-primary rounded-xl text-sm font-bold hover:bg-border transition border border-border" aria-label="Usar Câmera">
                    <CameraIcon className="w-5 h-5" />
                    <span className="whitespace-nowrap">Usar Câmera</span>
                </button>
            ) : (
                <button onClick={() => fileInputRef.current?.click()} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-surface text-text-primary rounded-xl text-sm font-bold hover:bg-border transition border border-border" aria-label="Enviar Foto">
                    <UploadCloudIcon className="w-5 h-5" />
                    <span className="whitespace-nowrap">Fazer Upload</span>
                </button>
            )}
        </div>
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
          placeholder="O que você deseja mudar hoje? (ex: novo corte, barba...)"
          className="flex-1 w-full p-4 bg-surface border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-highlight/50 text-text-primary placeholder:text-text-secondary/50 text-base"
          disabled={isLoading}
        />
        <button
          onClick={handleAnalyze}
          disabled={isLoading || !prompt.trim() || (!!error && !uploadedImage)}
          className="w-full md:w-auto px-8 py-4 bg-highlight text-black rounded-xl flex items-center justify-center gap-3 font-bold hover:bg-highlight-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg active:scale-95"
          aria-label="Analisar"
        >
          <SparklesIcon className="w-6 h-6" />
          <span>Analisar Estilo</span>
        </button>
      </div>
    </div>
  );
};

export default VisagistaView;
