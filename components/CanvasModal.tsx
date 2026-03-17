
import React, { useRef, useEffect, useState } from 'react';
import { 
    XMarkIcon, TrashIcon, SparklesIcon, PencilScribbleIcon, 
    UndoIcon, RedoIcon, BrushIcon, EraserIcon, LightBulbIcon, RefreshIcon
} from './Icons';
import { interpretCanvasSketch, generateImageFromCanvas } from '../services/geminiService';
import { GeneratedImage, AIMode } from '../types';

// Sub-components for a cleaner structure
const ToolButton: React.FC<{ label: string; isActive?: boolean; isDisabled?: boolean; onClick: () => void; children: React.ReactNode }> = ({ label, isActive, isDisabled, onClick, children }) => (
    <button
        onClick={onClick}
        title={label}
        aria-label={label}
        disabled={isDisabled}
        className={`p-2.5 rounded-lg transition-colors duration-200 ${isActive ? 'bg-highlight text-white' : 'bg-surface text-text-secondary hover:bg-border'} disabled:opacity-50 disabled:cursor-not-allowed`}
    >
        {children}
    </button>
);

const PreviewPanel: React.FC<{
  step: 'drawing' | 'interpreting' | 'awaiting_style' | 'generating' | 'success' | 'error';
  image: GeneratedImage | null;
  error: string | null;
  basePrompt: string;
  styleInput: string;
  onStyleInputChange: (value: string) => void;
  onStylePresetClick: (style: string) => void;
}> = ({ step, image, error, basePrompt, styleInput, onStyleInputChange, onStylePresetClick }) => {
    
    const renderContent = () => {
        switch (step) {
            case 'interpreting':
            case 'generating':
                return (
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center text-white z-10 transition-opacity duration-300">
                        <SparklesIcon className="w-12 h-12 text-highlight animate-pulse" />
                        <p className="mt-4 font-semibold">{step === 'interpreting' ? 'Interpretando desenho...' : 'Gerando sua obra de arte...'}</p>
                    </div>
                );
            case 'awaiting_style':
                return (
                    <div className="p-4 sm:p-6 text-center text-text-secondary flex flex-col items-center justify-center animate-fade-in w-full h-full">
                        <LightBulbIcon className="w-12 h-12 mb-4 text-highlight" />
                        <h3 className="text-lg font-semibold text-text-primary">Qual estilo você deseja?</h3>
                        <p className="mt-1 text-sm mb-4">A IA interpretou seu desenho como: <strong className="text-text-primary">"{basePrompt}"</strong></p>
                        
                        <div className="w-full space-y-3">
                            <input 
                                type="text"
                                value={styleInput}
                                onChange={(e) => onStyleInputChange(e.target.value)}
                                placeholder="Digite um estilo (ex: Realista, proporção 9:16)"
                                className="w-full p-2.5 bg-panel border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-highlight text-text-primary"
                            />
                            <div className="flex gap-2 justify-center">
                                <button onClick={() => onStylePresetClick('Realista')} className="px-3 py-1 bg-border text-xs rounded-full hover:bg-highlight hover:text-white transition-colors">Realista</button>
                                <button onClick={() => onStylePresetClick('Desenho')} className="px-3 py-1 bg-border text-xs rounded-full hover:bg-highlight hover:text-white transition-colors">Desenho</button>
                                <button onClick={() => onStylePresetClick('Arte de Fantasia')} className="px-3 py-1 bg-border text-xs rounded-full hover:bg-highlight hover:text-white transition-colors">Fantasia</button>
                            </div>
                        </div>
                    </div>
                );
            case 'error':
                return (
                     <div className="p-6 text-center text-danger">
                        <p className="font-bold mb-1">Oops! Algo deu errado.</p>
                        <p className="text-sm">{error}</p>
                    </div>
                );
            case 'success':
                 return image ? (
                    <div className="w-full h-full relative group animate-fade-in">
                        <img src={`data:${image.mimeType};base64,${image.base64}`} alt="Imagem gerada a partir do desenho" className="w-full h-full object-contain" />
                    </div>
                 ) : null;
            case 'drawing':
            default:
                 return (
                    <div className="p-6 text-center text-text-secondary flex flex-col items-center">
                        <PencilScribbleIcon className="w-16 h-16 mb-4" />
                        <h3 className="text-lg font-semibold text-text-primary">1. Desenhe sua ideia.</h3>
                        <p className="mt-1">Solte sua criatividade no quadro.</p>
                        <h3 className="text-lg font-semibold text-text-primary mt-6">2. Clique em "Avançar".</h3>
                        <p className="mt-1">A IA vai interpretar seu esboço.</p>
                    </div>
                );
        }
    };

    return (
        <div className="flex-1 bg-surface border border-border rounded-lg flex items-center justify-center relative aspect-square overflow-hidden">
            {renderContent()}
        </div>
    );
};

