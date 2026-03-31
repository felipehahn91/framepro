import React, { useState, useEffect, useMemo } from "react";
import { Layout } from "@/components/Layout";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Trash2, Plus, UserPlus, MessageSquare, MessageCircle, Link as LinkIcon,
  Upload, Loader2, Copy, ExternalLink, X, UserMinus, Search, Inbox, ArrowUp, ArrowDown, Clock, Tag as TagIcon, Zap, Filter, ChevronDown, LayoutGrid
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import LeadImportModal from "@/components/LeadImportModal";
import OpportunityDetailModal from "@/components/OpportunityDetailModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

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
  
  // Filtros e Pesquisa
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Modais
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'opp' | 'link' | 'trigger'>('opp');
  const [isNewColOpen, setIsNewColOpen] = useState(false);
  const [newColName, setNewColName] = useState("");
  const [isNewPipelineOpen, setIsNewPipelineOpen] = useState(false);
  const [newPipelineName, setNewPipelineName] = useState("");

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

  // Lógica de Filtragem e Pesquisa combinada
  const filteredOpportunities = useMemo(() => {
    return opportunities.filter(opp => {
      // 1. Filtrar pela pipeline ativa obrigatoriamente
      if (opp.pipeline_id !== activePipelineId) return false;

      // 2. Filtro de pesquisa (nome, email ou telefone)
      const query = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery || (
        opp.name.toLowerCase().includes(query) ||
        (opp.email && opp.email.toLowerCase().includes(query)) ||
        (opp.phone && opp.phone.toLowerCase().includes(query))
      );
      if (!matchesSearch) return false;

      // 3. Filtro de Tags
      if (selectedTags.length > 0) {
        if (!opp.tag || !selectedTags.includes(opp.tag)) return false;
      }

      return true;
    });
  }, [opportunities, activePipelineId, searchQuery, selectedTags]);

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
    const allSelectedInCol = colOppsIds.length > 0 && colOppsIds.every(id => selectedOpps.includes(id));
    if (allSelectedInCol) {
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
        if (data && (formData.pipeline_id || activePipelineId) === activePipelineId) setOpportunities(prev => [...prev, data as Opportunity]);
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

  const handleCreatePipeline = async () => {
    if (!newPipelineName) return;
    try {
      const { data: pipe, error: pipeErr } = await supabase.from('pipelines').insert({
        name: newPipelineName, user_id: user?.id
      }).select().single();

      if (pipeErr) throw pipeErr;

      const defCols = [
        { name: 'Aberto', order_index: 0, pipeline_id: pipe.id, user_id: user?.id },
        { name: 'Ganho', order_index: 1, pipeline_id: pipe.id, user_id: user?.id },
        { name: 'Perdido', order_index: 2, pipeline_id: pipe.id, user_id: user?.id }
      ];
      const { data: newCols } = await supabase.from('columns').insert(defCols).select();

      setPipelines([...pipelines, pipe]);
      if (newCols) setColumns([...columns, ...newCols]);
      
      setActivePipelineId(pipe.id);
      setNewPipelineName("");
      setIsNewPipelineOpen(false);
      toast.success("Novo funil criado!");
    } catch (e) {
      toast.error("Erro ao criar pipeline.");
    }
  };

  const handleDeleteTrigger = async (id: string) => {
    if (!confirm("Deletar gatilho?")) return;
    setWhatsappTriggers(prev => prev.filter(t => t.id !== id));
    await supabase.from('whatsapp_triggers').delete().eq('id', id);
  };

  const toggleTagFilter = (tag: string) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
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

        {/* Toolbar Superior: Pipelines, Pesquisa e Filtros */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-6 shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 flex-1">
            
            {/* Seletor de Pipeline */}
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center justify-between gap-3 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors min-w-[180px]">
                    <div className="flex items-center gap-2">
                      <LayoutGrid className="w-4 h-4 text-orange-500" />
                      <span className="font-bold text-gray-900 text-sm">
                        {pipelines.find(p => p.id === activePipelineId)?.name || 'Funis'}
                      </span>
                    </div>
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[220px]">
                  {pipelines.map(p => (
                    <DropdownMenuItem 
                      key={p.id} 
                      onClick={() => setActivePipelineId(p.id)}
                      className={`font-semibold cursor-pointer ${activePipelineId === p.id ? 'text-orange-500' : ''}`}
                    >
                      {p.name}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setIsNewPipelineOpen(true)} className="font-bold text-orange-500 cursor-pointer flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Criar Novo Funil
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Barra de Pesquisa */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text"
                placeholder="Pesquisar por nome, email ou telefone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:ring-2 focus:ring-orange-400 outline-none transition-all"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            
            {/* Filtro por Tags */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className={`flex items-center gap-2 px-4 py-2 border rounded-xl text-sm font-semibold transition-all ${selectedTags.length > 0 ? 'bg-orange-50 border-orange-200 text-orange-600' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  <Filter className="w-4 h-4" />
                  {selectedTags.length === 0 ? 'Filtrar por Tags' : `${selectedTags.length} Tag(s) ativa(s)`}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[200px]">
                {PHOTO_TYPES.map(tag => (
                  <DropdownMenuCheckboxItem
                    key={tag.value}
                    checked={selectedTags.includes(tag.value)}
                    onCheckedChange={() => toggleTagFilter(tag.value)}
                  >
                    {tag.label}
                  </DropdownMenuCheckboxItem>
                ))}
                {selectedTags.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setSelectedTags([])} className="justify-center font-bold text-red-500">
                      Limpar Filtros
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => setIsImportOpen(true)} className="p-2 bg-white border border-gray-200 text-gray-500 rounded-xl hover:bg-gray-50 transition-colors shadow-sm" title="Importar Leads">
              <Upload className="w-5 h-5" />
            </button>
            <button onClick={() => setIsModalOpen(true)} className="px-5 py-2.5 bg-orange-400 text-white font-bold rounded-xl hover:bg-orange-500 transition-colors flex items-center gap-2 shadow-sm">
              <Plus className="w-5 h-5" /> Adicionar
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
                    const allSelectedInCol = colOppsIds.length > 0 && colOppsIds.every(id => selectedOpps.includes(id));
                    const someSelectedInCol = colOppsIds.some(id => selectedOpps.includes(id));

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
                                    checked={allSelectedInCol}
                                    ref={input => { if (input) input.indeterminate = someSelectedInCol && !allSelectedInCol; }}
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
                                  {filteredOpportunities.length === 0 && searchQuery && (
                                    <div className="text-center py-10 opacity-40">
                                      <p className="text-sm font-bold">Nenhum lead encontrado.</p>
                                    </div>
                                  )}
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
        <DialogContent className="sm:max-w-2xl p-0 overflow-hidden bg-white max-h-[90vh] overflow-y-auto">
          <div className="p-6 sm:p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Adicionar ao Pipeline</h2>
            <p className="text-sm text-gray-500 mb-6">Crie uma nova oportunidade ou gere um link de formulário.</p>

            <div className="flex bg-gray-100 p-1 rounded-xl mb-6">
              <button onClick={() => setActiveTab('opp')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'opp' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>Nova Oportunidade</button>
              <button onClick={() => setActiveTab('link')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'link' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>Link Form</button>
              <button onClick={() => setActiveTab('trigger')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'trigger' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>Gatilho WhatsApp</button>
            </div>

            <div className="space-y-6">
              {/* Campos Comuns: Pipeline e Tipo de Foto */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-gray-700">Qual pipeline este lead cairá?</label>
                  <select 
                    value={formData.pipeline_id} 
                    onChange={e => setFormData({...formData, pipeline_id: e.target.value})}
                    className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none text-sm"
                  >
                    {pipelines.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-gray-700">Tipo de Foto</label>
                  <select 
                    value={formData.tag} 
                    onChange={e => setFormData({...formData, tag: e.target.value})}
                    className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none text-sm"
                  >
                    <option value="">Selecione o tipo</option>
                    {PHOTO_TYPES.map(pt => <option key={pt.value} value={pt.value}>{pt.label}</option>)}
                  </select>
                </div>
              </div>

              {activeTab === 'opp' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-gray-700">Nome do Lead *</label>
                    <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none" placeholder="Nome do cliente" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-gray-700">Valor</label>
                    <input type="number" value={formData.value} onChange={e => setFormData({...formData, value: e.target.value})} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none" placeholder="0.00" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-gray-700">Email</label>
                      <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-gray-700">Telefone/WhatsApp</label>
                      <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-gray-700">Instagram</label>
                      <input type="text" value={formData.instagram} onChange={e => setFormData({...formData, instagram: e.target.value})} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-gray-700">Data</label>
                      <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-gray-700">Local do evento</label>
                      <input type="text" value={formData.local} onChange={e => setFormData({...formData, local: e.target.value})} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-gray-700">Descrição</label>
                      <input type="text" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none" />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'link' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-gray-700">Nome do Formulário *</label>
                    <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none" placeholder="Ex: Orçamento Casamento" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-y-3 gap-x-8">
                    {[
                      { key: 'email', label: 'Email' },
                      { key: 'phone', label: 'Telefone/WhatsApp' },
                      { key: 'instagram', label: 'Instagram' },
                      { key: 'date', label: 'Data' },
                      { key: 'local', label: 'Local do evento' },
                      { key: 'description', label: 'Descrição' }
                    ].map(field => (
                      <div key={field.key} className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">{field.label}</span>
                        <input 
                          type="checkbox" 
                          checked={formFields[field.key as keyof typeof formFields]} 
                          onChange={e => setFormFields({...formFields, [field.key]: e.target.checked})}
                          className="w-5 h-5 rounded border-gray-300 accent-orange-500"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-gray-700">Número de WhatsApp</label>
                      <input type="text" value={formData.whatsapp_number} onChange={e => setFormData({...formData, whatsapp_number: e.target.value})} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none" placeholder="Ex: 5511999999999" />
                      <p className="text-[10px] text-gray-400">Número que receberá a mensagem do cliente</p>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-gray-700">Texto da Mensagem</label>
                      <input type="text" value={formData.whatsapp_text} onChange={e => setFormData({...formData, whatsapp_text: e.target.value})} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none" placeholder="Ex: Olá, gostaria de um orçamento" />
                      <p className="text-[10px] text-gray-400">Texto pré-definido para o WhatsApp</p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'trigger' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Mensagem Gatilho (Exata ou Contém)</label>
                    <input type="text" value={formData.trigger_phrase} onChange={e => setFormData({...formData, trigger_phrase: e.target.value})} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none shadow-sm" placeholder="Ex: orçamento casamento" />
                    <p className="text-[11px] text-gray-500 mt-2">Quando alguém enviar exatamente isso (ou uma frase contendo isso) no WhatsApp, o lead será criado automaticamente.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
            <button onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-gray-700 font-bold border border-gray-200 hover:bg-gray-100 rounded-xl transition-colors">Cancelar</button>
            <button onClick={handleCreateNew} className="px-8 py-2.5 bg-orange-400 text-white font-bold rounded-xl shadow-md transition-all">
              {activeTab === 'opp' ? 'Criar Oportunidade' : activeTab === 'link' ? 'Gerar Link Form' : 'Salvar Gatilho'}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Nova Pipeline */}
      <Dialog open={isNewPipelineOpen} onOpenChange={setIsNewPipelineOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Criar Novo Funil</DialogTitle>
            <DialogDescription>Dê um nome para sua nova pipeline de vendas.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <input 
              type="text" 
              value={newPipelineName} 
              onChange={e => setNewPipelineName(e.target.value)} 
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none font-semibold" 
              placeholder="Ex: Pós-Venda, Corporativo..." 
              autoFocus
            />
          </div>
          <DialogFooter>
            <button onClick={() => setIsNewPipelineOpen(false)} className="px-4 py-2 text-gray-500 font-bold hover:bg-gray-100 rounded-lg">Cancelar</button>
            <button onClick={handleCreatePipeline} className="px-6 py-2 bg-orange-400 text-white font-bold rounded-lg hover:bg-orange-500">Criar Funil</button>
          </DialogFooter>
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
            <button onClick={() => setIsCadenciaModalOpen(false)} className="px-5 py-2 text-gray-500 font-bold hover:bg-gray-100 rounded-lg transition-colors">Cancelar</button>
            <button onClick={handleStartCadencia} className="px-6 py-2 bg-orange-400 text-white font-bold rounded-lg hover:bg-orange-500 shadow-sm">Agendar Cadência</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}