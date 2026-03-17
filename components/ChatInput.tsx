
import React, { useState, useRef, useEffect } from 'react';
import { AIMode, GenerationTools, GeneratedImage } from '../types'; 
import { 
    Paperclip, Send, X, Settings2, Lightbulb, 
    Telescope, Sparkles, Globe, Pencil, Image as ImageIcon, 
    Camera, Mic, Video, Brush, Plus, Key
} from 'lucide-react';
import CameraModal from './CameraModal';
import MaskingModal from './MaskingModal';

interface ChatInputProps {
  onSendMessage: (
    inputText: string,
    imageGenerationPrompt?: string,
    userImages?: { base64: string; mimeType: string }[],
    userAudio?: { base64: string; mimeType: string },
    trueOriginalUserImagePromptForVariation?: string,
    numberOfImages?: number,
    tools?: GenerationTools,
    imageSource?: 'upload' | 'canvas',
    isSuperPrompt?: boolean,
    overrideAspectRatio?: string,
    maskImage?: { base64: string; mimeType: string; }
  ) => void;
  onSendPreGenerated: (prompt: string, image: GeneratedImage) => void;
  isLoading: boolean;
  currentMode: AIMode;
  isPhotoShootActive?: boolean;
  hasPhotoShootBaseImage?: boolean;
  pendingVariationInput?: {
    enhancedPrompt: string;
    referenceImageBase64?: string;
    referenceImageMimeType?: string;
    lineageOriginalUserPrompt?: string;
  } | null;
  superPromptStatus: 'idle' | 'describing' | 'awaiting_user_feedback' | 'unifying';
  isCanvasOpen: boolean;
  setIsCanvasOpen: (isOpen: boolean) => void;
  apiKeyStatus?: 'unknown' | 'ok' | 'not_set';
  onConfigureApiKey?: () => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage, onSendPreGenerated, isLoading, currentMode,
  isPhotoShootActive,
  hasPhotoShootBaseImage,
  pendingVariationInput,
  superPromptStatus,
  isCanvasOpen,
  setIsCanvasOpen,
  apiKeyStatus,
  onConfigureApiKey,
}) => {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedFilePreviews, setSelectedFilePreviews] = useState<string[]>([]);
  const [imageSource, setImageSource] = useState<'upload' | 'canvas' | null>(null);
  const [numberOfImagesToGenerate, setNumberOfImagesToGenerate] = useState<number>(1);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [isMaskingModalOpen, setIsMaskingModalOpen] = useState(false);
  const [maskBase64, setMaskBase64] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);
  
  // Tools state
  const [webSearch, setWebSearch] = useState(false);
  const [thinkLonger, setThinkLonger] = useState(false);
  const [forceImage, setForceImage] = useState(false);

  const canAttachFile = (currentMode === AIMode.Ultra || currentMode === AIMode.DesignStudio || currentMode === AIMode.AgentChat || currentMode === AIMode.VideoProtons || currentMode === AIMode.KingStudio || currentMode === AIMode.EditorKing) && !pendingVariationInput && superPromptStatus === 'idle';
  const canRecordAudio = (currentMode === AIMode.Ultra || currentMode === AIMode.AgentChat);

  useEffect(() => {
    if (!isLoading && !isRecording) {
      textareaRef.current?.focus();
    }
  }, [isLoading, isRecording]);

  useEffect(() => {
    if (!pendingVariationInput && superPromptStatus === 'idle') {
        const canGenerateImages = currentMode === AIMode.Ultra || currentMode === AIMode.DesignStudio || currentMode === AIMode.AgentChat;
        if (!canGenerateImages) {
            setNumberOfImagesToGenerate(1); 
        }
        setText('');
        setSelectedFiles([]); 
        setSelectedFilePreviews([]);
        setMaskBase64(null);
        setImageSource(null);
        setWebSearch(false);
        setThinkLonger(false);
        setForceImage(false);
        if (textareaRef.current) { textareaRef.current.style.height = 'auto'; }
    }
  }, [currentMode, pendingVariationInput, superPromptStatus]); 

  const getPlaceholderText = () => {
    if (isPhotoShootActive) {
        return hasPhotoShootBaseImage ? 'Digite os prompts numerados...' : 'Envie uma imagem para o ensaio...';
    }
    if (maskBase64) return "O que você deseja mudar?";
    if (superPromptStatus === 'awaiting_user_feedback') return "Digite suas modificações...";
    if (pendingVariationInput) return "Edite o prompt..."; 
    if (currentMode === AIMode.VideoProtons) return "Descreva seu vídeo...";
    return "Digite algo aqui";
  };

  const processImageFiles = (files: FileList | null) => {
    if (pendingVariationInput || superPromptStatus !== 'idle' || !files) return;
    
    // In EditorKing mode, we only allow one image at a time for masking
    if (currentMode === AIMode.EditorKing) {
      const file = files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setSelectedFiles([file]);
          setSelectedFilePreviews([e.target!.result as string]);
          setImageSource('upload');
          setIsMaskingModalOpen(true);
        }
      };
      reader.readAsDataURL(file);
      return;
    }

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setSelectedFiles(f => [...f, file]);
          setSelectedFilePreviews(p => [...p, e.target!.result as string]);
          setImageSource('upload');
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    processImageFiles(e.target.files);
    e.target.value = '';
  };

  const handleSubmit = (e?: React.FormEvent, audioData?: { base64: string, mimeType: string }) => {
    e?.preventDefault();
    if (isLoading || (!text.trim() && selectedFiles.length === 0 && !audioData)) return; 
    
    const mainInputText = text.trim();
    let userImagesPayload: { base64: string; mimeType: string }[] | undefined = undefined;
    let maskPayload: { base64: string; mimeType: string } | undefined = undefined;

    if (audioData) {
        onSendMessage(mainInputText, undefined, undefined, audioData);
    } else if (selectedFiles.length > 0) {
      userImagesPayload = selectedFilePreviews.map((preview, index) => ({
          base64: preview.split(',')[1],
          mimeType: selectedFiles[index].type
      }));
      if (maskBase64) {
          maskPayload = { base64: maskBase64, mimeType: 'image/png' };
      }
      onSendMessage(mainInputText, undefined, userImagesPayload, undefined, undefined, numberOfImagesToGenerate, { webSearch, thinkLonger, forceImage }, imageSource || 'upload', false, undefined, maskPayload);
    } else {
      onSendMessage(mainInputText, (currentMode === AIMode.DesignStudio ? mainInputText : undefined), undefined, undefined, undefined, numberOfImagesToGenerate, { webSearch, thinkLonger, forceImage });
    }

    setText('');
    setSelectedFiles([]);
    setSelectedFilePreviews([]);
    setMaskBase64(null);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };
  
  const startRecording = async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRef.current = new MediaRecorder(stream);
        audioChunksRef.current = [];
        mediaRecorderRef.current.ondataavailable = event => audioChunksRef.current.push(event.data);
        mediaRecorderRef.current.onstop = () => {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = (reader.result as string).split(',')[1];
                handleSubmit(undefined, { base64: base64String, mimeType: 'audio/webm' });
            };
            reader.readAsDataURL(audioBlob);
            stream.getTracks().forEach(track => track.stop());
        };
        mediaRecorderRef.current.start();
        setIsRecording(true);
        setRecordingTime(0);
        recordingTimerRef.current = window.setInterval(() => setRecordingTime(prev => prev + 1), 1000);
    } catch (err) { alert("Erro ao acessar microfone."); }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) mediaRecorderRef.current.stop();
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    setIsRecording(false);
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-2 md:px-6 pb-4 md:pb-6 pt-2 safe-bottom z-10">
        {apiKeyStatus === 'not_set' && (
            <div className="mb-3 p-3 bg-danger/10 border border-danger/20 rounded-2xl flex items-center justify-between animate-fade-in">
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-danger rounded-full animate-pulse" />
                    <p className="text-[9px] md:text-xs font-bold text-danger uppercase tracking-widest">API Key Pendente</p>
                </div>
                <button 
                    onClick={onConfigureApiKey}
                    className="px-3 py-1.5 bg-danger text-white text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-danger/80 transition-all active:scale-95"
                >
                    Configurar
                </button>
            </div>
        )}
        <div className="relative flex flex-col bg-black/40 backdrop-blur-3xl rounded-[2rem] md:rounded-[2.5rem] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-all focus-within:border-highlight/30 focus-within:shadow-[0_0_60px_rgba(0,255,0,0.08)] overflow-hidden">
            
            {/* Image Previews */}
            {selectedFilePreviews.length > 0 && (
                <div className="flex gap-3 p-4 md:p-6 overflow-x-auto no-scrollbar border-b border-white/5 bg-white/5">
                    {selectedFilePreviews.map((preview, index) => (
                        <div key={index} className="relative group flex-shrink-0">
                            <img src={preview} className="h-20 w-20 md:h-24 md:w-24 object-cover rounded-2xl border border-white/10 shadow-2xl" alt="" />
                            
                            {currentMode === AIMode.EditorKing && (
                                <button 
                                    onClick={() => setIsMaskingModalOpen(true)}
                                    className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-all rounded-2xl"
                                    title="Editar máscara"
                                >
                                    <Brush className="w-8 h-8 text-white" />
                                </button>
                            )}

                            <button 
                                onClick={() => {
                                    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
                                    setSelectedFilePreviews(prev => prev.filter((_, i) => i !== index));
                                    if (currentMode === AIMode.EditorKing) setMaskBase64(null);
                                }}
                                className="absolute -top-2 -right-2 bg-black/80 backdrop-blur-md text-white rounded-full p-2 border border-white/10 opacity-0 group-hover:opacity-100 transition-all shadow-2xl hover:bg-danger"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col">
                <div className="flex items-end gap-2 md:gap-3 p-3 md:p-4">
                    {/* Left Actions */}
                    <div className="flex items-center mb-1">
                        {canAttachFile && (
                            <>
                                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" multiple />
                                <button 
                                    type="button" 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="p-3 text-white/40 hover:text-highlight hover:bg-white/5 rounded-2xl transition-all active:scale-90 no-tap-highlight"
                                    title="Anexar imagem"
                                >
                                    <Plus className="w-7 h-7" />
                                </button>
                            </>
                        )}
                    </div>

                    {/* Textarea */}
                    <div className="flex-1 min-w-0 py-1">
                        {isRecording ? (
                            <div className="flex items-center gap-4 px-5 py-3 bg-highlight/5 rounded-2xl border border-highlight/20 animate-pulse">
                                <div className="w-3 h-3 bg-red-500 rounded-full shadow-[0_0_15px_rgba(239,68,68,0.8)]" />
                                <span className="text-base font-mono text-highlight tracking-[0.2em] font-black">
                                    {new Date(recordingTime * 1000).toISOString().substr(14, 5)}
                                </span>
                                <button type="button" onClick={stopRecording} className="text-[10px] text-highlight font-black uppercase tracking-widest hover:underline ml-auto">Parar</button>
                            </div>
                        ) : (
                            <textarea
                                ref={textareaRef}
                                value={text}
                                onChange={(e) => {
                                    setText(e.target.value);
                                    e.target.style.height = 'auto';
                                    e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSubmit();
                                    }
                                }}
                                placeholder={getPlaceholderText()}
                                className="w-full bg-transparent border-none focus:ring-0 text-white placeholder-white/20 text-base md:text-lg resize-none max-h-[150px] custom-scrollbar py-2 leading-relaxed font-medium"
                                rows={1}
                                disabled={isLoading}
                            />
                        )}
                    </div>

                    {/* Right Actions */}
                    <div className="flex items-center mb-1">
                        {canRecordAudio && !text.trim() && selectedFiles.length === 0 && (
                            <button 
                                type="button"
                                onMouseDown={startRecording}
                                onMouseUp={stopRecording}
                                className={`p-3 rounded-2xl transition-all active:scale-90 no-tap-highlight ${isRecording ? 'text-red-500 bg-red-500/10 shadow-inner' : 'text-white/40 hover:text-highlight hover:bg-white/5'}`}
                                title="Gravar áudio"
                            >
                                <Mic className="w-7 h-7" />
                            </button>
                        )}
                        
                        <button 
                            type="submit"
                            disabled={isLoading || (!text.trim() && selectedFiles.length === 0)}
                            className={`p-3 rounded-2xl transition-all active:scale-90 no-tap-highlight ${(!text.trim() && selectedFiles.length === 0) ? 'text-white/5' : 'text-highlight bg-highlight/10 shadow-xl shadow-highlight/10 hover:bg-highlight/20'}`}
                            title="Enviar"
                        >
                            <Send className="w-7 h-7" />
                        </button>
                    </div>
                </div>

                {/* Bottom Tools Bar */}
                <div className="flex items-center justify-between px-4 md:px-8 py-3.5 border-t border-white/5 bg-white/5 overflow-x-auto no-scrollbar">
                    <div className="flex items-center gap-5 md:gap-8 flex-shrink-0">
                        <button 
                            type="button"
                            onClick={() => setWebSearch(!webSearch)}
                            className={`flex items-center gap-3 text-[10px] font-black uppercase tracking-widest transition-all ${webSearch ? 'text-highlight' : 'text-white/30 hover:text-white'}`}
                        >
                            <Globe className="w-4 h-4" />
                            <span>Pesquisa</span>
                        </button>

                        {currentMode === AIMode.Ultra && (
                            <button 
                                type="button"
                                onClick={() => setThinkLonger(!thinkLonger)}
                                className={`flex items-center gap-3 text-[10px] font-black uppercase tracking-widest transition-all ${thinkLonger ? 'text-highlight' : 'text-white/30 hover:text-white'}`}
                            >
                                <Lightbulb className="w-4 h-4" />
                                <span>Pensar +</span>
                            </button>
                        )}

                        {(currentMode === AIMode.Ultra || currentMode === AIMode.DesignStudio) && (
                            <>
                                <button 
                                    type="button"
                                    onClick={() => setForceImage(!forceImage)}
                                    className={`flex items-center gap-3 text-[10px] font-black uppercase tracking-widest transition-all ${forceImage ? 'text-highlight' : 'text-white/30 hover:text-white'}`}
                                >
                                    <Sparkles className="w-4 h-4" />
                                    <span>Imagem</span>
                                </button>

                                <div className="flex items-center gap-4 text-white/20 border-l border-white/10 pl-6">
                                    <ImageIcon className="w-4 h-4" />
                                    <select 
                                        value={numberOfImagesToGenerate} 
                                        onChange={(e) => setNumberOfImagesToGenerate(Number(e.target.value))}
                                        className="bg-transparent border-none text-[10px] font-black p-0 focus:ring-0 cursor-pointer uppercase tracking-widest text-white/40 hover:text-white transition-colors"
                                    >
                                        <option value="1">1x</option>
                                        <option value="2">2x</option>
                                        <option value="4">4x</option>
                                    </select>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </form>
        </div>
        <p className="text-center text-[9px] text-white/10 mt-4 px-8 font-black uppercase tracking-widest">
            Protons AI v2.0 • Inteligência Criativa
        </p>

        {isMaskingModalOpen && selectedFilePreviews[0] && (
            <MaskingModal 
                isOpen={isMaskingModalOpen}
                onClose={() => setIsMaskingModalOpen(false)}
                image={{ 
                    base64: selectedFilePreviews[0].split(',')[1], 
                    mimeType: selectedFiles[0]?.type || 'image/png' 
                }}
                onSaveMask={(mask) => setMaskBase64(mask)}
            />
        )}
    </div>
  );
};