const CanvasToolbar: React.FC<{
    tool: 'pen' | 'eraser';
    setTool: (tool: 'pen' | 'eraser') => void;
    color: string;
    setColor: (color: string) => void;
    lineWidth: number;
    setLineWidth: (width: number) => void;
    undo: () => void;
    redo: () => void;
    canUndo: boolean;
    canRedo: boolean;
    clear: () => void;
}> = ({ tool, setTool, color, setColor, lineWidth, setLineWidth, undo, redo, canUndo, canRedo, clear }) => (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-panel/80 backdrop-blur-md border border-border rounded-full shadow-2xl p-2 flex items-center gap-2">
        <ToolButton label="Desfazer" onClick={undo} isDisabled={!canUndo}><UndoIcon className="w-5 h-5" /></ToolButton>
        <ToolButton label="Refazer" onClick={redo} isDisabled={!canRedo}><RedoIcon className="w-5 h-5" /></ToolButton>
        <div className="w-px h-6 bg-border mx-1"></div>
        <ToolButton label="Caneta" onClick={() => setTool('pen')} isActive={tool === 'pen'}><BrushIcon className="w-5 h-5" /></ToolButton>
        <ToolButton label="Borracha" onClick={() => setTool('eraser')} isActive={tool === 'eraser'}><EraserIcon className="w-5 h-5" /></ToolButton>
        <div className="w-px h-6 bg-border mx-1"></div>
        <div className="flex items-center gap-3 bg-surface rounded-full px-4 py-1.5">
            <input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-7 h-7 p-0 border-none rounded-full bg-transparent cursor-pointer disabled:opacity-50" title="Seletor de Cor" disabled={tool === 'eraser'} />
            <input id="lineWidth" type="range" min="2" max="60" value={lineWidth} onChange={e => setLineWidth(Number(e.target.value))} className="w-24 h-1.5 bg-border rounded-lg appearance-none cursor-pointer accent-highlight" title="Tamanho do Pincel" />
        </div>
        <div className="w-px h-6 bg-border mx-1"></div>
        <ToolButton label="Limpar Tela" onClick={clear}><TrashIcon className="w-5 h-5 text-danger" /></ToolButton>
    </div>
);


