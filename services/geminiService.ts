import { GoogleGenAI, Modality, Type, VideoGenerationReferenceType, VideoGenerationReferenceImage, HarmCategory, HarmBlockThreshold, ThinkingLevel } from '@google/genai';
import { v4 as uuidv4 } from 'uuid';
import { AIMode, Agent, GeneratedImage, Message, GroundingChunk, GenerationResponse } from '../types';

const SUPPORTED_IMAGE_MIME_TYPES = [
    'image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif'
];

/**
 * Robust error extractor for SDK/Fetch errors
 */
const getErrorCode = (error: any): number => {
    // Handle @google/genai SDK error structure
    if (error?.status) return error.status;
    if (error?.error?.code) return error.error.code;
    if (error?.code) return typeof error.code === 'number' ? error.code : 0;
    // Handle fetch-like errors
    if (error?.response?.status) return error.response.status;
    return 0;
};

const getErrorMessage = (error: any): string => {
    const msg = error?.message || error?.error?.message || error?.statusText || "";
    return msg.toLowerCase();
};

const getApiKey = () => {
    const key = (process.env.API_KEY || process.env.GEMINI_API_KEY) as string;
    if (!key || key === 'undefined') {
        console.error("API Key não encontrada no ambiente.");
        return "";
    }
    return key;
};

