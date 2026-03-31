import React, { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Trash2, Plus, UserPlus, MessageSquare, MessageCircle, Link as LinkIcon,
  Upload, Loader2, Copy, ExternalLink, X, UserMinus, Search, Inbox, ArrowUp, ArrowDown, Clock, Tag as TagIcon, Zap
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import LeadImportModal from "@/components/LeadImportModal";
import OpportunityDetailModal from "@/components/OpportunityDetailModal";

// --- Tipos ---
interface Pipeline { id: string; name: string; }
interface Column { id: string; pipeline_id: string; name: string; order_index: number; }
interface Opportunity {
  id: string; 
  pipeline_id: string; 
  column_id: string; 
  name: string; 
  tag: string;
  email: string; 
  phone: string; 
  value: string; 
  instagram: string; 
  address: string;
  observations: string; 
  event_date: string; 
  is_client: boolean;
  company: string; 
  avatar_url: string;
}
interface LinkForm {
  id: string; name: string; tag: string; whatsapp_number: string; whatsapp_text: string;
  fields: { email: boolean; phone: boolean; instagram: boolean; date: boolean; local: boolean; description: boolean; };
}
interface WhatsappTrigger {
  id: string; trigger_phrase: string; pipeline_id: string; column_id: string; tag: string; enabled: boolean;
}

const PHOTO_TYPES = [
  { value: 'Casamento', label: '💍 Casamento', color: 'bg-pink-100 text-pink-700' },
  { value: 'Gestante', label: '🤰 Gestante', color: 'bg-purple-100 text-purple-700' },
  { value: 'Corporativo', label: '💼 Corporativo', color: 'bg-blue-100 text-blue-700' },
  { value: 'Retrato', label: '👤 Retrato', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'Newborn', label: '👶 Newborn', color: 'bg-teal-100 text-teal-700' },
  { value: 'Infantil', label: '👧 Infantil', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'Ensaio feminino', label: '👩 Ensaio feminino', color: 'bg-rose-100 text-rose-700' },
  { value: 'Smash the cake', label: '🎂 Smash the cake', color: 'bg-orange-100 text-orange-700' }
];

export default function Oportunidades() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  
  // Dados
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [columns, setColumns] = useState<Column[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [linkForms, setLinkForms] = useState<LinkForm[]>([]);
  const [whatsappTriggers, setWhatsappTriggers] = useState<WhatsappTrigger[]>([]);
  const [activeCadences, setActiveCadences] = useState<Record<string, number>>({});
  
  const [activePipelineId, setActivePipelineId] = useState<string>("");
  const [selectedOpps, setSelectedOpps] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Modais
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'opp' | 'link' | 'trigger'>('opp');
  const [isNewColOpen, setIsNewColOpen] = useState(false);
  const [newColName, setNewColName] = useState("");

  // Modal de Detalhes da Oportunidade
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedOppToView, setSelectedOppToView] = useState<Opportunity | null>(null);

  // Formulário Modal
  const [formData, setFormData] = useState({
    pipeline_id: '', tag: '', name: '', value: '', email: '', phone: '', 
    instagram: '', date: '', local: '', description: '', whatsapp_number: '', whatsapp_text: '', trigger_phrase: ''
  });
  const [formFields, setFormFields] = useState({
    email: true, phone: true, instagram: true, date: false, local: false, description: false
  });

  // Busca inicial
  useEffect(() => {
    if (!user) return;
    fetchData();

    // Real-time para oportunidades
    const channel = supabase.channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'opportunities', filter: `user_id=eq.${user.id}` }, 
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setOpportunities(prev => {
              const exists = prev.some(o => o.id === payload.new.id);
              if (exists) return prev;
              return [...prev, payload.new as Opportunity];
            });
          }
          if (payload.eventType === 'UPDATE') setOpportunities(prev => prev.map(o => o.id === payload.new.id ? payload.new as Opportunity : o));
          if (payload.eventType === 'DELETE') {
            setOpportunities(prev => prev.filter(o => o.id !== payload.old.id));
            setSelectedOpps(prev => prev.filter(id => id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pipesRes, colsRes, oppsRes, formsRes, queueRes, triggersRes] = await Promise.all([
        supabase.from('pipelines').select('*').order('created_at', { ascending: true }),
        supabase.from('columns').select('*').order('order_index', { ascending: true }),
        supabase.from('opportunities').select('*'),
        supabase.from('link_forms').select('*'),
        supabase.from('cadencia_queue').select('opportunity_id').eq('user_id', user?.id).eq('status', 'pending'),
        supabase.from('whatsapp_triggers').select('*')
      ]);

      let pipes = pipesRes.data || [];
      let cols = colsRes.data || [];

      // Criar pipeline padrão se não existir
      if (pipes.length === 0) {
        const newPipe = await supabase.from('pipelines').insert({ name: 'Vendas Principais', user_id: user?.id }).select().single();
        if (newPipe.data) {
          pipes = [newPipe.data];
          const defCols = [
            { name: 'Aberto', order_index: 0, pipeline_id: newPipe.data.id, user_id: user?.id },
            { name: 'Em Progresso', order_index: 1, pipeline_id: newPipe.data.id, user_id: user?.id },
            { name: 'Ganho', order_index: 2, pipeline_id: newPipe.data.id, user_id: user?.id },
            { name: 'Perdido', order_index: 3, pipeline_id: newPipe.data.id, user_id: user?.id }
          ];
          const newCols = await supabase.from('columns').insert(defCols).select();
          cols = newCols.data || [];
        }
      }

      setPipelines(pipes);
      setColumns(cols);
      setOpportunities(oppsRes.data as Opportunity[] || []);
      setLinkForms(formsRes.data || []);
      setWhatsappTriggers(triggersRes.data || []);
      
      // Mapear contagem de cadências ativas por lead
      const cadenceMap: Record<string, number> = {};
      queueRes.data?.forEach(q => {
        if (q.opportunity_id) {
          cadenceMap[q.opportunity_id] = (cadenceMap[q.opportunity_id] || 0) + 1;
        }
      });
      setActiveCadences(cadenceMap);
      
      if (pipes.length > 0 && !activePipelineId) {
        setActivePipelineId(pipes[0].id);
        setFormData(prev => ({ ...prev, pipeline_id: pipes[0].id }));
      }
    } catch (error) {
      toast.error("Erro ao carregar dados.");
    } finally {
      setLoading(false);
    }
  };

  const activeColumns = columns.filter(c => c.pipeline_id === activePipelineId).sort((a, b) => a.order_index - b.order_index);

  const filteredOpportunities = opportunities.filter(opp => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      opp.name.toLowerCase().includes(query) ||
      (opp.email && opp.email.toLowerCase().includes(query)) ||
      (opp.phone && opp.phone.toLowerCase().includes(query))
    );
  });

  // Drag and Drop
  const onDragEnd = async (result: any) => {
    const { destination, source, draggableId, type } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    if (type === "column") {
      const newCols = Array.from(activeColumns);
      const [removed] = newCols.splice(source.index, 1);
      newCols.splice(destination.index, 0, removed);

      const updatedCols = newCols.map((col, index) => ({ ...col, order_index: index }));
      setColumns(prev => prev.map(c => updatedCols.find(uc => uc.id === c.id) || c));

      for (const col of updatedCols) {
        await supabase.from('columns').update({ order_index: col.order_index }).eq('id', col.id);
      }
      return;
    }

    const destColId = destination.droppableId;
    
    // Atualização otimista com reordenação local
    setOpportunities(prev => {
      const updatedOpps = Array.from(prev);
      const oppToMove = updatedOpps.find(o => o.id === draggableId);
      if (oppToMove) {
        oppToMove.column_id = destColId;
      }
      return updatedOpps;
    });

    await supabase.from('opportunities').update({ column_id: destColId }).eq('id', draggableId);
  };

  // Seleções
  const toggleColumnSelection = (colId: string, colOppsIds: string[]) => {
    const allSelected = colOppsIds.length > 0 && colOppsIds.every(id => selectedOpps.includes(id));
    if (allSelected) {
      setSelectedOpps(prev => prev.filter(id => !colOppsIds.includes(id)));
    } else {
      const newIds = colOppsIds.filter(id => !selectedOpps.includes(id));
      setSelectedOpps(prev => [...prev, ...newIds]);
    }
  };

  const toggleSelection = (oppId: string) => {
    setSelectedOpps(prev => prev.includes(oppId) ? prev.filter(id => id !== oppId) : [...prev, oppId]);
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Deletar ${selectedOpps.length} oportunidades?`)) return;
    try {
      for (const id of selectedOpps) {
        await supabase.from('opportunities').delete().eq('id', id);
      }
      setOpportunities(prev => prev.filter(o => !selectedOpps.includes(o.id)));
      setSelectedOpps([]);
      toast.success("Oportunidades deletadas.");
    } catch (e) {
      toast.error("Erro ao deletar.");
    }
  };

  // Reordenar Setas Cima/Baixo
  const moveCard = (e: React.MouseEvent, oppId: string, colId: string, direction: 'up' | 'down') => {
    e.stopPropagation();
    setOpportunities(prev => {
      const oppsInCol = prev.filter(o => o.column_id === colId);
      const otherOpps = prev.filter(o => o.column_id !== colId);
      const index = oppsInCol.findIndex(o => o.id === oppId);
      
      if (direction === 'up' && index > 0) {
        const temp = oppsInCol[index];
        oppsInCol[index] = oppsInCol[index - 1];
        oppsInCol[index - 1] = temp;
      } else if (direction === 'down' && index < oppsInCol.length - 1) {
        const temp = oppsInCol[index];
        oppsInCol[index] = oppsInCol[index + 1];
        oppsInCol[index + 1] = temp;
      }
      
      return [...otherOpps, ...oppsInCol];
    });
  };

  // Ações nos Cards
  const handleToggleClient = async (e: React.MouseEvent, opp: Opportunity) => {
    e.stopPropagation();
    try {
      const newStatus = !opp.is_client;
      await supabase.from('opportunities').update({ is_client: newStatus }).eq('id', opp.id);
      setOpportunities(prev => prev.map(o => o.id === opp.id ? { ...o, is_client: newStatus } : o));
      toast.success(newStatus ? "Adicionado aos clientes!" : "Removido de clientes.");
    } catch (e) {
      toast.error("Erro ao atualizar status do cliente.");
    }
  };

  const [isCadenciaModalOpen, setIsCadenciaModalOpen] = useState(false);
  const [selectedOppForCadencia, setSelectedOppForCadencia] = useState<Opportunity | null>(null);
  const [cadenciaFlows, setCadenciaFlows] = useState<any[]>([]);
  const [selectedFlowId, setSelectedFlowId] = useState<string>("");

  useEffect(() => {
    if (isCadenciaModalOpen && user) {
      supabase
        .from('cadencia_flows')
        .select('id, name, messages')
        .eq('user_id', user.id)
        .then(({ data }) => setCadenciaFlows(data || []));
    }
  }, [isCadenciaModalOpen, user]);

  const handleCadenciaClick = (e: React.MouseEvent, opp: Opportunity) => {
    e.stopPropagation();
    if (!opp.phone) return toast.error("Este lead não possui telefone cadastrado.");
    if (activeCadences[opp.id] > 0) {
      return toast.warning("Este lead já possui um fluxo de cadência em andamento.");
    }
    setSelectedOppForCadencia(opp);
    setIsCadenciaModalOpen(true);
  };

  const handleStartCadencia = async () => {
    if (!selectedFlowId || !selectedOppForCadencia || !user) return toast.error("Selecione um fluxo.");

    const flow = cadenciaFlows.find(f => f.id === selectedFlowId);
    if (!flow || !flow.messages || flow.messages.length === 0) return toast.error("Este fluxo não possui mensagens.");

    try {
      const queueItems = [];
      const now = new Date();
      let currentDelayInMinutes = 0;

      for (const step of flow.messages) {
        let stepDelayMinutes = 0;
        if (step.delayUnit === 'immediately') stepDelayMinutes = 0;
        else if (step.delayUnit === 'minutes') stepDelayMinutes = step.delayAmount || 0;
        else if (step.delayUnit === 'hours') stepDelayMinutes = (step.delayAmount || 0) * 60;
        else if (step.delayUnit === 'days') stepDelayMinutes = (step.delayAmount || 0) * 24 * 60;
        else if (step.delayDays) stepDelayMinutes = step.delayDays * 24 * 60;

        currentDelayInMinutes += stepDelayMinutes;
        const scheduledTime = new Date(now.getTime() + currentDelayInMinutes * 60000);

        for (const item of step.items) {
          queueItems.push({
            user_id: user.id,
            opportunity_id: selectedOppForCadencia.id,
            flow_id: flow.id,
            step_id: step.id,
            scheduled_for: scheduledTime.toISOString(),
            status: 'pending',
            payload: item
          });
        }
      }

      const { error } = await supabase.from('cadencia_queue').insert(queueItems);
      if (error) throw error;

      setActiveCadences(prev => ({
        ...prev,
        [selectedOppForCadencia.id]: (prev[selectedOppForCadencia.id] || 0) + queueItems.length
      }));

      toast.success("Cadência iniciada!");
      setIsCadenciaModalOpen(false);
    } catch (err) {
      toast.error("Erro ao iniciar cadência.");
    }
  };

  const handleDeleteColumn = async (colId: string) => {
    if (!confirm("Deletar esta coluna?")) return;
    await supabase.from('columns').delete().eq('id', colId);
    setColumns(prev => prev.filter(c => c.id !== colId));
    toast.success("Coluna deletada.");
  };

  const handleCardClick = (opp: Opportunity) => {
    setSelectedOppToView(opp);
    setIsDetailModalOpen(true);
  };

  const handleSaveDetailModal = (updatedOpp: Opportunity) => {
    setOpportunities(prev => prev.map(o => o.id === updatedOpp.id ? updatedOpp : o));
  };

  const handleDeleteDetailModal = (id: string) => {
    setOpportunities(prev => prev.filter(o => o.id !== id));
    setSelectedOpps(prev => prev.filter(selectedId => selectedId !== id));
  };

  const handleDeleteLinkForm = async (id: string) => {
    if (!confirm("Deletar este formulário?")) return;
    try {
      await supabase.from('link_forms').delete().eq('id', id);
      setLinkForms(prev => prev.filter(f => f.id !== id));
      toast.success("Formulário removido.");
    } catch (e) {
      toast.error("Erro ao deletar.");
    }
  };

  // Criação
  const handleCreateNew = async () => {
    if (activeTab === 'opp' && !formData.name) return toast.error("Nome é obrigatório.");
    if (activeTab === 'link' && !formData.name) return toast.error("Nome é obrigatório.");
    if (activeTab === 'trigger' && !formData.trigger_phrase) return toast.error("Mensagem gatilho é obrigatória.");
    
    if (activeColumns.length === 0) return toast.error("Crie uma coluna primeiro.");

    const targetCol = activeColumns[0].id;

    try {
      if (activeTab === 'opp') {
        const { data, error } = await supabase.from('opportunities').insert({
          user_id: user?.id,
          pipeline_id: formData.pipeline_id || activePipelineId,
          column_id: targetCol,
          name: formData.name,
          value: formData.value,
          email: formData.email,
          phone: formData.phone,
          instagram: formData.instagram,
          event_date: formData.date || null,
          address: formData.local,
          observations: formData.description,
          tag: formData.tag,
          is_client: false
        }).select().single();
        if (error) throw error;
        if (data) setOpportunities(prev => [...prev, data as Opportunity]);
        toast.success("Oportunidade criada!");
      } else if (activeTab === 'link') {
        const { data } = await supabase.from('link_forms').insert({
          user_id: user?.id,
          pipeline_id: formData.pipeline_id || activePipelineId,
          column_id: targetCol,
          name: formData.name,
          tag: formData.tag,
          whatsapp_number: formData.whatsapp_number,
          whatsapp_text: formData.whatsapp_text,
          fields: formFields
        }).select().single();
        if (data) setLinkForms(prev => [...prev, data]);
        toast.success("Link Form gerado!");
      } else if (activeTab === 'trigger') {
        const { data } = await supabase.from('whatsapp_triggers').insert({
          user_id: user?.id,
          trigger_phrase: formData.trigger_phrase,
          pipeline_id: formData.pipeline_id || activePipelineId,
          column_id: targetCol,
          tag: formData.tag,
          enabled: true
        }).select().single();
        if (data) setWhatsappTriggers(prev => [...prev, data]);
        toast.success("Gatilho configurado!");
      }
      setIsModalOpen(false);
      setFormData({ pipeline_id: activePipelineId, tag: '', name: '', value: '', email: '', phone: '', instagram: '', date: '', local: '', description: '', whatsapp_number: '', whatsapp_text: '', trigger_phrase: '' });
    } catch (error) {
      toast.error("Erro ao salvar.");
    }
  };

  const handleCreateColumn = async () => {
    if (!newColName) return;
    const { data } = await supabase.from('columns').insert({
      user_id: user?.id, pipeline_id: activePipelineId, name: newColName, order_index: activeColumns.length
    }).select().single();
    if (data) setColumns([...columns, data]);
    setNewColName(""); setIsNewColOpen(false);
    toast.success("Coluna criada!");
  };

  const handleDeleteTrigger = async (id: string) => {
    if (!confirm("Deletar gatilho?")) return;
    setWhatsappTriggers(prev => prev.filter(t => t.id !== id));
    await supabase.from('whatsapp_triggers').delete().eq('id', id);
  };

  if (loading) return <Layout><div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-orange-400" /></div></Layout>;

  return (
    <Layout>
      <div className="max-w-full mx-auto flex flex-col h-full bg-[#FAFAFA]">
        {/* Bulk Action Bar */}
        {selectedOpps.length > 0 && (
          <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-3 mb-4 flex items-center justify-between animate-in slide-in-from-top-2">
            <span className="font-semibold text-orange-500">{selectedOpps.length} oportunidade(s) selecionada(s)</span>
            <div className="flex gap-2">
              <button onClick={() => setSelectedOpps([])} className="px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 rounded-md transition-colors">Cancelar</button>
              <button onClick={handleBulkDelete} className="px-3 py-1.5 text-sm bg-red-50 text-red-600 hover:bg-red-100 rounded-md flex items-center gap-1.5 transition-colors">
                <Trash2 className="w-4 h-4" /> Deletar
              </button>
            </div>
          </div>
        )}

        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Oportunidades</h1>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button onClick={() => setIsImportOpen(true)} className="flex-1 sm:flex-none justify-center px-4 py-2.5 sm:py-2 bg-white border border-gray-200 text-gray-700 font-semibold rounded-xl sm:rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 shadow-sm">
              <Upload className="w-4 h-4" /> Importar
            </button>
            <button onClick={() => setIsModalOpen(true)} className="flex-1 sm:flex-none justify-center px-4 py-2.5 sm:py-2 bg-orange-400 text-white font-semibold rounded-xl sm:rounded-lg hover:bg-orange-500 transition-colors flex items-center gap-2 shadow-sm">
              <Plus className="w-4 h-4" /> Adicionar
            </button>
          </div>
        </div>

        {/* Kanban Board */}
        <div className="flex gap-4 sm:gap-5 overflow-x-auto pb-4 flex-1 items-start snap-x custom-scrollbar">
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="board" direction="horizontal" type="column">
              {(provided) => (
                <div className="flex gap-4 sm:gap-5 h-full" {...provided.droppableProps} ref={provided.innerRef}>
                  {activeColumns.map((col, index) => {
                    const colOpps = filteredOpportunities.filter(o => o.column_id === col.id);
                    const colOppsIds = colOpps.map(o => o.id);
                    const allSelected = colOppsIds.length > 0 && colOppsIds.every(id => selectedOpps.includes(id));
                    const someSelected = colOpps.some(o => selectedOpps.includes(o.id));

                    return (
                      <Draggable key={col.id} draggableId={col.id} index={index}>
                        {(provided) => (
                          <div
                            ref={provided.innerRef} {...provided.draggableProps}
                            className="flex-1 min-w-[85vw] sm:min-w-[320px] max-w-[85vw] sm:max-w-[340px] snap-center bg-white rounded-2xl sm:rounded-xl border border-gray-200 flex flex-col max-h-[calc(100vh-220px)] shadow-sm"
                          >
                            <div className="p-4 border-b border-gray-100 rounded-t-xl bg-white" {...provided.dragHandleProps}>
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                  <input 
                                    type="checkbox"
                                    checked={allSelected}
                                    ref={input => { if (input) input.indeterminate = someSelected && !allSelected; }}
                                    onChange={() => toggleColumnSelection(col.id, colOppsIds)}
                                    className="w-4 h-4 rounded border-gray-300 accent-orange-500 cursor-pointer"
                                  />
                                  <h3 className="font-bold text-gray-900 text-[15px]">{col.name}</h3>
                                  <span className="bg-gray-100 text-gray-500 text-xs font-bold px-2 py-0.5 rounded-full min-w-[24px] text-center">
                                    {colOpps.length}
                                  </span>
                                </div>
                                <button onClick={() => handleDeleteColumn(col.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                            
                            <Droppable droppableId={col.id} type="card">
                              {(provided, snapshot) => (
                                <div 
                                  ref={provided.innerRef} {...provided.droppableProps}
                                  className={`flex-1 p-3 overflow-y-auto rounded-b-xl space-y-3 transition-colors ${snapshot.isDraggingOver ? 'bg-orange-50/20' : 'bg-gray-50/30'}`}
                                  style={{ minHeight: '150px' }}
                                >
                                  {colOpps.map((opp, oppIndex) => {
                                    const isFromWhatsApp = opp.observations?.includes("gatilho de WhatsApp");
                                    return (
                                      <Draggable key={opp.id} draggableId={opp.id} index={oppIndex}>
                                        {(provided, snapshot) => (
                                          <div
                                            ref={provided.innerRef} 
                                            {...provided.draggableProps} 
                                            {...provided.dragHandleProps}
                                            onClick={() => handleCardClick(opp)}
                                            className={`bg-white p-4 rounded-xl border transition-all relative group cursor-pointer ${snapshot.isDragging ? 'shadow-xl ring-2 ring-orange-400 border-transparent z-50' : 'border-gray-200 shadow-sm hover:shadow-md'}`}
                                          >
                                            <div className="flex justify-between items-start mb-3">
                                              <div className="flex items-center gap-2.5">
                                                <input type="checkbox" checked={selectedOpps.includes(opp.id)} onChange={() => toggleSelection(opp.id)} onClick={(e) => e.stopPropagation()} className="w-4 h-4 mt-0.5 rounded border-gray-300 accent-orange-500 cursor-pointer shrink-0" />
                                                <span className="font-semibold text-gray-900 text-sm leading-tight flex items-center gap-1.5">
                                                  {isFromWhatsApp && <MessageCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />}
                                                  {opp.name}
                                                </span>
                                              </div>
                                              <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                                                <button onClick={(e) => moveCard(e, opp.id, col.id, 'up')} disabled={oppIndex === 0} className="text-gray-400 hover:text-gray-700 disabled:opacity-30"><ArrowUp className="w-3 h-3" /></button>
                                                <button onClick={(e) => moveCard(e, opp.id, col.id, 'down')} disabled={oppIndex === colOpps.length - 1} className="text-gray-400 hover:text-gray-700 disabled:opacity-30"><ArrowDown className="w-3 h-3" /></button>
                                              </div>
                                            </div>
                                            {opp.tag && (
                                              <div className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-orange-100 text-orange-700 mb-2">
                                                {opp.tag}
                                              </div>
                                            )}
                                            <div className="text-[12px] text-gray-500 mb-4 truncate">{opp.email || opp.phone}</div>
                                            <div className="flex gap-2">
                                              <button onClick={(e) => handleToggleClient(e, opp)} className={`flex-1 py-1.5 rounded-md border text-[11px] font-semibold transition-colors ${opp.is_client ? 'border-red-200 text-red-600 bg-red-50' : 'border-gray-200 text-gray-700 bg-white'}`}>
                                                {opp.is_client ? '-Cliente' : '+Cliente'}
                                              </button>
                                              <button onClick={(e) => handleCadenciaClick(e, opp)} className="flex-1 py-1.5 rounded-md border border-gray-200 text-gray-700 text-[11px] font-semibold bg-white hover:bg-gray-50 transition-colors">
                                                <MessageCircle className="w-3.5 h-3.5 inline mr-1 text-green-500" /> Cadência
                                              </button>
                                            </div>
                                          </div>
                                        )}
                                      </Draggable>
                                    );
                                  })}
                                  {provided.placeholder}
                                </div>
                              )}
                            </Droppable>
                          </div>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                  <button onClick={() => setIsNewColOpen(true)} className="min-w-[85vw] sm:min-w-[320px] max-w-[85vw] sm:max-w-[320px] snap-center bg-transparent border-2 border-dashed border-gray-200 rounded-2xl sm:rounded-xl flex items-center justify-center text-gray-600 hover:text-gray-900 h-[60px] font-bold text-sm">
                    <Plus className="w-4 h-4 mr-2" /> Adicionar Coluna
                  </button>
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </div>

        {/* Footer: Link Forms & Triggers */}
        <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2"><LinkIcon className="w-4 h-4 text-orange-400"/> Link Forms Ativos</h3>
            <div className="flex flex-col gap-2">
              {linkForms.map(form => (
                <div key={form.id} className="bg-white border border-gray-200 rounded-lg p-3 flex justify-between items-center shadow-sm">
                  <div><p className="font-semibold text-sm truncate max-w-[180px]">{form.name}</p><p className="text-xs text-gray-500">{form.tag || 'Geral'}</p></div>
                  <div className="flex gap-1">
                    <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/link-form/${form.id}`); toast.success("Copiado!"); }} className="p-1.5 text-gray-400 bg-gray-50 rounded"><Copy className="w-4 h-4"/></button>
                    <button onClick={() => handleDeleteLinkForm(form.id)} className="p-1.5 text-red-400 bg-red-50 rounded"><Trash2 className="w-4 h-4"/></button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2"><Zap className="w-4 h-4 text-orange-400"/> Gatilhos WhatsApp</h3>
            <div className="flex flex-col gap-2">
              {whatsappTriggers.map(trig => (
                <div key={trig.id} className="bg-white border border-gray-200 rounded-lg p-3 flex justify-between items-center shadow-sm">
                  <div><p className="font-semibold text-sm truncate max-w-[180px]">Gatilho: "{trig.trigger_phrase}"</p><p className="text-xs text-gray-500">Destino: {columns.find(c => c.id === trig.column_id)?.name || '...'}</p></div>
                  <button onClick={() => handleDeleteTrigger(trig.id)} className="p-1.5 text-red-400 bg-red-50 rounded"><Trash2 className="w-4 h-4"/></button>
                </div>
              ))}
              {whatsappTriggers.length === 0 && <p className="text-xs text-gray-400 italic">Nenhum gatilho configurado.</p>}
            </div>
          </div>
        </div>
      </div>

      <LeadImportModal isOpen={isImportOpen} onClose={() => setIsImportOpen(false)} pipelines={pipelines} columns={columns} userId={user?.id} onImportSuccess={fetchData} />
      <OpportunityDetailModal isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} opportunity={selectedOppToView} onSave={handleSaveDetailModal} onDelete={handleDeleteDetailModal} />

      {/* MODAL: Adicionar ao Pipeline */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-2xl p-0 overflow-hidden bg-white">
          <div className="p-6 sm:p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Adicionar ao Pipeline</h2>
            <div className="flex bg-gray-50 p-1 rounded-xl mb-6">
              <button onClick={() => setActiveTab('opp')} className={`flex-1 py-2 text-sm font-semibold rounded-lg ${activeTab === 'opp' ? 'bg-white shadow-sm' : ''}`}>Oportunidade</button>
              <button onClick={() => setActiveTab('link')} className={`flex-1 py-2 text-sm font-semibold rounded-lg ${activeTab === 'link' ? 'bg-white shadow-sm' : ''}`}>Link Form</button>
              <button onClick={() => setActiveTab('trigger')} className={`flex-1 py-2 text-sm font-semibold rounded-lg ${activeTab === 'trigger' ? 'bg-white shadow-sm' : ''}`}>Gatilho WhatsApp</button>
            </div>

            <div className="space-y-4">
              {activeTab === 'trigger' && (
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Mensagem Gatilho (Exata ou Contém)</label>
                  <input type="text" value={formData.trigger_phrase} onChange={e => setFormData({...formData, trigger_phrase: e.target.value})} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg" placeholder="Ex: orçamento casamento" />
                  <p className="text-[11px] text-gray-500 mt-1">Quando alguém enviar exatamente isso (ou uma frase contendo isso) no WhatsApp, o lead será criado automaticamente.</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Pipeline</label>
                  <select value={formData.pipeline_id} onChange={e => setFormData({...formData, pipeline_id: e.target.value})} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg">
                    {pipelines.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Tag / Tipo</label>
                  <select value={formData.tag} onChange={e => setFormData({...formData, tag: e.target.value})} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg">
                    <option value="">Selecione o tipo</option>
                    {PHOTO_TYPES.map(pt => <option key={pt.value} value={pt.value}>{pt.label}</option>)}
                  </select>
                </div>
              </div>

              {activeTab !== 'trigger' && (
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Nome {activeTab === 'opp' ? 'do Lead' : 'do Form'} *</label>
                  <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg" />
                </div>
              )}
            </div>
          </div>
          <div className="p-6 bg-gray-50 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateNew} className="bg-orange-400 hover:bg-orange-500">Salvar Configuração</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Nova Coluna */}
      <Dialog open={isNewColOpen} onOpenChange={setIsNewColOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Nova Coluna</DialogTitle></DialogHeader>
          <input type="text" value={newColName} onChange={e => setNewColName(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:ring-orange-400" placeholder="Nome da etapa" />
          <DialogFooter><Button onClick={handleCreateColumn} className="bg-orange-400 hover:bg-orange-500">Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Cadência */}
      <Dialog open={isCadenciaModalOpen} onOpenChange={setIsCadenciaModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Iniciar Fluxo de Cadência</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-sm text-gray-500">Selecione um fluxo para agendar as mensagens automáticas para <strong>{selectedOppForCadencia?.name}</strong>.</p>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">Fluxo</label>
              <select 
                value={selectedFlowId} 
                onChange={e => setSelectedFlowId(e.target.value)}
                className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm"
              >
                <option value="">Selecione um fluxo...</option>
                {cadenciaFlows.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCadenciaModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleStartCadencia} className="bg-orange-400 hover:bg-orange-500">Agendar Cadência</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}