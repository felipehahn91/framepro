import React, { useState, useEffect, useMemo } from "react";
import { Layout } from "@/components/Layout";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Trash2, Plus, UserPlus, MessageSquare, MessageCircle, Link as LinkIcon,
  Upload, Loader2, Copy, ExternalLink, X, UserMinus, Search, Inbox, ArrowUp, ArrowDown, Clock, Tag as TagIcon, Zap, Filter, ChevronDown, LayoutGrid, MoreVertical, MoveRight, Settings, Edit2
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
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// --- Tipos ---
interface Pipeline { id: string; name: string; order_index?: number; }
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
  order_index?: number;
  user_id: string;
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
  const [loadingOpps, setLoadingOpps] = useState(false);
  
  // Dados Base
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [columns, setColumns] = useState<Column[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [linkForms, setLinkForms] = useState<LinkForm[]>([]);
  const [whatsappTriggers, setWhatsappTriggers] = useState<WhatsappTrigger[]>([]);
  const [activeCadences, setActiveCadences] = useState<Record<string, number>>({});
  
  const [activePipelineId, setActivePipelineId] = useState<string>("");
  const [selectedOpps, setSelectedOpps] = useState<string[]>([]);
  
  // Lazy Load no Kanban
  const [visibleCounts, setVisibleCounts] = useState<Record<string, number>>({});

  // Filtros e Pesquisa
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Modais
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'opp' | 'link'>('opp');
  const [isNewColOpen, setIsNewColOpen] = useState(false);
  const [newColName, setNewColName] = useState("");
  const [isNewPipelineOpen, setIsNewPipelineOpen] = useState(false);
  const [newPipelineName, setNewPipelineName] = useState("");

  // Gerenciamento de Pipelines
  const [isManagePipelinesOpen, setIsManagePipelinesOpen] = useState(false);
  const [editingPipelineId, setEditingPipelineId] = useState<string | null>(null);
  const [editingPipelineName, setEditingPipelineName] = useState("");

  // Edição de Coluna Inline
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [editingColumnName, setEditingColumnName] = useState<string>("");
  
  // Modal de Ferramentas (Link Forms e Gatilhos)
  const [isAutomationsOpen, setIsAutomationsOpen] = useState(false);
  const [newTriggerData, setNewTriggerData] = useState({ phrase: '', column_id: '', tag: '' });

  // Modal de Detalhes da Oportunidade
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedOppToView, setSelectedOppToView] = useState<Opportunity | null>(null);

  // Mover Oportunidade Individual (Mobile UX)
  const [moveSingleModalOpen, setMoveSingleModalOpen] = useState(false);
  const [oppToMoveSingle, setOppToMoveSingle] = useState<Opportunity | null>(null);
  const [moveSingleTargetCol, setMoveSingleTargetCol] = useState<string>("");

  // Modal de Ações em Massa
  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const [moveTargetPipeline, setMoveTargetPipeline] = useState('');
  const [moveTargetColumn, setMoveTargetColumn] = useState('');
  const [massDeleteModalOpen, setMassDeleteModalOpen] = useState(false);
  const [isMassDeleting, setIsMassDeleting] = useState(false);

  // Formulário Modal
  const [formData, setFormData] = useState({
    pipeline_id: '', tag: '', name: '', value: '', email: '', phone: '', 
    instagram: '', date: '', local: '', description: '', whatsapp_number: '', whatsapp_text: ''
  });
  const [formFields, setFormFields] = useState({
    email: true, phone: true, instagram: true, date: false, local: false, description: false
  });

  // Busca de dados estruturais (Pipelines, Colunas, etc) no Load
  useEffect(() => {
    if (!user) return;
    fetchBaseData();
  }, [user]);

  // Busca de oportunidades apenas quando a Pipeline muda
  useEffect(() => {
    if (activePipelineId) {
      setVisibleCounts({}); // Reseta o contador de lazy load ao trocar de pipeline
      fetchOpportunitiesForPipeline(activePipelineId);
    }
  }, [activePipelineId]);

  // Listener Real-time escopo a pipeline ativa
  useEffect(() => {
    if (!user || !activePipelineId) return;

    const channel = supabase.channel('opportunities-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'opportunities', filter: `user_id=eq.${user.id}` }, 
        (payload) => {
          const newOpp = payload.new as Opportunity;
          
          if (payload.eventType === 'INSERT') {
            if (newOpp.pipeline_id === activePipelineId) {
              setOpportunities(prev => {
                if (prev.some(o => o.id === newOpp.id)) return prev;
                return [...prev, newOpp];
              });
            }
          }
          if (payload.eventType === 'UPDATE') {
            if (newOpp.pipeline_id === activePipelineId) {
              setOpportunities(prev => {
                const exists = prev.some(o => o.id === newOpp.id);
                return exists ? prev.map(o => o.id === newOpp.id ? newOpp : o) : [...prev, newOpp];
              });
            } else {
              // Foi movido para outro funil
              setOpportunities(prev => prev.filter(o => o.id !== newOpp.id));
              setSelectedOpps(prev => prev.filter(id => id !== newOpp.id));
            }
          }
          if (payload.eventType === 'DELETE') {
            setOpportunities(prev => prev.filter(o => o.id !== payload.old.id));
            setSelectedOpps(prev => prev.filter(id => id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, activePipelineId]);

  const fetchBaseData = async (forcePipelineId?: string) => {
    setLoading(true);
    try {
      const [pipesRes, colsRes, formsRes, queueRes, triggersRes] = await Promise.all([
        supabase.from('pipelines').select('*').order('order_index', { ascending: true, nullsFirst: false }).order('created_at', { ascending: true }),
        supabase.from('columns').select('*').order('order_index', { ascending: true }),
        supabase.from('link_forms').select('*'),
        supabase.from('cadencia_queue').select('opportunity_id').eq('user_id', user?.id).eq('status', 'pending'),
        supabase.from('whatsapp_triggers').select('*')
      ]);

      let pipes = pipesRes.data || [];
      let cols = colsRes.data || [];

      // Criar pipeline padrão se não existir
      if (pipes.length === 0) {
        const newPipe = await supabase.from('pipelines').insert({ name: 'Vendas Principais', user_id: user?.id, order_index: 0 }).select().single();
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
      setLinkForms(formsRes.data || []);
      setWhatsappTriggers(triggersRes.data || []);
      
      const cadenceMap: Record<string, number> = {};
      queueRes.data?.forEach(q => {
        if (q.opportunity_id) {
          cadenceMap[q.opportunity_id] = (cadenceMap[q.opportunity_id] || 0) + 1;
        }
      });
      setActiveCadences(cadenceMap);
      
      if (forcePipelineId) {
        setActivePipelineId(forcePipelineId);
        setFormData(prev => ({ ...prev, pipeline_id: forcePipelineId }));
      } else if (pipes.length > 0 && !activePipelineId) {
        setActivePipelineId(pipes[0].id);
        setFormData(prev => ({ ...prev, pipeline_id: pipes[0].id }));
      }
    } catch (error) {
      toast.error("Erro ao carregar dados base.");
    } finally {
      setLoading(false);
    }
  };

  const fetchOpportunitiesForPipeline = async (pipelineId: string) => {
    setLoadingOpps(true);
    try {
      let allData: Opportunity[] = [];
      let hasMore = true;
      let from = 0;
      const step = 1000;

      // Loop para garantir que carrega todos os milhares de leads sem bater no limite da API
      while (hasMore) {
        const { data, error } = await supabase
          .from('opportunities')
          .select('*')
          .eq('pipeline_id', pipelineId)
          .order('order_index', { ascending: true, nullsFirst: false })
          .order('created_at', { ascending: false })
          .range(from, from + step - 1);

        if (error) throw error;
        
        if (data && data.length > 0) {
          allData = [...allData, ...(data as Opportunity[])];
          if (data.length < step) {
            hasMore = false; // Última página
          } else {
            from += step;
          }
        } else {
          hasMore = false;
        }
      }
      
      setOpportunities(allData);
    } catch (error) {
      toast.error("Erro ao carregar oportunidades deste funil.");
    } finally {
      setLoadingOpps(false);
    }
  };

  const handleImportSuccess = (newPipelineId?: string) => {
    fetchBaseData(newPipelineId);
  };

  // Lida com o Scroll em uma coluna para carregar mais itens
  const handleScrollColumn = (e: React.UIEvent<HTMLDivElement>, colId: string, totalInCol: number) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const currentVisible = visibleCounts[colId] || 10;
    
    // Se a rolagem chegar perto do final (50px de margem), carrega mais 10 itens
    if (currentVisible < totalInCol && scrollHeight - scrollTop <= clientHeight + 50) {
      setVisibleCounts(prev => ({
        ...prev,
        [colId]: currentVisible + 10
      }));
    }
  };

  const activeColumns = columns.filter(c => c.pipeline_id === activePipelineId).sort((a, b) => a.order_index - b.order_index);
  const targetColumnsForMove = columns.filter(c => c.pipeline_id === (moveTargetPipeline || activePipelineId)).sort((a, b) => a.order_index - b.order_index);

  const filteredOpportunities = useMemo(() => {
    return opportunities.filter(opp => {
      if (opp.pipeline_id !== activePipelineId) return false;

      const query = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery || (
        opp.name.toLowerCase().includes(query) ||
        (opp.email && opp.email.toLowerCase().includes(query)) ||
        (opp.phone && opp.phone.toLowerCase().includes(query))
      );
      if (!matchesSearch) return false;

      if (selectedTags.length > 0) {
        if (!opp.tag || !selectedTags.includes(opp.tag)) return false;
      }

      return true;
    });
  }, [opportunities, activePipelineId, searchQuery, selectedTags]);

  // Drag and Drop (Colunas e Cards)
  const onDragEnd = async (result: any) => {
    const { destination, source, draggableId, type } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    // Movimentação de Colunas
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

    // Movimentação de Cards
    const sourceColId = source.droppableId;
    const destColId = destination.droppableId;

    if (sourceColId === destColId) {
      const colOpps = opportunities.filter(o => o.column_id === sourceColId).sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
      const otherOpps = opportunities.filter(o => o.column_id !== sourceColId);

      const reorderedOpps = Array.from(colOpps);
      const [movedOpp] = reorderedOpps.splice(source.index, 1);
      reorderedOpps.splice(destination.index, 0, movedOpp);

      const updatedColOpps = reorderedOpps.map((o, idx) => ({ ...o, order_index: idx }));
      setOpportunities([...otherOpps, ...updatedColOpps]);

      try {
        for (const opp of updatedColOpps) {
          const { error } = await supabase.from('opportunities').update({ order_index: opp.order_index }).eq('id', opp.id);
          if (error && !error.message?.includes('order_index') && error.code !== 'PGRST204') throw error;
        }
      } catch (e) {
        console.warn("A coluna order_index pode não existir em opportunities.");
      }
      return;
    }

    // Mover entre colunas diferentes
    const sourceColOpps = opportunities.filter(o => o.column_id === sourceColId).sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
    const destColOpps = opportunities.filter(o => o.column_id === destColId).sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
    const otherOpps = opportunities.filter(o => o.column_id !== sourceColId && o.column_id !== destColId);

    const [movedOpp] = sourceColOpps.splice(source.index, 1);
    movedOpp.column_id = destColId;
    destColOpps.splice(destination.index, 0, movedOpp);

    const updatedSourceOpps = sourceColOpps.map((o, idx) => ({ ...o, order_index: idx }));
    const updatedDestOpps = destColOpps.map((o, idx) => ({ ...o, order_index: idx }));

    setOpportunities([...otherOpps, ...updatedSourceOpps, ...updatedDestOpps]);

    try {
      await supabase.from('opportunities').update({ column_id: destColId, order_index: destination.index }).eq('id', draggableId);
      
      for (const opp of updatedDestOpps) {
        const { error } = await supabase.from('opportunities').update({ order_index: opp.order_index }).eq('id', opp.id);
        if (error && !error.message?.includes('order_index') && error.code !== 'PGRST204') throw error;
      }
    } catch (e) {
      console.warn("A coluna order_index pode não existir.");
    }
  };

  // Gerenciamento de Pipelines (Renomear, Deletar, Reordenar)
  const handleUpdatePipelineName = async (id: string) => {
    if (!editingPipelineName.trim()) {
      setEditingPipelineId(null);
      return;
    }
    try {
      await supabase.from('pipelines').update({ name: editingPipelineName }).eq('id', id);
      setPipelines(prev => prev.map(p => p.id === id ? { ...p, name: editingPipelineName } : p));
      setEditingPipelineId(null);
      toast.success('Funil renomeada!');
    } catch (error) {
      toast.error('Erro ao renomear funil.');
    }
  };

  const handleDeletePipeline = async (id: string) => {
    if (!confirm("Atenção: Deletar este funil excluirá TODAS as etapas e oportunidades dentro dele. Deseja continuar?")) return;
    try {
      await supabase.from('pipelines').delete().eq('id', id);
      const remaining = pipelines.filter(p => p.id !== id);
      setPipelines(remaining);
      if (activePipelineId === id) {
        setActivePipelineId(remaining.length > 0 ? remaining[0].id : '');
      }
      toast.success("Funil deletado.");
    } catch (error) {
      toast.error("Erro ao deletar funil.");
    }
  };

  const handleMovePipeline = async (index: number, direction: 'up' | 'down') => {
    const newPipes = [...pipelines];
    if (direction === 'up' && index > 0) {
      [newPipes[index - 1], newPipes[index]] = [newPipes[index], newPipes[index - 1]];
    } else if (direction === 'down' && index < newPipes.length - 1) {
      [newPipes[index + 1], newPipes[index]] = [newPipes[index], newPipes[index + 1]];
    } else {
      return;
    }

    const updatedPipes = newPipes.map((p, idx) => ({ ...p, order_index: idx }));
    setPipelines(updatedPipes);

    try {
      for (const pipe of updatedPipes) {
        const { error } = await supabase.from('pipelines').update({ order_index: pipe.order_index }).eq('id', pipe.id);
        if (error && !error.message?.includes('order_index') && error.code !== 'PGRST204') throw error;
      }
    } catch (error) {
      console.warn("A coluna order_index pode não existir na tabela pipelines.");
    }
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
    setIsMassDeleting(true);
    try {
      for (const id of selectedOpps) {
        await supabase.from('opportunities').delete().eq('id', id);
      }
      setOpportunities(prev => prev.filter(o => !selectedOpps.includes(o.id)));
      setSelectedOpps([]);
      toast.success("Oportunidades deletadas.");
      setMassDeleteModalOpen(false);
    } catch (e) {
      toast.error("Erro ao deletar.");
    } finally {
      setIsMassDeleting(false);
    }
  };

  const handleMoveSelected = async () => {
    if (!moveTargetColumn) return toast.error('Selecione uma coluna de destino');

    const targetPipeId = moveTargetPipeline || activePipelineId;

    try {
      await Promise.all(
        selectedOpps.map(oppId =>
          supabase.from('opportunities').update({ column_id: moveTargetColumn, pipeline_id: targetPipeId }).eq('id', oppId)
        )
      );

      if (targetPipeId === activePipelineId) {
        setOpportunities(prev => prev.map(opp => selectedOpps.includes(opp.id) ? { ...opp, column_id: moveTargetColumn } : opp));
      } else {
        setOpportunities(prev => prev.filter(opp => !selectedOpps.includes(opp.id)));
      }

      setSelectedOpps([]);
      setMoveModalOpen(false);
      toast.success('Oportunidades movidas com sucesso');
    } catch (error) {
      toast.error('Erro ao mover oportunidades');
    }
  };

  // Mover Card Individual (Mobile UX)
  const handleMoveSingleCard = async () => {
    if (!oppToMoveSingle || !moveSingleTargetCol) return;

    try {
      await supabase.from('opportunities').update({ column_id: moveSingleTargetCol }).eq('id', oppToMoveSingle.id);
      setOpportunities(prev => prev.map(o => o.id === oppToMoveSingle.id ? { ...o, column_id: moveSingleTargetCol } : o));
      toast.success("Card movido com sucesso!");
      setMoveSingleModalOpen(false);
      setOppToMoveSingle(null);
    } catch (e) {
      toast.error("Erro ao mover o card.");
    }
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

  const handleUpdateColumnName = async (colId: string) => {
    if (!editingColumnName.trim()) {
      setEditingColumnId(null);
      return;
    }
    try {
      await supabase.from('columns').update({ name: editingColumnName }).eq('id', colId);
      setColumns(prev => prev.map(c => c.id === colId ? { ...c, name: editingColumnName } : c));
      setEditingColumnId(null);
      toast.success('Coluna renomeada!');
    } catch (error) {
      toast.error('Erro ao renomear coluna.');
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

  // Criação de Leads e Link Forms
  const handleCreateNew = async () => {
    if (activeTab === 'opp' && !formData.name) return toast.error("Nome é obrigatório.");
    if (activeTab === 'link' && !formData.name) return toast.error("Nome é obrigatório.");
    
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
      }
      setIsModalOpen(false);
      setFormData({ pipeline_id: activePipelineId, tag: '', name: '', value: '', email: '', phone: '', instagram: '', date: '', local: '', description: '', whatsapp_number: '', whatsapp_text: '' });
    } catch (error) {
      toast.error("Erro ao salvar.");
    }
  };

  const handleCreateTrigger = async () => {
    if (!newTriggerData.phrase) return toast.error("A frase gatilho é obrigatória.");
    if (!newTriggerData.column_id) return toast.error("Selecione a etapa de destino.");

    try {
      const { data } = await supabase.from('whatsapp_triggers').insert({
        user_id: user?.id,
        trigger_phrase: newTriggerData.phrase,
        pipeline_id: activePipelineId, 
        column_id: newTriggerData.column_id,
        tag: newTriggerData.tag,
        enabled: true
      }).select().single();

      if (data) setWhatsappTriggers(prev => [...prev, data]);
      setNewTriggerData({ phrase: '', column_id: '', tag: '' });
      toast.success("Gatilho configurado com sucesso!");
    } catch (error) {
      toast.error("Erro ao salvar gatilho.");
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
        name: newPipelineName, user_id: user?.id, order_index: pipelines.length
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

  const deleteSingleOpp = async (id: string) => {
    if (!confirm("Deletar esta oportunidade?")) return;
    await supabase.from('opportunities').delete().eq('id', id);
    setOpportunities(prev => prev.filter(o => o.id !== id));
    toast.success("Oportunidade deletada.");
  };

  if (loading) return <Layout><div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-orange-400" /></div></Layout>;

  return (
    <Layout>
      <div className="max-w-full mx-auto flex flex-col h-full bg-[#FAFAFA]">
        
        {/* FAB para Mobile */}
        <button 
          onClick={() => setIsModalOpen(true)} 
          className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-orange-500 text-white rounded-full shadow-[0_4px_20px_rgba(249,115,22,0.4)] flex items-center justify-center z-50 hover:bg-orange-600 transition-transform active:scale-95"
        >
          <Plus className="w-6 h-6" />
        </button>

        {/* Bulk Action Bar */}
        {selectedOpps.length > 0 && (
          <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-3 mb-3 flex items-center justify-between animate-in slide-in-from-top-2 z-20 sticky top-0">
            <span className="font-semibold text-orange-500 text-sm">{selectedOpps.length} selecionada(s)</span>
            <div className="flex gap-2">
              <button onClick={() => setSelectedOpps([])} className="px-3 py-1.5 text-xs sm:text-sm text-gray-500 hover:bg-gray-100 rounded-md transition-colors">Cancelar</button>
              
              <button onClick={() => setMoveModalOpen(true)} className="hidden sm:flex px-3 py-1.5 text-xs sm:text-sm bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-md items-center gap-1.5 transition-colors">
                <MoveRight className="w-4 h-4" /> Mover
              </button>

              <button onClick={() => setMassDeleteModalOpen(true)} className="px-3 py-1.5 text-xs sm:text-sm bg-red-50 text-red-600 hover:bg-red-100 rounded-md flex items-center gap-1.5 transition-colors">
                <Trash2 className="w-4 h-4" /> Deletar
              </button>
            </div>
          </div>
        )}

        {/* Toolbar Superior Compacta */}
        <div className="bg-white border border-gray-200 rounded-2xl p-3 mb-4 shadow-sm flex flex-col gap-3">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            
            <div className="flex flex-1 items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex flex-1 md:flex-none items-center justify-between gap-3 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors md:min-w-[200px]">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <LayoutGrid className="w-4 h-4 text-orange-500 shrink-0" />
                      <span className="font-bold text-gray-900 text-sm truncate">
                        {pipelines.find(p => p.id === activePipelineId)?.name || 'Funis'}
                      </span>
                    </div>
                    <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[calc(100vw-2rem)] md:w-[250px]">
                  {pipelines.map(p => (
                    <DropdownMenuItem 
                      key={p.id} 
                      onClick={() => setActivePipelineId(p.id)}
                      className={`font-semibold cursor-pointer py-3 md:py-2 ${activePipelineId === p.id ? 'text-orange-500 bg-orange-50' : ''}`}
                    >
                      {p.name}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setIsManagePipelinesOpen(true)} className="font-bold text-gray-700 cursor-pointer flex items-center gap-2 py-3 md:py-2 hover:text-orange-500">
                    <Settings className="w-4 h-4" /> Gerenciar Funis
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsNewPipelineOpen(true)} className="font-bold text-orange-500 cursor-pointer flex items-center gap-2 py-3 md:py-2">
                    <Plus className="w-4 h-4" /> Criar Novo Funil
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <button 
                onClick={() => setIsAutomationsOpen(true)}
                className="flex items-center justify-center gap-2 px-3 py-2 border border-gray-200 text-gray-600 bg-white rounded-xl text-sm font-semibold transition-all hover:bg-gray-50 shrink-0"
              >
                <Zap className="w-4 h-4 text-orange-400" />
                <span className="hidden sm:inline">Ferramentas</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1 md:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text"
                  placeholder="Pesquisar..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:ring-2 focus:ring-orange-400 outline-none transition-all"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className={`flex items-center justify-center p-2 border rounded-xl transition-all ${selectedTags.length > 0 ? 'bg-orange-50 border-orange-200 text-orange-600' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                    <Filter className="w-4 h-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[200px]">
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
                      <DropdownMenuItem onClick={() => setSelectedTags([])} className="justify-center font-bold text-red-500 py-2">
                        Limpar Filtros
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              <button onClick={() => setIsImportOpen(true)} className="flex items-center justify-center p-2 bg-white border border-gray-200 text-gray-500 rounded-xl hover:bg-gray-50 transition-colors shadow-sm" title="Importar Leads">
                <Upload className="w-4 h-4" />
              </button>
              
              <button onClick={() => setIsModalOpen(true)} className="hidden md:flex px-4 py-2 bg-orange-400 text-white font-bold rounded-xl hover:bg-orange-500 transition-colors items-center gap-2 shadow-sm">
                <Plus className="w-4 h-4" /> Adicionar
              </button>
            </div>
          </div>
        </div>

        {/* Kanban Board */}
        <div className="flex gap-3 sm:gap-4 overflow-x-auto flex-1 items-start snap-x snap-mandatory custom-scrollbar relative pb-4 min-h-0">
          {loadingOpps ? (
             <div className="absolute inset-0 flex items-center justify-center bg-white/50 z-10 rounded-2xl">
                <Loader2 className="w-8 h-8 animate-spin text-orange-400" />
             </div>
          ) : (
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="board" direction="horizontal" type="column">
                {(provided) => (
                  <div className="flex gap-3 sm:gap-4 h-full" {...provided.droppableProps} ref={provided.innerRef}>
                    {activeColumns.map((col, index) => {
                      const colOpps = filteredOpportunities
                        .filter(o => o.column_id === col.id)
                        .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
                        
                      const colOppsIds = colOpps.map(o => o.id);
                      const allSelectedInCol = colOppsIds.length > 0 && colOppsIds.every(id => selectedOpps.includes(id));
                      const someSelectedInCol = colOppsIds.some(id => selectedOpps.includes(id));

                      // Lazy Load slice
                      const currentVisibleCount = visibleCounts[col.id] || 10;
                      const renderedOpps = colOpps.slice(0, currentVisibleCount);

                      return (
                        <Draggable key={col.id} draggableId={col.id} index={index}>
                          {(provided) => (
                            <div
                              ref={provided.innerRef} {...provided.draggableProps}
                              className="flex-1 min-w-[85vw] sm:min-w-[300px] max-w-[85vw] sm:max-w-[320px] snap-center bg-gray-100/50 rounded-2xl sm:rounded-xl border border-gray-200 flex flex-col h-full max-h-full shadow-sm"
                            >
                              <div className="p-3 border-b border-gray-200 rounded-t-xl bg-white" {...provided.dragHandleProps}>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <div className="flex items-center justify-center w-5 h-5 shrink-0">
                                      <input 
                                        type="checkbox"
                                        checked={allSelectedInCol}
                                        ref={input => { if (input) input.indeterminate = someSelectedInCol && !allSelectedInCol; }}
                                        onChange={() => toggleColumnSelection(col.id, colOppsIds)}
                                        className="w-4 h-4 rounded border-gray-300 accent-orange-500 cursor-pointer"
                                      />
                                    </div>
                                    
                                    {editingColumnId === col.id ? (
                                      <input
                                        type="text"
                                        value={editingColumnName}
                                        onChange={(e) => setEditingColumnName(e.target.value)}
                                        className="w-full h-7 text-sm px-2 border border-orange-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
                                        autoFocus
                                        onKeyDown={(e) => e.key === 'Enter' && handleUpdateColumnName(col.id)}
                                        onBlur={() => handleUpdateColumnName(col.id)}
                                      />
                                    ) : (
                                      <>
                                        <h3 className="font-bold text-gray-900 text-sm truncate max-w-[150px]">{col.name}</h3>
                                        <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center shrink-0">
                                          {colOpps.length}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                  
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <button className="text-gray-400 hover:text-gray-700 p-1 rounded-md transition-colors shrink-0">
                                        <MoreVertical className="w-4 h-4" />
                                      </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem 
                                        onClick={() => {
                                          setEditingColumnId(col.id);
                                          setEditingColumnName(col.name);
                                        }} 
                                        className="font-medium cursor-pointer"
                                      >
                                        <Edit2 className="w-4 h-4 mr-2" /> Renomear Coluna
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleDeleteColumn(col.id)} className="text-red-500 focus:bg-red-50 focus:text-red-600 font-medium cursor-pointer">
                                        <Trash2 className="w-4 h-4 mr-2" /> Deletar Coluna
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </div>
                              
                              <Droppable droppableId={col.id} type="card">
                                {(provided, snapshot) => (
                                  <div 
                                    ref={provided.innerRef} {...provided.droppableProps}
                                    onScroll={(e) => handleScrollColumn(e, col.id, colOpps.length)}
                                    className={`flex-1 p-2 overflow-y-auto rounded-b-xl space-y-2.5 transition-colors custom-scrollbar ${snapshot.isDraggingOver ? 'bg-orange-50/50' : 'bg-transparent'}`}
                                    style={{ minHeight: '100px' }}
                                  >
                                    {renderedOpps.map((opp, oppIndex) => {
                                      const isFromWhatsApp = opp.observations?.includes("gatilho de WhatsApp");
                                      return (
                                        <Draggable key={opp.id} draggableId={opp.id} index={oppIndex}>
                                          {(provided, snapshot) => (
                                            <div
                                              ref={provided.innerRef} 
                                              {...provided.draggableProps} 
                                              {...provided.dragHandleProps}
                                              onClick={() => handleCardClick(opp)}
                                              className={`bg-white p-3 rounded-xl border transition-all relative group cursor-pointer ${snapshot.isDragging ? 'shadow-2xl ring-2 ring-orange-400 border-transparent z-50 scale-105' : 'border-gray-200 shadow-sm hover:shadow-md hover:border-orange-200'}`}
                                            >
                                              <div className="flex justify-between items-start mb-2">
                                                <div className="flex items-start gap-2.5">
                                                  <input 
                                                    type="checkbox" 
                                                    checked={selectedOpps.includes(opp.id)} 
                                                    onChange={() => toggleSelection(opp.id)} 
                                                    onClick={(e) => e.stopPropagation()} 
                                                    className="w-4 h-4 mt-0.5 rounded border-gray-300 accent-orange-500 cursor-pointer shrink-0" 
                                                  />
                                                  <span className="font-semibold text-gray-900 text-sm leading-tight flex items-center gap-1.5 pr-1">
                                                    {isFromWhatsApp && <MessageCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />}
                                                    {opp.name}
                                                  </span>
                                                </div>
                                                
                                                <div onClick={e => e.stopPropagation()}>
                                                  <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                      <button className="text-gray-400 hover:text-gray-700 p-1 -mr-1 rounded-md hover:bg-gray-50 transition-colors">
                                                        <MoreVertical className="w-4 h-4" />
                                                      </button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-48">
                                                      <DropdownMenuItem onClick={() => { setOppToMoveSingle(opp); setMoveSingleModalOpen(true); }} className="cursor-pointer font-medium">
                                                        <MoveRight className="w-4 h-4 mr-2 text-blue-500" /> Mover de Etapa
                                                      </DropdownMenuItem>
                                                      <DropdownMenuSeparator />
                                                      <DropdownMenuItem onClick={() => deleteSingleOpp(opp.id)} className="text-red-500 focus:bg-red-50 focus:text-red-600 font-medium cursor-pointer">
                                                        <Trash2 className="w-4 h-4 mr-2" /> Excluir
                                                      </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                  </DropdownMenu>
                                                </div>
                                              </div>
                                              
                                              {opp.tag && (
                                                <div className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-orange-100 text-orange-700 mb-2">
                                                  {opp.tag}
                                                </div>
                                              )}
                                              
                                              <div className="flex flex-col gap-0.5 mb-3">
                                                {opp.email && (
                                                  <span className="text-xs font-medium text-gray-500 truncate" title={opp.email}>
                                                    {opp.email}
                                                  </span>
                                                )}
                                                {opp.phone && (
                                                  <span className="text-xs font-medium text-gray-500 truncate" title={opp.phone}>
                                                    {opp.phone}
                                                  </span>
                                                )}
                                                {!opp.email && !opp.phone && (
                                                  <span className="text-xs font-medium text-gray-400 italic truncate">
                                                    Sem contato
                                                  </span>
                                                )}
                                              </div>
                                              
                                              <div className="flex gap-1.5">
                                                <button 
                                                  onClick={(e) => handleToggleClient(e, opp)} 
                                                  className={`flex-1 py-1.5 rounded-lg border text-[11px] font-bold transition-colors ${opp.is_client ? 'border-red-200 text-red-600 bg-red-50 hover:bg-red-100' : 'border-gray-200 text-gray-700 bg-white hover:bg-gray-50'}`}
                                                >
                                                  {opp.is_client ? '-Cliente' : '+Cliente'}
                                                </button>
                                                <button 
                                                  onClick={(e) => handleCadenciaClick(e, opp)} 
                                                  className="flex-1 py-1.5 rounded-lg border border-gray-200 text-gray-700 text-[11px] font-bold bg-white hover:bg-gray-50 transition-colors flex items-center justify-center gap-1"
                                                >
                                                  <MessageCircle className="w-3.5 h-3.5 text-green-500" /> Cadência
                                                </button>
                                              </div>
                                            </div>
                                          )}
                                        </Draggable>
                                      );
                                    })}
                                    {provided.placeholder}
                                    
                                    {/* Indicador de Carregamento Lazy */}
                                    {renderedOpps.length < colOpps.length && (
                                      <div className="py-4 text-center">
                                        <Loader2 className="w-5 h-5 animate-spin text-orange-400 mx-auto" />
                                      </div>
                                    )}

                                    {filteredOpportunities.length === 0 && searchQuery && (
                                      <div className="text-center py-6 opacity-40">
                                        <p className="text-xs font-bold">Nenhum lead encontrado.</p>
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
                    
                    <button 
                      onClick={() => setIsNewColOpen(true)} 
                      className="min-w-[85vw] sm:min-w-[300px] max-w-[85vw] sm:max-w-[300px] snap-center bg-white/50 border-2 border-dashed border-gray-300 rounded-2xl sm:rounded-xl flex items-center justify-center text-gray-500 hover:text-orange-500 hover:border-orange-300 hover:bg-orange-50/50 h-[50px] font-bold text-sm transition-all"
                    >
                      <Plus className="w-4 h-4 mr-2" /> Adicionar Coluna
                    </button>
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          )}
        </div>
      </div>

      <LeadImportModal isOpen={isImportOpen} onClose={() => setIsImportOpen(false)} pipelines={pipelines} columns={columns} userId={user?.id} onImportSuccess={handleImportSuccess} />
      
      <OpportunityDetailModal 
        isOpen={isDetailModalOpen} 
        onClose={() => setIsDetailModalOpen(false)} 
        opportunity={selectedOppToView} 
        onSave={handleSaveDetailModal} 
        onDelete={handleDeleteDetailModal}
        onOpenCadence={(opp) => {
          setIsDetailModalOpen(false);
          setSelectedOppForCadencia(opp);
          setIsCadenciaModalOpen(true);
        }}
      />

      {/* MODAL: Gerenciar Pipelines */}
      <Dialog open={isManagePipelinesOpen} onOpenChange={setIsManagePipelinesOpen}>
        <DialogContent className="w-[95vw] sm:max-w-md bg-white rounded-2xl p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Gerenciar Funis</DialogTitle>
            <DialogDescription className="text-sm">Mude a ordem, renomeie ou exclua seus funis de venda.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 max-h-[60vh] overflow-y-auto custom-scrollbar">
            {pipelines.map((pipe, idx) => (
              <div key={pipe.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-100 group">
                {editingPipelineId === pipe.id ? (
                  <input
                    type="text"
                    value={editingPipelineName}
                    onChange={e => setEditingPipelineName(e.target.value)}
                    onBlur={() => handleUpdatePipelineName(pipe.id)}
                    onKeyDown={e => e.key === 'Enter' && handleUpdatePipelineName(pipe.id)}
                    className="flex-1 bg-white border border-orange-300 px-2 py-1 rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                    autoFocus
                  />
                ) : (
                  <span className="font-bold text-gray-800 text-sm flex-1 truncate">{pipe.name}</span>
                )}

                <div className="flex items-center gap-1 ml-2">
                  <button onClick={() => handleMovePipeline(idx, 'up')} disabled={idx === 0} className="p-1.5 text-gray-400 hover:text-gray-800 hover:bg-gray-200 rounded disabled:opacity-30"><ArrowUp className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleMovePipeline(idx, 'down')} disabled={idx === pipelines.length - 1} className="p-1.5 text-gray-400 hover:text-gray-800 hover:bg-gray-200 rounded disabled:opacity-30"><ArrowDown className="w-3.5 h-3.5" /></button>
                  <div className="w-px h-4 bg-gray-200 mx-1"></div>
                  <button onClick={() => { setEditingPipelineId(pipe.id); setEditingPipelineName(pipe.name); }} className="p-1.5 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded"><Edit2 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleDeletePipeline(pipe.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={() => setIsManagePipelinesOpen(false)} className="w-full bg-gray-900 text-white font-bold hover:bg-black rounded-xl">Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: Ferramentas de Automação (Link Forms e Gatilhos) */}
      <Dialog open={isAutomationsOpen} onOpenChange={setIsAutomationsOpen}>
        <DialogContent className="w-[95vw] sm:w-full sm:max-w-2xl bg-gray-50 max-h-[90vh] overflow-y-auto custom-scrollbar p-0 rounded-2xl">
          <div className="p-4 sm:p-6 bg-white border-b border-gray-100 flex items-center justify-between sticky top-0 z-20">
            <div className="pr-8">
              <DialogTitle className="text-lg sm:text-xl font-bold text-gray-900">Ferramentas do Funil</DialogTitle>
              <DialogDescription className="text-xs sm:text-sm mt-1">Gerencie seus formulários de captura e gatilhos de WhatsApp.</DialogDescription>
            </div>
            <button onClick={() => setIsAutomationsOpen(false)} className="absolute right-4 top-4 p-2 bg-gray-50 text-gray-500 rounded-full hover:bg-gray-100 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-sm">
              <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                <LinkIcon className="w-5 h-5 text-orange-400"/> Link Forms Ativos
              </h3>
              <div className="flex flex-col gap-3">
                {linkForms.map(form => (
                  <div key={form.id} className="bg-gray-50 border border-gray-100 rounded-xl p-4 flex justify-between items-center gap-3 overflow-hidden w-full">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-gray-900 truncate">{form.name}</p>
                      <p className="text-xs font-medium text-gray-500 mt-0.5 truncate">{form.tag || 'Geral'}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/link-form/${form.id}`); toast.success("Copiado!"); }} className="p-2 text-gray-500 bg-white border border-gray-200 hover:text-orange-500 rounded-lg shadow-sm transition-colors"><Copy className="w-4 h-4"/></button>
                      <button onClick={() => handleDeleteLinkForm(form.id)} className="p-2 text-red-500 bg-white border border-gray-200 hover:bg-red-50 rounded-lg shadow-sm transition-colors"><Trash2 className="w-4 h-4"/></button>
                    </div>
                  </div>
                ))}
                {linkForms.length === 0 && <p className="text-sm text-gray-400 italic py-2">Nenhum formulário criado.</p>}
              </div>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-sm">
              <h3 className="text-base font-bold text-gray-900 mb-2 flex items-center gap-2">
                <Zap className="w-5 h-5 text-orange-400"/> Gatilhos WhatsApp
              </h3>
              <p className="text-xs text-gray-500 mb-4">Cria um lead automaticamente quando você receber essa frase.</p>
              
              <div className="flex flex-col gap-3 mb-6">
                {whatsappTriggers.map(trig => (
                  <div key={trig.id} className="bg-gray-50 border border-gray-100 rounded-xl p-4 flex justify-between items-center gap-3 overflow-hidden w-full">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-gray-900 truncate">"{trig.trigger_phrase}"</p>
                      <p className="text-xs font-medium text-gray-500 mt-0.5 truncate">Destino: {columns.find(c => c.id === trig.column_id)?.name || '...'}</p>
                    </div>
                    <button onClick={() => handleDeleteTrigger(trig.id)} className="p-2 text-red-500 bg-white border border-gray-200 hover:bg-red-50 rounded-lg shadow-sm transition-colors shrink-0"><Trash2 className="w-4 h-4"/></button>
                  </div>
                ))}
                {whatsappTriggers.length === 0 && <p className="text-sm text-gray-400 italic py-2">Nenhum gatilho configurado.</p>}
              </div>

              {/* Formulário Novo Gatilho */}
              <div className="p-4 bg-orange-50/50 rounded-xl border border-orange-100 space-y-3">
                <h4 className="text-sm font-bold text-gray-900">Novo Gatilho</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input 
                    type="text" 
                    placeholder="Frase (Ex: orçamento)" 
                    value={newTriggerData.phrase} 
                    onChange={e => setNewTriggerData({...newTriggerData, phrase: e.target.value})} 
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-orange-400 text-sm" 
                  />
                  <select 
                    value={newTriggerData.column_id} 
                    onChange={e => setNewTriggerData({...newTriggerData, column_id: e.target.value})} 
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-orange-400 text-sm"
                  >
                    <option value="">Etapa de destino...</option>
                    {activeColumns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="flex justify-end pt-2">
                  <button onClick={handleCreateTrigger} className="px-5 py-2.5 bg-orange-400 text-white rounded-lg text-sm font-bold hover:bg-orange-500 transition-colors w-full sm:w-auto shadow-sm">
                    Salvar Gatilho
                  </button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL: Mover Oportunidade Única (UX Mobile) */}
      <Dialog open={moveSingleModalOpen} onOpenChange={setMoveSingleModalOpen}>
        <DialogContent className="w-[95vw] sm:max-w-sm bg-white p-4 sm:p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Mover Etapa</DialogTitle>
            <DialogDescription className="text-sm">
              Para qual etapa você deseja mover <strong>{oppToMoveSingle?.name}</strong>?
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <select 
              value={moveSingleTargetCol} 
              onChange={e => setMoveSingleTargetCol(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-400 outline-none"
            >
              <option value="">Selecione...</option>
              {activeColumns.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <DialogFooter className="mt-2 flex flex-col sm:flex-row gap-2">
            <button onClick={() => setMoveSingleModalOpen(false)} className="w-full sm:w-auto flex-1 py-2.5 text-gray-600 font-bold hover:bg-gray-100 rounded-xl transition-colors text-sm">Cancelar</button>
            <button onClick={handleMoveSingleCard} disabled={!moveSingleTargetCol} className="w-full sm:w-auto flex-1 py-2.5 bg-orange-400 text-white font-bold rounded-xl hover:bg-orange-500 shadow-sm disabled:opacity-50 text-sm">Mover</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: Ações em Massa (Mover Vários) */}
      <Dialog open={moveModalOpen} onOpenChange={setMoveModalOpen}>
        <DialogContent className="w-[95vw] sm:max-w-md bg-white p-4 sm:p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Mover Múltiplas Oportunidades</DialogTitle>
            <DialogDescription className="text-sm">Selecione o destino para os {selectedOpps.length} leads selecionados.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700">Funil de Destino</label>
              <select 
                value={moveTargetPipeline || activePipelineId} 
                onChange={(e) => {
                  setMoveTargetPipeline(e.target.value);
                  setMoveTargetColumn('');
                }}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none text-sm"
              >
                {pipelines.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700">Coluna de Destino</label>
              <select 
                value={moveTargetColumn} 
                onChange={e => setMoveTargetColumn(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none text-sm"
              >
                <option value="">Selecione...</option>
                {targetColumnsForMove.map(col => <option key={col.id} value={col.id}>{col.name}</option>)}
              </select>
            </div>
          </div>
          <DialogFooter className="mt-2 flex flex-col sm:flex-row gap-2">
            <button onClick={() => setMoveModalOpen(false)} className="w-full sm:w-auto flex-1 py-2.5 text-gray-600 font-bold hover:bg-gray-100 rounded-xl transition-colors text-sm">Cancelar</button>
            <button onClick={handleMoveSelected} disabled={!moveTargetColumn} className="w-full sm:w-auto flex-1 py-2.5 bg-orange-400 text-white font-bold rounded-xl hover:bg-orange-500 shadow-sm disabled:opacity-50 text-sm">Mover</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: Excluir em Massa */}
      <Dialog open={massDeleteModalOpen} onOpenChange={setMassDeleteModalOpen}>
        <DialogContent className="w-[95vw] sm:max-w-sm bg-white text-center p-4 sm:p-6 rounded-2xl">
          <div className="w-14 h-14 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-3 border border-red-100">
            <Trash2 className="w-6 h-6" />
          </div>
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900 mb-1">Excluir {selectedOpps.length} leads?</DialogTitle>
            <DialogDescription className="text-gray-500 text-sm mb-4">
              Esta ação não pode ser desfeita. Todos os dados vinculados serão apagados.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col sm:flex-row gap-2">
            <button onClick={() => setMassDeleteModalOpen(false)} disabled={isMassDeleting} className="w-full sm:w-auto flex-1 py-2.5 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-colors text-sm">Cancelar</button>
            <button onClick={handleBulkDelete} disabled={isMassDeleting} className="w-full sm:w-auto flex-1 py-2.5 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-colors flex justify-center items-center text-sm">
              {isMassDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Excluir'}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL PRINCIPAL: Adicionar Lead / Link Form */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="w-[95vw] sm:max-w-[600px] p-0 overflow-hidden bg-white max-h-[90vh] overflow-y-auto custom-scrollbar rounded-2xl">
          <div className="p-4 sm:p-8">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-gray-900 mb-1">Adicionar ao Pipeline</DialogTitle>
              <DialogDescription className="text-sm text-gray-500 mb-4">Crie uma nova oportunidade ou gere um link de formulário.</DialogDescription>
            </DialogHeader>

            <div className="flex bg-gray-100 p-1 rounded-xl mb-6">
              <button onClick={() => setActiveTab('opp')} className={`flex-1 py-2 px-2 text-xs sm:text-sm font-bold rounded-lg transition-all ${activeTab === 'opp' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>Nova Oportunidade</button>
              <button onClick={() => setActiveTab('link')} className={`flex-1 py-2 px-2 text-xs sm:text-sm font-bold rounded-lg transition-all ${activeTab === 'link' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>Link Form</button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-gray-700">Qual pipeline este lead cairá?</label>
                <select 
                  value={formData.pipeline_id} 
                  onChange={e => setFormData({...formData, pipeline_id: e.target.value})}
                  className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-orange-400 text-sm"
                >
                  {pipelines.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-gray-700">Tipo de Foto</label>
                <select 
                  value={formData.tag} 
                  onChange={e => setFormData({...formData, tag: e.target.value})}
                  className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-orange-400 text-sm"
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
                  <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-orange-400 text-sm" placeholder="Nome do cliente" />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-gray-700">Valor</label>
                  <input type="number" value={formData.value} onChange={e => setFormData({...formData, value: e.target.value})} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-orange-400 text-sm" placeholder="0.00" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-gray-700">Email</label>
                    <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-orange-400 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-gray-700">Telefone/WhatsApp</label>
                    <input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-orange-400 text-sm" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-gray-700">Instagram</label>
                    <input type="text" value={formData.instagram} onChange={e => setFormData({...formData, instagram: e.target.value})} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-orange-400 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-gray-700">Data</label>
                    <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-orange-400 text-sm" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-gray-700">Local do evento</label>
                    <input type="text" value={formData.local} onChange={e => setFormData({...formData, local: e.target.value})} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-orange-400 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-gray-700">Descrição</label>
                    <input type="text" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-orange-400 text-sm" />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'link' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-gray-700">Nome do Formulário *</label>
                  <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-orange-400 text-sm" placeholder="Ex: Orçamento Casamento" />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 py-2">
                  {[
                    { key: 'email', label: 'Email' },
                    { key: 'phone', label: 'Telefone/WhatsApp' },
                    { key: 'instagram', label: 'Instagram' },
                    { key: 'date', label: 'Data' },
                    { key: 'local', label: 'Local do evento' },
                    { key: 'description', label: 'Descrição' }
                  ].map(field => (
                    <label key={field.key} className="flex items-center justify-between cursor-pointer bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">
                      <span className="text-sm font-bold text-gray-900">{field.label}</span>
                      <input 
                        type="checkbox" 
                        checked={formFields[field.key as keyof typeof formFields]} 
                        onChange={e => setFormFields({...formFields, [field.key]: e.target.checked})}
                        className="w-4 h-4 rounded border-gray-300 accent-orange-500 cursor-pointer"
                      />
                    </label>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-gray-700">Número de WhatsApp</label>
                    <input type="text" value={formData.whatsapp_number} onChange={e => setFormData({...formData, whatsapp_number: e.target.value})} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-orange-400 text-sm" placeholder="Ex: 5511999999999" />
                    <p className="text-xs text-gray-500">Número que receberá a mensagem do cliente</p>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-gray-700">Texto da Mensagem</label>
                    <input type="text" value={formData.whatsapp_text} onChange={e => setFormData({...formData, whatsapp_text: e.target.value})} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-orange-400 text-sm" placeholder="Ex: Olá, gostaria de um orçamento" />
                    <p className="text-xs text-gray-500">Texto pré-definido para o WhatsApp</p>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="p-4 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row justify-end gap-2 rounded-b-2xl">
            <button onClick={() => setIsModalOpen(false)} className="w-full sm:w-auto px-5 py-2.5 text-gray-600 text-sm font-bold hover:bg-gray-200 rounded-lg transition-colors">Cancelar</button>
            <button onClick={handleCreateNew} className="w-full sm:w-auto px-6 py-2.5 bg-orange-400 text-white text-sm font-bold rounded-lg shadow-sm hover:bg-orange-500 transition-all active:scale-95">
              {activeTab === 'opp' ? 'Criar Oportunidade' : 'Gerar Link Form'}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Nova Pipeline */}
      <Dialog open={isNewPipelineOpen} onOpenChange={setIsNewPipelineOpen}>
        <DialogContent className="w-[95vw] sm:max-w-sm bg-white p-4 sm:p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900">Criar Novo Funil</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <input 
              type="text" 
              value={newPipelineName} 
              onChange={e => setNewPipelineName(e.target.value)} 
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none text-sm font-semibold" 
              placeholder="Ex: Pós-Venda, Corporativo..." 
              autoFocus
            />
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-2">
            <button onClick={() => setIsNewPipelineOpen(false)} className="w-full sm:w-auto flex-1 py-2.5 text-gray-600 text-sm font-bold hover:bg-gray-100 rounded-xl">Cancelar</button>
            <button onClick={handleCreatePipeline} className="w-full sm:w-auto flex-1 py-2.5 bg-orange-400 text-white text-sm font-bold rounded-xl hover:bg-orange-500 shadow-sm">Criar Funil</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Nova Coluna */}
      <Dialog open={isNewColOpen} onOpenChange={setIsNewColOpen}>
        <DialogContent className="w-[95vw] sm:max-w-sm bg-white p-4 sm:p-6 rounded-2xl">
          <DialogHeader><DialogTitle className="text-lg font-bold text-gray-900">Nova Etapa</DialogTitle></DialogHeader>
          <div className="py-2">
            <input type="text" value={newColName} onChange={e => setNewColName(e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none text-sm font-semibold" placeholder="Ex: Negociação" autoFocus />
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-2">
            <button onClick={() => setIsNewColOpen(false)} className="w-full sm:w-auto flex-1 py-2.5 text-gray-600 text-sm font-bold hover:bg-gray-100 rounded-xl">Cancelar</button>
            <button onClick={handleCreateColumn} className="w-full sm:w-auto flex-1 py-2.5 bg-orange-400 text-white text-sm font-bold rounded-xl hover:bg-orange-500 shadow-sm">Salvar Etapa</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Cadência */}
      <Dialog open={isCadenciaModalOpen} onOpenChange={setIsCadenciaModalOpen}>
        <DialogContent className="w-[95vw] sm:max-w-sm bg-white p-4 sm:p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900">Iniciar Automação</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <p className="text-sm text-gray-500">Agendar mensagens automáticas para <strong>{selectedOppForCadencia?.name}</strong>.</p>
            <div>
              <select 
                value={selectedFlowId} 
                onChange={e => setSelectedFlowId(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-400 outline-none font-semibold"
              >
                <option value="">Selecione um fluxo...</option>
                {cadenciaFlows.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-2">
            <button onClick={() => setIsCadenciaModalOpen(false)} className="w-full sm:w-auto flex-1 py-2.5 text-gray-600 text-sm font-bold hover:bg-gray-100 rounded-xl transition-colors">Cancelar</button>
            <button onClick={handleStartCadencia} className="w-full sm:w-auto flex-1 py-2.5 bg-green-500 text-white text-sm font-bold rounded-xl hover:bg-green-600 shadow-sm">Ativar Fluxo</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}