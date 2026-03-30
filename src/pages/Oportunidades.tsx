import React, { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Trash2, Plus, UserPlus, MessageCircle, Link as LinkIcon, 
  Upload, Loader2, Copy, ExternalLink, X, ArrowUp, ArrowDown, UserMinus
} from "lucide-react";
import { toast } from "sonner";
import LeadImportModal from "@/components/LeadImportModal";

// --- Tipos ---
interface Pipeline { id: string; name: string; }
interface Column { id: string; pipeline_id: string; name: string; order_index: number; }
interface Opportunity {
  id: string; pipeline_id: string; column_id: string; name: string; tag: string;
  email: string; phone: string; value: string; instagram: string; address: string;
  observations: string; event_date: string; is_client: boolean;
}
interface LinkForm {
  id: string; name: string; tag: string; whatsapp_number: string; whatsapp_text: string;
  fields: { email: boolean; phone: boolean; instagram: boolean; date: boolean; local: boolean; description: boolean; };
}

const PHOTO_TYPES = [
  { value: 'Casamento', label: '💍 Casamento' },
  { value: 'Gestante', label: '🤰 Gestante' },
  { value: 'Corporativo', label: '💼 Corporativo' },
  { value: 'Retrato', label: '👤 Retrato' },
  { value: 'Newborn', label: '👶 Newborn' },
  { value: 'Infantil', label: '👧 Infantil' },
  { value: 'Ensaio feminino', label: '👩 Ensaio feminino' },
  { value: 'Smash the cake', label: '🎂 Smash the cake' }
];

