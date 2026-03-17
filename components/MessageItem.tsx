
import React, { useMemo, useEffect, useState, useRef, memo } from 'react'; 
import { Message, MessageSender, GroundingChunk, AIMode, FormField, GeneratedImage } from '../types'; 
import { 
    Download, Sparkles, FileCode, RotateCcw, Send, 
    Star, ChevronLeft, ChevronRight, Edit3, X, 
    Check, ThumbsUp, ThumbsDown, Copy, Share2,
    Maximize2, Play, Bot, User as UserIcon, ExternalLink
} from 'lucide-react';
import { RichLoadingIndicator } from './RichLoadingIndicator';

const SourceLink: React.FC<{ chunk: GroundingChunk, index: number }> = ({ chunk, index }) => {
  if (!chunk.web || !chunk.web.uri) return null;
  return (
    <a href={chunk.web.uri} target="_blank" rel="noopener noreferrer" 
      className="inline-flex items-center gap-1.5 bg-white/5 text-white/60 text-[10px] px-3 py-1.5 rounded-xl mr-2 mb-2 hover:bg-white/10 hover:text-white transition-all border border-white/10 backdrop-blur-md"
      title={chunk.web.title || 'Fonte da Web'}
    >
      <span className="font-bold text-highlight">{index + 1}</span>
      <span className="truncate max-w-[120px] font-medium">
        {chunk.web.title || (() => {
          try {
            return new URL(chunk.web.uri!).hostname;
          } catch (e) {
            return chunk.web.uri;
          }
        })()}
      </span>
      <ExternalLink className="w-2.5 h-2.5 opacity-50" />
    </a>
  );
};

const GeneratedImageDisplay: React.FC<{
    image: GeneratedImage;
    message: Message;
    imageIndex: number;
    currentMode: AIMode;
    onStartVariation: (message: Message, imageIndex: number) => void;
    onGenerateSvgForImage: (messageId: string, imageIndex: number) => void;
    onOpenImagePreview: () => void;
    onRegenerateImage: (messageId: string, imageIndex: number) => void;
}> = ({ image, message, imageIndex, currentMode, onStartVariation, onGenerateSvgForImage, onOpenImagePreview, onRegenerateImage }) => {
    const dataUrl = `data:${image.mimeType};base64,${image.base64}`;

    if (!image.base64) {
        return <div className="aspect-square bg-white/5 rounded-3xl flex items-center justify-center p-6 text-center text-xs text-danger border border-white/10">{image.prompt || "Erro ao carregar imagem."}</div>;
    }

    return (
        <div className="relative group rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-black/20">
            <img 
                src={dataUrl} 
                alt={image.prompt || "Imagem gerada"} 
                className="w-full h-auto object-contain cursor-pointer hover:scale-[1.02] transition-transform duration-700 ease-out" 
                onClick={onOpenImagePreview} 
            />
            
            <div className="absolute bottom-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                <button onClick={() => onRegenerateImage(message.id, imageIndex)} className="p-3 bg-black/60 backdrop-blur-xl text-white rounded-2xl hover:bg-highlight hover:text-black transition-all shadow-xl border border-white/10" title="Gerar novamente">
                    <RotateCcw className="w-4.5 h-4.5" />
                </button>
                <button onClick={() => onStartVariation(message, imageIndex)} className="p-3 bg-black/60 backdrop-blur-xl text-white rounded-2xl hover:bg-highlight hover:text-black transition-all shadow-xl border border-white/10" title="Criar Variação">
                    <Sparkles className="w-4.5 h-4.5" />
                </button>
                <button onClick={onOpenImagePreview} className="p-3 bg-black/60 backdrop-blur-xl text-white rounded-2xl hover:bg-highlight hover:text-black transition-all shadow-xl border border-white/10" title="Expandir">
                    <Maximize2 className="w-4.5 h-4.5" />
                </button>
            </div>
        </div>
    );
};

