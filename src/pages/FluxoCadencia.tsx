import React, { useState, useEffect, useRef } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Plus, Save, Trash2, Mic, Image as ImageIcon, Type, 
  MessageSquare, Loader2, X, Square
} from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface MessageItem {
  id: string;
  type: 'text' | 'audio' | 'image';
  content: string; 
  caption?: string;
}

interface Step {
  id: string;
  delayDays?: number; // Legado
  delayAmount?: number;
  delayUnit?: 'immediately' | 'minutes' | 'hours' | 'days';
  items: MessageItem[];
}

interface CadenciaFlow {
  id: string;
  user_id: string;
  name: string;
  messages: Step[];
}

// --- Componentes Auxiliares para Mídia ---

const AudioRecorder = ({ onSave, onCancel, userId }: { onSave: (url: string) => void, onCancel: () => void, userId: string }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [time, setTime] = useState(0);
  const [uploading, setUploading] = useState(false);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  useEffect(() => {
    let interval: any;
    if (isRecording) interval = setInterval(() => setTime(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, [isRecording]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      mediaRecorder.current.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data);
      };
      mediaRecorder.current.onstop = async () => {
        const audioBlob = new Blob(chunks.current, { type: 'audio/ogg; codecs=opus' });
        chunks.current = [];
        stream.getTracks().forEach(track => track.stop());
        
        setUploading(true);
        const fileName = `${userId}/cadencia/${crypto.randomUUID()}.ogg`;
        const { error } = await supabase.storage.from('contract_images').upload(fileName, audioBlob, { contentType: 'audio/ogg' });
        
        if (!error) {
          const { data } = supabase.storage.from('contract_images').getPublicUrl(fileName);
          onSave(data.publicUrl);
        } else {
          toast.error("Erro ao fazer upload do áudio");
          onCancel();
        }
        setUploading(false);
      };
      mediaRecorder.current.start();
      setIsRecording(true);
    } catch (err) {
      toast.error("Permissão de microfone negada.");
      onCancel();
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      setIsRecording(false);
    }
  };

  if (uploading) {
    return <div className="flex items-center gap-2 text-orange-500 font-medium p-4 bg-orange-50 rounded-xl border border-orange-100"><Loader2 className="w-4 h-4 animate-spin" /> Salvando áudio...</div>;
  }

  if (!isRecording) {
    return (
      <div className="flex items-center justify-center p-6 bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl">
        <button onClick={startRecording} className="flex flex-col items-center gap-2 text-gray-500 hover:text-orange-500 transition-colors">
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm border border-gray-200"><Mic className="w-6 h-6" /></div>
          <span className="text-sm font-semibold">Clique para Gravar Áudio</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-4 bg-red-50 border border-red-100 rounded-xl">
      <div className="flex items-center gap-3">
        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
        <span className="text-red-600 font-mono font-bold">
          {Math.floor(time / 60)}:{(time % 60).toString().padStart(2, '0')}
        </span>
      </div>
      <div className="flex gap-2">
        <button onClick={onCancel} className="p-2 text-gray-500 hover:bg-red-100 rounded-full transition-colors"><Trash2 className="w-5 h-5" /></button>
        <button onClick={stopRecording} className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-sm"><Square className="w-5 h-5" fill="currentColor" /></button>
      </div>
    </div>
  );
};

const ImageUploader = ({ onSave, onCancel, userId }: { onSave: (url: string) => void, onCancel: () => void, userId: string }) => {
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return toast.error("A imagem deve ter no máximo 5MB.");
    
    setUploading(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/cadencia/${crypto.randomUUID()}.${fileExt}`;
    
    const { error } = await supabase.storage.from('contract_images').upload(fileName, file);
    if (!error) {
      const { data } = supabase.storage.from('contract_images').getPublicUrl(fileName);
      onSave(data.publicUrl);
    } else {
      toast.error("Erro ao fazer upload da imagem");
      onCancel();
    }
    setUploading(false);
  };

  if (uploading) {
    return <div className="flex items-center gap-2 text-orange-500 font-medium p-4 bg-orange-50 rounded-xl border border-orange-100"><Loader2 className="w-4 h-4 animate-spin" /> Salvando imagem...</div>;
  }

  return (
    <div className="relative">
      <label className="flex flex-col items-center justify-center p-6 bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:bg-orange-50 hover:border-orange-300 transition-colors">
        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm border border-gray-200 mb-2"><ImageIcon className="w-6 h-6 text-gray-400" /></div>
        <span className="text-sm font-semibold text-gray-600">Clique ou arraste uma imagem</span>
        <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </label>
      <button onClick={onCancel} className="absolute top-2 right-2 p-1.5 bg-white shadow-sm border border-gray-200 rounded-full text-gray-500 hover:text-red-500"><X className="w-4 h-4" /></button>
    </div>
  );
};

export default function FluxoCadencia() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [flows, setFlows] = useState<CadenciaFlow[]>([]);
  const [activeFlowId, setActiveFlowId] = useState<string>('');
  const [editingFlow, setEditingFlow] = useState<CadenciaFlow | null>(null);

  const [isNewFlowOpen, setIsNewFlowOpen] = useState(false);
  const [newFlowName, setNewFlowName] = useState('');

  useEffect(() => {
    if (user) fetchFlows();
  }, [user]);

  const normalizeFlow = (flow: CadenciaFlow) => {
    return {
      ...flow,
      messages: flow.messages.map(step => ({
        ...step,
        delayAmount: step.delayAmount !== undefined ? step.delayAmount : (step.delayDays || 0),
        delayUnit: step.delayUnit || (step.delayDays === 0 ? 'immediately' : 'days')
      }))
    };
  };

  const fetchFlows = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('cadencia_flows')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        if (error.code === '42P01') {
          toast.error("Tabela não encontrada. Execute o arquivo setup_cadencia.sql no Supabase.");
        } else {
          throw error;
        }
      }
      
      const loadedFlows = (data || []).map(normalizeFlow);
      setFlows(loadedFlows);
      
      if (loadedFlows.length > 0 && !activeFlowId) {
        setActiveFlowId(loadedFlows[0].id);
        setEditingFlow(loadedFlows[0]);
      } else if (loadedFlows.length > 0 && activeFlowId) {
        const flow = loadedFlows.find(f => f.id === activeFlowId);
        if (flow) setEditingFlow(flow);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleFlowChange = (id: string) => {
    setActiveFlowId(id);
    const flow = flows.find(f => f.id === id);
    if (flow) setEditingFlow(JSON.parse(JSON.stringify(flow))); // Deep copy
  };

  const handleCreateFlow = async () => {
    if (!newFlowName.trim()) return toast.error("O nome é obrigatório");
    try {
      const { data, error } = await supabase.from('cadencia_flows').insert({
        name: newFlowName,
        user_id: user?.id,
        messages: []
      }).select().single();

      if (error) throw error;

      const normalizedData = normalizeFlow(data as CadenciaFlow);
      setFlows([...flows, normalizedData]);
      setActiveFlowId(normalizedData.id);
      setEditingFlow(normalizedData);
      setIsNewFlowOpen(false);
      setNewFlowName('');
      toast.success("Fluxo criado!");
    } catch (error) {
      toast.error("Erro ao criar fluxo");
    }
  };

  const handleDeleteFlow = async () => {
    if (!confirm("Tem certeza que deseja excluir este fluxo?")) return;
    try {
      await supabase.from('cadencia_flows').delete().eq('id', activeFlowId);
      toast.success("Fluxo excluído");
      
      const remaining = flows.filter(f => f.id !== activeFlowId);
      setFlows(remaining);
      if (remaining.length > 0) {
        setActiveFlowId(remaining[0].id);
        setEditingFlow(remaining[0]);
      } else {
        setActiveFlowId('');
        setEditingFlow(null);
      }
    } catch (error) {
      toast.error("Erro ao excluir fluxo");
    }
  };

  const handleSave = async () => {
    if (!editingFlow) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('cadencia_flows').update({
        messages: editingFlow.messages,
        updated_at: new Date().toISOString()
      }).eq('id', editingFlow.id);

      if (error) throw error;
      toast.success("Alterações salvas com sucesso!");
      
      setFlows(prev => prev.map(f => f.id === editingFlow.id ? editingFlow : f));
    } catch (error) {
      toast.error("Erro ao salvar alterações");
    } finally {
      setSaving(false);
    }
  };

  // --- Manipulação do Fluxo (Steps e Mensagens) ---

  const addStep = () => {
    if (!editingFlow) return;
    const newStep: Step = {
      id: crypto.randomUUID(),
      delayAmount: editingFlow.messages.length > 0 ? 1 : 0,
      delayUnit: editingFlow.messages.length > 0 ? 'days' : 'immediately',
      items: [{ id: crypto.randomUUID(), type: 'text', content: '' }]
    };
    setEditingFlow({ ...editingFlow, messages: [...editingFlow.messages, newStep] });
  };

  const removeStep = (stepId: string) => {
    if (!editingFlow) return;
    setEditingFlow({ ...editingFlow, messages: editingFlow.messages.filter(s => s.id !== stepId) });
  };

  const updateStepDelayAmount = (stepId: string, amount: number) => {
    if (!editingFlow) return;
    setEditingFlow({
      ...editingFlow,
      messages: editingFlow.messages.map(s => s.id === stepId ? { ...s, delayAmount: amount, delayDays: s.delayUnit === 'days' ? amount : s.delayDays } : s)
    });
  };

  const updateStepDelayUnit = (stepId: string, unit: 'immediately' | 'minutes' | 'hours' | 'days') => {
    if (!editingFlow) return;
    setEditingFlow({
      ...editingFlow,
      messages: editingFlow.messages.map(s => s.id === stepId ? { ...s, delayUnit: unit, delayAmount: unit === 'immediately' ? 0 : (s.delayAmount || 1) } : s)
    });
  };

  const addMessageToStep = (stepId: string, type: 'text' | 'audio' | 'image') => {
    if (!editingFlow) return;
    setEditingFlow({
      ...editingFlow,
      messages: editingFlow.messages.map(s => {
        if (s.id === stepId) {
          return { ...s, items: [...s.items, { id: crypto.randomUUID(), type, content: '' }] };
        }
        return s;
      })
    });
  };

  const removeMessageFromStep = (stepId: string, msgId: string) => {
    if (!editingFlow) return;
    setEditingFlow({
      ...editingFlow,
      messages: editingFlow.messages.map(s => {
        if (s.id === stepId) {
          return { ...s, items: s.items.filter(m => m.id !== msgId) };
        }
        return s;
      })
    });
  };

  const updateMessageContent = (stepId: string, msgId: string, content: string, caption?: string) => {
    if (!editingFlow) return;
    setEditingFlow({
      ...editingFlow,
      messages: editingFlow.messages.map(s => {
        if (s.id === stepId) {
          return {
            ...s, items: s.items.map(m => m.id === msgId ? { ...m, content, caption: caption ?? m.caption } : m)
          };
        }
        return s;
      })
    });
  };

  if (loading) {
    return <Layout><div className="flex h-full items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div></Layout>;
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto flex flex-col h-full space-y-8 pb-12">
        
        {/* Cabeçalho */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 z-10 sticky top-0">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Fluxos de Cadência</h1>
            <p className="text-sm text-gray-500">Configure sequências de mensagens automáticas para seus leads.</p>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Select value={activeFlowId} onValueChange={handleFlowChange}>
              <SelectTrigger className="w-full sm:w-[220px] bg-gray-50 border-gray-200">
                <SelectValue placeholder="Selecione um fluxo" />
              </SelectTrigger>
              <SelectContent>
                {flows.map(f => (
                  <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <button 
              onClick={() => setIsNewFlowOpen(true)}
              className="p-2 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors border border-gray-200"
              title="Novo Fluxo"
            >
              <Plus className="w-5 h-5" />
            </button>
            <button 
              onClick={handleSave}
              disabled={saving || !editingFlow}
              className="px-5 py-2.5 bg-orange-500 text-white font-bold rounded-lg hover:bg-orange-600 transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvar Alterações
            </button>
          </div>
        </div>

        {/* Timeline */}
        {editingFlow ? (
          <div className="relative pl-4 sm:pl-8">
            {/* Linha vertical */}
            <div className="absolute top-4 bottom-8 left-[31px] sm:left-[47px] w-0.5 bg-gray-200" />
            
            <div className="space-y-8">
              {editingFlow.messages.map((step, stepIndex) => (
                <div key={step.id} className="relative pl-12 sm:pl-16">
                  {/* Número da Etapa */}
                  <div className="absolute left-0 sm:left-4 top-4 w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold shadow-md ring-4 ring-[#f8fafc]">
                    {stepIndex + 1}
                  </div>

                  {/* Card da Etapa */}
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden transition-all hover:border-orange-200">
                    
                    <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between bg-gray-50/50 gap-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-gray-700 text-sm">Enviar</span>
                        
                        {step.delayUnit !== 'immediately' && (
                          <input 
                            type="number" 
                            min="1"
                            value={step.delayAmount ?? 1}
                            onChange={e => updateStepDelayAmount(step.id, Number(e.target.value))}
                            className="w-16 px-2 py-1.5 h-8 text-center border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-400 font-bold text-gray-900"
                          />
                        )}
                        
                        <Select 
                          value={step.delayUnit || 'days'} 
                          onValueChange={(val: any) => updateStepDelayUnit(step.id, val)}
                        >
                          <SelectTrigger className="w-[155px] h-8 bg-white border-gray-300 font-semibold text-gray-700 focus:ring-orange-400">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="immediately">Imediatamente</SelectItem>
                            <SelectItem value="minutes">Minuto(s) após</SelectItem>
                            <SelectItem value="hours">Hora(s) após</SelectItem>
                            <SelectItem value="days">Dia(s) após</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-600 rounded-full text-xs font-bold border border-green-100">
                          <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
                        </div>
                        <button onClick={() => removeStep(step.id)} className="p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 rounded-md transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="p-4 space-y-4">
                      {step.items.map((msg, msgIndex) => (
                        <div key={msg.id} className="relative bg-gray-50 p-4 rounded-xl border border-gray-100 group">
                          <button 
                            onClick={() => removeMessageFromStep(step.id, msg.id)}
                            className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-red-500 bg-white rounded-md shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>

                          {msg.type === 'text' && (
                            <div className="space-y-2">
                              <div className="flex items-center gap-1.5 text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">
                                <Type className="w-3.5 h-3.5" /> Mensagem de Texto
                              </div>
                              <textarea 
                                value={msg.content}
                                onChange={e => updateMessageContent(step.id, msg.id, e.target.value)}
                                placeholder="Olá! Gostaria de saber mais sobre nossos serviços?"
                                className="w-full p-3 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none min-h-[80px]"
                              />
                            </div>
                          )}

                          {msg.type === 'audio' && (
                            <div className="space-y-2">
                              <div className="flex items-center gap-1.5 text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">
                                <Mic className="w-3.5 h-3.5" /> Mensagem de Áudio
                              </div>
                              {msg.content ? (
                                <div className="flex items-center gap-4 bg-white p-3 border border-gray-200 rounded-lg">
                                  <audio controls src={msg.content} className="h-10 w-full max-w-[250px]" />
                                  <button onClick={() => updateMessageContent(step.id, msg.id, '')} className="text-xs font-bold text-red-500 hover:underline">Regravar</button>
                                </div>
                              ) : (
                                <AudioRecorder 
                                  userId={user?.id || ''}
                                  onSave={(url) => updateMessageContent(step.id, msg.id, url)} 
                                  onCancel={() => removeMessageFromStep(step.id, msg.id)} 
                                />
                              )}
                            </div>
                          )}

                          {msg.type === 'image' && (
                            <div className="space-y-2">
                              <div className="flex items-center gap-1.5 text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">
                                <ImageIcon className="w-3.5 h-3.5" /> Mensagem com Imagem
                              </div>
                              {msg.content ? (
                                <div className="flex flex-col gap-3">
                                  <div className="relative inline-block w-fit">
                                    <img src={msg.content} alt="Upload" className="h-32 rounded-lg border border-gray-200 shadow-sm object-cover" />
                                    <button onClick={() => updateMessageContent(step.id, msg.id, '', '')} className="absolute -top-2 -right-2 bg-white text-red-500 rounded-full p-1 shadow-md border border-gray-200 hover:bg-red-50">
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                  <input 
                                    type="text"
                                    value={msg.caption || ''}
                                    onChange={e => updateMessageContent(step.id, msg.id, msg.content, e.target.value)}
                                    placeholder="Adicione uma legenda (opcional)"
                                    className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                                  />
                                </div>
                              ) : (
                                <ImageUploader 
                                  userId={user?.id || ''}
                                  onSave={(url) => updateMessageContent(step.id, msg.id, url)} 
                                  onCancel={() => removeMessageFromStep(step.id, msg.id)} 
                                />
                              )}
                            </div>
                          )}

                        </div>
                      ))}

                      <div className="flex items-center gap-2 pt-2">
                        <span className="text-xs font-bold text-gray-400 uppercase mr-2">+ Adicionar:</span>
                        <button onClick={() => addMessageToStep(step.id, 'text')} className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50 flex items-center gap-1.5 shadow-sm transition-colors">
                          <Type className="w-3.5 h-3.5" /> Texto
                        </button>
                        <button onClick={() => addMessageToStep(step.id, 'audio')} className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50 flex items-center gap-1.5 shadow-sm transition-colors">
                          <Mic className="w-3.5 h-3.5" /> Áudio
                        </button>
                        <button onClick={() => addMessageToStep(step.id, 'image')} className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50 flex items-center gap-1.5 shadow-sm transition-colors">
                          <ImageIcon className="w-3.5 h-3.5" /> Imagem
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <div className="relative pl-12 sm:pl-16">
                <button 
                  onClick={addStep}
                  className="w-full py-4 border-2 border-dashed border-gray-300 rounded-2xl text-gray-500 font-bold hover:bg-gray-50 hover:border-orange-300 hover:text-orange-500 transition-all flex items-center justify-center gap-2 bg-white/50"
                >
                  <Plus className="w-5 h-5" /> Adicionar Nova Etapa
                </button>
              </div>

              {editingFlow.messages.length > 0 && (
                 <div className="relative pl-12 sm:pl-16 flex justify-between items-center pt-8 border-t border-gray-200">
                    <button onClick={handleDeleteFlow} className="text-red-500 font-semibold text-sm hover:underline flex items-center gap-1.5">
                      <Trash2 className="w-4 h-4" /> Excluir Fluxo Completo
                    </button>
                 </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-white rounded-2xl border border-gray-200 shadow-sm mt-8">
            <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mb-4">
              <MessageSquare className="w-10 h-10 text-orange-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Nenhum fluxo selecionado</h2>
            <p className="text-gray-500 mb-6 max-w-md">Selecione um fluxo existente no menu superior ou crie um novo para começar a configurar suas automações.</p>
            <button onClick={() => setIsNewFlowOpen(true)} className="px-6 py-3 bg-orange-400 text-white font-bold rounded-xl hover:bg-orange-500 transition-colors flex items-center gap-2 shadow-md">
              <Plus className="w-5 h-5" /> Criar Primeiro Fluxo
            </button>
          </div>
        )}
      </div>

      {/* Modal Novo Fluxo */}
      <Dialog open={isNewFlowOpen} onOpenChange={setIsNewFlowOpen}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Criar Novo Fluxo</DialogTitle>
            <DialogDescription>
              Dê um nome para sua nova cadência de mensagens (Ex: Follow Up, Contorno de Objeção).
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <label className="block text-sm font-bold text-gray-900 mb-2">Nome do Fluxo</label>
            <input 
              type="text" 
              value={newFlowName}
              onChange={(e) => setNewFlowName(e.target.value)}
              placeholder="Digite o nome..."
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400 transition-all"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleCreateFlow()}
            />
          </div>

          <div className="flex justify-end gap-3 mt-2">
            <button onClick={() => setIsNewFlowOpen(false)} className="px-5 py-2.5 text-gray-600 font-semibold hover:bg-gray-100 rounded-lg transition-all">
              Cancelar
            </button>
            <button onClick={handleCreateFlow} disabled={!newFlowName.trim()} className="px-6 py-2.5 bg-orange-400 text-white font-bold rounded-lg hover:bg-orange-500 transition-all flex items-center gap-2 shadow-sm disabled:opacity-50">
              Criar Fluxo
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}