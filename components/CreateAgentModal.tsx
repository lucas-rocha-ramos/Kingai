


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
            <h3 className="text-lg font-semibold text-text-primary mb-4">{title}</h3>
            <div className="space-y-4">
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="create-agent-title">
      <div className="bg-surface p-6 rounded-lg shadow-xl w-full max-w-2xl text-text-primary relative max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 id="create-agent-title" className="text-2xl font-semibold text-text-primary">{modalTitle}</h2>
          <button onClick={onClose} className="p-1 text-text-secondary hover:text-text-primary rounded-full" aria-label="Fechar modal"><XMarkIcon className="w-6 h-6" /></button>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
            <div className="flex justify-between text-xs text-text-secondary mb-1">
                <span>Etapa {step} de {totalSteps}</span>
            </div>
            <div className="w-full bg-panel rounded-full h-1.5">
                <div className="bg-accent h-1.5 rounded-full" style={{ width: `${(step / totalSteps) * 100}%`, transition: 'width 0.3s ease-in-out' }}></div>
            </div>
        </div>


        <div className="flex-grow overflow-y-auto custom-scrollbar pr-2 space-y-6">
            <WizardStep currentStep={step} stepNumber={1} title="1. Persona e Nome">
                <div>
                    <label htmlFor="agentName" className="block text-sm font-medium text-text-primary mb-1">Nome do Agente <span className="text-danger">*</span></label>
                    <input type="text" id="agentName" value={newAgentData.name || ''} onChange={(e) => onUpdateNewAgentData('name', e.target.value)} className="w-full p-2.5 bg-panel border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-accent text-text-primary" required aria-required="true"/>
                </div>
                <div>
                    <label htmlFor="agentInstructions" className="block text-sm font-medium text-text-primary mb-1">Instruções (Persona) <span className="text-danger">*</span></label>
                    <textarea id="agentInstructions" value={newAgentData.instructions || ''} onChange={(e) => onUpdateNewAgentData('instructions', e.target.value)} rows={8} className="w-full p-2.5 bg-panel border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-accent text-text-primary custom-scrollbar" placeholder="Ex: Você é um copywriter especializado em e-mails marketing persuasivos..." required aria-required="true"/>
                </div>
            </WizardStep>

            <WizardStep currentStep={step} stepNumber={2} title="2. Capacidades do Agente">
                 <div className="space-y-3">
                    <label className="flex items-center space-x-3 p-3 bg-panel rounded-md hover:bg-border cursor-pointer transition-colors">
                        <input
                            type="checkbox"
                            checked={!!newAgentData.capabilities?.imageGeneration}
                            onChange={(e) => onUpdateNewAgentData('capabilities', { ...newAgentData.capabilities, imageGeneration: e.target.checked })}
                            className="h-5 w-5 rounded border-gray-300 text-accent focus:ring-accent bg-surface"
                        />
                        <div>
                        <span className="text-sm font-medium text-text-primary">Geração de Imagem</span>
                        <p className="text-xs text-text-secondary">Permite que o agente gere e receba imagens.</p>
                        </div>
                    </label>
                    <label className="flex items-center space-x-3 p-3 bg-panel rounded-md hover:bg-border cursor-pointer transition-colors">
                        <input
                            type="checkbox"
                            checked={!!newAgentData.capabilities?.codeGeneration}
                            onChange={(e) => onUpdateNewAgentData('capabilities', { ...newAgentData.capabilities, codeGeneration: e.target.checked })}
                            className="h-5 w-5 rounded border-gray-300 text-accent focus:ring-accent bg-surface"
                        />
                        <div>
                        <span className="text-sm font-medium text-text-primary">Geração de Código</span>
                        <p className="text-xs text-text-secondary">Habilita o agente a escrever e formatar blocos de código.</p>
                        </div>
                    </label>
                </div>
            </WizardStep>

             <WizardStep currentStep={step} stepNumber={3} title="3. Foto de Perfil">
                {isChoosingAiImage && agentProfilePicOptions.length > 0 ? (
                <div className="p-3 bg-panel rounded-md border border-border">
                    <p className="text-md font-semibold mb-3 text-center text-text-primary">Escolha uma Foto de Perfil Gerada</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                    {agentProfilePicOptions.map(option => (
                        <img 
                        key={option.id} 
                        src={`data:${option.mimeType};base64,${option.base64}`} 
                        alt={`Opção de perfil ${option.id}`} 
                        className="w-full h-28 object-cover rounded-md cursor-pointer hover:ring-2 hover:ring-accent focus:ring-2 focus:ring-accent" 
                        onClick={() => handleSelectAndFinalizeAiImage(option)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSelectAndFinalizeAiImage(option)}
                        tabIndex={0}
                        aria-label={`Selecionar opção de imagem ${option.id}`}
                        />
                    ))}
                    </div>
                    <div className="flex justify-between space-x-2">
                        <button type="button" onClick={handleRegenerateAiProfilePics} disabled={isGeneratingAgentProfilePic || !newAgentData.profilePicturePrompt?.trim()} className="flex-1 px-3 py-2 text-xs sm:text-sm font-medium text-background bg-accent hover:bg-accent-hover rounded-md transition-colors disabled:opacity-50 flex items-center justify-center">
                            {isGeneratingAgentProfilePic ? <div className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin mr-1.5" role="status"></div> : <SparklesIcon className="w-4 h-4 mr-1.5" />} Gerar Novamente
                        </button>
                        <button type="button" onClick={() => handleProfilePicSourceChange(AgentProfilePictureSource.UPLOAD)} className="flex-1 px-3 py-2 text-xs sm:text-sm bg-panel text-text-primary border border-border hover:bg-border rounded-md">Voltar para Anexar</button>
                    </div>
                </div>
                ) : (
                <>
                    <div className="flex space-x-2 mb-3">
                    <button type="button" onClick={() => handleProfilePicSourceChange(AgentProfilePictureSource.UPLOAD)} className={`px-4 py-2 text-sm rounded-md ${profilePicSource === AgentProfilePictureSource.UPLOAD ? 'bg-accent text-background' : 'bg-panel text-text-primary border border-border hover:bg-border'}`}>Anexar Imagem</button>
                    <button type="button" onClick={() => handleProfilePicSourceChange(AgentProfilePictureSource.AI)} className={`px-4 py-2 text-sm rounded-md ${profilePicSource === AgentProfilePictureSource.AI ? 'bg-accent text-background' : 'bg-panel text-text-primary border border-border hover:bg-border'}`}>Gerar com IA</button>
                    </div>

                    {profilePicSource === AgentProfilePictureSource.UPLOAD && (
                    <div>
                        <input type="file" id="agentProfilePicUpload" accept=".jpg, .jpeg, .png, .webp, .raw, .img, .svg, .psd, .ai, image/*" onChange={onProfilePicUpload} className="hidden" ref={profilePicFileRef}/>
                        <button type="button" onClick={triggerProfilePicUpload} className="w-full flex items-center justify-center px-3 py-2 bg-panel hover:bg-border text-text-primary rounded-md text-sm font-medium transition-colors border border-border" aria-label="Escolher arquivo para foto de perfil"><UploadCloudIcon className="w-5 h-5 mr-2"/> Escolher Arquivo (Max 40MB)</button>
                    </div>
                    )}

                    {profilePicSource === AgentProfilePictureSource.AI && (
                    <div className="space-y-3">
                        <input type="text" id="aiProfilePicPrompt" placeholder="Descreva a imagem de perfil (ex: polvo roxo amigável)" value={newAgentData.profilePicturePrompt || ''} onChange={(e) => { onUpdateNewAgentData('profilePicturePrompt', e.target.value); onUpdateNewAgentData('profilePictureUrl', undefined); }} className="w-full p-2.5 bg-panel border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-accent text-text-primary"/>
                        <button type="button" onClick={handleRegenerateAiProfilePics} disabled={isGeneratingAgentProfilePic || !newAgentData.profilePicturePrompt?.trim()} className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-background bg-accent hover:bg-accent-hover rounded-md transition-colors disabled:opacity-50">
                        {isGeneratingAgentProfilePic ? <div className="w-5 h-5 border-2 border-background border-t-transparent rounded-full animate-spin mr-2" role="status"></div> : <SparklesIcon className="w-5 h-5 mr-2" />} Gerar Opções
                        </button>
                    </div>
                    )}

                    {newAgentData.profilePictureUrl && !isChoosingAiImage && (
                        <div className="mt-4 p-2 bg-panel rounded border border-border">
                            <p className="text-xs text-text-secondary mb-2 text-center">Prévia Atual:</p>
                            <img src={newAgentData.profilePictureUrl} alt="Prévia da foto de perfil" className="max-w-[120px] max-h-32 object-contain rounded-md mx-auto"/>
                        </div>
                    )}
                </>
                )}
            </WizardStep>

            <WizardStep currentStep={step} stepNumber={4} title="4. Base de Conhecimento">
                <p className="text-sm text-text-secondary mb-3">Forneça PDFs para o agente usar como referência (Max 5MB por arquivo).</p>
                <input type="file" id="agentKnowledgePdfs" multiple accept=".pdf" onChange={(e) => e.target.files && onAddPdfs(e.target.files)} className="hidden" ref={pdfFileRef}/>
                <button type="button" onClick={triggerPdfUpload} className="w-full flex items-center justify-center px-3 py-2 bg-panel hover:bg-border text-text-primary rounded-md text-sm font-medium transition-colors mb-3 border border-border" aria-label="Anexar arquivos PDF de conhecimento"><UploadCloudIcon className="w-5 h-5 mr-2"/> Anexar PDFs</button>
                {newAgentData.knowledgeDocs && newAgentData.knowledgeDocs.length > 0 && (
                <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar p-2 bg-panel rounded-md border border-border">
                    {newAgentData.knowledgeDocs.map((doc) => (
                    <div key={doc.id} className="flex justify-between items-center p-1.5 bg-surface rounded text-xs border border-border">
                        <span className="truncate text-text-primary" title={doc.name}>{doc.name} ({(doc.size / 1024 / 1024).toFixed(2)}MB)</span>
                        <button type="button" onClick={() => onRemovePdf(doc.id)} className="text-danger hover:text-red-700 p-0.5" aria-label={`Remover PDF ${doc.name}`}><TrashIcon className="w-3.5 h-3.5" /></button>
                    </div>
                    ))}
                </div>
                )}
            </WizardStep>
        </div>

        <div className="mt-8 pt-6 border-t border-border flex justify-between items-center">
             <div>
                {editingAgentId && (
                    <button 
                    type="button" 
                    onClick={handleDeleteButtonClick} 
                    className="px-4 py-2 text-sm font-medium text-danger bg-transparent border border-danger hover:bg-danger/10 rounded-md transition-colors"
                    aria-label={`Excluir agente ${newAgentData.name || ''}`}
                    >
                    Excluir Agente
                    </button>
                )}
            </div>
            <div className="flex space-x-3">
                {step > 1 && (
                    <button type="button" onClick={prevStep} className="px-4 py-2 text-sm font-medium text-text-secondary bg-panel hover:bg-border rounded-md transition-colors border border-border">Voltar</button>
                )}
                {step < totalSteps ? (
                     <button type="button" onClick={nextStep} disabled={step === 1 && !isStep1Valid} className="px-6 py-2 text-sm font-medium text-background bg-accent hover:bg-accent-hover rounded-md transition-colors disabled:opacity-50">Próximo</button>
                ) : (
                    <button type="button" onClick={onSaveAgent} disabled={isGeneratingAgentProfilePic || !isStep1Valid} className="px-6 py-2 text-sm font-medium text-background bg-accent hover:bg-accent-hover rounded-md transition-colors disabled:opacity-50">{editingAgentId ? "Salvar Alterações" : "Salvar Agente"}</button>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default CreateAgentModal;