const VideoPlayer: React.FC<{ apiUrl: string }> = ({ apiUrl }) => {
    const [videoSrc, setVideoSrc] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let objectUrl: string | null = null;
        const fetchVideo = async () => {
            try {
                const response = await fetch(apiUrl);
                const videoBlob = await response.blob();
                objectUrl = URL.createObjectURL(videoBlob);
                setVideoSrc(objectUrl);
            } catch (err) {
                console.error("Erro ao carregar vídeo", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchVideo();
        return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
    }, [apiUrl]);

    if (isLoading) return <div className="aspect-video bg-white/5 rounded-3xl animate-pulse flex items-center justify-center text-white/40 text-xs border border-white/10">Carregando vídeo...</div>;

    return (
        <div className="rounded-3xl overflow-hidden border border-white/10 bg-black shadow-2xl">
            <video src={videoSrc || ''} controls autoPlay loop muted className="w-full" />
        </div>
    );
};

interface MessageItemProps {
  message: Message;
  currentMode: AIMode;
  onStartVariation: (message: Message, imageIndex: number) => void;
  onGenerateSvgForImage: (messageId: string, imageIndex: number) => void;
  onOpenImagePreview: (images: GeneratedImage[], startIndex: number) => void;
  onRegenerateImage: (messageId: string, imageIndex: number) => void;
  onFormSubmit: (messageId: string, formData: { [key: string]: string }) => void;
  onEdit: (newText: string) => void;
  onFeedback: (feedback: 'liked' | 'disliked') => void;
}

export const MessageItem: React.FC<MessageItemProps> = memo(({ message, currentMode, onStartVariation, onGenerateSvgForImage, onOpenImagePreview, onRegenerateImage, onFormSubmit, onEdit, onFeedback }) => {
  const isUser = message.sender === MessageSender.User;
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.text);

  const handleEditSave = () => {
    if (editText.trim() && editText.trim() !== message.text) {
        onEdit(editText.trim());
    }
    setIsEditing(false);
  };

  const renderContent = () => {
    if (isUser && message.userImages && message.userImages.length > 0) {
        return (
            <div className="flex flex-col gap-4">
                <div className={`grid ${message.userImages.length === 1 ? 'grid-cols-1' : 'grid-cols-2'} gap-3`}>
                    {message.userImages.map((img, index) => (
                        <img key={index} src={`data:${img.mimeType};base64,${img.base64}`} alt="" className="w-full h-56 object-cover rounded-3xl border border-white/10 shadow-xl" />
                    ))}
                </div>
                {message.text && <p className="text-base leading-relaxed font-medium">{message.text}</p>}
            </div>
        );
    }

    if (message.isGeneratingVideo) return <RichLoadingIndicator type="video" aspectRatio={message.generationAspectRatio} />;
    if (message.isGeneratingImage) return <RichLoadingIndicator type="image" aspectRatio={message.generationAspectRatio} />;

    if (message.images && message.images.length > 0) {
        return (
            <div className="flex flex-col gap-6">
                <div className={`grid ${message.images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
                    {message.images.map((image, index) => (
                        <GeneratedImageDisplay 
                            key={index} 
                            image={image} 
                            message={message} 
                            imageIndex={index} 
                            currentMode={currentMode} 
                            onStartVariation={onStartVariation} 
                            onGenerateSvgForImage={onGenerateSvgForImage} 
                            onOpenImagePreview={() => onOpenImagePreview(message.images!, index)} 
                            onRegenerateImage={onRegenerateImage} 
                        />
                    ))}
                </div>
                {message.text && <div className="text-base leading-relaxed font-medium text-white/90" dangerouslySetInnerHTML={{ __html: message.text.replace(/\n/g, '<br />') }} />}
            </div>
        );
    }

    if (message.videoUrl) return <VideoPlayer apiUrl={message.videoUrl} />;

    const textContent = message.text || (message.error ? `Erro: ${message.error}` : '');
    
    return (
        <div className="flex flex-col gap-4">
            <div className={`text-base leading-relaxed font-medium ${message.error ? 'text-danger' : 'text-white/90'}`} dangerouslySetInnerHTML={{ __html: textContent.replace(/\n/g, '<br />') }} />
            
            {message.groundingChunks && message.groundingChunks.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">
                    {message.groundingChunks.map((chunk, index) => <SourceLink key={index} chunk={chunk} index={index} />)}
                </div>
            )}
        </div>
    );
  };

  return (
    <div className={`flex w-full mb-10 animate-fade-in ${isUser ? 'justify-end' : 'justify-start'}`}>
        <div className={`flex gap-5 max-w-[90%] md:max-w-[80%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
            {/* Avatar */}
            <div className="flex-shrink-0 mt-1">
                {isUser ? (
                    <div className="w-10 h-10 rounded-2xl bg-highlight flex items-center justify-center text-black font-black text-sm shadow-lg shadow-highlight/20">
                        U
                    </div>
                ) : (
                    <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-xl backdrop-blur-md">
                        <Bot className="w-6 h-6 text-highlight" />
                    </div>
                )}
            </div>

            {/* Message Content */}
            <div className={`flex flex-col gap-3 ${isUser ? 'items-end' : 'items-start'}`}>
                <div className={`group relative ${isUser ? 'bg-white/10 text-white px-6 py-4 rounded-[2rem] rounded-tr-lg border border-white/10 shadow-2xl backdrop-blur-3xl' : 'text-white w-full'}`}>
                    {isEditing ? (
                        <div className="flex flex-col gap-3 min-w-[280px] md:min-w-[400px]">
                            <textarea
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-base focus:outline-none focus:border-highlight transition-all placeholder-white/20"
                                rows={4}
                            />
                            <div className="flex justify-end gap-3">
                                <button onClick={() => setIsEditing(false)} className="p-2.5 hover:bg-white/10 rounded-xl transition-all"><X className="w-5 h-5" /></button>
                                <button onClick={handleEditSave} className="p-2.5 hover:bg-highlight/20 rounded-xl transition-all text-highlight"><Check className="w-5 h-5" /></button>
                            </div>
                        </div>
                    ) : (
                        renderContent()
                    )}

                    {/* Actions Overlay for AI Messages */}
                    {!isUser && !message.isLoading && !isEditing && (
                        <div className="flex items-center gap-2 mt-6 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-1 group-hover:translate-y-0">
                            <button onClick={() => onFeedback('liked')} className={`p-2 rounded-xl hover:bg-white/10 transition-all ${message.feedback === 'liked' ? 'text-highlight bg-highlight/10' : 'text-white/40'}`}><ThumbsUp className="w-4.5 h-4.5" /></button>
                            <button onClick={() => onFeedback('disliked')} className={`p-2 rounded-xl hover:bg-white/10 transition-all ${message.feedback === 'disliked' ? 'text-danger bg-danger/10' : 'text-white/40'}`}><ThumbsDown className="w-4.5 h-4.5" /></button>
                            <button onClick={() => { 
                                if (navigator.clipboard && navigator.clipboard.writeText) {
                                    navigator.clipboard.writeText(message.text || ''); 
                                } else {
                                    console.warn("Clipboard API não disponível");
                                }
                            }} className="p-2 rounded-xl hover:bg-white/10 text-white/40 hover:text-white transition-all" title="Copiar"><Copy className="w-4.5 h-4.5" /></button>
                            <button onClick={() => onRegenerateImage(message.id, 0)} className="p-2 rounded-xl hover:bg-white/10 text-white/40 hover:text-white transition-all" title="Refazer"><RotateCcw className="w-4.5 h-4.5" /></button>
                        </div>
                    )}

                    {/* Edit Button for User Messages */}
                    {isUser && !isEditing && (
                        <button 
                            onClick={() => setIsEditing(true)}
                            className="absolute -left-12 top-2 p-3 text-white/20 hover:text-highlight opacity-0 group-hover:opacity-100 transition-all hover:bg-white/5 rounded-xl"
                        >
                            <Edit3 className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
});
