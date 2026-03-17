
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
      className="inline-flex items-center gap-1 bg-panel text-text-secondary text-[10px] px-2 py-1 rounded-none mr-2 mb-2 hover:bg-border hover:text-text-primary transition-colors border border-border"
      title={chunk.web.title || 'Fonte da Web'}
    >
      <span className="font-bold">{index + 1}</span>
      <span className="truncate max-w-[100px]">
        {chunk.web.title || (() => {
          try {
            return new URL(chunk.web.uri!).hostname;
          } catch (e) {
            return chunk.web.uri;
          }
        })()}
      </span>
      <ExternalLink className="w-2 h-2" />
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
        return <div className="aspect-square bg-panel rounded-none flex items-center justify-center p-4 text-center text-xs text-danger">{image.prompt || "Erro ao carregar imagem."}</div>;
    }

    return (
        <div className="relative group rounded-none overflow-hidden border border-border">
            <img 
                src={dataUrl} 
                alt={image.prompt || "Imagem gerada"} 
                className="w-full h-auto object-contain cursor-pointer hover:scale-[1.02] transition-transform duration-500" 
                onClick={onOpenImagePreview} 
            />
            
            <div className="absolute bottom-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <button onClick={() => onRegenerateImage(message.id, imageIndex)} className="p-2 bg-black/60 backdrop-blur-md text-white rounded-none hover:bg-black/80 transition-colors" title="Gerar novamente">
                    <RotateCcw className="w-4 h-4" />
                </button>
                <button onClick={() => onStartVariation(message, imageIndex)} className="p-2 bg-black/60 backdrop-blur-md text-white rounded-none hover:bg-black/80 transition-colors" title="Criar Variação">
                    <Sparkles className="w-4 h-4" />
                </button>
                <button onClick={onOpenImagePreview} className="p-2 bg-black/60 backdrop-blur-md text-white rounded-none hover:bg-black/80 transition-colors" title="Expandir">
                    <Maximize2 className="w-4 h-4" />
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

    if (isLoading) return <div className="aspect-video bg-panel rounded-none animate-pulse flex items-center justify-center text-text-secondary text-xs">Carregando vídeo...</div>;

    return (
        <div className="rounded-none overflow-hidden border border-border bg-black">
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
            <div className="flex flex-col gap-3">
                <div className={`grid ${message.userImages.length === 1 ? 'grid-cols-1' : 'grid-cols-2'} gap-2`}>
                    {message.userImages.map((img, index) => (
                        <img key={index} src={`data:${img.mimeType};base64,${img.base64}`} alt="" className="w-full h-48 object-cover rounded-none border border-border" />
                    ))}
                </div>
                {message.text && <p className="text-sm leading-relaxed">{message.text}</p>}
            </div>
        );
    }

    if (message.isGeneratingVideo) return <RichLoadingIndicator type="video" aspectRatio={message.generationAspectRatio} />;
    if (message.isGeneratingImage) return <RichLoadingIndicator type="image" aspectRatio={message.generationAspectRatio} />;

    if (message.images && message.images.length > 0) {
        return (
            <div className="flex flex-col gap-4">
                <div className={`grid ${message.images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'} gap-3`}>
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
                {message.text && <div className="text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: message.text.replace(/\n/g, '<br />') }} />}
            </div>
        );
    }

    if (message.videoUrl) return <VideoPlayer apiUrl={message.videoUrl} />;

    const textContent = message.text || (message.error ? `Erro: ${message.error}` : '');
    
    return (
        <div className="flex flex-col gap-4">
            <div className={`text-sm leading-relaxed ${message.error ? 'text-danger' : ''}`} dangerouslySetInnerHTML={{ __html: textContent.replace(/\n/g, '<br />') }} />
            
            {message.groundingChunks && message.groundingChunks.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                    {message.groundingChunks.map((chunk, index) => <SourceLink key={index} chunk={chunk} index={index} />)}
                </div>
            )}
        </div>
    );
  };

  return (
    <div className={`flex w-full mb-8 animate-fade-in ${isUser ? 'justify-end' : 'justify-start'}`}>
        <div className={`flex gap-4 max-w-[85%] md:max-w-[75%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
            {/* Avatar */}
            <div className="flex-shrink-0 mt-1">
                {isUser ? (
                    <div className="w-8 h-8 rounded-none bg-highlight flex items-center justify-center text-black font-bold text-xs">
                        U
                    </div>
                ) : (
                    <div className="w-8 h-8 rounded-none bg-panel border border-border flex items-center justify-center">
                        <Bot className="w-5 h-5 text-highlight" />
                    </div>
                )}
            </div>

            {/* Message Content */}
            <div className={`flex flex-col gap-2 ${isUser ? 'items-end' : 'items-start'}`}>
                <div className={`group relative ${isUser ? 'bg-panel text-text-primary px-4 py-3 rounded-none border border-border shadow-[0_0_10px_rgba(0,255,0,0.05)]' : 'text-text-primary w-full'}`}>
                    {isEditing ? (
                        <div className="flex flex-col gap-2 min-w-[200px]">
                            <textarea
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                className="w-full bg-background border border-border rounded-none p-3 text-sm focus:outline-none focus:border-highlight"
                                rows={3}
                            />
                            <div className="flex justify-end gap-2">
                                <button onClick={() => setIsEditing(false)} className="p-1.5 hover:bg-border rounded-none transition-colors"><X className="w-4 h-4" /></button>
                                <button onClick={handleEditSave} className="p-1.5 hover:bg-border rounded-none transition-colors text-highlight"><Check className="w-4 h-4" /></button>
                            </div>
                        </div>
                    ) : (
                        renderContent()
                    )}

                    {/* Actions Overlay for AI Messages */}
                    {!isUser && !message.isLoading && !isEditing && (
                        <div className="flex items-center gap-1 mt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <button onClick={() => onFeedback('liked')} className={`p-1.5 rounded-none hover:bg-panel transition-colors ${message.feedback === 'liked' ? 'text-highlight' : 'text-text-secondary'}`}><ThumbsUp className="w-4 h-4" /></button>
                            <button onClick={() => onFeedback('disliked')} className={`p-1.5 rounded-none hover:bg-panel transition-colors ${message.feedback === 'disliked' ? 'text-danger' : 'text-text-secondary'}`}><ThumbsDown className="w-4 h-4" /></button>
                            <button onClick={() => { 
                                if (navigator.clipboard && navigator.clipboard.writeText) {
                                    navigator.clipboard.writeText(message.text || ''); 
                                } else {
                                    console.warn("Clipboard API não disponível");
                                }
                            }} className="p-1.5 rounded-none hover:bg-panel text-text-secondary transition-colors" title="Copiar"><Copy className="w-4 h-4" /></button>
                            <button onClick={() => onRegenerateImage(message.id, 0)} className="p-1.5 rounded-none hover:bg-panel text-text-secondary transition-colors" title="Refazer"><RotateCcw className="w-4 h-4" /></button>
                        </div>
                    )}

                    {/* Edit Button for User Messages */}
                    {isUser && !isEditing && (
                        <button 
                            onClick={() => setIsEditing(true)}
                            className="absolute -left-10 top-2 p-2 text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <Edit3 className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
});
