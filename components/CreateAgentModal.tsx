


import React, { useState, useRef, useEffect } from 'react';
import { Agent, AgentProfilePictureSource, GeneratedImage, AgentKnowledgeDoc } from '../types';
import { XMarkIcon, UploadCloudIcon, TrashIcon, SparklesIcon } from './Icons';


interface CreateAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveAgent: () => void;
  newAgentData: Partial<Agent & { pdfs: AgentKnowledgeDoc[] }>; 
  onUpdateNewAgentData: (field: keyof Agent | 'profilePicturePrompt' | 'profilePictureSource' | 'capabilities', value: any) => void;
  onProfilePicUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onGenerateProfilePic: () => void;
  agentProfilePicOptions: GeneratedImage[];
  isGeneratingAgentProfilePic: boolean;
  onSelectProfilePic: (image: GeneratedImage) => void;
  onAddPdfs: (files: FileList) => void;
  onRemovePdf: (docId: string) => void;
  editingAgentId?: string | null; 
  onDeleteAgent: (agentId: string) => void;
}

const WizardStep: React.FC<{ currentStep: number, stepNumber: number, title: string, children: React.ReactNode }> = ({ currentStep, stepNumber, title, children }) => {
    if (currentStep !== stepNumber) return null;
    return (
        <div className="animate-fade-in">
            <h3 className="text-xl font-black text-white mb-6 tracking-tight">{title}</h3>
            <div className="space-y-6">
                 {children}
            </div>
        </div>
    );
};