export default function Oportunidades() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  
  // Dados
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [columns, setColumns] = useState<Column[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [linkForms, setLinkForms] = useState<LinkForm[]>([]);
  
  const [activePipelineId, setActivePipelineId] = useState<string>("");
  const [selectedOpps, setSelectedOpps] = useState<string[]>([]);

  // Modais
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'opp' | 'link'>('opp');
  const [isNewColOpen, setIsNewColOpen] = useState(false);
  const [newColName, setNewColName] = useState("");

  // Formulário Modal
  const [formData, setFormData] = useState({
    pipeline_id: '', tag: '', name: '', value: '', email: '', phone: '', 
    instagram: '', date: '', local: '', description: '', whatsapp_number: '', whatsapp_text: ''
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
          if (payload.eventType === 'INSERT') setOpportunities(prev => [...prev, payload.new as Opportunity]);
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
      const [pipesRes, colsRes, oppsRes, formsRes] = await Promise.all([
        supabase.from('pipelines').select('*').order('created_at', { ascending: true }),
        supabase.from('columns').select('*').order('order_index', { ascending: true }),
        supabase.from('opportunities').select('*'),
        supabase.from('link_forms').select('*')
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
      setOpportunities(oppsRes.data || []);
      setLinkForms(formsRes.data || []);
      
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
    setOpportunities(prev => prev.map(o => o.id === draggableId ? { ...o, column_id: destColId } : o));
    await supabase.from('opportunities').update({ column_id: destColId }).eq('id', draggableId);
  };

  // Reordenar Setas Cima/Baixo
  const moveCard = (oppId: string, colId: string, direction: 'up' | 'down') => {
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

  // Seleções
  const handleSelectAll = (colId: string) => {
    const colOppsIds = opportunities.filter(o => o.column_id === colId).map(o => o.id);
    setSelectedOpps(prev => Array.from(new Set([...prev, ...colOppsIds])));
  };

  const handleDeselectAll = (colId: string) => {
    const colOppsIds = opportunities.filter(o => o.column_id === colId).map(o => o.id);
    setSelectedOpps(prev => prev.filter(id => !colOppsIds.includes(id)));
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

  // Ações nos Cards
  const handleToggleClient = async (opp: Opportunity) => {
    try {
      const newStatus = !opp.is_client;
      await supabase.from('opportunities').update({ is_client: newStatus }).eq('id', opp.id);
      setOpportunities(prev => prev.map(o => o.id === opp.id ? { ...o, is_client: newStatus } : o));
      toast.success(newStatus ? "Adicionado aos clientes!" : "Removido de clientes.");
    } catch (e) {
      toast.error("Erro ao atualizar status do cliente.");
    }
  };

  const handleCadencia = (opp: Opportunity) => {
    const phone = opp.phone;
    if (!phone) return toast.error("Este lead não possui telefone cadastrado.");
    const cleanPhone = phone.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanPhone}?text=Olá ${opp.name}, `, '_blank');
  };

  const handleDeleteColumn = async (colId: string) => {
    if (!confirm("Deletar esta coluna? As oportunidades não serão perdidas, mas ficarão sem coluna até serem movidas.")) return;
    await supabase.from('columns').delete().eq('id', colId);
    setColumns(prev => prev.filter(c => c.id !== colId));
    toast.success("Coluna deletada.");
  };

  // Criação
  const handleCreateNew = async () => {
    if (!formData.name) return toast.error("Nome é obrigatório.");
    if (activeColumns.length === 0) return toast.error("Crie uma coluna primeiro.");

    const isOpp = activeTab === 'opp';
    const targetCol = activeColumns[0].id;

    try {
      if (isOpp) {
        await supabase.from('opportunities').insert({
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
          tag: formData.tag
        });
        toast.success("Oportunidade criada!");
      } else {
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

  const handleCreateColumn = async () => {
    if (!newColName) return;
    const { data } = await supabase.from('columns').insert({
      user_id: user?.id, pipeline_id: activePipelineId, name: newColName, order_index: activeColumns.length
    }).select().single();
    if (data) setColumns([...columns, data]);
    setNewColName(""); setIsNewColOpen(false);
    toast.success("Coluna criada!");
  };

  const handleDeleteLinkForm = async (id: string) => {
    if (!confirm("Deletar formulário?")) return;
    setLinkForms(prev => prev.filter(f => f.id !== id));
    await supabase.from('link_forms').delete().eq('id', id);
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Oportunidades</h1>
          <div className="flex items-center gap-3 ml-auto">
            <button onClick={() => setIsImportOpen(true)} className="px-4 py-2 bg-white border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 shadow-sm">
              <Upload className="w-4 h-4" /> Importar
            </button>
            <button onClick={() => setIsModalOpen(true)} className="px-4 py-2 bg-orange-400 text-white font-medium rounded-lg hover:bg-orange-500 transition-colors flex items-center gap-2 shadow-sm">
              <Plus className="w-4 h-4" /> Adicionar
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3 mb-6">
          <select 
            value={activePipelineId} onChange={(e) => setActivePipelineId(e.target.value)}
            className="w-[200px] px-4 py-2 bg-white border border-gray-200 rounded-lg text-[13px] text-gray-700 shadow-sm transition-colors outline-none focus:ring-2 focus:ring-orange-400 appearance-none cursor-pointer"
          >
            {pipelines.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button 
            onClick={async () => {
              const name = prompt("Nome do novo pipeline:");
              if (name) {
                const { data } = await supabase.from('pipelines').insert({ name, user_id: user?.id }).select().single();
                if (data) {
                  setPipelines([...pipelines, data]);
                  setActivePipelineId(data.id);
                  const newCols = await supabase.from('columns').insert([{ name: 'Aberto', order_index: 0, pipeline_id: data.id, user_id: user?.id }]).select();
                  setColumns([...columns, ...(newCols.data || [])]);
                }
              }
            }}
            className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-[13px] text-gray-700 font-medium hover:bg-gray-50 shadow-sm transition-colors"
          >
            Nova Pipeline
          </button>
        </div>

        {/* Kanban Board */}
        <div className="flex gap-5 overflow-x-auto pb-4 flex-1 items-start">
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="board" direction="horizontal" type="column">
              {(provided) => (
                <div className="flex gap-5 h-full" {...provided.droppableProps} ref={provided.innerRef}>
                  {activeColumns.map((col, index) => {
                    const colOpps = opportunities.filter(o => o.column_id === col.id);
                    return (
                      <Draggable key={col.id} draggableId={col.id} index={index}>
                        {(provided) => (
                          <div 
                            ref={provided.innerRef} {...provided.draggableProps}
                            className="flex-1 min-w-[320px] max-w-[340px] bg-white rounded-xl border border-gray-200 flex flex-col max-h-[calc(100vh-220px)] shadow-sm"
                          >
                            <div className="p-4 border-b border-gray-100 rounded-t-xl bg-white" {...provided.dragHandleProps}>
                              <div className="flex items-center justify-between mb-3">
                                <h3 className="font-bold text-gray-900 text-[15px]">{col.name}</h3>
                                <div className="flex items-center gap-2">
                                  <span className="bg-gray-100 text-gray-500 text-xs font-bold px-2 py-0.5 rounded-full min-w-[24px] text-center">
                                    {colOpps.length}
                                  </span>
                                  <button onClick={() => handleDeleteColumn(col.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 text-[11px] text-gray-500 font-medium">
                                <button onClick={() => handleSelectAll(col.id)} className="hover:text-gray-900 transition-colors">Selecionar Todos</button>
                                <span className="text-gray-300">|</span>
                                <button onClick={() => handleDeselectAll(col.id)} className="hover:text-gray-900 transition-colors">Desmarcar Todos</button>
                              </div>
                            </div>
                            
                            <Droppable droppableId={col.id} type="card">
                              {(provided, snapshot) => (
                                <div 
                                  ref={provided.innerRef} {...provided.droppableProps}
                                  className={`flex-1 p-3 overflow-y-auto rounded-b-xl space-y-3 transition-colors ${snapshot.isDraggingOver ? 'bg-orange-50/20' : 'bg-gray-50/30'}`}
                                  style={{ minHeight: '150px' }}
                                >
                                  {colOpps.map((opp, oppIndex) => (
                                    <Draggable key={opp.id} draggableId={opp.id} index={oppIndex}>
                                      {(provided, snapshot) => (
                                        <div
                                          ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}
                                          className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all relative group"
                                          style={{ ...provided.draggableProps.style, opacity: snapshot.isDragging ? 0.9 : 1 }}
                                        >
                                          {/* Card Header: Checkbox + Name + Arrows */}
                                          <div className="flex justify-between items-start mb-3">
                                            <div className="flex items-center gap-2.5">
                                              <input 
                                                type="checkbox" 
                                                checked={selectedOpps.includes(opp.id)}
                                                onChange={() => toggleSelection(opp.id)}
                                                className="w-4 h-4 rounded-full border-gray-300 text-orange-400 focus:ring-orange-400 cursor-pointer"
                                              />
                                              <span className="font-semibold text-gray-900 text-sm">{opp.name}</span>
                                            </div>
                                            <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                              <button onClick={() => moveCard(opp.id, col.id, 'up')} disabled={oppIndex === 0} className="text-gray-400 hover:text-gray-700 disabled:opacity-30">
                                                <ArrowUp className="w-3 h-3" />
                                              </button>
                                              <button onClick={() => moveCard(opp.id, col.id, 'down')} disabled={oppIndex === colOpps.length - 1} className="text-gray-400 hover:text-gray-700 disabled:opacity-30">
                                                <ArrowDown className="w-3 h-3" />
                                              </button>
                                            </div>
                                          </div>

                                          {/* Card Info: Tag, Email, Phone */}
                                          {opp.tag && (
                                            <div className="mb-2.5 inline-flex items-center bg-gray-100 px-2 py-0.5 rounded-md text-[11px] font-medium text-gray-600">
                                              {PHOTO_TYPES.find(p => p.value === opp.tag)?.label || opp.tag}
                                            </div>
                                          )}
                                          <div className="text-[12px] text-gray-500 mb-0.5 truncate">{opp.email}</div>
                                          <div className="text-[12px] text-gray-500 mb-4">{opp.phone}</div>

                                          {/* Card Footer: Buttons */}
                                          <div className="flex gap-2">
                                            <button 
                                              onClick={() => handleToggleClient(opp)}
                                              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md border text-[11px] font-semibold transition-colors ${opp.is_client ? 'border-red-200 text-red-600 bg-red-50 hover:bg-red-100' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                                            >
                                              {opp.is_client ? <UserMinus className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
                                              {opp.is_client ? '-Cliente' : '+Cliente'}
                                            </button>
                                            <button 
                                              onClick={() => handleCadencia(opp)}
                                              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md border border-gray-200 text-gray-700 text-[11px] font-semibold hover:bg-gray-50 transition-colors"
                                            >
                                              <MessageCircle className="w-3.5 h-3.5 text-green-500" />
                                              Cadência
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
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                  
                  {/* Add Column Button */}
                  <button 
                    onClick={() => setIsNewColOpen(true)}
                    className="min-w-[320px] max-w-[320px] bg-transparent border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center text-gray-900 hover:border-gray-300 hover:bg-gray-50 transition-all h-[50px] font-semibold text-sm"
                  >
                    <Plus className="w-4 h-4 mr-2" /> Adicionar Coluna
                  </button>
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </div>

        {/* Link Forms Gerados */}
        {linkForms.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2"><LinkIcon className="w-4 h-4 text-orange-400"/> Link Forms Ativos</h3>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {linkForms.map(form => {
                const url = `${window.location.origin}/link-form/${form.id}`;
                return (
                  <div key={form.id} className="bg-white border border-gray-200 rounded-lg p-3 min-w-[280px] flex justify-between items-center shadow-sm">
                    <div>
                      <p className="font-semibold text-sm truncate max-w-[180px]">{form.name}</p>
                      <p className="text-xs text-gray-500">{form.tag || 'Geral'}</p>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => { navigator.clipboard.writeText(url); toast.success("Link copiado!"); }} className="p-1.5 text-gray-400 hover:text-gray-700 bg-gray-50 rounded"><Copy className="w-4 h-4"/></button>
                      <button onClick={() => window.open(url, '_blank')} className="p-1.5 text-gray-400 hover:text-gray-700 bg-gray-50 rounded"><ExternalLink className="w-4 h-4"/></button>
                      <button onClick={() => handleDeleteLinkForm(form.id)} className="p-1.5 text-red-400 hover:text-red-600 bg-red-50 rounded"><Trash2 className="w-4 h-4"/></button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Modal de Importação CSV / Trello */}
      <LeadImportModal 
        isOpen={isImportOpen} 
        onClose={() => setIsImportOpen(false)} 
        pipelines={pipelines} 
        columns={columns} 
        userId={user?.id} 
        onImportSuccess={fetchData}
      />

      {/* MODAL: Adicionar ao Pipeline */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white rounded-2xl w-full max-w-2xl shadow-2xl p-6 sm:p-8 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Adicionar ao Pipeline</h2>
                <p className="text-sm text-gray-500 mt-1">Crie uma nova oportunidade ou gere um link de formulário.</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5"/></button>
            </div>

            <div className="flex bg-gray-50 p-1 rounded-xl mb-6">
              <button 
                onClick={() => setActiveTab('opp')}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === 'opp' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >Nova Oportunidade</button>
              <button 
                onClick={() => setActiveTab('link')}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === 'link' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >Link Form</button>
            </div>

            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Qual pipeline este lead cairá?</label>
                  <select 
                    value={formData.pipeline_id} onChange={e => setFormData({...formData, pipeline_id: e.target.value})}
                    className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  >
                    {pipelines.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Tipo de Foto</label>
                  <select 
                    value={formData.tag} onChange={e => setFormData({...formData, tag: e.target.value})}
                    className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  >
                    <option value="">Selecione o tipo</option>
                    {PHOTO_TYPES.map(pt => <option key={pt.value} value={pt.value}>{pt.label}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">{activeTab === 'opp' ? 'Nome do Lead *' : 'Nome do Formulário *'}</label>
                <input 
                  type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  placeholder={activeTab === 'opp' ? "Nome do cliente" : "Ex: Orçamento Casamento"}
                />
              </div>

              {activeTab === 'opp' && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Valor</label>
                    <input 
                      type="text" value={formData.value} onChange={e => setFormData({...formData, value: e.target.value})}
                      className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email</label>
                      <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Telefone/WhatsApp</label>
                      <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Instagram</label>
                      <input type="text" value={formData.instagram} onChange={e => setFormData({...formData, instagram: e.target.value})} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Data</label>
                      <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Local do evento</label>
                      <input type="text" value={formData.local} onChange={e => setFormData({...formData, local: e.target.value})} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Descrição</label>
                      <input type="text" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'link' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-y-4 gap-x-8">
                    {Object.entries({ email: 'Email', phone: 'Telefone/WhatsApp', instagram: 'Instagram', date: 'Data', local: 'Local do evento', description: 'Descrição' }).map(([key, label]) => (
                      <label key={key} className="flex items-center justify-between cursor-pointer group">
                        <span className="text-sm font-semibold text-gray-900">{label}</span>
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${formFields[key as keyof typeof formFields] ? 'bg-orange-100 border-orange-400' : 'border-gray-300 group-hover:border-orange-400'}`}>
                          {formFields[key as keyof typeof formFields] && <div className="w-2.5 h-2.5 bg-orange-400 rounded-full" />}
                        </div>
                        <input 
                          type="checkbox" className="hidden" 
                          checked={formFields[key as keyof typeof formFields]}
                          onChange={(e) => {
                            if (['email', 'phone', 'instagram'].includes(key)) return;
                            setFormFields({...formFields, [key]: e.target.checked})
                          }}
                        />
                      </label>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Número de WhatsApp</label>
                      <input 
                        type="text" value={formData.whatsapp_number} onChange={e => setFormData({...formData, whatsapp_number: e.target.value})}
                        className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                        placeholder="Ex: 5511999999999"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Texto da Mensagem</label>
                      <input 
                        type="text" value={formData.whatsapp_text} onChange={e => setFormData({...formData, whatsapp_text: e.target.value})}
                        className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                        placeholder="Ex: Olá, gostaria de um orçamento"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-8">
              <button onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-gray-700 font-semibold border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
              <button onClick={handleCreateNew} className="px-6 py-2.5 bg-orange-400 text-white font-semibold rounded-lg hover:bg-orange-500 transition-colors">
                {activeTab === 'opp' ? 'Criar Oportunidade' : 'Gerar Link Form'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nova Coluna */}
      {isNewColOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsNewColOpen(false)} />
          <div className="relative bg-white rounded-xl w-full max-w-sm shadow-2xl p-6">
            <h2 className="text-lg font-bold mb-4">Nova Coluna</h2>
            <input 
              type="text" value={newColName} onChange={e => setNewColName(e.target.value)} autoFocus
              onKeyDown={e => e.key === 'Enter' && handleCreateColumn()}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-orange-400"
              placeholder="Nome da etapa"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setIsNewColOpen(false)} className="px-4 py-2 text-gray-600 font-medium">Cancelar</button>
              <button onClick={handleCreateColumn} className="px-4 py-2 bg-orange-400 text-white rounded-lg font-medium">Salvar</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}