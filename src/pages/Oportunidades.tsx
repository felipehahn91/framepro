import React, { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Trash2, Plus, UserPlus, MessageCircle, Link as LinkIcon, 
  Upload, Loader2, Copy, ExternalLink, X, UserMinus, Search, Inbox, ArrowUp, ArrowDown, GitBranch,
  MessageSquare
} from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { toast } from "sonner";
import LeadImportModal from "@/components/LeadImportModal";
import OpportunityDetailModal from "@/components/OpportunityDetailModal";

// --- Tipos ---
interface Pipeline { id: string; name: string; }
interface Column { id: string; pipeline_id: string; name: string; order_index: number; }
interface Opportunity {
  id: string; pipeline_id: string; column_id: string; name: string; tag: string;
  email: string; phone: string; value: string; instagram: string; address: string;
  observations: string; event_date: string; is_client: boolean;
}

export default function Oportunidades() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [columns, setColumns] = useState<Column[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  
  const [activePipelineId, setActivePipelineId] = useState<string>("");
  const [selectedOpps, setSelectedOpps] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Cadência States
  const [isCadenciaModalOpen, setIsCadenciaModalOpen] = useState(false);
  const [selectedOppForFlow, setSelectedOppForFlow] = useState<Opportunity | null>(null);
  const [flows, setFlows] = useState<any[]>([]);
  const [selectedFlowId, setSelectedFlowId] = useState("");
  const [startingFlow, setStartingFlow] = useState(false);

  // Outros Modais
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedOppToView, setSelectedOppToView] = useState<Opportunity | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchData();
    fetchFlows();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pipesRes, colsRes, oppsRes] = await Promise.all([
        supabase.from('pipelines').select('*').order('created_at', { ascending: true }),
        supabase.from('columns').select('*').order('order_index', { ascending: true }),
        supabase.from('opportunities').select('*')
      ]);

      setPipelines(pipesRes.data || []);
      setColumns(colsRes.data || []);
      setOpportunities(oppsRes.data || []);
      
      if (pipesRes.data && pipesRes.data.length > 0 && !activePipelineId) {
        setActivePipelineId(pipesRes.data[0].id);
      }
    } catch (error) {
      toast.error("Erro ao carregar dados.");
    } finally {
      setLoading(false);
    }
  };

  const fetchFlows = async () => {
    const { data } = await supabase.from('cadencia_flows').select('id, name');
    setFlows(data || []);
  };

  const handleStartFlow = async () => {
    if (!selectedFlowId || !selectedOppForFlow) return;
    setStartingFlow(true);
    
    try {
      const { data: flow, error } = await supabase.from('cadencia_flows').select('*').eq('id', selectedFlowId).single();
      if (error) throw error;

      const now = new Date();
      const queueItems = flow.messages.map((step: any) => {
        let scheduledDate = new Date(now);
        
        if (step.delayUnit === 'minutes') scheduledDate.setMinutes(now.getMinutes() + step.delayAmount);
        else if (step.delayUnit === 'hours') scheduledDate.setHours(now.getHours() + step.delayAmount);
        else if (step.delayUnit === 'days') scheduledDate.setDate(now.getDate() + step.delayAmount);

        return {
          user_id: user?.id,
          opportunity_id: selectedOppForFlow.id,
          flow_id: flow.id,
          step_id: step.id,
          scheduled_for: scheduledDate.toISOString(),
          payload: { items: step.items },
          status: 'pending'
        };
      });

      const { error: queueError } = await supabase.from('cadencia_queue').insert(queueItems);
      if (queueError) throw queueError;

      toast.success(`${queueItems.length} etapas agendadas com sucesso!`);
      setIsCadenciaModalOpen(false);
    } catch (err) {
      toast.error("Erro ao agendar cadência automática.");
    } finally {
      setStartingFlow(false);
    }
  };

  const onDragEnd = async (result: any) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const updatedOpps = Array.from(opportunities);
    const oppIndex = updatedOpps.findIndex(o => o.id === draggableId);
    if (oppIndex === -1) return;

    const opp = { ...updatedOpps[oppIndex], column_id: destination.droppableId };
    updatedOpps[oppIndex] = opp;
    setOpportunities(updatedOpps);

    const { error } = await supabase.from('opportunities').update({ column_id: destination.droppableId }).eq('id', draggableId);
    if (error) {
      toast.error("Erro ao mover card.");
      fetchData();
    }
  };

  if (loading) return <Layout><div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-orange-400" /></div></Layout>;

  const activeColumns = columns.filter(c => c.pipeline_id === activePipelineId).sort((a, b) => a.order_index - b.order_index);

  return (
    <Layout>
      <div className="max-w-full mx-auto flex flex-col h-full bg-[#FAFAFA]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Oportunidades</h1>
          <div className="flex items-center gap-3">
             <select 
              value={activePipelineId} onChange={(e) => setActivePipelineId(e.target.value)}
              className="w-[200px] px-4 py-2 bg-white border border-gray-200 rounded-lg text-[13px] text-gray-700 shadow-sm outline-none focus:ring-2 focus:ring-orange-400"
            >
              {pipelines.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <button onClick={() => setIsModalOpen(true)} className="px-4 py-2 bg-orange-400 text-white font-medium rounded-lg hover:bg-orange-500 transition-colors flex items-center gap-2 shadow-sm">
              <Plus className="w-4 h-4" /> Adicionar
            </button>
          </div>
        </div>

        <div className="flex gap-5 overflow-x-auto pb-4 flex-1 items-start">
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex gap-5 h-full">
              {activeColumns.map((col) => {
                const colOpps = opportunities.filter(o => o.column_id === col.id);
                return (
                  <div key={col.id} className="flex-1 min-w-[320px] max-w-[340px] bg-white rounded-xl border border-gray-200 flex flex-col max-h-[calc(100vh-220px)] shadow-sm">
                    <div className="p-4 border-b border-gray-100 font-bold text-gray-900">{col.name}</div>
                    <Droppable droppableId={col.id}>
                      {(provided) => (
                        <div className="flex-1 p-3 overflow-y-auto space-y-3 bg-gray-50/30" {...provided.droppableProps} ref={provided.innerRef}>
                          {colOpps.map((opp, index) => (
                            <Draggable key={opp.id} draggableId={opp.id} index={index}>
                              {(provided) => (
                                <div 
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md cursor-pointer group"
                                  onClick={() => { setSelectedOppToView(opp); setIsDetailModalOpen(true); }}
                                >
                                  <p className="font-semibold text-gray-900 mb-4">{opp.name}</p>
                                  <div className="flex gap-2">
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); setSelectedOppForFlow(opp); setIsCadenciaModalOpen(true); }}
                                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md border border-orange-200 text-orange-600 bg-orange-50 text-[11px] font-bold hover:bg-orange-100 transition-colors"
                                    >
                                      <GitBranch className="w-3.5 h-3.5" /> Iniciar Cadência
                                    </button>
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); window.open(`https://wa.me/${opp.phone?.replace(/\D/g, '')}`, '_blank'); }}
                                      className="p-1.5 border border-gray-200 rounded-md text-gray-400 hover:text-green-500"
                                    >
                                      <MessageSquare className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </div>
                )
              })}
            </div>
          </DragDropContext>
        </div>
      </div>

      <Dialog open={isCadenciaModalOpen} onOpenChange={setIsCadenciaModalOpen}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
               <GitBranch className="w-5 h-5 text-orange-500" /> Iniciar Automação
            </DialogTitle>
            <DialogDescription>
              Selecione o fluxo que será enviado automaticamente para <strong>{selectedOppForFlow?.name}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="py-6">
            <label className="block text-sm font-bold text-gray-700 mb-2">Fluxo de Cadência</label>
            <select 
              value={selectedFlowId}
              onChange={(e) => setSelectedFlowId(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400 transition-all text-gray-700"
            >
              <option value="">Selecione um template...</option>
              {flows.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
            <p className="text-[11px] text-gray-400 mt-2">
              Ao confirmar, o robô agendará todos os envios conforme os tempos definidos no fluxo.
            </p>
          </div>

          <div className="flex justify-end gap-3">
            <button onClick={() => setIsCadenciaModalOpen(false)} className="px-5 py-2.5 text-gray-600 font-semibold hover:bg-gray-100 rounded-lg">Cancelar</button>
            <button 
              onClick={handleStartFlow}
              disabled={!selectedFlowId || startingFlow}
              className="px-6 py-2.5 bg-orange-400 text-white font-bold rounded-lg hover:bg-orange-500 transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
              {startingFlow ? <Loader2 className="w-4 h-4 animate-spin" /> : <GitBranch className="w-4 h-4" />}
              Agendar Envios
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <LeadImportModal 
        isOpen={isImportOpen} 
        onClose={() => setIsImportOpen(false)} 
        pipelines={pipelines} 
        columns={columns} 
        userId={user?.id}
        onImportSuccess={fetchData}
      />

      <OpportunityDetailModal 
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        opportunity={selectedOppToView}
        onSave={() => fetchData()}
        onDelete={() => fetchData()}
      />
    </Layout>
  );
}