const CreateAgentModal: React.FC<CreateAgentModalProps> = ({
  isOpen, onClose, onSaveAgent, newAgentData, onUpdateNewAgentData, onProfilePicUpload,
  onGenerateProfilePic, agentProfilePicOptions, isGeneratingAgentProfilePic, onSelectProfilePic,
  onAddPdfs, onRemovePdf, editingAgentId, onDeleteAgent
}) => {
  const [profilePicSource, setProfilePicSource] = useState<AgentProfilePictureSource>(newAgentData.profilePictureSource || AgentProfilePictureSource.UPLOAD);
  const [isChoosingAiImage, setIsChoosingAiImage] = useState<boolean>(false);
  const pdfFileRef = useRef<HTMLInputElement>(null);
  const profilePicFileRef = useRef<HTMLInputElement>(null);

  // Wizard state
  const [step, setStep] = useState(1);
  const totalSteps = 4;


  useEffect(() => {
    setProfilePicSource(newAgentData.profilePictureSource || AgentProfilePictureSource.UPLOAD);
    if (!isOpen) {
        setTimeout(() => setStep(1), 300); // Reset step after closing animation
    }
  }, [newAgentData.profilePictureSource, isOpen]);

  useEffect(() => {
    if (profilePicSource === AgentProfilePictureSource.AI && agentProfilePicOptions.length > 0 && !newAgentData.profilePictureUrl) {
      setIsChoosingAiImage(true);
    } else if (newAgentData.profilePictureUrl || profilePicSource === AgentProfilePictureSource.UPLOAD) {
      setIsChoosingAiImage(false);
    }
    if (agentProfilePicOptions.length === 0) {
        setIsChoosingAiImage(false);
    }
  }, [agentProfilePicOptions, profilePicSource, newAgentData.profilePictureUrl]);


  if (!isOpen) return null;

  const handleProfilePicSourceChange = (source: AgentProfilePictureSource) => {
    setProfilePicSource(source);
    onUpdateNewAgentData('profilePictureSource', source);
    if (source === AgentProfilePictureSource.UPLOAD) {
      onUpdateNewAgentData('profilePicturePrompt', ''); 
    }
    setIsChoosingAiImage(false); 
  };
  
  const handleSelectAndFinalizeAiImage = (image: GeneratedImage) => {
    onSelectProfilePic(image);
    setIsChoosingAiImage(false); 
  };

  const handleRegenerateAiProfilePics = () => {
    onUpdateNewAgentData('profilePictureUrl', undefined); 
    onGenerateProfilePic(); 
  };

  const handleDeleteButtonClick = () => {
    if (editingAgentId && window.confirm(`Tem certeza que deseja excluir o agente "${newAgentData.name || 'este agente'}"? Esta ação não pode ser desfeita.`)) {
      onDeleteAgent(editingAgentId);
    }
  };

  const triggerPdfUpload = () => pdfFileRef.current?.click();
  const triggerProfilePicUpload = () => profilePicFileRef.current?.click();

  const nameFilled = newAgentData.name && newAgentData.name.trim() !== '';
  const instructionsFilled = newAgentData.instructions && newAgentData.instructions.trim() !== '';
  const modalTitle = editingAgentId ? "Editar Agente" : "Criar Novo Agente";

  const nextStep = () => setStep(s => Math.min(s + 1, totalSteps));
  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  const isStep1Valid = nameFilled && instructionsFilled;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="create-agent-title">
      <div className="bg-white/5 backdrop-blur-3xl p-8 rounded-[2.5rem] border border-white/10 shadow-2xl w-full max-w-2xl text-white relative max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-8">
          <h2 id="create-agent-title" className="text-3xl font-black text-white tracking-tight">{modalTitle}</h2>
          <button onClick={onClose} className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-2xl transition-all" aria-label="Fechar modal"><XMarkIcon className="w-7 h-7" /></button>
        </div>

        {/* Progress Bar */}
        <div className="mb-10">
            <div className="flex justify-between text-[10px] font-black text-white/40 uppercase tracking-widest mb-3">
                <span>Etapa {step} de {totalSteps}</span>
                <span className="text-highlight">{Math.round((step / totalSteps) * 100)}%</span>
            </div>
            <div className="w-full bg-white/5 rounded-full h-2 border border-white/5 p-0.5">
                <div className="bg-highlight h-full rounded-full shadow-[0_0_15px_rgba(0,255,0,0.5)]" style={{ width: `${(step / totalSteps) * 100}%`, transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)' }}></div>
            </div>
        </div>


        <div className="flex-grow overflow-y-auto custom-scrollbar pr-2 space-y-8">
            <WizardStep currentStep={step} stepNumber={1} title="1. Persona e Nome">
                <div>
                    <label htmlFor="agentName" className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">Nome do Agente <span className="text-danger">*</span></label>
                    <input type="text" id="agentName" value={newAgentData.name || ''} onChange={(e) => onUpdateNewAgentData('name', e.target.value)} className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:border-highlight text-white font-medium transition-all" required aria-required="true"/>
                </div>
                <div>
                    <label htmlFor="agentInstructions" className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">Instruções (Persona) <span className="text-danger">*</span></label>
                    <textarea id="agentInstructions" value={newAgentData.instructions || ''} onChange={(e) => onUpdateNewAgentData('instructions', e.target.value)} rows={8} className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:border-highlight text-white font-medium transition-all custom-scrollbar resize-none" placeholder="Ex: Você é um copywriter especializado em e-mails marketing persuasivos..." required aria-required="true"/>
                </div>
            </WizardStep>

            <WizardStep currentStep={step} stepNumber={2} title="2. Capacidades do Agente">
                 <div className="grid grid-cols-1 gap-4">
                    <label className="flex items-center space-x-4 p-5 bg-white/5 rounded-3xl border border-white/10 hover:bg-white/10 cursor-pointer transition-all group">
                        <input
                            type="checkbox"
                            checked={!!newAgentData.capabilities?.imageGeneration}
                            onChange={(e) => onUpdateNewAgentData('capabilities', { ...newAgentData.capabilities, imageGeneration: e.target.checked })}
                            className="h-6 w-6 rounded-lg border-white/20 text-highlight focus:ring-highlight bg-black/40"
                        />
                        <div>
                            <span className="text-base font-bold text-white group-hover:text-highlight transition-colors">Geração de Imagem</span>
                            <p className="text-xs text-white/40 font-medium">Permite que o agente gere e receba imagens.</p>
                        </div>
                    </label>
                    <label className="flex items-center space-x-4 p-5 bg-white/5 rounded-3xl border border-white/10 hover:bg-white/10 cursor-pointer transition-all group">
                        <input
                            type="checkbox"
                            checked={!!newAgentData.capabilities?.codeGeneration}
                            onChange={(e) => onUpdateNewAgentData('capabilities', { ...newAgentData.capabilities, codeGeneration: e.target.checked })}
                            className="h-6 w-6 rounded-lg border-white/20 text-highlight focus:ring-highlight bg-black/40"
                        />
                        <div>
                            <span className="text-base font-bold text-white group-hover:text-highlight transition-colors">Geração de Código</span>
                            <p className="text-xs text-white/40 font-medium">Habilita o agente a escrever e formatar blocos de código.</p>
                        </div>
                    </label>
                </div>
            </WizardStep>

             <WizardStep currentStep={step} stepNumber={3} title="3. Foto de Perfil">
                {isChoosingAiImage && agentProfilePicOptions.length > 0 ? (
                <div className="p-6 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-md">
                    <p className="text-sm font-black text-white/40 uppercase tracking-widest mb-6 text-center">Escolha uma Foto de Perfil Gerada</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
                    {agentProfilePicOptions.map(option => (
                        <img 
                        key={option.id} 
                        src={`data:${option.mimeType};base64,${option.base64}`} 
                        alt={`Opção de perfil ${option.id}`} 
                        className="w-full h-32 object-cover rounded-2xl cursor-pointer hover:ring-4 hover:ring-highlight/50 focus:ring-4 focus:ring-highlight/50 transition-all shadow-xl" 
                        onClick={() => handleSelectAndFinalizeAiImage(option)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSelectAndFinalizeAiImage(option)}
                        tabIndex={0}
                        aria-label={`Selecionar opção de imagem ${option.id}`}
                        />
                    ))}
                    </div>
                    <div className="flex gap-4">
                        <button type="button" onClick={handleRegenerateAiProfilePics} disabled={isGeneratingAgentProfilePic || !newAgentData.profilePicturePrompt?.trim()} className="flex-1 px-6 py-4 text-sm font-black text-black bg-highlight hover:scale-105 rounded-2xl transition-all disabled:opacity-50 flex items-center justify-center uppercase tracking-widest">
                            {isGeneratingAgentProfilePic ? <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin mr-2" role="status"></div> : <SparklesIcon className="w-5 h-5 mr-2" />} Gerar Novamente
                        </button>
                        <button type="button" onClick={() => handleProfilePicSourceChange(AgentProfilePictureSource.UPLOAD)} className="flex-1 px-6 py-4 text-sm font-black text-white/40 bg-white/5 border border-white/10 hover:bg-white/10 rounded-2xl transition-all uppercase tracking-widest">Voltar</button>
                    </div>
                </div>
                ) : (
                <>
                    <div className="flex gap-3 mb-6">
                        <button type="button" onClick={() => handleProfilePicSourceChange(AgentProfilePictureSource.UPLOAD)} className={`flex-1 px-6 py-4 text-xs font-black rounded-2xl transition-all uppercase tracking-widest ${profilePicSource === AgentProfilePictureSource.UPLOAD ? 'bg-highlight text-black shadow-lg shadow-highlight/20' : 'bg-white/5 text-white/40 border border-white/10 hover:bg-white/10'}`}>Anexar</button>
                        <button type="button" onClick={() => handleProfilePicSourceChange(AgentProfilePictureSource.AI)} className={`flex-1 px-6 py-4 text-xs font-black rounded-2xl transition-all uppercase tracking-widest ${profilePicSource === AgentProfilePictureSource.AI ? 'bg-highlight text-black shadow-lg shadow-highlight/20' : 'bg-white/5 text-white/40 border border-white/10 hover:bg-white/10'}`}>Gerar IA</button>
                    </div>

                    {profilePicSource === AgentProfilePictureSource.UPLOAD && (
                    <div>
                        <input type="file" id="agentProfilePicUpload" accept=".jpg, .jpeg, .png, .webp, .raw, .img, .svg, .psd, .ai, image/*" onChange={onProfilePicUpload} className="hidden" ref={profilePicFileRef}/>
                        <button type="button" onClick={triggerProfilePicUpload} className="w-full flex items-center justify-center px-6 py-5 bg-white/5 hover:bg-white/10 text-white rounded-3xl text-sm font-black transition-all border border-white/10 border-dashed group active:scale-95" aria-label="Escolher arquivo para foto de perfil">
                            <UploadCloudIcon className="w-6 h-6 mr-3 text-white/40 group-hover:text-highlight transition-colors"/> 
                            <span className="uppercase tracking-widest">Escolher Arquivo</span>
                        </button>
                    </div>
                    )}

                    {profilePicSource === AgentProfilePictureSource.AI && (
                    <div className="space-y-4">
                        <input type="text" id="aiProfilePicPrompt" placeholder="Descreva a imagem de perfil (ex: polvo roxo amigável)" value={newAgentData.profilePicturePrompt || ''} onChange={(e) => { onUpdateNewAgentData('profilePicturePrompt', e.target.value); onUpdateNewAgentData('profilePictureUrl', undefined); }} className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:border-highlight text-white font-medium transition-all"/>
                        <button type="button" onClick={handleRegenerateAiProfilePics} disabled={isGeneratingAgentProfilePic || !newAgentData.profilePicturePrompt?.trim()} className="w-full flex items-center justify-center px-8 py-5 text-sm font-black text-black bg-highlight hover:scale-105 rounded-2xl transition-all disabled:opacity-50 uppercase tracking-widest shadow-lg shadow-highlight/20">
                            {isGeneratingAgentProfilePic ? <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin mr-3" role="status"></div> : <SparklesIcon className="w-6 h-6 mr-3" />} Gerar Opções
                        </button>
                    </div>
                    )}

                    {newAgentData.profilePictureUrl && !isChoosingAiImage && (
                        <div className="mt-8 p-6 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-md">
                            <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-4 text-center">Prévia Atual</p>
                            <div className="w-32 h-32 mx-auto rounded-2xl overflow-hidden border-2 border-highlight shadow-2xl">
                                <img src={newAgentData.profilePictureUrl} alt="Prévia da foto de perfil" className="w-full h-full object-cover"/>
                            </div>
                        </div>
                    )}
                </>
                )}
            </WizardStep>

            <WizardStep currentStep={step} stepNumber={4} title="4. Base de Conhecimento">
                <p className="text-sm text-white/40 font-medium mb-6">Forneça PDFs para o agente usar como referência (Max 5MB por arquivo).</p>
                <input type="file" id="agentKnowledgePdfs" multiple accept=".pdf" onChange={(e) => e.target.files && onAddPdfs(e.target.files)} className="hidden" ref={pdfFileRef}/>
                <button type="button" onClick={triggerPdfUpload} className="w-full flex items-center justify-center px-6 py-5 bg-white/5 hover:bg-white/10 text-white rounded-3xl text-sm font-black transition-all mb-6 border border-white/10 border-dashed group active:scale-95" aria-label="Anexar arquivos PDF de conhecimento">
                    <UploadCloudIcon className="w-6 h-6 mr-3 text-white/40 group-hover:text-highlight transition-colors"/> 
                    <span className="uppercase tracking-widest">Anexar PDFs</span>
                </button>
                {newAgentData.knowledgeDocs && newAgentData.knowledgeDocs.length > 0 && (
                <div className="space-y-3 max-h-56 overflow-y-auto custom-scrollbar p-4 bg-black/20 rounded-3xl border border-white/10">
                    {newAgentData.knowledgeDocs.map((doc) => (
                    <div key={doc.id} className="flex justify-between items-center p-4 bg-white/5 rounded-2xl text-xs border border-white/5 hover:bg-white/10 transition-colors">
                        <span className="truncate text-white font-bold" title={doc.name}>{doc.name} <span className="text-white/40 font-medium ml-2">({(doc.size / 1024 / 1024).toFixed(2)}MB)</span></span>
                        <button type="button" onClick={() => onRemovePdf(doc.id)} className="text-danger hover:bg-danger/10 p-2 rounded-xl transition-all" aria-label={`Remover PDF ${doc.name}`}><TrashIcon className="w-4.5 h-4.5" /></button>
                    </div>
                    ))}
                </div>
                )}
            </WizardStep>
        </div>

        <div className="mt-10 pt-8 border-t border-white/10 flex justify-between items-center">
             <div>
                {editingAgentId && (
                    <button 
                    type="button" 
                    onClick={handleDeleteButtonClick} 
                    className="px-6 py-3 text-xs font-black text-danger bg-danger/5 border border-danger/20 hover:bg-danger/10 rounded-2xl transition-all uppercase tracking-widest"
                    aria-label={`Excluir agente ${newAgentData.name || ''}`}
                    >
                    Excluir
                    </button>
                )}
            </div>
            <div className="flex gap-4">
                {step > 1 && (
                    <button type="button" onClick={prevStep} className="px-6 py-3 text-xs font-black text-white/40 bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/10 uppercase tracking-widest">Voltar</button>
                )}
                {step < totalSteps ? (
                     <button type="button" onClick={nextStep} disabled={step === 1 && !isStep1Valid} className="px-8 py-3 text-xs font-black text-black bg-highlight hover:scale-105 rounded-2xl transition-all disabled:opacity-20 uppercase tracking-widest shadow-lg shadow-highlight/20">Próximo</button>
                ) : (
                    <button type="button" onClick={onSaveAgent} disabled={isGeneratingAgentProfilePic || !isStep1Valid} className="px-8 py-3 text-xs font-black text-black bg-highlight hover:scale-105 rounded-2xl transition-all disabled:opacity-20 uppercase tracking-widest shadow-lg shadow-highlight/20">{editingAgentId ? "Salvar" : "Criar"}</button>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default CreateAgentModal;