// Main Component
const CanvasModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onAccept: (image: GeneratedImage) => void;
  currentMode: AIMode;
}> = ({ isOpen, onClose, onAccept, currentMode }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [context, setContext] = useState<CanvasRenderingContext2D | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  
  // Drawing Tool State
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
  const [lineWidth, setLineWidth] = useState(8);
  const [color, setColor] = useState('#FFFFFF');

  // Undo/Redo State
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Generation State
  const [step, setStep] = useState<'drawing' | 'interpreting' | 'awaiting_style' | 'generating' | 'success' | 'error'>('drawing');
  const [basePrompt, setBasePrompt] = useState('');
  const [styleInput, setStyleInput] = useState('');
  const [generatedImage, setGeneratedImage] = useState<GeneratedImage | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  
  const saveHistory = () => {
    if (!context || !canvasRef.current) return;
    const imageData = context.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
    const newHistory = history.slice(0, historyIndex + 1);
    setHistory([...newHistory, imageData]);
    setHistoryIndex(newHistory.length);
  };

  const undo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      context?.putImageData(history[newIndex], 0, 0);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      context?.putImageData(history[newIndex], 0, 0);
    }
  };

  const resetForNewDrawing = () => {
    setStep('drawing');
    setBasePrompt('');
    setStyleInput('');
    setGeneratedImage(null);
    setGenerationError(null);
  };
  
  const resetForIterativeGeneration = () => {
    setStep('drawing');
    setBasePrompt('');
    setGeneratedImage(null);
    setGenerationError(null);
    // Note: styleInput is preserved for convenience
  };

  const clearCanvas = () => {
    if (context && canvasRef.current) {
      context.fillStyle = '#1D1D1F';
      context.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      saveHistory();
      resetForNewDrawing();
    }
  };

  const handleInterpret = async () => {
    if (!canvasRef.current || step === 'interpreting' || step === 'generating') return;
    setStep('interpreting');
    setGenerationError(null);

    const canvasDataUrl = canvasRef.current.toDataURL('image/png');
    const base64Data = canvasDataUrl.split(',')[1];
    const interpretResult = await interpretCanvasSketch(base64Data);
    
    // FIX: Narrow result type using 'in' operator before access
    if ('error' in interpretResult) {
        setGenerationError(interpretResult.error || "A IA não conseguiu interpretar o desenho.");
        setStep('error');
    } else if ('prompt' in interpretResult && interpretResult.prompt) {
        setBasePrompt(interpretResult.prompt);
        setStep('awaiting_style');
    } else {
        setGenerationError("A IA não retornou um prompt válido.");
        setStep('error');
    }
  };

  const handleGenerate = async () => {
    if (!basePrompt || !styleInput || step === 'generating') return;
    setStep('generating');
    setGenerationError(null);

    // Capture the sketch again to use as reference
    const canvasDataUrl = canvasRef.current?.toDataURL('image/png');
    const sketch = canvasDataUrl ? { base64: canvasDataUrl.split(',')[1], mimeType: 'image/png' } : undefined;

    const result = await generateImageFromCanvas(
      basePrompt,
      styleInput,
      currentMode,
      sketch
    );
    
    // FIX: Narrow result type and check for images array
    if ('images' in result && result.images && result.images.length > 0) {
      setGeneratedImage(result.images[0]);
      setStep('success');
    } else {
      const errorMsg = ('error' in result ? result.error : null) || "A geração final da imagem falhou.";
      setGenerationError(errorMsg);
      setStep('error');
    }
  };

  // Initialize canvas on open
  useEffect(() => {
    if (isOpen && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        setContext(ctx);
        // Clear and reset state on open
        ctx.fillStyle = '#1D1D1F';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const initialImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        setHistory([initialImageData]);
        setHistoryIndex(0);
        resetForNewDrawing();
      }
    }
  }, [isOpen]);

  // Drawing functions
  const getCoords = (event: React.MouseEvent<HTMLCanvasElement>): {x: number, y: number} => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (canvas.width / rect.width),
      y: (event.clientY - rect.top) * (canvas.height / rect.height)
    };
  }

  const startDrawing = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (step === 'success' || step === 'error') {
        resetForIterativeGeneration();
    }
    
    if (!context) return;
    const { x, y } = getCoords(event);
    setIsDrawing(true);
    context.beginPath();
    context.moveTo(x, y);
    context.lineWidth = lineWidth;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.strokeStyle = color;
    context.globalCompositeOperation = tool === 'pen' ? 'source-over' : 'destination-out';
  };

  const draw = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !context) return;
    const { x, y } = getCoords(event);
    context.lineTo(x, y);
    context.stroke();
  };

  const stopDrawing = () => {
    if (!context || !isDrawing) return;
    context.closePath();
    setIsDrawing(false);
    saveHistory();
  };

  const handleAccept = () => {
    if (generatedImage) {
      onAccept(generatedImage);
      onClose();
    }
  };

  const renderActionButton = () => {
      const isLoading = step === 'interpreting' || step === 'generating';
      switch (step) {
          case 'drawing':
              return <button onClick={handleInterpret} disabled={isLoading} className="w-full px-6 py-3 text-lg font-semibold text-white bg-highlight hover:bg-highlight-hover rounded-lg transition-colors disabled:opacity-50">Avançar</button>;
          case 'awaiting_style':
              return <button onClick={handleGenerate} disabled={isLoading || !styleInput.trim()} className="w-full px-6 py-3 text-lg font-semibold text-white bg-highlight hover:bg-highlight-hover rounded-lg transition-colors disabled:opacity-50">Gerar Imagem</button>;
          case 'error':
              return <button onClick={() => {
                  if (basePrompt) {
                      setStep('awaiting_style');
                  } else {
                      setStep('drawing');
                  }
                  setGenerationError(null);
              }} className="w-full px-6 py-3 text-lg font-semibold text-white bg-danger hover:bg-opacity-80 rounded-lg transition-colors">Tentar Novamente</button>;
      }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col p-4 sm:p-6" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
          <h2 className="text-2xl font-semibold text-text-primary">Estúdio Mágico</h2>
          <button onClick={onClose} className="p-1.5 text-text-secondary hover:text-text-primary rounded-full" aria-label="Fechar Estúdio Mágico">
            <XMarkIcon className="w-7 h-7" />
          </button>
        </div>

        <div className="flex-1 flex flex-col md:flex-row gap-6 min-h-0">
          {/* Left Panel: Canvas and Controls */}
          <div className="w-full md:w-[60%] flex flex-col gap-4 relative">
            <div className="flex-grow bg-panel border border-border rounded-lg overflow-hidden aspect-square">
              <canvas
                ref={canvasRef}
                width={512}
                height={512}
                className="w-full h-full cursor-crosshair"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
              />
            </div>
            <CanvasToolbar 
                tool={tool} setTool={setTool}
                color={color} setColor={setColor}
                lineWidth={lineWidth} setLineWidth={setLineWidth}
                undo={undo} redo={redo}
                canUndo={historyIndex > 0} canRedo={historyIndex < history.length - 1}
                clear={clearCanvas}
            />
          </div>

          {/* Right Panel: Preview */}
          <div className="w-full md:w-[40%] flex flex-col">
            <PreviewPanel 
                step={step} 
                image={generatedImage} 
                error={generationError}
                basePrompt={basePrompt}
                styleInput={styleInput}
                onStyleInputChange={setStyleInput}
                onStylePresetClick={setStyleInput}
            />
             <div className="mt-4 pt-4 border-t border-border flex justify-end flex-shrink-0">
                 {step === 'success' && generatedImage ? (
                    <div className="flex w-full gap-4">
                        <button 
                            onClick={handleGenerate} 
                            className="flex-1 px-4 py-3 text-md font-semibold text-text-primary bg-panel hover:bg-border rounded-lg transition-colors flex items-center justify-center gap-2"
                            aria-label="Gerar uma nova variação da imagem"
                        >
                            <RefreshIcon className="w-5 h-5"/>
                            Gerar Novamente
                        </button>
                        <button 
                            onClick={handleAccept} 
                            className="flex-1 px-4 py-3 text-md font-semibold text-white bg-success hover:bg-opacity-90 rounded-lg transition-colors"
                        >
                            Usar esta Imagem
                        </button>
                    </div>
                ) : (step === 'interpreting' || step === 'generating') ? (
                    <button disabled className="w-full px-6 py-3 text-lg font-semibold text-white bg-highlight rounded-lg opacity-50 flex items-center justify-center">Gerando...</button>
                ) : (
                    renderActionButton()
                )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CanvasModal;