/**
 * Helper for exponential backoff retries
 */
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
    let lastError: any;
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (error: any) {
            lastError = error;
            const status = getErrorCode(error);
            const message = getErrorMessage(error);

            const isQuotaExceeded = status === 429 || message.includes('quota') || message.includes('exhausted') || message.includes('rate limit');
            const isServerError = status >= 500 || status === 0; // status 0 often means network error

            if ((isQuotaExceeded || isServerError) && i < maxRetries - 1) {
                // Longer wait for quota errors
                const baseWait = isQuotaExceeded ? 3000 : 1500;
                const waitTime = Math.pow(2, i) * baseWait + Math.random() * 1000;
                console.warn(`Retry attempt ${i + 1} due to ${isQuotaExceeded ? 'Quota' : 'Server'} error. Waiting ${Math.round(waitTime)}ms...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
                continue;
            }
            throw error;
        }
    }
    throw lastError;
}

const buildHistory = (history: Message[]) => {
    return history.map(message => ({
        role: message.sender === 'user' ? 'user' : 'model',
        parts: [
            ...(message.text ? [{ text: message.text }] : []),
            ...(message.userImages ? message.userImages.map(img => ({
                inlineData: { mimeType: img.mimeType, data: img.base64 }
            })) : [])
        ].filter(p => p)
    })).filter(c => c.parts.length > 0);
};

export async function* generateFastTextResponseStream(prompt: string, history: Message[]) {
    try {
        const ai = new GoogleGenAI({ apiKey: getApiKey() });
        const contents = [...buildHistory(history), { role: 'user', parts: [{ text: prompt }] }];
        
        const responseStream = await ai.models.generateContentStream({
            model: 'gemini-3-flash-preview',
            contents,
            config: { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }
        });

        for await (const chunk of responseStream) {
            if (chunk.text) yield chunk.text;
        }
    } catch (error) {
        console.error('Error in generateFastTextResponseStream:', error);
        yield 'Erro de conexão. Verifique sua cota diária.';
    }
}

export const generateSvgFromDescription = async (description: string): Promise<GenerationResponse> => {
    try {
        return await withRetry(async () => {
            const ai = new GoogleGenAI({ apiKey: getApiKey() });
            const prompt = `Crie um logotipo SVG minimalista para: "${description}". Retorne APENAS o código <svg> puro.`;
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
            });
            let svgContent = response.text?.replace(/`{3}svg\n/g, '').replace(/`{3}/g, '').trim();
            if (!svgContent || !svgContent.startsWith('<svg')) throw new Error('SVG Inválido');
            return { svgContent, svgFilename: "logo.svg" };
        });
    } catch (error: any) {
        return { error: 'Falha ao gerar o SVG.' };
    }
};

/**
 * Helper to generate images using "Nano Banana" (Gemini 2.5/3 Flash Image)
 */
async function generateNanoBananaImage(ai: any, prompt: string, userImages?: { base64: string; mimeType: string }[], maskImage?: { base64: string; mimeType: string }, isLabMode: boolean = false, aspectRatio: string = '1:1', numberOfImages: number = 1): Promise<GenerationResponse> {
    return await withRetry(async () => {
        const parts: any[] = [];
        
        // In King Lab, we map @imagem1, @imagem2 etc based on the sequence
        if (isLabMode && userImages) {
            userImages.forEach((img, idx) => {
                parts.push({ text: `Referência @imagem${idx + 1}:` });
                parts.push({ inlineData: { data: img.base64, mimeType: img.mimeType } });
            });
            parts.push({ text: `INSTRUÇÃO DE FUSÃO: ${prompt}. Use as imagens acima conforme as tags @imagemN mencionadas.` });
        } else {
            if (userImages && userImages.length > 0) {
                parts.push({ inlineData: { data: userImages[0].base64, mimeType: userImages[0].mimeType } });
                parts.push({ text: `Use a imagem acima como referência visual principal. Crie uma imagem final baseada nela seguindo esta descrição: ${prompt}` });
            } else {
                parts.push({ text: prompt });
            }
        }
        
        if (maskImage) {
            parts.push({ text: "A imagem a seguir é uma máscara de inpainting. Os pixels BRANCOS indicam a área que deve ser ALTERADA ou REMOVIDA. Os pixels PRETOS indicam a área que deve ser PRESERVADA intacta." });
            parts.push({ inlineData: { data: maskImage.base64, mimeType: maskImage.mimeType } });
            parts.push({ text: `COMANDO DO USUÁRIO: ${prompt}. 
            Instrução Crítica: Modifique EXCLUSIVAMENTE a área selecionada pela máscara branca. 
            Se o comando for para remover uma pessoa ou objeto, apague-o completamente e preencha o espaço com o fundo (background) de forma perfeitamente realista e imperceptível.` });
        }

        const safetySettings = [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        ];

        const responsePromises = [];
        for (let i = 0; i < numberOfImages; i++) {
            try {
                responsePromises.push(ai.models.generateContent({
                    model: 'gemini-2.5-flash-image',
                    contents: { parts },
                    config: { 
                        safetySettings,
                        aspectRatio
                    }
                }));
            } catch (err) {
                console.error("Erro ao enfileirar promessa de geração:", err);
                throw err;
            }
        }

        let responses;
        try {
            responses = await Promise.all(responsePromises);
        } catch (err: any) {
            console.error("Erro na chamada da API Gemini (Nano Banana):", err);
            const status = getErrorCode(err);
            const msg = getErrorMessage(err);
            if (status === 403) throw new Error("Acesso negado. Verifique se sua chave de API tem permissão para o modelo Gemini 2.5 Flash Image.");
            if (status === 429) throw new Error("Limite de cota atingido para geração de imagens.");
            if (status === 0) throw new Error("Erro de rede ao conectar com a API de imagens. Verifique sua conexão.");
            throw err;
        }
        const images: GeneratedImage[] = [];
        let textResponse = '';

        for (const response of responses) {
            const responseParts = response.candidates?.[0]?.content?.parts;
            if (responseParts) {
                for (const part of responseParts) {
                    if (part.inlineData) {
                        images.push({
                            id: uuidv4(), base64: part.inlineData.data, mimeType: part.inlineData.mimeType,
                            prompt, originalUserPrompt: prompt, source: 'gemini', createdAt: new Date(),
                            aspectRatio
                        });
                    } else if (part.text && !textResponse) {
                        textResponse = part.text;
                    }
                }
            }
        }
        
        if (images.length === 0) throw new Error("A IA não conseguiu processar a imagem. Verifique se o prompt é permitido.");
        return { images, text: textResponse || "Aqui está o resultado.", source: 'gemini' };
    });
}

export const generateResponse = async (options: {
    mode: AIMode;
    prompt: string;
    imageGenerationPrompt?: string;
    history: Message[];
    agent?: Agent;
    userImages?: { base64: string; mimeType: string }[];
    userAudio?: { base64: string; mimeType: string };
    originalUserImagePromptForVariation?: string;
    numberOfImages?: number;
    tools?: any;
    isSuperPrompt?: boolean;
    maskImage?: { base64: string; mimeType: string };
}): Promise<GenerationResponse> => {
    const { mode, prompt, history, agent, userImages, numberOfImages = 1, tools, maskImage } = options;

    try {
        return await withRetry(async () => {
            const apiKey = getApiKey();
            if (!apiKey) {
                return { error: 'Chave de API não configurada. Por favor, configure sua chave no menu de configurações.' };
            }
            const ai = new GoogleGenAI({ apiKey });

            // KING LAB / EDITOR KING / KING STUDIO / PROTONS HQ (Force Nano Banana)
            if (mode === AIMode.KingLab || mode === AIMode.EditorKing || mode === AIMode.KingStudio || mode === AIMode.ProtonsHQ) {
                return await generateNanoBananaImage(ai, prompt, userImages, maskImage, mode === AIMode.KingLab || mode === AIMode.ProtonsHQ, '1:1', numberOfImages);
            }

            // DESIGN STUDIO (Imagen with automatic fallback)
            if (mode === AIMode.DesignStudio || (mode === AIMode.Ultra && tools?.forceImage)) {
                try {
                    const response = await ai.models.generateImages({
                        model: 'imagen-4.0-generate-001',
                        prompt: prompt,
                        config: { numberOfImages: numberOfImages }
                    });
                    const images = response.generatedImages.map(img => ({
                        id: uuidv4(), base64: img.image.imageBytes, mimeType: 'image/png',
                        prompt, originalUserPrompt: prompt, source: 'gemini' as const, createdAt: new Date(), aspectRatio: '1:1',
                    }));
                    return { images, text: "Geração concluída.", source: 'gemini' };
                } catch (err: any) {
                    const status = getErrorCode(err);
                    if (status === 403 || status === 429) {
                        console.warn("Acesso negado ao Imagen. Usando Nano Banana...");
                        return await generateNanoBananaImage(ai, prompt, userImages, undefined, false, '1:1', numberOfImages);
                    }
                    throw err;
                }
            }

            // TEXTUAL FLOW (Gemini 3 Pro with automatic fallback to Flash)
            let primaryModel = mode === AIMode.Ultra ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview';
            const userParts: any[] = [{ text: prompt }];
            if (userImages) userImages.forEach(img => userParts.unshift({ inlineData: { mimeType: img.mimeType, data: img.base64 } }));
            
            const contents = [...buildHistory(history), { role: 'user', parts: userParts }];
            const config: any = { systemInstruction: agent?.instructions };
            if (tools?.webSearch) config.tools = [{ googleSearch: {} }];
            if (tools?.thinkLonger) {
                config.thinkingConfig = { thinkingLevel: ThinkingLevel.HIGH };
            }

            try {
                const response = await ai.models.generateContent({ model: primaryModel, contents, config });
                return { text: response.text, groundingChunks: response.candidates?.[0]?.groundingMetadata?.groundingChunks, source: 'gemini' };
            } catch (err: any) {
                const status = getErrorCode(err);
                if (status === 403 || status === 429) {
                    console.warn(`Modelo ${primaryModel} sem permissão. Usando Flash...`);
                    const fallbackResponse = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents, config });
                    return { text: fallbackResponse.text, source: 'gemini' };
                }
                throw err;
            }
        });
    } catch (error: any) {
        const status = getErrorCode(error);
        const msg = getErrorMessage(error);
        if (status === 403) return { error: 'Sua chave de API não possui permissão para modelos Pro ou Imagen. Verifique se o faturamento está configurado no Google AI Studio.' };
        if (status === 429 || msg.includes('quota')) return { error: 'Limite de créditos atingido. Aguarde alguns minutos.' };
        return { error: `Erro no laboratório: ${msg || error.message || 'Falha na conexão'}` };
    }
};

export const generateVideoFromPromptService = async (prompt: string, aspectRatio: string | null, image?: { base64: string; mimeType: string; }, referenceImages?: { base64: string; mimeType: string; }[]) => {
    try {
        return await withRetry(async () => {
            const apiKey = getApiKey();
            if (!apiKey) {
                return { error: 'Chave de API não configurada.' };
            }
            const aiForVideo = new GoogleGenAI({ apiKey });
            const hasCameo = referenceImages && referenceImages.length > 0;
            const request: any = { prompt: prompt, config: { numberOfVideos: 1 } };

            if (hasCameo) {
                request.model = 'veo-3.1-generate-preview';
                request.config.resolution = '720p';
                request.config.aspectRatio = '16:9';
                const referenceImagesPayload: VideoGenerationReferenceImage[] = referenceImages!.map(img => ({
                    image: { imageBytes: img.base64, mimeType: img.mimeType },
                    referenceType: VideoGenerationReferenceType.ASSET,
                }));
                request.config.referenceImages = referenceImagesPayload;
            } else {
                request.model = 'veo-3.1-fast-generate-preview';
                request.config.resolution = '1080p';
                request.config.aspectRatio = ['16:9', '9:16', '1:1'].includes(aspectRatio || '') ? aspectRatio : '16:9';
                if (image) request.image = { imageBytes: image.base64, mimeType: image.mimeType };
            }

            let operation = await aiForVideo.models.generateVideos(request);
            while (!operation.done) {
                await new Promise(resolve => setTimeout(resolve, 8000));
                operation = await aiForVideo.operations.getVideosOperation({operation: operation});
            }
            if (operation.error) throw new Error(String(operation.error.message || "Erro desconhecido"));
            const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
            return { videoUrl: `${downloadLink}&key=${process.env.API_KEY}`, text: 'Vídeo concluído!' };
        });
    } catch (error: any) {
        return { error: "Erro na geração de vídeo. Verifique faturamento no Google Cloud." };
    }
};

export const generateVisagistaResponse = async (userPrompt: string, userImage: { base64: string; mimeType: string }, updateCallback: (message: string) => void) => {
    try {
        return await withRetry(async () => {
            const apiKey = getApiKey();
            if (!apiKey) {
                return { error: 'Chave de API não configurada.' };
            }
            const ai = new GoogleGenAI({ apiKey });
            updateCallback('Analisando biometria facial...');

            const schema = {
                type: Type.OBJECT,
                properties: {
                    analysis: { type: Type.STRING },
                    recommendations: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                title: { type: Type.STRING },
                                description: { type: Type.STRING },
                                generation_prompt: { type: Type.STRING }
                            },
                            required: ["title", "description", "generation_prompt"]
                        }
                    }
                },
                required: ["analysis", "recommendations"]
            };

            const response = await ai.models.generateContent({
                model: "gemini-3-flash-preview",
                contents: {
                    parts: [
                        { text: `Aja como Visagista. Analise a imagem. Pedido: "${userPrompt}". Retorne JSON com análise e 3 sugestões.` },
                        { inlineData: { data: userImage.base64, mimeType: userImage.mimeType } }
                    ]
                },
                config: { responseMimeType: "application/json", responseSchema: schema }
            });

            let analysisResult: any = {};
            try {
                analysisResult = JSON.parse(response.text || "{}");
            } catch (e) {
                console.error("Erro ao parsear JSON do Visagista:", e);
            }
            const recommendations = analysisResult.recommendations || [];
            const results = [];

            for (let i = 0; i < recommendations.length; i++) {
                const rec = recommendations[i];
                updateCallback(`Criando visual ${i + 1}: ${rec.title}...`);
                try {
                    const editRes = await generateNanoBananaImage(ai, `Aplique esta mudança: ${rec.generation_prompt}`, [userImage]);
                    if (editRes.images && editRes.images.length > 0) {
                        results.push({
                            image: { base64: editRes.images[0].base64, mimeType: editRes.images[0].mimeType },
                            title: rec.title,
                            description: rec.description
                        });
                    }
                } catch (e) {
                    console.error(`Erro no visual ${i}:`, e);
                }
            }
            return { results };
        });
    } catch (error: any) {
        return { error: 'Falha na análise de visagismo.' };
    }
};

export const generateTtsAudio = async (text: string) => {
    try {
        const apiKey = getApiKey();
        if (!apiKey) return { error: 'Chave de API não configurada.' };
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text }] }],
            config: { responseModalities: [Modality.AUDIO], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } } }
        });
        return { audioBase64: response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data };
    } catch (e) { return { error: 'TTS Offline' }; }
};

export const interpretCanvasSketch = async (base64: string) => {
    try {
        return await withRetry(async () => {
            const apiKey = getApiKey();
            if (!apiKey) return { error: 'Chave de API não configurada.' };
            const ai = new GoogleGenAI({ apiKey });
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: { parts: [{ text: 'Descreva este esboço de forma detalhada para que possa ser usado como prompt de imagem.' }, { inlineData: { data: base64, mimeType: 'image/png' } }]}
            });
            return { prompt: response.text || '' };
        });
    } catch (e) { return { error: 'Erro de cota ou conexão' }; }
};

export const generateImageFromCanvas = async (p: string, s: string, m: AIMode, sketch?: { base64: string, mimeType: string }) => {
    try {
        const apiKey = getApiKey();
        if (!apiKey) return { error: 'Chave de API não configurada.' };
        const ai = new GoogleGenAI({ apiKey });
        const finalPrompt = `${p}, ${s}`;
        return await generateNanoBananaImage(ai, finalPrompt, sketch ? [sketch] : undefined);
    } catch (e) { return { error: 'Erro ao renderizar imagem' }; }
};

export const generateHumanFromDescription = async (d: any) => {
    try {
        const apiKey = getApiKey();
        if (!apiKey) return { error: 'Chave de API não configurada.' };
        const ai = new GoogleGenAI({ apiKey });
        const prompt = `Portrait of ${d.appearance}, ultra-realistic, 8k. Portrait mode.`;
        try {
            const response = await ai.models.generateImages({
                model: 'imagen-4.0-generate-001',
                prompt,
                config: { numberOfImages: 4, aspectRatio: '9:16' }
            });
            return { images: response.generatedImages.map(img => ({ id: uuidv4(), base64: img.image.imageBytes, mimeType: 'image/png', prompt, source: 'gemini' as const, createdAt: new Date(), aspectRatio: '9:16' })) };
        } catch {
             const nanoRes = await generateNanoBananaImage(ai, prompt);
             return { images: nanoRes.images || [] };
        }
    } catch (e) { return { error: 'Erro na geração humana.' }; }
};

export const analyzeImageForNanoStudio = async (b: string, m: string) => {
    try {
        return await withRetry(async () => {
            const apiKey = getApiKey();
            if (!apiKey) return { error: 'Chave de API não configurada.' };
            const ai = new GoogleGenAI({ apiKey });
            const prompt = `Aja como um especialista em design gráfico e análise de imagem. Analise esta arte/imagem e identifique todos os elementos editáveis para torná-la 100% editável em um estúdio.
            Retorne um JSON estritamente seguindo este esquema:
            {
              "analysis": {
                "overallStyle": "descrição do estilo visual",
                "typographyDescription": "descrição das fontes usadas",
                "colorPalette": ["#hex1", "#hex2"]
              },
              "texts": [
                { "id": "text_1", "content": "texto original", "boundingBox": {"x": 0.1, "y": 0.1, "width": 0.2, "height": 0.05}, "fontDescription": "descrição da fonte e cor", "effects": "descrição de sombras, gradientes, etc" }
              ],
              "people": [
                { "id": "person_1", "description": "descrição da pessoa", "boundingBox": {"x": 0.3, "y": 0.2, "width": 0.3, "height": 0.6}, "clothingAndPoseDescription": "descrição detalhada da roupa e pose", "blendingDescription": "como a pessoa se integra ao fundo" }
              ],
              "objects": [
                { "id": "obj_1", "description": "descrição do objeto", "boundingBox": {"x": 0.7, "y": 0.7, "width": 0.1, "height": 0.1} }
              ]
            }
            REGRAS CRÍTICAS:
            1. Identifique TODOS os textos, pessoas e objetos principais.
            2. As coordenadas x, y, width e height devem ser normalizadas de 0 a 1.
            3. Seja extremamente preciso na localização dos elementos.
            4. Se não houver elementos de uma categoria, retorne um array vazio [].`;

            const response = await ai.models.generateContent({
                model: "gemini-3-flash-preview",
                contents: { parts: [{ text: prompt }, { inlineData: { data: b, mimeType: m } }] },
                config: { responseMimeType: "application/json" }
            });
            let parsed: any = { texts: [], people: [], objects: [] };
            try {
                const text = response.text || "{}";
                const result = JSON.parse(text);
                parsed = {
                    ...parsed,
                    ...result
                };
            } catch (e) {
                console.error("Erro ao parsear JSON da análise NanoStudio:", e);
            }
            return parsed;
        });
    } catch (e) { return { error: 'Erro de análise' }; }
};

export const performImageEdit = async (opt: { baseImage: { base64: string, mimeType: string }, prompt: string, additionalImages?: { base64: string, mimeType: string }[], analysis?: any }) => {
    try {
        return await withRetry(async () => {
            const ai = new GoogleGenAI({ apiKey: getApiKey() });
            const userImages = [opt.baseImage, ...(opt.additionalImages || [])];
            const res = await generateNanoBananaImage(ai, `EDIÇÃO PROFISSIONAL: ${opt.prompt}`, userImages, undefined, false);
            
            if (res.images && res.images.length > 0) {
                return { image: res.images[0] };
            }
            throw new Error("Falha ao editar a imagem.");
        });
    } catch (e: any) { 
        console.error("Erro performImageEdit:", e);
        return { error: 'Erro ao editar a imagem. Limite de cota atingido ou falha no servidor.' }; 
    }
};

export const replicateStyleAndPersonalize = async (opt: { 
    referenceImage: { base64: string, mimeType: string }, 
    analysis: any, 
    responses: { [key: string]: string },
    userImages?: { base64: string, mimeType: string }[]
}) => {
    try {
        return await withRetry(async () => {
            const ai = new GoogleGenAI({ apiKey: getApiKey() });
            
            const prompt = `Crie uma NOVA arte baseada no DNA de estilo da imagem de referência fornecida (@imagem1).
            
            DNA DE ESTILO:
            - Estilo Geral: ${opt.analysis.analysis?.overallStyle}
            - Tipografia: ${opt.analysis.analysis?.typographyDescription}
            - Paleta de Cores: ${opt.analysis.analysis?.colorPalette?.join(', ')}
            
            INFORMAÇÕES PERSONALIZADAS DO USUÁRIO:
            ${Object.entries(opt.responses).map(([key, value]) => `- ${key}: ${value}`).join('\n')}
            
            INSTRUÇÕES CRÍTICAS:
            1. Mantenha a COMPOSIÇÃO, CONCEITO e VIBE da imagem de referência (@imagem1).
            2. Substitua TODOS os textos originais pelas informações personalizadas acima.
            3. Se houver pessoas na imagem de referência, substitua-as por novas pessoas que combinem com o novo nicho (${opt.responses.nicho || 'mesmo nicho'}), mantendo a pose e integração.
            4. IMPORTANTE: Se o usuário forneceu imagens adicionais (@imagem2, @imagem3, etc.), USE ESSAS IMAGENS para substituir as pessoas ou elementos principais na nova arte. Remova o fundo delas e integre-as perfeitamente seguindo o estilo DNA.
            5. O resultado final deve parecer uma variação profissional e personalizada da referência.
            6. Remova o fundo de qualquer nova pessoa adicionada automaticamente.`;

            const images = [opt.referenceImage, ...(opt.userImages || [])];
            return await generateNanoBananaImage(ai, prompt, images, undefined, true);
        });
    } catch (e: any) {
        console.error("Erro replicateStyleAndPersonalize:", e);
        return { error: 'Erro ao replicar estilo. Limite de cota atingido ou falha no servidor.' };
    }
};

export const searchImageInspiration = async (q: string) => {
    try {
        return await withRetry(async () => {
            const ai = new GoogleGenAI({ apiKey: getApiKey() });
            const res = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: `4 prompts de imagem para "${q}". JSON array.`
            });
            let prompts = [];
            try {
                prompts = JSON.parse(res.text?.replace(/```json\n?|\n?```/g, '') || "[]");
            } catch (e) {
                console.error("Erro ao parsear JSON de inspiração:", e);
            }
            
            // Process sequentially to avoid 429 on parallel image generation
            const results = [];
            for (const p of prompts) {
                const imgRes = await generateNanoBananaImage(ai, p);
                if (imgRes.images) results.push(...imgRes.images);
                // Small delay between requests if multiple
                if (prompts.length > 1) await new Promise(r => setTimeout(r, 500));
            }
            return { images: results };
        });
    } catch (e) { return { error: 'Erro de inspiração' }; }
};

export const extractLayersForExport = async (b: any, a: any) => {
    try {
        const ai = new GoogleGenAI({ apiKey: getApiKey() });
        const nano = await generateNanoBananaImage(ai, "Remova o fundo.", [b]);
        return { layers: [{ filename: 'bg.png', base64: nano.images?.[0]?.base64 || '', mimeType: 'image/png' }] };
    } catch (e) { return { error: 'Erro de exportação' }; }
};
