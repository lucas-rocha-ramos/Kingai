
// Self-reference for recursive types is handled by TypeScript without explicit import.
// import { GeneratedImage } from './types'; 

export interface GenerationTools {
  thinkLonger: boolean;
  webSearch: boolean;
  forceImage: boolean;
}

export enum AIMode {
  Fast = 'Fast',
  Ultra = 'Ultra',
  DesignStudio = 'DesignStudio',
  VideoProtons = 'VideoProtons', 
  AgentChat = 'AgentChat', 
  KingStudio = 'NanoStudio',
  EditorKing = 'BanaX',
  Visagista = 'Visagista',
  KingLab = 'KingLab',
  HumanKing = 'AvatarKing',
  ProtonsHQ = 'ProtonsHQ',
}

export enum MessageSender {
  User = 'user',
  AI = 'ai',
}

export interface FormField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'select';
  options?: string[];
  required?: boolean;
}

export interface Message {
  id:string;
  text: string;
  sender: MessageSender;
  
  images?: GeneratedImage[]; // NEW: Replaces imageUrl, holds all image data for grouping.
  
  userImages?: { base64: string; mimeType: string; }[]; // NEW: for user-uploaded images

  videoUrl?: string; 
  videoPrompt?: string; 
  source?: 'gemini' | 'openai' | 'video_service' | 'deepfloyd_service'; // Added deepfloyd
  isLoading?: boolean;
  isStreaming?: boolean; // NEW: For streaming text UI state
  error?: string; 
  groundingChunks?: GroundingChunk[];
  createdAt: Date; 
  svgContent?: string; 
  svgFilename?: string; 
  isGeneratingImage?: boolean; // NEW: Flag for image generation loading
  isGeneratingVideo?: boolean; // NEW: Flag for video generation loading
  generationAspectRatio?: string; // NEW: Aspect ratio for the loading animation
  formRequest?: {
    fields: FormField[];
  };
  formResponse?: { [key: string]: string };

  // NEW: For user feedback and message editing
  feedback?: 'liked' | 'disliked';
  isEditing?: boolean;

  // NEW: Fields for Audio I/O
  userAudio?: { base64: string; mimeType: string };
  generatedAudioUrl?: string;
}

export interface GroundingChunk {
  web?: {
    uri?: string;
    title?: string;
  };
}

export type SiteComponentType = 'Header' | 'TextBlock' | 'Image' | 'Button' | 'TwoColumns' | 'Footer';

export interface SiteComponent {
  id: string;
  type: SiteComponentType;
  props: { [key: string]: any };
  layout: {
    x: number;
    y: number;
    width: number;
    height: number;
    zIndex: number;
  };
}

export interface SiteSettings {
  backgroundColor: string;
  responsive: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  mode: AIMode;
  agentId?: string; 
  createdAt: Date;
  lastInteractedAt?: Date;
  visagistaResults?: VisagistaResult[];
  isPhotoShootActive?: boolean; // NEW: For BANA X "Ensaio Fotográfico"
  siteComponents?: SiteComponent[];
  siteSettings?: SiteSettings;
}

export interface GeneratedImage {
  id: string;
  base64: string;
  mimeType: string; 
  prompt: string; // This is the final, enhanced prompt used for generation
  originalUserPrompt?: string; // This is the user's original text prompt for lineage
  source: 'gemini' | 'openai' | 'deepfloyd_service'; // Added deepfloyd
  createdAt: Date;
  aspectRatio?: string;
}

export enum AgentProfilePictureSource {
  UPLOAD = 'upload',
  AI = 'ai',
}

export interface AgentKnowledgeDoc {
  id: string;
  name: string;
  type: 'application/pdf'; 
  base64Content: string; 
  size: number; 
}

export interface Agent {
  id: string;
  name: string;
  instructions: string; 
  profilePictureUrl?: string; 
  profilePictureSource: AgentProfilePictureSource;
  profilePicturePrompt?: string; 
  knowledgeDocs: AgentKnowledgeDoc[];
  createdAt: Date;
  capabilities: {
    imageGeneration: boolean;
    codeGeneration: boolean;
  };
}

export interface User {
  username: string;
  passwordHash: string; 
}

export interface SuperPromptWorkflowState {
  status: 'idle' | 'describing' | 'awaiting_user_feedback' | 'unifying';
  referenceImageBase64?: string;
  referenceImageMimeType?: string;
  userImageMessageId?: string; 
  generatedSuperPrompt?: string; 
}

export interface VisagistaResult {
  image: {
    base64: string;
    mimeType: string;
  };
  title: string;
  description: string;
}

export interface CameoProfile {
  appearanceImages: { base64: string; mimeType: string; }[];
}

export interface HumanKingProfile {
  id: string;
  characterSheet: string;
  imagePrompt: string;
  baseImage: {
    base64: string;
    mimeType: string;
  };
  createdAt: Date;
}

export interface ProtonsHQProfile {
  id: string;
  characterImages: { base64: string; mimeType: string; }[];
  instructions: string;
  createdAt: Date;
}

export interface NanoStudioWorkflow {
  status: 'idle' | 'analyzing' | 'questionnaire' | 'generating';
  referenceImage?: { base64: string; mimeType: string };
  analysis?: any;
  responses?: { [key: string]: string };
}

// FIX: Added missing GenerationResponse interface to solve the error in geminiService.ts
export interface GenerationResponse {
  images?: GeneratedImage[];
  text?: string;
  svgContent?: string;
  svgFilename?: string;
  error?: string;
  source?: 'gemini' | 'openai' | 'video_service' | 'deepfloyd_service';
  groundingChunks?: GroundingChunk[];
  formRequest?: {
    fields: FormField[];
  };
}
