import React, { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Trash2, Plus, UserPlus, MessageCircle, Diamond, Link as LinkIcon, 
  Upload, Loader2, Copy, ExternalLink, X
} from "lucide-react";
import { toast } from "sonner";

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

  // Modais
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'opp' | 'link'>('opp');
  const [isNewColOpen, setIsNewColOpen] = useState(false);
  const [newColName, setNewColName] = useState("");

  // Formulário Modal
  const [formData, setFormData] = useState({
    pipeline_id: '',
    tag: '',
    name: '',
    value: '',
    email: '',
    phone: '',
    instagram: '',
    date: '',
    local: '',
    description: '',
    whatsapp_number: '',
    whatsapp_text: ''
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
          if (payload.eventType === 'DELETE') setOpportunities(prev => prev.filter(o => o.id !== payload.old.id));
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
            { name: 'Ganho', order_index: 2, pipeline_id: newPipe.data.id, user_id: user?.id }
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

      // Atualizar no banco
      for (const col of updatedCols) {
        await supabase.from('columns').update({ order_index: col.order_index }).eq('id', col.id);
      }
      return;
    }

    // Mover Card
    const destColId = destination.droppableId;
    setOpportunities(prev => prev.map(o => o.id === draggableId ? { ...o, column_id: destColId } : o));
    await supabase.from('opportunities').update({ column_id: destColId }).eq('id', draggableId);
  };

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
      user_id: user?.id,
      pipeline_id: activePipelineId,
      name: newColName,
      order_index: activeColumns.length
    }).select().single();
    
    if (data) setColumns([...columns, data]);
    setNewColName("");
    setIsNewColOpen(false);
    toast.success("Coluna criada!");
  };

  const handleDeleteOpp = async (id: string) => {
    if (!confirm("Deletar oportunidade?")) return;
    setOpportunities(prev => prev.filter(o => o.id !== id));
    await supabase.from('opportunities').delete().eq('id', id);
    toast.success("Deletado.");
  };

  const handleDeleteLinkForm = async (id: string) => {
    if (!confirm("Deletar formulário?")) return;
    setLinkForms(prev => prev.filter(f => f.id !== id));
    await supabase.from('link_forms').delete().eq('id', id);
  };

  if (loading) return <Layout><div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-orange-400" /></div></Layout>;

  return (
    <Layout>
      <div className="max-w-full mx-auto flex flex-col h-full">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Oportunidades</h1>
          <div className="flex items-center gap-3 ml-auto">
            <button 
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 bg-orange-400 text-white font-medium rounded-lg hover:bg-orange-500 transition-colors flex items-center gap-2 shadow-sm"
            >
              <Plus className="w-4 h-4" /> Adicionar
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3 mb-6">
          <select 
            value={activePipelineId}
            onChange={(e) => setActivePipelineId(e.target.value)}
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
                  const defCols = [
                    { name: 'Aberto', order_index: 0, pipeline_id: data.id, user_id: user?.id },
                  ];
                  const newCols = await supabase.from('columns').insert(defCols).select();
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
        <div className="flex gap-4 overflow-x-auto pb-4 flex-1 items-start">
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="board" direction="horizontal" type="column">
              {(provided) => (
                <div className="flex gap-4 h-full" {...provided.droppableProps} ref={provided.innerRef}>
                  {activeColumns.map((col, index) => {
                    const colOpps = opportunities.filter(o => o.column_id === col.id);
                    return (
                      <Draggable key={col.id} draggableId={col.id} index={index}>
                        {(provided) => (
                          <div 
                            ref={provided.innerRef} {...provided.draggableProps}
                            className="flex-1 min-w-[300px] max-w-[320px] bg-white rounded-xl border border-gray-200 flex flex-col max-h-[calc(100vh-220px)] shadow-sm"
                          >
                            <div className="p-4 border-b border-gray-100 bg-gray-50/50 rounded-t-xl" {...provided.dragHandleProps}>
                              <div className="flex items-center justify-between">
                                <h3 className="font-bold text-gray-900 text-base">{col.name}</h3>
                                <span className="bg-white border border-gray-200 text-gray-500 text-xs font-bold px-2 py-0.5 rounded-full min-w-[24px] text-center shadow-sm">
                                  {colOpps.length}
                                </span>
                              </div>
                            </div>
                            
                            <Droppable droppableId={col.id} type="card">
                              {(provided, snapshot) => (
                                <div 
                                  ref={provided.innerRef} {...provided.droppableProps}
                                  className={`flex-1 p-3 overflow-y-auto rounded-b-xl space-y-3 transition-colors ${snapshot.isDraggingOver ? 'bg-orange-50/50' : 'bg-gray-50/30'}`}
                                  style={{ minHeight: '150px' }}
                                >
                                  {colOpps.map((opp, index) => (
                                    <Draggable key={opp.id} draggableId={opp.id} index={index}>
                                      {(provided, snapshot) => (
                                        <div
                                          ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}
                                          className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all group relative"
                                          style={{ ...provided.draggableProps.style, opacity: snapshot.isDragging ? 0.9 : 1 }}
                                        >
                                          <div className="flex justify-between items-start mb-2.5">
                                            <span className="font-semibold text-gray-900 text-[15px] truncate">{opp.name}</span>
                                            <button onClick={() => handleDeleteOpp(opp.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                              <Trash2 className="w-4 h-4" />
                                            </button>
                                          </div>
                                          {opp.tag && (
                                            <div className="mb-3 inline-flex items-center gap-1.5 bg-gray-100/80 px-2 py-0.5 rounded-md text-[11px] font-medium text-gray-600">
                                              {PHOTO_TYPES.find(p => p.value === opp.tag)?.label || opp.tag}
                                            </div>
                                          )}
                                          <div className="text-[13px] text-gray-500 truncate mb-1">{opp.phone || opp.email}</div>
                                          {opp.value && <div className="text-[13px] font-medium text-gray-700">{opp.value}</div>}
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
                  
                  <button 
                    onClick={() => setIsNewColOpen(true)}
                    className="min-w-[300px] max-w-[320px] bg-gray-50/50 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-all h-[100px] font-medium"
                  >
                    <Plus className="w-5 h-5 mr-2" /> Nova Coluna
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

            {/* Toggle Tabs */}
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
                            if (['email', 'phone', 'instagram'].includes(key)) return; // Bloqueados conforme imagem
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
                      <p className="text-[11px] text-gray-500 mt-1">Número que receberá a mensagem do cliente</p>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Texto da Mensagem</label>
                      <input 
                        type="text" value={formData.whatsapp_text} onChange={e => setFormData({...formData, whatsapp_text: e.target.value})}
                        className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                        placeholder="Ex: Olá, gostaria de um orçamento"
                      />
                      <p className="text-[11px] text-gray-500 mt-1">Texto pré-definido para o WhatsApp</p>
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

      {/* Modal Nova Coluna Simples */}
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